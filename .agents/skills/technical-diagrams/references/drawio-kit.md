# draw.io style kit

New diagrams are written as a spec (`spec.md`), and the builder applies everything below. Read
this file when you **edit the XML of an existing diagram**: one extracted from a `.drawio.svg`,
possibly after a person changed it in the draw.io editor. It also explains the roles the spec
refers to.

Copy these strings exactly. Every colour is a `light-dark(light, dark)` pair, so the exported SVG
follows the reader's light or dark theme. A colour written without `light-dark()` still works, but
draw.io then invents its dark variant, and the lint reports it as `raw-colour`.

To see a complete model, build one of the examples:
`render.mjs build assets/example-architecture.json /tmp/example.drawio`.

## File skeleton

```xml
<mxfile>
  <diagram id="DIAGRAM-NAME" name="DIAGRAM-NAME">
    <mxGraphModel grid="1" gridSize="10" page="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- vertices, then edges -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

- One `<diagram>` (page) per file. Only the first page is exported.
- Use meaningful ids (`api`, `cloud-sql`, `e-api-sql`), not `2`, `3`, `4`. People editing the file
  later, and you on the next edit, find cells by id.
- Every vertex has `<mxGeometry x y width height as="geometry"/>`. Every edge has
  `<mxGeometry relative="1" as="geometry"/>`. The render script routes every edge except one whose
  style has `manualRoute=1`, which keeps its waypoints.
- XML comments are allowed and help the next editor, for example `<!-- row 2: the worker's stores -->`.

## Labels

`value` is HTML (`html=1`), so markup inside it must be escaped: `<` as `&lt;`, `>` as `&gt;`, `"`
as `&quot;`, `&` as `&amp;`.

| Label | `value` |
|---|---|
| Title only | `api` |
| Title + subtitle (the default for architecture nodes) | `&lt;b&gt;api&lt;/b&gt;&lt;br&gt;&lt;font style=&quot;font-size:10px&quot;&gt;Fastify, 2–3 replicas&lt;/font&gt;` |
| Two plain lines | `Cloud SQL&lt;br&gt;private IP` |

Keep a subtitle to one short line: a role, a technology or a port, not a sentence. Explanations
belong in the document's prose. Do not set text colours inside the HTML (`<font color>`), because
a fixed colour cannot follow the theme. Hierarchy comes from weight and size.

## Node styles

All node styles share this text part, abbreviated as `TEXT` below:

```
whiteSpace=wrap;html=1;fontFamily=Helvetica;fontSize=12;fontColor=light-dark(#0F172A,#E2E8F0);
```

Pick the role from what the component *is* to the reader, and use a role only when the diagram
has something of that kind. A colour that means nothing is noise.

| Role | Use for | Style (append `TEXT`) |
|---|---|---|
| actor | people, browsers, client apps, other teams | `rounded=1;arcSize=50;fontStyle=1;fillColor=light-dark(#F8FAFC,#1E293B);strokeColor=light-dark(#475569,#94A3B8);` |
| entry | gateway, load balancer, ingress, CDN, reverse proxy | `rounded=1;arcSize=12;fillColor=light-dark(#FFFBEB,#3A2A06);strokeColor=light-dark(#D97706,#FBBF24);` |
| service | our deployable code: API, worker, job, function, module | `rounded=1;arcSize=12;fillColor=light-dark(#F0F9FF,#082F49);strokeColor=light-dark(#0284C7,#38BDF8);` |
| store | database, bucket, cache, file store | `shape=cylinder3;boundedLbl=1;size=8;fillColor=light-dark(#F5F3FF,#2E1065);strokeColor=light-dark(#7C3AED,#A78BFA);` |
| queue | queue, topic, stream, event bus | `rounded=1;arcSize=12;fillColor=light-dark(#FFF7ED,#431407);strokeColor=light-dark(#EA580C,#FB923C);` |
| managed | a cloud service we use but do not run (Vertex AI, a managed KMS) | `rounded=1;arcSize=12;fillColor=light-dark(#F0FDFA,#042F2E);strokeColor=light-dark(#0D9488,#2DD4BF);` |
| external | a system owned by someone else (corporate IdP, a partner API, SaaS) | `rounded=1;arcSize=12;dashed=1;dashPattern=4 3;fillColor=light-dark(#FFFFFF,#0F172A);strokeColor=light-dark(#64748B,#94A3B8);` |
| security | identity provider, secret store, policy point | `rounded=1;arcSize=12;fillColor=light-dark(#FFF1F2,#4C0519);strokeColor=light-dark(#E11D48,#FB7185);` |

Flowchart shapes:

