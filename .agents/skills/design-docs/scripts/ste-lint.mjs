#!/usr/bin/env node
// Lints a Markdown design document against the ASD-STE100-based writing rules and the
// design-doc structure rules of the design-docs skill. Heuristic: it finds candidates,
// a person (or agent) decides. No dependencies; Node 18+.
//
//   node ste-lint.mjs <file.md> [more.md ...] [--kind <kind>] [--json] [--quiet]
//
// Exit 0: no errors. Exit 1: errors found. Exit 2: bad usage or unreadable file.

import fs from 'node:fs';
import path from 'node:path';

const KINDS = {
  // H2 headings (regex, case-insensitive) each kind must have, in addition to the common ones,
  // and whether it must carry at least one diagram.
  overview: { sections: ['system context', 'containers'], diagram: true },
  deployment: { sections: ['topology', 'workloads', 'verification'], diagram: true },
  api: { sections: ['api list'], diagram: true, perOperationFlow: true },
  'api-conventions': { sections: ['errors', 'authentication|authorization'], diagram: false },
  events: { sections: ['event catalogue', 'delivery'], diagram: true },
  'data-model': { sections: ['storage boundary', 'entity relationships', 'entities'], diagram: true, columnTables: true },
  workflow: { sections: ['states', 'transitions', 'failures and recovery'], diagram: true },
  component: { sections: ['responsibilities', 'structure', 'dependencies'], diagram: true },
  integration: { sections: ['port|operations', 'failure handling'], diagram: true },
  configuration: { sections: ['sources', 'settings'], diagram: false },
  observability: { sections: ['logs', 'alerts'], diagram: false },
  security: { sections: ['trust boundaries', 'authorization', 'threats and controls'], diagram: true },
  frontend: { sections: ['state ownership', 'screens'], diagram: false },
  runbook: { sections: ['before you start', 'procedure', 'verify'], diagram: false, noCommon: true },
  decision: { sections: ['status', 'context', 'decision', 'consequences'], diagram: false, noCommon: true },
  glossary: { sections: [], diagram: false, noCommon: true },
  index: { sections: ['reading order', 'document map'], diagram: false, noCommon: true },
};
const COMMON_FIRST = /^overview$/i;
const COMMON_REQUIRED = ['decisions', 'limits and open questions'];
const COMMON_LAST = /^related documents$/i;
const CODE_MAP = /^code map$/i;

const LIMITS = { descriptive: 25, procedural: 20, cell: 25, paragraph: 6, docWarn: 4000, docInfo: 2500 };

const NEG = /\b(not|never|no|nothing|neither|nor|none|cannot|can't|don't|doesn't|isn't|aren't|won't|without|nobody|unless)\b/gi;

