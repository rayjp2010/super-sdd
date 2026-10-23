// Builds a draw.io model from a small JSON spec: semantic roles instead of style strings, centre
// coordinates instead of corners, page coordinates everywhere (group children are converted), and
// one size per shape class (the size the longest label in that class needs).
import { textWidth } from "./lint.mjs";

const TEXT = "whiteSpace=wrap;html=1;fontFamily=Helvetica;fontSize=12;fontColor=light-dark(#0F172A,#E2E8F0);";
const pair = (fill, stroke) => `fillColor=light-dark(${fill});strokeColor=light-dark(${stroke});`;

export const ROLES = {
  actor: { cls: "pill", style: "rounded=1;arcSize=50;fontStyle=1;" + pair("#F8FAFC,#1E293B", "#475569,#94A3B8") },
  entry: { cls: "box", style: "rounded=1;arcSize=12;" + pair("#FFFBEB,#3A2A06", "#D97706,#FBBF24") },
  service: { cls: "box", style: "rounded=1;arcSize=12;" + pair("#F0F9FF,#082F49", "#0284C7,#38BDF8") },
  store: { cls: "cylinder", style: "shape=cylinder3;boundedLbl=1;size=8;" + pair("#F5F3FF,#2E1065", "#7C3AED,#A78BFA") },
  queue: { cls: "box", style: "rounded=1;arcSize=12;" + pair("#FFF7ED,#431407", "#EA580C,#FB923C") },
  managed: { cls: "box", style: "rounded=1;arcSize=12;" + pair("#F0FDFA,#042F2E", "#0D9488,#2DD4BF") },
  external: { cls: "box", style: "rounded=1;arcSize=12;dashed=1;dashPattern=4 3;" + pair("#FFFFFF,#0F172A", "#64748B,#94A3B8") },
  security: { cls: "box", style: "rounded=1;arcSize=12;" + pair("#FFF1F2,#4C0519", "#E11D48,#FB7185") },
  terminal: { cls: "pill", style: "rounded=1;arcSize=50;fontStyle=1;" + pair("#F1F5F9,#1E293B", "#475569,#94A3B8") },
  step: { cls: "box", style: "rounded=1;arcSize=12;" + pair("#F0F9FF,#082F49", "#0284C7,#38BDF8") },
  decision: { cls: "rhombus", style: "rhombus;" + pair("#FFFBEB,#3A2A06", "#D97706,#FBBF24") },
  failure: { cls: "box", style: "rounded=1;arcSize=12;" + pair("#FFF1F2,#4C0519", "#E11D48,#FB7185") },
  note: {
    cls: "note",
    style: "text;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;fontFamily=Helvetica;fontSize=10;fontColor=light-dark(#475569,#94A3B8);",
  },
};

// Minimum size per shape class; the builder grows a whole class to fit its longest label.
const MIN = { box: [140, 48], pill: [120, 40], cylinder: [140, 60], rhombus: [120, 80], note: [120, 30] };
const MAX_W = { box: 240, pill: 260, cylinder: 220, rhombus: 220, note: 400 };

const GROUP = {
  boundary:
    "rounded=1;arcSize=3;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;verticalAlign=top;align=left;spacingLeft=12;spacingTop=4;fontFamily=Helvetica;fontSize=11;fontStyle=1;dashed=1;dashPattern=6 4;fillColor=light-dark(#F8FAFC,#0B1220);strokeColor=light-dark(#94A3B8,#475569);fontColor=light-dark(#475569,#94A3B8);",
  trust:
    "rounded=1;arcSize=3;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;verticalAlign=top;align=left;spacingLeft=12;spacingTop=4;fontFamily=Helvetica;fontSize=11;fontStyle=1;dashed=1;dashPattern=6 4;fillColor=light-dark(#F8FAFC,#0B1220);strokeColor=light-dark(#E11D48,#FB7185);fontColor=light-dark(#BE123C,#FDA4AF);",
};

const EDGE =
  "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;endSize=6;strokeWidth=1.25;fontFamily=Helvetica;fontSize=10;labelBackgroundColor=default;strokeColor=light-dark(#64748B,#94A3B8);fontColor=light-dark(#334155,#CBD5E1);";
const EDGE_KIND = {
  sync: "",
  async: "dashed=1;dashPattern=5 4;endArrow=open;endSize=7;",
  weak: "dashed=1;dashPattern=2 3;endArrow=open;endSize=7;",
  both: "startArrow=block;startFill=1;startSize=6;",
  main: "strokeWidth=2;strokeColor=light-dark(#334155,#CBD5E1);",
};

const PAD = { side: 20, top: 36, bottom: 20 };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const up10 = (n) => Math.ceil(n / 10) * 10;