| Role | Style (append `TEXT`) | Size |
|---|---|---|
| terminal (start/end) | `rounded=1;arcSize=50;fontStyle=1;fillColor=light-dark(#F1F5F9,#1E293B);strokeColor=light-dark(#475569,#94A3B8);` | h 40 |
| step | `rounded=1;arcSize=12;fillColor=light-dark(#F0F9FF,#082F49);strokeColor=light-dark(#0284C7,#38BDF8);` | h 48, or 56 for two lines |
| decision | `rhombus;fillColor=light-dark(#FFFBEB,#3A2A06);strokeColor=light-dark(#D97706,#FBBF24);` | 120×80 minimum; question ≤ 3 words |
| failure / error end | `rounded=1;arcSize=12;fillColor=light-dark(#FFF1F2,#4C0519);strokeColor=light-dark(#E11D48,#FB7185);` | h 48 |
| data written or read | the `store` style | 120×60 |

### Sizes

Every shape of one class (box, pill, cylinder, rhombus) has the same size across the whole
diagram: the size its longest label needs. Uneven sizes read as emphasis that nobody meant, and
the lint reports `size-mismatch`. When you add a node whose label is longer than the others, grow
the whole class rather than that one box.

To work out a size: width = longest line + 32px, rounded up to the next 10. As upper bounds per
character, Helvetica 12px bold is about 6.7px, 12px regular about 5.6px, 10px regular about
4.7px, and CJK about 1em (12px).

## Groups (boundaries)

A group is a container vertex. **Its children's `x`/`y` are relative to the group's top-left
corner**, not to the page. Set `parent="GROUP-ID"` on each child.

```
boundary: rounded=1;arcSize=3;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;verticalAlign=top;align=left;spacingLeft=12;spacingTop=4;fontFamily=Helvetica;fontSize=11;fontStyle=1;dashed=1;dashPattern=6 4;fillColor=light-dark(#F8FAFC,#0B1220);strokeColor=light-dark(#94A3B8,#475569);fontColor=light-dark(#475569,#94A3B8);
trust:    same as boundary, with strokeColor=light-dark(#E11D48,#FB7185);fontColor=light-dark(#BE123C,#FDA4AF);
```

- Padding: the first child starts at relative `x=20`, `y=36`, so it clears the title. Leave 20px
  below and right of the last child.
- A node that is not a member must lie wholly outside the group's rectangle. Overlapping it
  claims a membership that is not true, and the lint fails it (`foreign-group`).
- Nest at most two levels (for example a cloud project containing a cluster).
- Groups for one tier (all the external systems, all the managed services) are optional. Use one
  only when it states a fact: who owns it, where it runs, or a trust boundary.

## Edges

Base style, abbreviated as `EDGE`:

```
edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;endSize=6;strokeWidth=1.25;fontFamily=Helvetica;fontSize=10;labelBackgroundColor=default;strokeColor=light-dark(#64748B,#94A3B8);fontColor=light-dark(#334155,#CBD5E1);
```

| Meaning | Append to `EDGE` |
|---|---|
| synchronous call or data flow | nothing |
| async message, event, notification, fire-and-forget | `dashed=1;dashPattern=5 4;endArrow=open;endSize=7;` |
| weak dependency (type-only import, optional, config-time) | `dashed=1;dashPattern=2 3;endArrow=open;endSize=7;` |
| both directions (one connection, two-way traffic) | `startArrow=block;startFill=1;startSize=6;` |
| the main path, when it must stand out | `strokeWidth=2;strokeColor=light-dark(#334155,#CBD5E1);` |

- Put every edge on `parent="1"`, even when both ends are inside the same group.
- `value` is the label: an action or protocol in 1–3 words (`SQL`, `/api, /ws`, `enqueue`,
  `signature request`). Leave it empty only when the two ends already say it all.
- If line styles or colours carry meaning, say what each one means in one sentence below the image
  in the markdown, for example "Dashed lines are type-only imports." That legend follows the page
  theme and stays readable at any zoom.

### Ports (choosing the side an edge uses)

The router picks sides automatically. Pin a side only when it picks a bad one, or when several
edges leave one side and need their own lanes:

```
exitX=1;exitY=0.5;exitDx=0;exitDy=0;     leave from the middle of the right side
entryX=0.5;entryY=0;entryDx=0;entryDy=0; enter at the middle of the top side
```

`X` runs 0 (left) to 1 (right), and `Y` runs 0 (top) to 1 (bottom). Several edges on one side get
spread ports (`exitY=0.25` / `0.5` / `0.75`). Move the far end so it lines up with its port; an
edge between a port and a box centre that misses it by a few pixels draws a jog, which the lint
reports as `jog`.

## Pitfalls the render script will reject

- A raw `<` inside an attribute: escape label markup.
- A child positioned in page coordinates inside a group: it lands far outside, and the lint reports
  `outside-group`.
- An edge whose `source` or `target` id does not exist.
- Two cells with one id.
