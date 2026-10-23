// Reads a draw.io model (.drawio file or the `content` of a .drawio.svg) into plain cells.
import zlib from "node:zlib";
import { elements, parseXml, textOf } from "./xml.mjs";

export function parseStyle(style = "") {
  const map = {};
  for (const part of style.split(";")) {
    if (!part) continue;
    const i = part.indexOf("=");
    if (i === -1) map[part] = true;
    else map[part.slice(0, i)] = part.slice(i + 1);
  }
  return map;
}

function inflateDiagram(text) {
  const raw = zlib.inflateRawSync(Buffer.from(text.trim(), "base64")).toString("utf8");
  return decodeURIComponent(raw);
}

/** The embedded model of a .drawio.svg, as .drawio file text. */
export function extractFromSvg(svgText) {
  const doc = parseXml(svgText);
  const svg = elements(doc).find((e) => e.name === "svg");
  const content = svg?.attrs.content;
  if (!content) throw new Error("this SVG has no embedded draw.io diagram (it was exported without -e)");
  return content;
}

function graphModel(xml, problems) {
  const doc = parseXml(xml);
  const top = elements(doc)[0];
  if (top?.name === "mxGraphModel") return top;
  if (top?.name !== "mxfile") throw new Error(`expected <mxfile> or <mxGraphModel>, found <${top?.name}>`);
  const pages = elements(top).filter((e) => e.name === "diagram");
  if (!pages.length) throw new Error("<mxfile> has no <diagram>");
  if (pages.length > 1) {
    problems.push({ level: "warn", code: "pages", msg: `${pages.length} pages; only the first is exported` });
  }
  const inline = elements(pages[0]).find((e) => e.name === "mxGraphModel");
  if (inline) return inline;
  const packed = textOf(pages[0]).trim();
  if (!packed) throw new Error("the first <diagram> is empty");
  return elements(parseXml(inflateDiagram(packed))).find((e) => e.name === "mxGraphModel");
}

/**
 * @returns {{ cells: Map<string, object>, problems: {level, code, msg}[] }}
 * Each cell: { id, value, style, styleText, vertex, edge, parent, source, target, geo, container }.
 */
export function readModel(xml) {
  const problems = [];
  const gm = graphModel(xml, problems);
  const root = elements(gm).find((e) => e.name === "root");
  if (!root) throw new Error("<mxGraphModel> has no <root>");

  const cells = new Map();
  for (const el of elements(root)) {
    let attrs;
    let cellEl;
    if (el.name === "mxCell") {
      attrs = { ...el.attrs };
      cellEl = el;
    } else if (el.name === "object" || el.name === "UserObject") {
      cellEl = elements(el).find((e) => e.name === "mxCell");
      if (!cellEl) throw new Error(`<${el.name} id="${el.attrs.id}"> has no inner <mxCell>`);
      attrs = { ...cellEl.attrs, id: el.attrs.id, value: el.attrs.label ?? "" };
    } else {
      throw new Error(`unexpected <${el.name}> inside <root>`);
    }
    const id = attrs.id;
    if (id === undefined) throw new Error("a cell has no id");
    if (cells.has(id)) problems.push({ level: "error", code: "duplicate-id", msg: `id "${id}" is used twice` });

    const g = elements(cellEl).find((e) => e.name === "mxGeometry");
    let geo = null;
    if (g) {
      const num = (k) => (g.attrs[k] === undefined ? 0 : Number(g.attrs[k]));
      const arr = elements(g).find((e) => e.name === "Array" && e.attrs.as === "points");
      geo = {
        x: num("x"),
        y: num("y"),
        w: num("width"),
        h: num("height"),
        relative: g.attrs.relative === "1",
        points: arr ? elements(arr).map((p) => ({ x: Number(p.attrs.x ?? 0), y: Number(p.attrs.y ?? 0) })) : [],
      };
    }
    cells.set(id, {
      id,
      value: attrs.value ?? "",
      styleText: attrs.style ?? "",
      style: parseStyle(attrs.style),
      vertex: attrs.vertex === "1",
      edge: attrs.edge === "1",
      parent: attrs.parent,
      source: attrs.source,
      target: attrs.target,
      geo,
      container: false,
    });
  }

  for (const c of cells.values()) {
    if (c.parent !== undefined && !cells.has(c.parent)) {
      problems.push({ level: "error", code: "bad-parent", msg: `${c.id}: parent "${c.parent}" does not exist` });
    }
    if (c.vertex) {
      if (!c.geo || !(c.geo.w > 0) || !(c.geo.h > 0)) {
        problems.push({ level: "error", code: "no-geometry", msg: `${c.id}: vertex needs <mxGeometry> with width and height` });
      }
      const p = cells.get(c.parent);
      if (p?.vertex) p.container = true;
      if (c.style.container === "1" || c.style.swimlane || c.style.group) c.container = true;
    }
    if (c.edge) {
      for (const end of ["source", "target"]) {
        if (c[end] === undefined) {
          problems.push({ level: "warn", code: "dangling-edge", msg: `${c.id}: edge has no ${end}` });
        } else if (!cells.get(c[end])?.vertex) {
          problems.push({ level: "error", code: "bad-terminal", msg: `${c.id}: ${end} "${c[end]}" is not a vertex` });
        }
      }
      if (!c.geo) problems.push({ level: "error", code: "no-geometry", msg: `${c.id}: edge needs <mxGeometry relative="1" as="geometry"/>` });
    }
  }
  return { cells, problems };
}

/** First line of a label as plain text, for messages. */
export function plainLabel(cell) {
  if (!cell) return "?";
  const first = String(cell.value)
    .split(/<br\s*\/?>|<\/div>|<\/p>|\n/i)
    .map((s) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim())
    .find(Boolean);
  return first ? (first.length > 28 ? first.slice(0, 27) + "…" : first) : cell.id;
}

export function describe(cells, id) {
  const c = cells.get(id);
  if (!c) return id;
  if (c.edge) return `${id} (${plainLabel(cells.get(c.source))} → ${plainLabel(cells.get(c.target))})`;
  return `"${plainLabel(c)}"`;
}
