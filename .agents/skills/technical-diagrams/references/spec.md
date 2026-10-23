# Diagram spec (JSON)

New draw.io diagrams are written as a small JSON spec, and `render.mjs` builds the draw.io model
from it. You decide what the reader sees: roles, positions, labels and edges. The builder handles
what is easy to get wrong by hand:

- style strings with light/dark colour pairs
- label escaping
- group-relative coordinates
- one size per shape class

Complete examples: `assets/example-architecture.json` and `assets/example-flowchart.json`. Read the
one closest to your diagram first.

```json
{
  "name": "architecture-topology",
  "groups": [
    { "id": "cluster", "label": "GKE cluster", "kind": "boundary" }
  ],
  "nodes": [
    { "id": "browser", "role": "actor", "label": "Browser", "cx": 80, "cy": 110 },
    { "id": "api", "role": "service", "label": "api", "sub": "Fastify, 2–3 replicas", "cx": 500, "cy": 110, "group": "cluster" }
  ],
  "edges": [
    { "from": "browser", "to": "api", "label": "HTTPS" },
    { "from": "api", "to": "worker", "label": "enqueue", "kind": "async", "exit": "bottom", "entry": "top" }
  ]
}
```

## nodes

| Field | Meaning |
|---|---|
| `id` | Stable, meaningful id (`api`, `cloud-sql`). Later edits and people find cells by it. |
| `role` | What the component *is* to the reader (table below). |
| `label` | Plain text; `\n` breaks a line. No HTML, because the builder escapes it. |
| `sub` | Optional one-line subtitle (role, technology, port). With a subtitle, the label is bold. |
| `cx`, `cy` | **Centre**, in page coordinates, even inside a group. Two nodes that share `cy` are on one row and their edge is straight. Plan these on a grid (see `layout.md`). |
| `group` | Id of the group the node belongs to. |
| `w`, `h` | Avoid. They override the class size and the lint then reports `size-mismatch`. |

| Role | Use for | Shape class |
|---|---|---|
| `actor` | people, browsers, client apps, other teams | pill |
| `entry` | gateway, load balancer, ingress, CDN, reverse proxy | box |
| `service` | our deployable code: API, worker, job, function, module | box |
| `store` | database, bucket, cache, file store | cylinder |
| `queue` | queue, topic, stream, event bus | box |
| `managed` | a cloud service we use but do not run (Vertex AI, a managed KMS) | box |
| `external` | a system owned by someone else (corporate IdP, partner API, SaaS); dashed | box |
| `security` | identity provider, secret store, policy point | box |
| `terminal` | flowchart start or end | pill |
| `step` | flowchart action, a verb phrase of six words or fewer | box |
| `decision` | flowchart question of three words or fewer, with labelled exits | rhombus |
| `failure` | flowchart error ending | box |
| `note` | small muted text inside the diagram (rare; prefer the prose) | none |

Use a role only when the diagram has something of that kind. A colour that means nothing is
noise.

**Sizes are automatic.** All shapes of one class (box, pill, cylinder, rhombus) get the size the
longest label in that class needs, so every box matches the biggest one. The render prints the
result, for example `build: sizes box 180×52, cylinder 150×60`. Use those numbers when you space
centres: a gap between two boxes is the centre distance minus the width. To force a larger class
size, add `"sizes": { "box": [200, 56] }`.

## groups

| Field | Meaning |
|---|---|
| `id`, `label` | The label is the group's title, top-left. |
| `kind` | `boundary` (cluster, project, runtime, ownership) or `trust` (security boundary). |
| `parent` | Id of an enclosing group, for at most two levels. |
| `x`, `y`, `w`, `h` | Optional. Without them the group fits its members, with 20px on the sides and bottom and 36px on top for the title. |

A group is drawn as the rectangle around its members, so members must form one contiguous block
on your grid. Keep non-members out of that rectangle.

## edges

| Field | Meaning |
|---|---|
| `from`, `to` | Node ids (not groups). |
| `label` | 1–3 words: an action or protocol. |
| `kind` | `sync` (default), `async`, `weak` (type-only or optional), `both` (two-way), `main` (emphasised main path) |
| `exit`, `entry` | Optional port: `left` `right` `top` `bottom`, with an optional position along the side, as in `right:0.25`. Leave them out and the router picks a side. |
| `via` | Optional waypoints, in page coordinates: `[[x, y], ...]`. The router leaves this edge alone, and re-renders keep the path. Use it for returns and loops, which the router would otherwise pull through the middle of the diagram (it takes the shortest path, even with ports pinned). Give the corners of the path in the empty corridor, for example `[[60, 520], [60, 60]]` for a loop up the left side. |
| `id` | Optional; defaults to `e-<from>-<to>`. |

## Commands

```bash
S=<skill-dir>/scripts/render.mjs
node $S /tmp/diagrams/<name>.json <doc-dir>/diagrams/<name>.drawio.svg   # build + render + lint
node $S build /tmp/diagrams/<name>.json /tmp/diagrams/<name>.drawio      # build only
```

Rendering a spec also writes the built model next to it (`<name>.drawio`). Keep the spec in
`/tmp` while you iterate. The committed artifact is only the `.drawio.svg`, which contains the full
model.
