#!/usr/bin/env node
// Render a diagram spec or draw.io model to an editable, light/dark-adaptive .drawio.svg, write PNG
// previews, and lint the result.
//
//   render.mjs <in.json|in.drawio|in.drawio.svg> <out.drawio.svg> [--no-route] [--previews <dir>] [--scale <n>]
//   render.mjs build <in.json> <out.drawio>
//   render.mjs extract <in.drawio.svg> <out.drawio>
//   render.mjs lint <in.drawio.svg>
//
// Exit codes: 0 clean or warnings only, 1 lint errors, 2 usage or tool failure.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildModel } from "./lib/build.mjs";
import { exportDiagram } from "./lib/export.mjs";
import { lint } from "./lib/lint.mjs";
import { extractFromSvg, readModel } from "./lib/model.mjs";
import { loadRouter, ToolError } from "./lib/tools.mjs";

function fail(msg) {
  console.error(`render: ${msg}`);
  process.exit(2);
}

function parseArgs(argv) {
  const pos = [];
  const opts = { route: true, previews: null, scale: 2 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-route") opts.route = false;
    else if (a === "--previews") opts.previews = argv[++i];
    else if (a === "--scale") opts.scale = Number(argv[++i]);
    else if (a.startsWith("--")) fail(`unknown option ${a}`);
    else pos.push(a);
  }
  return { pos, opts };
}

function build(file) {
  let spec;
  try {
    spec = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`${file}: not valid JSON (${e.message})`);
  }
  try {
    const { xml, problems, classSize } = buildModel(spec);
    for (const p of problems) console.log(`build: ${p}`);
    console.log(`build: sizes ${Object.entries(classSize).map(([k, [w, h]]) => `${k} ${w}×${h}`).join(", ")}`);
    return xml;
  } catch (e) {
    fail(`${file}: ${e.message}`);
  }
}

function readSource(file) {
  if (file.endsWith(".json")) {
    const xml = build(file);
    // Keep the generated model beside the spec, for reading or hand edits.
    writeFileSync(file.replace(/\.json$/, ".drawio"), xml);
    return xml;
  }
  const text = readFileSync(file, "utf8");
  return file.endsWith(".svg") ? extractFromSvg(text) : text;
}

/** libavoid rewrites every edge style with rounded=0; keep the author's rounded corners. */
function restoreRounded(original, routed) {
  const wanted = new Map();
  for (const c of original.values()) if (c.edge) wanted.set(c.id, c.style.rounded ?? "0");
  return routed.replace(/<mxCell\b[^>]*>/g, (tag) => {
    const id = tag.match(/\sid="([^"]*)"/)?.[1];
    if (!wanted.has(id) || wanted.get(id) !== "1") return tag;
    return tag.replace(/\sstyle="([^"]*)"/, (_, s) => ` style="${s.split(";").map((p) => (p === "rounded=0" ? "rounded=1" : p)).join(";")}"`);
  });
}

/** Edges marked manualRoute=1 keep their authored waypoints: put the pre-route cell back. */
function restoreManual(original, routed) {
  const cellRe = (id) => new RegExp(`<mxCell\\b(?=[^>]*\\sid="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}")[^>]*>[\\s\\S]*?</mxCell>`);
  let out = routed;
  for (const tag of original.match(/<mxCell\b[^>]*>/g) ?? []) {
    if (!/\sstyle="[^"]*manualRoute=1/.test(tag)) continue;
    const id = tag.match(/\sid="([^"]*)"/)?.[1];
    const before = original.match(cellRe(id))?.[0];
    if (before && cellRe(id).test(out)) out = out.replace(cellRe(id), () => before);
  }
  return out;
}

