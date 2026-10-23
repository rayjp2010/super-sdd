// Minimal XML reader for draw.io models and draw.io SVG exports. Both are machine-generated or
// agent-written XML; this parser exists to give precise errors on the latter, not to be general.

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(n);
    }
    return NAMED[e] ?? m;
  });
}

function lineOf(src, offset) {
  return src.slice(0, offset).split("\n").length;
}

function parseAttrs(src, raw, offset) {
  const attrs = {};
  const re = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(raw))) {
    const value = m[3] ?? m[4];
    if (value.includes("<")) {
      throw new Error(
        `line ${lineOf(src, offset)}: attribute ${m[1]} contains a raw "<"; escape label markup as &lt; &gt; &quot;`,
      );
    }
    attrs[m[1]] = decodeEntities(value);
  }
  return attrs;
}

export function parseXml(src) {
  const root = { name: "#document", attrs: {}, children: [] };
  const stack = [root];
  const re =
    /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let expected = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index !== expected) {
      throw new Error(`line ${lineOf(src, expected)}: malformed markup near ${JSON.stringify(src.slice(expected, expected + 40))}`);
    }
    expected = re.lastIndex;
    const top = stack[stack.length - 1];
    if (m[2]) {
      if (top.name !== m[2]) {
        throw new Error(`line ${lineOf(src, m.index)}: </${m[2]}> closes <${top.name}>`);
      }
      stack.pop();
    } else if (m[3]) {
      const el = { name: m[3], attrs: parseAttrs(src, m[4], m.index), children: [], parent: top };
      top.children.push(el);
      if (!m[5]) stack.push(el);
    } else if (m[6] !== undefined) {
      if (m[6].trim()) top.children.push({ text: decodeEntities(m[6]) });
    } else if (m[1] !== undefined) {
      top.children.push({ text: m[1] });
    }
  }
  if (expected !== src.length) {
    throw new Error(`line ${lineOf(src, expected)}: malformed markup near ${JSON.stringify(src.slice(expected, expected + 40))}`);
  }
  if (stack.length !== 1) throw new Error(`unclosed <${stack[stack.length - 1].name}>`);
  return root;
}

export function elements(el) {
  return (el.children ?? []).filter((c) => c.name);
}

export function textOf(el) {
  if (el.text !== undefined) return el.text;
  return (el.children ?? []).map(textOf).join("");
}