function lines(node) {
  const title = String(node.label ?? node.id).split("\n");
  const sub = node.sub ? String(node.sub).split("\n") : [];
  const bold = Boolean(node.sub) || ROLES[node.role].style.includes("fontStyle=1");
  return [...title.map((t) => ({ t, fs: 12, bold })), ...sub.map((t) => ({ t, fs: 10, bold: false }))];
}

function htmlValue(node) {
  const title = String(node.label ?? node.id).split("\n").map(esc).join("<br>");
  if (!node.sub) return title;
  const sub = String(node.sub).split("\n").map(esc).join("<br>");
  return `<b>${title}</b><br><font style="font-size:10px">${sub}</font>`;
}

/** The size one node's label needs in its class. */
function needed(node, cls) {
  const ls = lines(node);
  const textW = Math.max(...ls.map((l) => textWidth(l.t, l.fs, l.bold)));
  const textH = ls.reduce((h, l) => h + l.fs * 1.2, 0);
  const [minW, minH] = MIN[cls];
  let w;
  let h = Math.max(minH, up10(textH + 20));
  if (cls === "rhombus") {
    h = Math.max(minH, up10(textH * 2.4));
    w = (textW + 20) / Math.max(0.3, 1 - textH / h);
  } else if (cls === "pill") w = textW + h * 0.35 + 28;
  else w = textW + 32;
  w = Math.min(MAX_W[cls], Math.max(minW, up10(w)));
  if (cls !== "rhombus" && textW + 16 > w) {
    // Too long even at the class maximum: it wraps, so it needs more height.
    const rows = ls.reduce((n, l) => n + Math.ceil(textWidth(l.t, l.fs, l.bold) / (w - 16)), 0);
    h = Math.max(h, up10(rows * 13.5 + 20));
  }
  return [w, h];
}

function portStyle(prefix, spec) {
  if (!spec) return "";
  const [side, at] = String(spec).split(":");
  const f = at === undefined ? 0.5 : Number(at);
  const xy = { left: [0, f], right: [1, f], top: [f, 0], bottom: [f, 1] }[side];
  if (!xy) throw new Error(`port "${spec}": use left|right|top|bottom, optionally :0..1`);
  return `${prefix}X=${xy[0]};${prefix}Y=${xy[1]};${prefix}Dx=0;${prefix}Dy=0;`;
}