// phrase lists: [regex, rule, message]
const PHRASES = [
  // vague references: the reader has to search for the antecedent
  [/\b(the same way|in the same way|for the same reason|for the reason (?:the|that|it)|same kind of reason|as above|as below|above-mentioned|aforementioned|the former|the latter|that mechanism|this mechanism|the one above)\b/i,
    'vague-reference', 'name the thing again instead of pointing at it'],
  [/\bfor [`\w-]+'s reason\b/i, 'vague-reference', 'state the reason, do not point to another one'],
  // history: design docs describe the current system; history lives in git, changes and decisions
  [/\b(previously|used to|no longer|was added|were added|was removed|were removed|was introduced|originally|at first|since then|until now|so far|nowadays|these days|before (?:it|this|that) existed|predates?|legacy|the old (?:system|code|design)|the replaced system|historically|once also|is gone|are gone|has been (?:added|removed|replaced|renamed))\b/i,
    'history', 'describe the current system; move history to a decision record or the change'],
  [/\b(today|currently|for now|at the moment|at present)\b/i, 'history',
    'state the fact without a time word; mark planned items as Planned'],
  [/\b(issue|PR|pull request|ticket) #\d+/i, 'history', 'link the decision record, not the issue thread'],
  // rhetoric: persuasive or literary style
  [/\b(we|we're|we've|our|us|let's)\b/i, 'rhetoric', 'name the actor (the api, the worker, the member), not "we"'],
  [/\b(load[- ]bearing|honest(?:ly)?|the whole of|teeth|wedged|worth (?:the|a|naming|stating|noting)|plainly|of course|obviously|clearly|simply|merely|really|very|quite|actually|basically|essentially|in fact|note that|it should be noted|needless to say|it is important to|it is worth)\b/i,
    'rhetoric', 'remove the comment word or metaphor; state the fact'],
  [/\b(in order to|utili[sz]e|leverage|facilitate|prior to|subsequent to|in the event that|with regard to|a number of|is able to|are able to|make use of)\b/i,
    'filler', 'use the short form (to, use, help, before, after, if, about, some, can)'],
  [/\b(etc\.?|and so on|and so forth)\b/i, 'filler', 'list every item, or say "for example" and give the items'],
  [/\b(?:set|carry|look|find|point|make|take|go|end|turn|bring|figure|give|fill|hand|pick|come|kick|back|roll|wind|spin|shut|start|fire|tear|break|break|clean|sort|work|write) (?:up|out|over|off|through|in|on|back|down)\b/i,
    'phrasal-verb', 'use a one-word verb (configure, do, find, start, stop, remove, ...)'],
];

// -ing words that are adjectives, nouns or prepositions, not progressive verbs
const ING_OK = new Set(('pending outstanding missing existing remaining following during nothing something anything everything ' +
  'string thing things morning evening ceiling bring king ring sing spring wing building setting settings heading headings ' +
  'logging routing caching hashing pairing mapping mappings binding bindings ordering polling meaning meanings warning warnings ' +
  'timing rendering processing during spacing padding naming matching incoming outgoing upcoming ongoing booking billing ' +
  'listing listings testing tracing scaling packaging rating rounding offering earning onboarding ranking funding parking ' +
  'staging opening closing sending signing filing saving loading working running').split(' '));

function parseArgs(argv) {
  const out = { files: [], kind: null, json: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kind') out.kind = argv[++i];
    else if (a === '--json') out.json = true;
    else if (a === '--quiet') out.quiet = true;
    else if (a === '-h' || a === '--help') { out.help = true; }
    else out.files.push(a);
  }
  return out;
}

// Replace inline code with a one-word token, links with their text, drop emphasis.
// STE 8.5/8.6: an identifier, quoted label or parenthetical counts as one word.
function normalize(s) {
  return s
    .replace(/`[^`]*`/g, 'CODE')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|(?<!\w)[*_](?!\s)|(?<!\s)[*_](?!\w)/g, '')
    .replace(/\b(e\.g|i\.e|vs|cf|approx|etc)\./gi, '$1')
    .replace(/(\d)\.(\d)/g, '$1$2');
}
function countWords(s) {
  const t = normalize(s).replace(/\([^()]*\)/g, 'PAREN').replace(/"[^"]*"/g, 'QUOTE');
  return t.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}
function sentences(text) {
  const t = normalize(text);
  return t.split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"'(\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}])/u)
    .map(s => s.trim()).filter(s => s && /[\p{L}]/u.test(s));
}
function rawSentences(text) {
  // same split on un-normalized text, to report excerpts
  return text.replace(/\b(e\.g|i\.e|vs|cf|approx)\./gi, '$1\u2024')
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"'(`\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}])/u)
    .map(s => s.replace(/\u2024/g, '.').trim()).filter(Boolean);
}
const excerpt = s => { const x = s.replace(/\s+/g, ' ').trim(); return x.length > 90 ? x.slice(0, 87) + '...' : x; };

function splitCells(line) {
  const masked = line.replace(/`[^`]*`/g, m => m.replace(/\|/g, '\u2502')).replace(/\\\|/g, '\u2502');
  return masked.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.replace(/\u2502/g, '|').trim());
}

function lint(file, kind) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const findings = [];
  const add = (line, severity, rule, message, text) => findings.push({ file, line, severity, rule, message, excerpt: text ? excerpt(text) : undefined });

  const units = []; // {line, text, type: 'para'|'item'|'step'|'cell', section}
  const h2 = []; // {line, title}
  const h3 = []; // every ### heading
  let curH3 = null; // the ### heading in force, reset by each ##
  let inFence = false, fenceLang = '', inComment = false, mermaidCount = 0, mermaidFlow = [], imageDiagrams = [];
  let section = '', cur = null, fenceStart = 0, fenceFirst = null;
  const tables = []; // {line, section, header: [..], rows: [{line, cells}]}
  const links = []; // link targets
  let table = null;
  const flush = () => { if (cur) { units.push(cur); cur = null; } };

  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1, l = lines[i];
    if (inComment) { if (l.includes('-->')) inComment = false; continue; }
    const fence = l.match(/^\s*(```|~~~)\s*(\S*)/);
    if (fence) {
      flush();
      table = null;
      if (!inFence) { inFence = true; fenceLang = fence[2]; fenceStart = ln; fenceFirst = null; if (/^mermaid/i.test(fenceLang)) { mermaidCount++; mermaidFlow.push({ line: ln, section, h3: curH3 }); } }
      else inFence = false;
      continue;
    }
    if (inFence) {
      if (fenceFirst === null && l.trim()) {
        fenceFirst = l.trim();
        if (/^mermaid/i.test(fenceLang) && /^(flowchart|graph)\b/.test(fenceFirst))
          add(fenceStart, 'error', 'flowchart-format', 'flowcharts are draw.io .drawio.svg files (technical-diagrams skill); Mermaid is for sequence, ER and state diagrams');
      }
      continue;
    }
    for (const m of l.matchAll(/\]\(([^)\s]+)\)/g)) links.push(m[1]);
    if (/<!--/.test(l)) {
      add(ln, 'error', 'placeholder', 'template comment left in the document', l);
      if (!l.includes('-->')) inComment = true;
      flush(); continue;
    }
    if (/<[A-Za-z][^>]*\s[^>]*>|<(?:Title|Name|Term|Value|TODO|TBD)[^>]*>|\bTODO\b|\bTBD\b/.test(l.replace(/`[^`]*`/g, '')) && !/<(a|img|br|sup|sub|details|summary|kbd)\b/i.test(l))
      add(ln, 'error', 'placeholder', 'template placeholder left in the document', l);
    const img = l.match(/!\[[^\]]*\]\(([^)]+\.drawio\.svg)\)/);
    if (img) imageDiagrams.push({ line: ln, section, h3: curH3 });

    const h = l.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      const title = h[2].trim();
      if (h[1].length === 2) { h2.push({ line: ln, title }); section = title; curH3 = null; }
      else if (h[1].length === 3) { h3.push({ line: ln, title, section }); curH3 = title; }
      if (h[1].length >= 2 && countWords(title) > 10) add(ln, 'warning', 'heading-length', 'heading over 10 words; name the topic, do not argue it', title);
      continue;
    }
    if (/^\s*\|/.test(l)) {
      flush();
      if (/^\s*\|[\s|:-]+\|\s*$/.test(l)) continue;
      const cells = splitCells(l);
      if (!table) { table = { line: ln, section, h3: curH3, header: cells, rows: [] }; tables.push(table); continue; }
      table.rows.push({ line: ln, cells });
      cells.forEach((c, ci) => { if (c) units.push({ line: ln, text: c, type: 'cell', section, col: table.header[ci] || '' }); });
      continue;
    }
    table = null;
    if (/^\s*$/.test(l)) { flush(); continue; }
    const item = l.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flush();
      cur = { line: ln, text: item[3], type: /\d/.test(item[2]) ? 'step' : 'item', section, h3: curH3 };
      continue;
    }
    const text = l.replace(/^\s*>\s?/, '').trim();
    if (cur) cur.text += ' ' + text;
    else cur = { line: ln, text, type: 'para', section, h3: curH3 };
  }
  flush();

  const inCodeMap = u => CODE_MAP.test(u.section);
  let totalWords = 0;

  for (const u of units) {
    const sents = sentences(u.text);
    const raws = rawSentences(u.text);
    const words = countWords(u.text);
    totalWords += words;

    if (u.type === 'cell') {
      if (words > LIMITS.cell) add(u.line, 'error', 'cell-length', `table cell has ${words} words (max ${LIMITS.cell}); move detail to a note under the table`, u.text);
      else if (sents.length > 2) add(u.line, 'warning', 'cell-sentences', `table cell has ${sents.length} sentences; a cell holds one fact`, u.text);
    } else if (u.type === 'para' && sents.length > LIMITS.paragraph) {
      add(u.line, 'error', 'paragraph-length', `paragraph has ${sents.length} sentences (max ${LIMITS.paragraph}); split by topic or use a list`, u.text);
    }

    sents.forEach((s, idx) => {
      const raw = raws[idx] ?? s;
      const w = countWords(s);
      const max = u.type === 'step' ? LIMITS.procedural : LIMITS.descriptive;
      if (u.type !== 'cell' && w > max)
        add(u.line, 'error', 'sentence-length', `sentence has ${w} words (max ${max}${u.type === 'step' ? ', procedural step' : ''})`, raw);
      const negs = (s.match(NEG) || []).length;
      if (negs >= 2) add(u.line, 'warning', 'negation', `${negs} negations in one sentence; state the positive rule`, raw);
      if (/;/.test(s)) add(u.line, 'warning', 'semicolon', 'no semicolons (STE 8.1); make two sentences or a list', raw);
      if (/\s[—–]\s|—/.test(s)) add(u.line, 'warning', 'dash-aside', 'dash aside makes a sentence carry two ideas; make two sentences', raw);
      if (/\b(has|have|had)\s+(been\s+)?\w+(ed|en)\b/i.test(s)) add(u.line, 'warning', 'perfect-tense', 'use simple present or simple past (STE 3.2)', raw);
      const prog = s.match(/\b(is|are|was|were|be|been)\s+(\w+ing)\b/i);
      if (prog && !ING_OK.has(prog[2].toLowerCase())) add(u.line, 'warning', 'progressive', `"${prog[0]}": use a simple tense (STE 3.5)`, raw);
      const pass = s.match(/\b(is|are|was|were|be|been|being)\s+(\w+ed|written|known|held|sent|built|taken|given|kept|made|read|run|set|shown|done|seen|found|left|told|chosen|driven|thrown|drawn)\b(?!\s+by\b)/i);
      if (pass) add(u.line, 'info', 'passive', `"${pass[0]}" without an actor; name who does it if it is known (STE 3.6)`, raw);
    });

    const plain = u.text.replace(/`[^`]*`/g, 'CODE');
    for (const [re, rule, message] of PHRASES) {
      const m = plain.match(re);
      if (m && !(rule === 'history' && /decision/i.test(path.basename(file)))) add(u.line, 'warning', rule, `"${m[0]}": ${message}`, u.text);
    }
    // a SQL default or type (`now()`, `gen_random_uuid()`) is a database contract, not a code path
    if (!inCodeMap(u) && !/^(default|data type|type)$/i.test(u.col || '')) {
      const codes = u.text.match(/`[^`]+`/g) || [];
      for (const c of codes) {
        if (/[\w-]+\/[\w./-]+\.(ts|tsx|js|mjs|cjs|vue|py|go|java|sql|rb|rs|kt)`$/.test(c) || /\b[a-z]\w*\(\)?`$/.test(c) && /\(/.test(c))
          add(u.line, 'warning', 'code-path', `${c}: file paths and function names rot; name the contract, or move it to "## Code map"`, u.text);
      }
    }
  }

  // ---- structure
  const titles = h2.map(x => x.title.replace(/[`*]/g, '').trim());
  const spec = kind ? KINDS[kind] : null;
  if (!lines.some(l => /^#\s+\S/.test(l))) add(1, 'error', 'structure', 'document has no "# Title"');
  if (!spec || !spec.noCommon) {
    if (titles.length && !COMMON_FIRST.test(titles[0])) add(h2[0].line, 'warning', 'structure', `first section is "${titles[0]}"; start with "## Overview"`);
    if (titles.length && !COMMON_LAST.test(titles.at(-1))) add(h2.at(-1).line, 'warning', 'structure', `last section is "${titles.at(-1)}"; end with "## Related documents"`);
    if (kind) for (const req of COMMON_REQUIRED)
      if (!titles.some(t => new RegExp(`^(${req})`, 'i').test(t))) add(1, 'error', 'structure', `missing "## ${req[0].toUpperCase() + req.slice(1)}" (write "None." if empty)`);
  }
  if (spec) {
    for (const req of spec.sections)
      if (!titles.some(t => new RegExp(`^(${req})`, 'i').test(t))) add(1, 'error', 'structure', `kind "${kind}" needs a "## ${req.split('|')[0]}" section`);
    if (spec.diagram && mermaidCount + imageDiagrams.length === 0) add(1, 'error', 'diagram', `kind "${kind}" needs at least one diagram`);
    if (spec.perOperationFlow) {
      // every "### [n.] <METHOD> /path" operation heading needs a draw.io flowchart before the next heading
      const ops = h3.filter(x => OP_HEADING.test(x.title.replace(/`/g, '')));
      for (const op of ops) {
        const has = imageDiagrams.some(d => d.h3 === op.title);
        if (!has) add(op.line, 'error', 'diagram', `operation "${op.title}" has no processing flowchart (.drawio.svg)`);
      }
      if (!ops.length) add(1, 'warning', 'structure', 'no "### <METHOD> /path" operation headings found');
      checkOpenapi(file, tables, links, add);
      // an operation section is a purpose and a flowchart: the processing lives in the flowchart only
      for (const op of ops) {
        for (const t of tables.filter(t => t.h3 === op.title))
          add(t.line, 'error', 'operation-text', 'operation section has a table; put the processing in the flowchart, details in openapi.yaml, events in the event catalogue', t.header.join(' | '));
        const us = units.filter(u => u.h3 === op.title && u.type !== 'cell');
        for (const u of us.filter(u => u.type !== 'para')) add(u.line, 'error', 'operation-text', 'operation section has a list; put the processing in the flowchart', u.text);
        const n = us.filter(u => u.type === 'para').reduce((a, u) => a + sentences(u.text).length, 0);
        if (n > 2) add(op.line, 'error', 'operation-text', `operation section has ${n} sentences of text (max 2: its purpose); put the processing in the flowchart`);
      }
    }
    if (spec.columnTables) {
      checkColumnTables(tables, add);
      for (const x of h2) if (/^(indexes|constraints|keys)\b/i.test(x.title.replace(/[`*]/g, '')))
        add(x.line, 'error', 'entity-local', `"## ${x.title}": put each index and constraint table under its own table's section`);
      // explain each table with bullet points, not prose (STE 4.3)
      const entityH3 = new Set(tables.filter(t => t.header.some(h => /^column$/i.test(h))).map(t => t.h3).filter(Boolean));
      for (const u of units.filter(u => u.type === 'para' && entityH3.has(u.h3)))
        add(u.line, 'error', 'entity-bullets', 'explain a table with bullet points (one fact each), not a paragraph', u.text);
    }
  }
  for (const t of tables) {
    if (!/^no\.?$/i.test(t.header[0] || ''))
      add(t.line, 'error', 'table-number', `table starts with "${t.header[0]}"; the first column is "No." (1, 2, 3 ...)`, t.header.join(' | '));
    else t.rows.forEach((r, i) => {
      if (r.cells[0] !== String(i + 1)) add(r.line, 'warning', 'table-number', `row number is "${r.cells[0]}", expected ${i + 1}`);
    });
  }
  if (totalWords > LIMITS.docWarn) add(1, 'warning', 'doc-length', `${totalWords} words (about ${Math.round(totalWords / 200)} min); split the document by topic (target <= ${LIMITS.docInfo})`);
  else if (totalWords > LIMITS.docInfo) add(1, 'info', 'doc-length', `${totalWords} words; consider a split (target <= ${LIMITS.docInfo})`);

  return { file, words: totalWords, findings };
}

