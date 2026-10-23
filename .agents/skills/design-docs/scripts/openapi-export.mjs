#!/usr/bin/env node
// Writes an OpenAPI document that the code generates as a stable, reviewable YAML file.
// No dependencies; Node 18+.
//
//   node openapi-export.mjs <source> <out.yaml> [--paths <prefix>]
//
//   <source>  http(s) URL (for example http://localhost:3000/openapi.json), a .json file, or - for stdin
//   --paths   keep only the paths that start with this prefix, and the components they reference
//
// Exit 0: written. Exit 2: bad usage, unreachable source, or not an OpenAPI document.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const prefix = opt('--paths');
const [source, out] = args;
if (!source || !out) {
  console.error('usage: openapi-export.mjs <url|file.json|-> <out.yaml> [--paths <prefix>]');
  process.exit(2);
}

async function read(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
    return res.text();
  }
  return fs.readFileSync(src === '-' ? 0 : src, 'utf8');
}

// Keep only the selected paths and the components they reach through $ref.
function prune(doc, pre) {
  doc.paths = Object.fromEntries(Object.entries(doc.paths || {}).filter(([p]) => p.startsWith(pre)));
  const keep = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === '$ref' && typeof v === 'string' && v.startsWith('#/components/')) {
        if (!keep.has(v)) {
          keep.add(v);
          const [, , group, name] = v.split('/');
          visit(doc.components?.[group]?.[name]);
        }
      } else visit(v);
    }
  };
  visit(doc.paths);
  for (const [group, items] of Object.entries(doc.components || {})) {
    for (const name of Object.keys(items)) if (!keep.has(`#/components/${group}/${name}`)) delete items[name];
    if (!Object.keys(items).length) delete doc.components[group];
  }
  return doc;
}

// Minimal YAML emitter for JSON data. Strings are plain when that is unambiguous, else JSON-quoted
// (a JSON string is a valid YAML double-quoted scalar).
const RESERVED = /^(true|false|null|yes|no|on|off|y|n|~|)$/i;
const scalar = (v) => {
  if (v === null) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  const plain = /^[A-Za-z_/$][\w ./{}$@()+-]*$/.test(s) && !/\s$/.test(s) && !/: |\s#/.test(s) && !RESERVED.test(s);
  return plain ? s : JSON.stringify(s);
};
const key = (k) => scalar(k);
function emit(v, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(v)) {
    if (!v.length) return ' []';
    return v.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length) {
        const body = emit(item, indent + 2).replace(/^\n/, '');
        return `\n${pad}- ${body.slice(indent + 2)}`;
      }
      return `\n${pad}-${emit(item, indent + 2)}`;
    }).join('');
  }
  if (v && typeof v === 'object') {
    const entries = Object.entries(v);
    if (!entries.length) return ' {}';
    return entries.map(([k, val]) => `\n${pad}${key(k)}:${emit(val, indent + 2)}`).join('');
  }
  return ` ${scalar(v)}`;
}

let doc;
try {
  doc = JSON.parse(await read(source));
} catch (e) {
  console.error(`cannot read an OpenAPI JSON document from ${source}: ${e.message}`);
  process.exit(2);
}
if (!doc.openapi || !doc.paths) {
  console.error(`${source}: not an OpenAPI document (no "openapi" or "paths" field)`);
  process.exit(2);
}
if (prefix) prune(doc, prefix);
const header = `# Generated from ${source === '-' ? 'stdin' : source} by openapi-export.mjs. Do not edit by hand: change the code and export again.\n`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, header + emit(doc).replace(/^\n/, '') + '\n');
const ops = Object.values(doc.paths).reduce((n, item) => n + Object.keys(item).filter((m) => /^(get|put|post|patch|delete|head|options)$/.test(m)).length, 0);
console.log(`openapi-export: wrote ${out} (${Object.keys(doc.paths).length} paths, ${ops} operations, OpenAPI ${doc.openapi})`);