export function buildModel(spec) {
  const problems = [];
  const nodes = spec.nodes ?? [];
  const groups = spec.groups ?? [];
  const edges = spec.edges ?? [];
  const ids = new Set();
  for (const item of [...groups, ...nodes]) {
    if (!item.id) throw new Error(`an item has no id: ${JSON.stringify(item)}`);
    if (ids.has(item.id)) throw new Error(`id "${item.id}" is used twice`);
    ids.add(item.id);
  }
  const groupById = new Map(groups.map((g) => [g.id, g]));
  for (const n of nodes) {
    if (!ROLES[n.role]) throw new Error(`node "${n.id}": role "${n.role}" is not one of ${Object.keys(ROLES).join(", ")}`);
    if (n.group && !groupById.has(n.group)) throw new Error(`node "${n.id}": group "${n.group}" does not exist`);
  }

  // One size per class: the largest any of its labels needs, unless the spec fixes it.
  const classSize = {};
  for (const n of nodes) {
    const cls = ROLES[n.role].cls;
    const [w, h] = needed(n, cls);
    const cur = classSize[cls] ?? [0, 0];
    classSize[cls] = [Math.max(cur[0], w), Math.max(cur[1], h)];
  }
  for (const [cls, size] of Object.entries(spec.sizes ?? {})) {
    if (!MIN[cls]) throw new Error(`sizes.${cls}: use one of ${Object.keys(MIN).join(", ")}`);
    const need = classSize[cls] ?? [0, 0];
    if (size[0] < need[0] || size[1] < need[1]) {
      problems.push(`sizes.${cls} ${size.join("×")} is smaller than its longest label needs (${need.join("×")}); using the larger`);
    }
    classSize[cls] = [Math.max(size[0], need[0]), Math.max(size[1], need[1])];
  }

  // Page-coordinate rectangles for nodes.
  const rect = new Map();
  for (const n of nodes) {
    const cls = ROLES[n.role].cls;
    const [w, h] = [n.w ?? classSize[cls][0], n.h ?? classSize[cls][1]];
    let x;
    let y;
    if (n.cx !== undefined && n.cy !== undefined) [x, y] = [n.cx - w / 2, n.cy - h / 2];
    else if (n.x !== undefined && n.y !== undefined) [x, y] = [n.x, n.y];
    else throw new Error(`node "${n.id}": give cx/cy (centre) or x/y (top-left)`);
    rect.set(n.id, { x, y, w, h });
  }

  // Groups: explicit rectangle, or fit around their members (nested groups first).
  const parentOf = new Map([...nodes.map((n) => [n.id, n.group]), ...groups.map((g) => [g.id, g.parent])]);
  const depth = (id) => (groupById.get(id)?.parent ? 1 + depth(groupById.get(id).parent) : 0);
  for (const g of [...groups].sort((a, b) => depth(b.id) - depth(a.id))) {
    if (g.x !== undefined) {
      rect.set(g.id, { x: g.x, y: g.y, w: g.w, h: g.h });
      continue;
    }
    const members = [...parentOf.entries()].filter(([, p]) => p === g.id).map(([id]) => rect.get(id)).filter(Boolean);
    if (!members.length) throw new Error(`group "${g.id}" has no members and no x/y/w/h`);
    const x1 = Math.min(...members.map((r) => r.x)) - PAD.side;
    const y1 = Math.min(...members.map((r) => r.y)) - PAD.top;
    const x2 = Math.max(...members.map((r) => r.x + r.w)) + PAD.side;
    const y2 = Math.max(...members.map((r) => r.y + r.h)) + PAD.bottom;
    const titleW = textWidth(String(g.label ?? ""), 11, true) + 28;
    rect.set(g.id, { x: x1, y: y1, w: Math.max(x2 - x1, titleW), h: y2 - y1 });
  }

  const rel = (id) => {
    const r = rect.get(id);
    const p = parentOf.get(id);
    if (!p) return r;
    const pr = rect.get(p);
    return { ...r, x: r.x - pr.x, y: r.y - pr.y };
  };
  const num = (v) => Math.round(v * 10) / 10;
  const geo = (id) => {
    const r = rel(id);
    return `<mxGeometry x="${num(r.x)}" y="${num(r.y)}" width="${num(r.w)}" height="${num(r.h)}" as="geometry"/>`;
  };

  const out = [];
  out.push("<mxfile>");
  out.push(`  <diagram id="${esc(spec.name ?? "diagram")}" name="${esc(spec.name ?? "diagram")}">`);
  out.push('    <mxGraphModel grid="1" gridSize="10" page="0">');
  out.push("      <root>");
  out.push('        <mxCell id="0"/>');
  out.push('        <mxCell id="1" parent="0"/>');
  for (const g of [...groups].sort((a, b) => depth(a.id) - depth(b.id))) {
    const style = GROUP[g.kind ?? "boundary"];
    if (!style) throw new Error(`group "${g.id}": kind must be boundary or trust`);
    out.push(`        <mxCell id="${esc(g.id)}" value="${esc(esc(g.label ?? ""))}" style="${style}" vertex="1" parent="${esc(g.parent ?? "1")}">`);
    out.push(`          ${geo(g.id)}`);
    out.push("        </mxCell>");
  }
  for (const n of nodes) {
    const style = ROLES[n.role].style + (n.role === "note" ? "" : TEXT);
    out.push(`        <mxCell id="${esc(n.id)}" value="${esc(htmlValue(n))}" style="${style}" vertex="1" parent="${esc(n.group ?? "1")}">`);
    out.push(`          ${geo(n.id)}`);
    out.push("        </mxCell>");
  }
  edges.forEach((e, i) => {
    for (const end of ["from", "to"]) {
      if (!rect.has(e[end]) || groupById.has(e[end])) throw new Error(`edge ${e.from} → ${e.to}: "${e[end]}" is not a node`);
    }
    const kind = EDGE_KIND[e.kind ?? "sync"];
    if (kind === undefined) throw new Error(`edge ${e.from} → ${e.to}: kind must be one of ${Object.keys(EDGE_KIND).join(", ")}`);
    const id = e.id ?? `e-${e.from}-${e.to}${edges.slice(0, i).some((o) => o.from === e.from && o.to === e.to) ? `-${i}` : ""}`;
    // `via` pins the path: manualRoute=1 tells render.mjs to keep these waypoints instead of rerouting.
    const via = e.via ?? [];
    if (!Array.isArray(via) || via.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) {
      throw new Error(`edge ${e.from} → ${e.to}: via must be a list of [x, y] page points`);
    }
    const style = EDGE + kind + portStyle("exit", e.exit) + portStyle("entry", e.entry) + (via.length ? "manualRoute=1;" : "");
    out.push(`        <mxCell id="${esc(id)}" value="${esc(esc(e.label ?? ""))}" style="${style}" edge="1" parent="1" source="${esc(e.from)}" target="${esc(e.to)}">`);
    if (via.length) {
      out.push('          <mxGeometry relative="1" as="geometry">');
      out.push('            <Array as="points">');
      for (const [x, y] of via) out.push(`              <mxPoint x="${x}" y="${y}"/>`);
      out.push("            </Array>");
      out.push("          </mxGeometry>");
    } else {
      out.push('          <mxGeometry relative="1" as="geometry"/>');
    }
    out.push("        </mxCell>");
  });
  out.push("      </root>", "    </mxGraphModel>", "  </diagram>", "</mxfile>", "");
  return { xml: out.join("\n"), problems, classSize };
}