const OP_HEADING = /^(\d+\.\s*)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|WS|SUBSCRIBE)\s+\//i;
const normPath = p => p.replace(/[`\s]/g, '').replace(/:([A-Za-z_]\w*)/g, '{$1}').replace(/\{[^}]+\}/g, '{}').replace(/\/$/, '');

// The API list names every operation. Each one must exist in the OpenAPI file the document links to.
function checkOpenapi(file, tables, links, add) {
  const target = links.find(l => /openapi[^/]*\.(ya?ml|json)(#.*)?$/i.test(l));
  if (!target) return add(1, 'error', 'openapi', 'no link to the OpenAPI file; request and response details live in openapi.yaml');
  if (/^https?:/.test(target)) return;
  const p = path.resolve(path.dirname(file), target.replace(/#.*$/, ''));
  if (!fs.existsSync(p)) return add(1, 'error', 'openapi', `linked OpenAPI file ${target} does not exist`);
  const ops = new Set(readOpenapiOps(p));
  const list = tables.find(t => t.header.some(h => /^method$/i.test(h)) && t.header.some(h => /^path$/i.test(h)));
  if (!list) return add(1, 'error', 'openapi', 'the API list needs separate "Method" and "Path" columns');
  const mi = list.header.findIndex(h => /^method$/i.test(h)), pi = list.header.findIndex(h => /^path$/i.test(h));
  if (!list.header.some(h => /auth/i.test(h))) add(list.line, 'error', 'openapi', 'the API list needs an "Auth required" column');
  for (const r of list.rows) {
    const m = (r.cells[mi] || '').replace(/[`*]/g, '').trim().toLowerCase();
    const pth = (r.cells[pi] || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    if (/^(ws|subscribe)$/.test(m)) continue;
    if (!ops.has(`${m} ${normPath(pth)}`)) add(r.line, 'error', 'openapi', `${m.toUpperCase()} ${pth.replace(/`/g, '')} is not in ${target}`);
  }
}

// Reads "method path" pairs from the paths block of an OpenAPI YAML or JSON file, without a YAML library.
function readOpenapiOps(p) {
  const src = fs.readFileSync(p, 'utf8');
  if (/\.json$/i.test(p)) {
    const doc = JSON.parse(src);
    return Object.entries(doc.paths || {}).flatMap(([k, v]) => Object.keys(v).map(m => `${m.toLowerCase()} ${normPath(k)}`));
  }
  const out = [];
  let inPaths = false, pathIndent = -1, methodIndent = -1, cur = null;
  for (const line of src.split('\n')) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indent = line.match(/^ */)[0].length;
    const k = line.trim().match(/^["']?([^"':]+)["']?\s*:/);
    if (indent === 0) { inPaths = !!k && k[1] === 'paths'; pathIndent = -1; continue; }
    if (!inPaths || !k) continue;
    if (pathIndent < 0) pathIndent = indent;
    if (indent === pathIndent) { cur = k[1]; methodIndent = -1; continue; }
    if (indent < pathIndent || !cur) continue;
    if (methodIndent < 0) methodIndent = indent;
    if (indent === methodIndent && /^(get|put|post|patch|delete|head|options)$/i.test(k[1])) out.push(`${k[1].toLowerCase()} ${normPath(cur)}`);
  }
  return out;
}

// Data model: one database column per row, with a full column definition.
function checkColumnTables(tables, add) {
  for (const t of tables) {
    const ci = t.header.findIndex(h => /^column$/i.test(h));
    if (ci < 0) continue;
    const need = [['data type', /^(data )?type$/i], ['PK', /^pk$/i], ['FK', /^fk|references?$/i], ['Nullable', /^null(able)?$/i], ['Default', /^default$/i]];
    const missing = need.filter(([, re]) => !t.header.some(h => re.test(h))).map(([n]) => n);
    if (missing.length) add(t.line, 'error', 'column-definition', `column table lacks: ${missing.join(', ')}`, t.header.join(' | '));
    for (const r of t.rows) {
      const c = r.cells[ci] || '';
      if ((c.match(/`[^`]+`/g) || []).length > 1 || /[*,]|\b(columns|and)\b/.test(c.replace(/`[^`]*`/g, '')))
        add(r.line, 'error', 'one-column-per-row', `"${c}": one database column per row`);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.files.length) {
  console.log(`usage: ste-lint.mjs <file.md>... [--kind ${Object.keys(KINDS).join('|')}] [--json] [--quiet]`);
  process.exit(args.help ? 0 : 2);
}
if (args.kind && !KINDS[args.kind]) { console.error(`unknown kind "${args.kind}"; one of: ${Object.keys(KINDS).join(', ')}`); process.exit(2); }

let errors = 0, warnings = 0, infos = 0;
const results = [];
for (const f of args.files) {
  let r;
  try { r = lint(f, args.kind); } catch (e) { console.error(`${f}: ${e.message}`); process.exit(2); }
  results.push(r);
  for (const x of r.findings) { if (x.severity === 'error') errors++; else if (x.severity === 'warning') warnings++; else infos++; }
}
if (args.json) console.log(JSON.stringify({ errors, warnings, infos, results }, null, 2));
else {
  for (const r of results) for (const x of r.findings) {
    if (args.quiet && x.severity === 'info') continue;
    console.log(`${x.file}:${x.line} ${x.severity} ${x.rule}: ${x.message}${x.excerpt ? `\n    > ${x.excerpt}` : ''}`);
  }
  const words = results.reduce((a, r) => a + r.words, 0);
  console.log(`ste-lint: ${errors} errors, ${warnings} warnings, ${infos} info (${words} words, ${results.length} file${results.length > 1 ? 's' : ''})`);
}
process.exit(errors ? 1 : 0);
