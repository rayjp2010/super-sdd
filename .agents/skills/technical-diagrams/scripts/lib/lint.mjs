// Geometry lint over a draw.io SVG export. Coordinates come from the SVG (what the reader sees);
// cell kinds, endpoints and label text come from the model.
import { describe } from "./model.mjs";
import { elements, parseXml, textOf } from "./xml.mjs";

// GitHub's markdown column is about 980px wide; wider SVGs are scaled down to fit it.
const COLUMN_PX = 980;
const MIN_READABLE_PX = 9;

// ---------- geometry helpers ----------

const inflate = (r, d) => ({ x1: r.x1 - d, y1: r.y1 - d, x2: r.x2 + d, y2: r.y2 + d });
const intersects = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
const contains = (outer, inner) =>
  inner.x1 >= outer.x1 - 0.5 && inner.y1 >= outer.y1 - 0.5 && inner.x2 <= outer.x2 + 0.5 && inner.y2 <= outer.y2 + 0.5;

function segHitsRect(p, q, r) {
  // Liang–Barsky clip; true when any part of segment pq lies strictly inside r.
  let t0 = 0;
  let t1 = 1;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  for (const [pk, qk] of [
    [-dx, p.x - r.x1],
    [dx, r.x2 - p.x],
    [-dy, p.y - r.y1],
    [dy, r.y2 - p.y],
  ]) {
    if (pk === 0) {
      if (qk <= 0) return false;
    } else {
      const t = qk / pk;
      if (pk < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 >= t1) return false;
    }
  }
  return true;
}

function crossing(a, b, c, d) {
  // Proper crossing of ab and cd away from their ends (3px), which ignores shared ports.
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
  const la = Math.hypot(b.x - a.x, b.y - a.y);
  const lc = Math.hypot(d.x - c.x, d.y - c.y);
  const ea = 3 / la;
  const ec = 3 / lc;
  if (t > ea && t < 1 - ea && u > ec && u < 1 - ec) return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return null;
}

function collinearOverlap(a, b, c, d) {
  const horiz = (p, q) => Math.abs(p.y - q.y) < 0.5;
  const vert = (p, q) => Math.abs(p.x - q.x) < 0.5;
  if (horiz(a, b) && horiz(c, d) && Math.abs(a.y - c.y) < 2) {
    return Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
  }
  if (vert(a, b) && vert(c, d) && Math.abs(a.x - c.x) < 2) {
    return Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
  }
  return 0;
}