function report(result, problems) {
  const all = [...problems, ...result.findings];
  const order = { error: 0, warn: 1, info: 2 };
  all.sort((a, b) => order[a.level] - order[b.level]);
  const n = (lvl) => all.filter((f) => f.level === lvl).length;
  const c = result.counts;
  console.log(`size: ${c.width}×${c.height}px · ${c.nodes} nodes · ${c.groups} groups · ${c.edges} edges · ${c.crossings} crossings`);
  console.log(`lint: ${n("error")} errors, ${n("warn")} warnings, ${n("info")} info`);
  for (const f of all) console.log(`  ${f.level.padEnd(5)} ${f.code.padEnd(20)} ${f.msg}`);
  return n("error");
}

async function render(input, output, opts) {
  if (!output.endsWith(".drawio.svg")) fail("output must end in .drawio.svg");
  let xml;
  try {
    xml = readSource(input);
  } catch (e) {
    fail(`${input}: ${e.message}`);
  }
  let model;
  try {
    model = readModel(xml);
  } catch (e) {
    fail(`${input}: ${e.message}`);
  }
  const fatal = model.problems.filter((p) => p.level === "error");
  if (fatal.length) {
    for (const p of fatal) console.error(`  error ${p.code.padEnd(20)} ${p.msg}`);
    fail("fix the model errors above before rendering");
  }

  try {
    const problems = model.problems.slice();
    if (opts.route) {
      const routeXml = await loadRouter();
      const routed = await routeXml(xml);
      if (routed === xml) problems.push({ level: "warn", code: "unrouted", msg: "libavoid routing did not run; edges are draw.io's default routes" });
      else xml = restoreManual(xml, restoreRounded(model.cells, routed));
    }

    const stem = path.basename(output, ".drawio.svg");
    const previews = path.resolve(opts.previews ?? path.join(os.tmpdir(), "technical-diagrams", stem));
    mkdirSync(previews, { recursive: true });
    mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    // A fresh name per render: image viewers (including agent file readers) cache by path.
    const tag = new Date().toISOString().replace(/\D/g, "").slice(8, 14);
    const light = path.join(previews, `${stem}.${tag}.light.png`);
    const dark = path.join(previews, `${stem}.${tag}.dark.png`);
    await exportDiagram(xml, { svgFile: output, lightFile: light, darkFile: dark, scale: opts.scale });

    const svg = readFileSync(output, "utf8");
    const embedded = readModel(extractFromSvg(svg));
    const result = lint(svg, embedded.cells);
    console.log(`wrote: ${output}`);
    console.log(`previews: ${light} ${dark}`);
    process.exit(report(result, problems) ? 1 : 0);
  } catch (e) {
    if (e instanceof ToolError) fail(e.message);
    throw e;
  }
}

const { pos, opts } = parseArgs(process.argv.slice(2));
if (pos[0] === "build") {
  if (pos.length !== 3) fail("usage: render.mjs build <in.json> <out.drawio>");
  writeFileSync(pos[2], build(pos[1]));
  console.log(`built: ${pos[2]}`);
} else if (pos[0] === "extract") {
  if (pos.length !== 3) fail("usage: render.mjs extract <in.drawio.svg> <out.drawio>");
  try {
    writeFileSync(pos[2], extractFromSvg(readFileSync(pos[1], "utf8")));
  } catch (e) {
    fail(`${pos[1]}: ${e.message}`);
  }
  console.log(`extracted: ${pos[2]}`);
} else if (pos[0] === "lint") {
  if (pos.length !== 2) fail("usage: render.mjs lint <in.drawio.svg>");
  const svg = readFileSync(pos[1], "utf8");
  const model = readModel(extractFromSvg(svg));
  process.exit(report(lint(svg, model.cells), model.problems) ? 1 : 0);
} else if (pos.length === 2) {
  await render(pos[0], pos[1], opts);
} else {
  fail("usage: render.mjs <in.json|in.drawio|in.drawio.svg> <out.drawio.svg> [--no-route] [--previews <dir>] [--scale <n>]\n       render.mjs build <in.json> <out.drawio>\n       render.mjs extract <in.drawio.svg> <out.drawio>\n       render.mjs lint <in.drawio.svg>");
}
