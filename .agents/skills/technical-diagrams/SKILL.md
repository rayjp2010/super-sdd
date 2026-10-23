---
name: technical-diagrams
description: Create, redraw or edit technical diagrams for documentation, READMEs and design docs, and decide between Mermaid and draw.io. draw.io output is an editable .drawio.svg that follows light/dark mode, placed deliberately and checked by a render-and-lint script. Use whenever a diagram is wanted or touched — architecture, deployment, topology, component or module-dependency maps, flowcharts, process or lifecycle flows, sequence, ER and state diagrams — and whenever a Mermaid diagram is called messy, tangled, cramped or hard to read, or the user mentions draw.io, drawio, .drawio.svg, or asks to draw, diagram or visualize a system or process.
---

# Technical diagrams

A diagram is good when its placement follows meaning: the main path reads in one direction, each
store sits beside the service that owns it, and boundaries are real facts. Layout engines
(Mermaid's included) cannot know which node belongs next to which. That is why Mermaid stays
tidy for fixed-grammar diagrams (sequence, ER, state), where the grammar decides the layout, and
tangles on architecture maps and flowcharts, even small ones. For those, place the nodes yourself
in draw.io, and let the render script route the lines and check the result.

Every diagram stays editable. Mermaid stays as text in the markdown. draw.io diagrams are saved
as `.drawio.svg`: one file that is both the picture a markdown viewer (GitHub, GitLab, an IDE
preview) shows and the full draw.io model. Never commit PNG or JPEG.

All commands below use `S=<skill-dir>/scripts/render.mjs`, where `<skill-dir>` is the directory
that holds this SKILL.md. They need Node 20 or newer and git. If the project pins Node through
a version manager (mise, asdf, nvm), run `node` through it, for example `mise exec -- node $S …`.

## 1. Choose the format

| Diagram | Format |
|---|---|
| Sequence, ER, state | Mermaid, inline. Split a big one by phase instead of switching tools. |
| Architecture, deployment, topology, component or dependency map | draw.io |
| Any flowchart or process flow, of any size, including API processing flows | draw.io |
| An existing Mermaid flowchart | draw.io, when the diagram is touched |
| An existing Mermaid sequence, ER or state diagram the user calls messy | A better Mermaid, split by phase |

## 2. Mermaid

Read [references/mermaid.md](references/mermaid.md) and write the fenced block in the document. The
main rule: no `%%{init}`, `style` or `classDef` colours. GitHub, GitLab and most viewers theme
Mermaid for light and dark themselves.

## 3. draw.io

Read [references/layout.md](references/layout.md) and [references/spec.md](references/spec.md)
before writing anything, and look at the example closest to your diagram
(`assets/example-architecture.json` or `assets/example-flowchart.json`).

Two rules hold for every draw.io diagram, because readers notice when they break:

- **Fixed reading direction.** Architecture and dependency maps read left→right, starting from
  the actor on the far left. Flowcharts read top→bottom. Never flip or rotate the direction to
  solve a layout or width problem; `layout.md` lists what to do instead.
- **One size per shape class.** Every box matches the biggest box. The builder enforces this,
  so do not override `w`/`h`.

1. **Inventory the facts.** List every node, edge (with its label) and boundary from the source:
   the document's prose, the Mermaid being replaced, or the code. Keep this list in your working
   notes. A migration keeps every node and edge of the original, with the same direction. Add a
   boundary group or an edge label only when the document states that fact; never invent
   components, protocols or ports.
2. **Plan the grid** with the rules in `layout.md`: classify the edges, assign each node a column
   and row, check every non-main edge's corridor, and estimate the width. Do this before writing
   coordinates. It decides more about the result than any later fix.
3. **Write the spec** (`spec.md`) to a scratch file outside the repo, for example
   `/tmp/diagrams/<name>.json`. Give roles and centre coordinates from your grid; the builder
   supplies styles, sizes and group rectangles. Do not write a generator script or raw XML for a
   new diagram.
4. **Render:**

   ```bash
   node $S /tmp/diagrams/<name>.json <doc-dir>/diagrams/<name>.drawio.svg
   ```

   The script:
   - builds the model and prints the class sizes it chose
   - routes the edges around the boxes (libavoid, from the official draw.io MCP package)
   - exports the SVG with draw.io's own export page, run in headless Chromium (Playwright)
   - writes a light and a dark PNG preview to `/tmp/technical-diagrams/<name>/`
   - lints the result

   Exit 1 means lint errors; exit 2 means a broken spec or a missing tool.
5. **Fix, then look.**
   - Lint errors must reach zero.
   - Fix every warning (`crossing`, `shared-run`, `jog`, `size-mismatch`, `edge-through-title`,
     `cramped-text`, `small-text`, `label-on-edge`) unless it is unavoidable. Note the reason for
     any that remain.
   - Fix by moving centres or pinning ports in the spec, then render again.
   - Once the lint is clean, open **both** preview PNGs with your file-reading tool and go
     through the checklist at the end of `layout.md`. The lint measures geometry; only looking
     shows whether the diagram reads well.
   - Stop after about five renders. If a defect remains, report it rather than nudging
     coordinates blindly.
6. **Embed** it in the document, next to the prose it illustrates:

   ```markdown
   ![One sentence saying what the diagram shows](diagrams/<name>.drawio.svg)
   ```

   - Follow the project's existing convention for where images live. Without one, put the file
     in `diagrams/` beside the markdown file, named `<doc-stem>-<subject>.drawio.svg` (for
     example `docs/diagrams/architecture-topology.drawio.svg`).
   - When migrating, replace the Mermaid block with this line. Do not keep both.
   - If line styles or colours carry meaning, add a one-sentence legend under the image.
7. **Report:**
   - the SVG path
   - the final lint summary line
   - that you inspected both previews, and what you changed after looking
   - any remaining warnings, with reasons
   - how a person edits the file (below)

### Editing an existing .drawio.svg

```bash
node $S extract <doc-dir>/diagrams/<name>.drawio.svg /tmp/diagrams/<name>.drawio
# edit the scratch model, keeping existing ids
node $S /tmp/diagrams/<name>.drawio <doc-dir>/diagrams/<name>.drawio.svg
```

An existing diagram is edited as XML, because a person may have changed it in the draw.io editor
and no spec of it exists. Read [references/drawio-kit.md](references/drawio-kit.md) for the
style strings and keep new boxes at the size of their class. For a large rework, such as
re-planning the grid, writing a fresh spec is often simpler; keep the existing ids.

Rendering reroutes every edge except those whose style has `manualRoute=1` (what a spec `via`
produces). To pin one path in XML, give the edge waypoints and add `manualRoute=1;` to its style.
If a person has hand-shaped many edges in the draw.io editor, add `--no-route` so all of their
waypoints survive. `render.mjs lint <file.drawio.svg>` lints without rendering.

### How people edit these files

Open the `.drawio.svg` in VS Code with the *Draw.io Integration* extension
(`hediet.vscode-drawio`), in draw.io Desktop, or at app.diagrams.net (*File → Open from device*).
Saving keeps it a `.drawio.svg`, and the edges follow the boxes when they are dragged.

## Notes

- **Tools.** The renderer needs no Docker. On first use it installs three things into
  `~/.cache/technical-diagrams/`, outside any project, so the project's own dependencies and
  lockfile are untouched: `@drawio/mcp` (edge routing), `playwright-core` with a Chromium build
  (installed only if Playwright has none), and the draw.io 31.7.0 web app (a shallow `git` checkout
  of tag `v31.7.0`, about 80 MB). All need network access once. The SVG comes from the web app's
  `export3.html`, the same render code as draw.io Desktop 31.7.0, so it matches Desktop's output. The
  PNG previews are screenshots of that SVG under each colour scheme, so their fonts come from the
  machine.
- **Documents that move.** When a document with an embedded diagram is moved or copied
  elsewhere, for example from a draft or proposal folder into the main docs, move its
  `.drawio.svg` with it. A link left pointing at the old location breaks when that folder goes.
- **Diagrams are documentation.** If a diagram names a component, endpoint or step that the code
  renames or removes, update the diagram in the same change, as you would the prose.