function pathPoints(d) {
  const toks = d.match(/[MLCQZHVA]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const pts = [];
  let i = 0;
  let cmd = null;
  let cur = { x: 0, y: 0 };
  const num = () => Number(toks[i++]);
  while (i < toks.length) {
    if (/[a-z]/i.test(toks[i])) cmd = toks[i++].toUpperCase();
    if (cmd === "Z") continue;
    if (cmd === "M" || cmd === "L") cur = { x: num(), y: num() };
    else if (cmd === "H") cur = { x: num(), y: cur.y };
    else if (cmd === "V") cur = { x: cur.x, y: num() };
    else if (cmd === "Q") {
      i += 2;
      cur = { x: num(), y: num() };
    } else if (cmd === "C") {
      i += 4;
      cur = { x: num(), y: num() };
    } else if (cmd === "A") {
      i += 5;
      cur = { x: num(), y: num() };
    } else break;
    pts.push(cur);
  }
  return pts;
}

function bboxOf(points) {
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}

// ---------- text estimates ----------

// Helvetica/Arial advance widths per 1000 em, regular and bold, for the printable ASCII range
// starting at space (0x20). Labels render in Helvetica or its metric twin Arial/Liberation Sans.
// prettier-ignore
const REGULAR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
// prettier-ignore
const BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

function charWidth(ch, fs, bold) {
  const cp = ch.codePointAt(0);
  let em;
  if (cp >= 0x20 && cp <= 0x7e) em = (bold ? BOLD : REGULAR)[cp - 0x20] / 1000;
  else if ((cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xac00 && cp <= 0xd7af) || (cp >= 0xff00 && cp <= 0xffef)) em = 1.0;
  else em = 0.6;
  return em * fs;
}

export const textWidth = (s, fs, bold = false) => [...s].reduce((sum, ch) => sum + charWidth(ch, fs, bold), 0);

/** Lines of an html (or plain) label with each line's font size and weight. */
function labelLines(cell) {
  const baseFs = Number(cell.style.fontSize ?? (cell.edge ? 11 : 12));
  const baseBold = (Number(cell.style.fontStyle ?? 0) & 1) === 1;
  const html = cell.style.html === "1";
  const raw = String(cell.value);
  const parts = html ? raw.split(/<br\s*\/?>|<\/div>\s*<div[^>]*>|<\/p>\s*<p[^>]*>|\n/i) : raw.split("\n");
  return parts
    .map((part) => {
      const m = part.match(/font-size:\s*(\d+(?:\.\d+)?)px/i);
      const text = html
        ? part
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
        : part;
      return { text: text.trim(), fs: m ? Number(m[1]) : baseFs, bold: baseBold || /<b>|<strong>|font-weight:\s*(bold|[6-9]00)/i.test(part) };
    })
    .filter((l) => l.text);
}

// ---------- SVG cell geometry ----------

const SHAPE_TAGS = new Set(["rect", "ellipse", "circle", "path", "polygon", "polyline", "line", "image"]);
const TEXT_TAGS = new Set(["switch", "foreignObject", "text"]);

function inherited(el, name) {
  for (let e = el; e && e.attrs; e = e.parent) if (e.attrs[name] !== undefined) return e.attrs[name];
  return undefined;
}

function shapePoints(el) {
  const a = el.attrs;
  const n = (k) => Number(a[k] ?? 0);
  switch (el.name) {
    case "rect":
    case "image":
      return [
        { x: n("x"), y: n("y") },
        { x: n("x") + n("width"), y: n("y") + n("height") },
      ];
    case "ellipse":
      return [
        { x: n("cx") - n("rx"), y: n("cy") - n("ry") },
        { x: n("cx") + n("rx"), y: n("cy") + n("ry") },
      ];
    case "circle":
      return [
        { x: n("cx") - n("r"), y: n("cy") - n("r") },
        { x: n("cx") + n("r"), y: n("cy") + n("r") },
      ];
    case "line":
      return [
        { x: n("x1"), y: n("y1") },
        { x: n("x2"), y: n("y2") },
      ];
    case "polygon":
    case "polyline": {
      const v = (a.points ?? "").trim().split(/[\s,]+/).map(Number);
      const pts = [];
      for (let i = 0; i + 1 < v.length; i += 2) pts.push({ x: v[i], y: v[i + 1] });
      return pts;
    }
    case "path":
      return pathPoints(a.d ?? "");
    default:
      return [];
  }
}

function collectCell(g) {
  const shapes = [];
  const texts = [];
  (function visit(el, inText) {
    for (const c of elements(el)) {
      if (c.attrs["data-cell-id"] !== undefined) continue; // a nested child cell
      if (c.name === "text") texts.push(c);
      else if (SHAPE_TAGS.has(c.name) && !inText) shapes.push(c);
      visit(c, inText || TEXT_TAGS.has(c.name));
    }
  })(g, false);
  return { shapes, texts };
}

function textBox(t) {
  const fs = parseFloat(inherited(t, "font-size") ?? "11");
  const anchor = inherited(t, "text-anchor") ?? "start";
  const spans = elements(t).filter((e) => e.name === "tspan");
  const lines = spans.length
    ? spans.map((s) => ({ x: Number(s.attrs.x ?? t.attrs.x), y: Number(s.attrs.y ?? t.attrs.y), text: textOf(s) }))
    : [{ x: Number(t.attrs.x), y: Number(t.attrs.y), text: textOf(t) }];
  let box = null;
  for (const l of lines) {
    if (!Number.isFinite(l.x) || !Number.isFinite(l.y) || !l.text.trim()) continue;
    const w = textWidth(l.text, fs) + 4;
    const x1 = anchor === "middle" ? l.x - w / 2 : anchor === "end" ? l.x - w : l.x;
    const r = { x1, y1: l.y - fs * 0.85, x2: x1 + w, y2: l.y + fs * 0.25 };
    box = box ? { x1: Math.min(box.x1, r.x1), y1: Math.min(box.y1, r.y1), x2: Math.max(box.x2, r.x2), y2: Math.max(box.y2, r.y2) } : r;
  }
  return box;
}

// ---------- lint ----------

export function lint(svgText, cells) {
  const out = [];
  const add = (level, code, msg) => out.push({ level, code, msg });
  const name = (id) => describe(cells, id);

  const doc = parseXml(svgText);
  const svg = elements(doc).find((e) => e.name === "svg");
  const groups = [];
  (function find(el) {
    for (const c of elements(el)) {
      if (c.name === "g" && c.attrs["data-cell-id"] !== undefined) groups.push(c);
      find(c);
    }
  })(svg);

  const nodes = []; // { id, rect, container }
  const edges = []; // { id, pts, label }
  for (const g of groups) {
    const id = g.attrs["data-cell-id"];
    const cell = cells.get(id);
    if (!cell || (!cell.vertex && !cell.edge)) continue;
    const { shapes, texts } = collectCell(g);
    if (cell.vertex) {
      const rect = bboxOf(shapes.flatMap(shapePoints));
      if (rect) nodes.push({ id, rect, container: cell.container, text: cell.style.text === true || cell.style.shape === "text" });
    } else {
      const line = shapes.find((s) => s.name === "path" && s.attrs.fill === "none") ?? shapes.find((s) => s.name === "path");
      const pts = line ? pathPoints(line.attrs.d ?? "") : [];
      const label = texts.map(textBox).find(Boolean) ?? null;
      if (pts.length >= 2) edges.push({ id, pts, label, source: cell.source, target: cell.target });
    }
  }
  const boxes = nodes.filter((n) => !n.container && !n.text);
  const containers = nodes.filter((n) => n.container);
  const rectOf = new Map(nodes.map((n) => [n.id, n.rect]));

  const ancestors = (id) => {
    const list = [];
    for (let p = cells.get(id)?.parent; p && cells.get(p)?.vertex; p = cells.get(p).parent) list.push(p);
    return list;
  };

  // Nodes on top of each other.
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (intersects(inflate(boxes[i].rect, -1), inflate(boxes[j].rect, -1))) {
        add("error", "node-overlap", `${name(boxes[i].id)} overlaps ${name(boxes[j].id)}`);
      }
    }
  }

  // Group membership must match what the reader sees.
  for (const n of nodes) {
    const anc = new Set(ancestors(n.id));
    for (const c of containers) {
      if (c.id === n.id) continue;
      if (anc.has(c.id)) {
        if (!contains(c.rect, n.rect)) add("error", "outside-group", `${name(n.id)} sticks out of its group ${name(c.id)}`);
      } else if (!ancestors(c.id).includes(n.id) && intersects(inflate(c.rect, -1), inflate(n.rect, -1))) {
        add(
          "error",
          "foreign-group",
          `${name(n.id)} overlaps group ${name(c.id)} but is not its child (set parent="${c.id}" with relative x/y, or move it out)`,
        );
      }
    }
  }

  // A line through a group's title band reads as crossing out the title.
  for (const e of edges) {
    for (const c of containers) {
      const band = { x1: c.rect.x1 + 4, y1: c.rect.y1 + 2, x2: c.rect.x2 - 4, y2: c.rect.y1 + 26 };
      for (let k = 0; k + 1 < e.pts.length; k++) {
        if (segHitsRect(e.pts[k], e.pts[k + 1], band)) {
          add("warn", "edge-through-title", `${name(e.id)} crosses the title band of group ${name(c.id)}; let it enter the group through a side`);
          break;
        }
      }
    }
  }

  // Edges through boxes.
  for (const e of edges) {
    for (const b of boxes) {
      if (b.id === e.source || b.id === e.target) continue;
      const r = inflate(b.rect, -2);
      for (let k = 0; k + 1 < e.pts.length; k++) {
        if (segHitsRect(e.pts[k], e.pts[k + 1], r)) {
          add("error", "edge-through-node", `${name(e.id)} passes through ${name(b.id)}`);
          break;
        }
      }
    }
  }

  // Edge labels.
  const labelled = edges.filter((e) => e.label);
  for (const e of labelled) {
    for (const b of boxes) {
      if (intersects(e.label, inflate(b.rect, -1))) add("error", "label-on-node", `label of ${name(e.id)} overlaps ${name(b.id)}`);
    }
    for (const c of containers) {
      // The container's own title sits in its top 28px.
      const title = { x1: c.rect.x1, y1: c.rect.y1, x2: c.rect.x2, y2: c.rect.y1 + 28 };
      if (intersects(e.label, title) && !(e.label.y1 >= title.y2)) {
        add("warn", "label-on-group-title", `label of ${name(e.id)} sits in the title band of group ${name(c.id)}`);
      }
    }
    for (const f of edges) {
      if (f.id === e.id) continue;
      for (let k = 0; k + 1 < f.pts.length; k++) {
        if (segHitsRect(f.pts[k], f.pts[k + 1], inflate(e.label, -1))) {
          add("warn", "label-on-edge", `label of ${name(e.id)} covers part of ${name(f.id)}`);
          break;
        }
      }
    }
  }
  for (let i = 0; i < labelled.length; i++) {
    for (let j = i + 1; j < labelled.length; j++) {
      if (intersects(labelled[i].label, labelled[j].label)) {
        add("error", "label-on-label", `labels of ${name(labelled[i].id)} and ${name(labelled[j].id)} overlap`);
      }
    }
  }

  // Crossings and shared runs between edges.
  let crossings = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i];
      const b = edges[j];
      const sharesEnd = a.source === b.source || a.target === b.target || a.source === b.target || a.target === b.source;
      let crossAt = null;
      let shared = 0;
      for (let k = 0; k + 1 < a.pts.length; k++) {
        for (let l = 0; l + 1 < b.pts.length; l++) {
          crossAt ??= crossing(a.pts[k], a.pts[k + 1], b.pts[l], b.pts[l + 1]);
          shared = Math.max(shared, collinearOverlap(a.pts[k], a.pts[k + 1], b.pts[l], b.pts[l + 1]));
        }
      }
      if (crossAt) {
        crossings++;
        add("warn", "crossing", `${name(a.id)} crosses ${name(b.id)} near (${Math.round(crossAt.x)}, ${Math.round(crossAt.y)})`);
      }
      if (shared > 12) {
        if (sharesEnd) add("info", "shared-trunk", `${name(a.id)} and ${name(b.id)} share a ${Math.round(shared)}px trunk`);
        else add("warn", "shared-run", `${name(a.id)} and ${name(b.id)} run on top of each other for ${Math.round(shared)}px`);
      }
    }
  }

  // Near-miss alignment: two waypoints a few px apart make a visible jog.
  for (const c of cells.values()) {
    if (!c.edge || !c.geo) continue;
    const p = c.geo.points;
    for (let k = 0; k + 1 < p.length; k++) {
      const d = Math.abs(p[k + 1].x - p[k].x) + Math.abs(p[k + 1].y - p[k].y);
      if (d > 0.5 && d < 16) {
        add("warn", "jog", `${name(c.id)} has a ${Math.round(d)}px jog; align its two ends (same centre line or port) so it runs straight`);
        break;
      }
    }
  }

  // Text that does not fit its box (estimated from the model's label).
  for (const c of cells.values()) {
    if (!c.vertex || !c.geo || !c.value) continue;
    const lines = labelLines(c);
    if (!lines.length) continue;
    if (c.container) {
      const w = textWidth(lines[0].text, lines[0].fs, true);
      if (w > c.geo.w - 24) add("warn", "group-title", `title of group ${name(c.id)} (~${Math.round(w)}px) is wider than the group`);
      continue;
    }
    if (c.style.text === true || c.style.shape === "text") continue;
    // draw.io wraps at the full box width (about 1px inside each side). What looks cramped depends
    // on the outline: a pill loses its round ends, a rhombus narrows away from its middle.
    const rhombus = c.style.rhombus || c.style.shape === "rhombus";
    const pill = Number(c.style.arcSize ?? 0) >= 40 && c.style.rounded === "1";
    const wrapAt = c.geo.w - 2;
    const wrap = c.style.whiteSpace === "wrap";
    const measured = lines.map((l) => ({ ...l, w: textWidth(l.text, l.fs, l.bold) }));
    const height = measured.reduce((h, l) => h + Math.max(1, wrap ? Math.ceil(l.w / wrapAt) : 1) * l.fs * 1.2, 0);
    const visualW = rhombus
      ? c.geo.w * Math.max(0, 1 - height / c.geo.h) - 4
      : c.geo.w - (pill ? c.geo.h * 0.35 : 0);
    for (const l of measured) {
      if (l.w > wrapAt && !wrap) {
        add("error", "text-overflow", `${name(c.id)}: "${l.text}" is ~${Math.round(l.w)}px, box allows ~${Math.round(wrapAt)}px`);
      } else if (l.w > wrapAt && (pill || rhombus)) {
        add("warn", "cramped-text", `${name(c.id)}: "${l.text}" wraps inside a ${pill ? "pill" : "rhombus"}; shorten it or widen the box`);
      } else if (l.w <= wrapAt && visualW - l.w < 12) {
        // Fits on one line, but runs into the outline.
        add("warn", "cramped-text", `${name(c.id)}: "${l.text}" nearly touches the outline; widen the box by ~${Math.ceil(l.w + 16 - visualW)}px`);
      }
    }
    const availH = c.geo.h * (rhombus ? 0.6 : 1) - 8;
    if (height > availH) {
      add(
        "error",
        "text-overflow",
        `${name(c.id)}: text needs ~${Math.round(height + 6)}px of height at width ${c.geo.w}, box is ${c.geo.h}px (widen or heighten the box, or shorten the text)`,
      );
    }
  }

  // One size per shape class: uneven boxes read as emphasis nobody meant.
  const classOf = (c) => {
    if (c.style.text === true || c.style.shape === "text") return null;
    if (c.style.rhombus || c.style.shape === "rhombus") return "rhombus";
    if (c.style.shape === "cylinder3" || c.style.shape === "cylinder") return "cylinder";
    if (c.style.rounded === "1" && Number(c.style.arcSize ?? 0) >= 40) return "pill";
    return "box";
  };
  const sizes = {};
  for (const c of cells.values()) {
    if (!c.vertex || c.container || !c.geo) continue;
    const cls = classOf(c);
    if (!cls) continue;
    const key = `${Math.round(c.geo.w)}×${Math.round(c.geo.h)}`;
    (sizes[cls] ??= {})[key] = [...((sizes[cls] ?? {})[key] ?? []), c.id];
  }
  for (const [cls, bySize] of Object.entries(sizes)) {
    const keys = Object.keys(bySize);
    if (keys.length < 2) continue;
    const dims = (k) => k.split("×").map(Number);
    const widths = keys.flatMap((k) => bySize[k].map(() => dims(k)[0])).sort((a, b) => a - b);
    const median = widths[Math.floor(widths.length / 2)];
    const wide = keys.filter((k) => dims(k)[0] > 2 * median);
    const normal = keys.filter((k) => !wide.includes(k));
    const w = Math.max(...normal.map((k) => dims(k)[0]));
    const h = Math.max(...normal.map((k) => dims(k)[1]));
    const list = keys.map((k) => `${k} (${bySize[k].length})`).join(", ");
    const bars = wide.flatMap((k) => bySize[k]).map(name).join(", ");
    add(
      "warn",
      "size-mismatch",
      `${cls} shapes come in ${keys.length} sizes: ${list}; make them all ${w}×${h}` +
        (bars ? `. ${bars} spans several columns; draw it as a normal box and fan its edges out` : ""),
    );
  }

  // Readability once GitHub fits the image to its column.
  const width = parseFloat(svg.attrs.width ?? "0");
  const height = parseFloat(svg.attrs.height ?? "0");
  let minFs = Infinity;
  for (const c of cells.values()) {
    if ((c.vertex || c.edge) && c.value) for (const l of labelLines(c)) minFs = Math.min(minFs, l.fs);
  }
  if (width > COLUMN_PX && Number.isFinite(minFs)) {
    const shown = (minFs * COLUMN_PX) / width;
    if (shown < MIN_READABLE_PX) {
      add(
        "warn",
        "small-text",
        `${Math.round(width)}px wide: GitHub shrinks it to ${COLUMN_PX}px, so ${minFs}px text shows at ~${shown.toFixed(1)}px. Tighten columns, stack rows, or split the diagram`,
      );
    }
  }

  // Colours without an explicit dark value are auto-darkened by draw.io; the kit gives exact pairs.
  const raw = new Set();
  for (const c of cells.values()) {
    for (const k of ["fillColor", "strokeColor", "fontColor"]) {
      const v = c.style[k];
      if (v && /^#|^rgb/i.test(v)) raw.add(c.id);
    }
  }
  if (raw.size) add("info", "raw-colour", `${raw.size} cell(s) use a colour without light-dark(); draw.io will pick their dark variant`);

  const counts = {
    nodes: [...cells.values()].filter((c) => c.vertex && !c.container).length,
    groups: [...cells.values()].filter((c) => c.vertex && c.container).length,
    edges: [...cells.values()].filter((c) => c.edge).length,
    crossings,
    width: Math.round(width),
    height: Math.round(height),
  };
  return { findings: out, counts };
}
