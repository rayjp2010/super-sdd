# Layout: placing nodes so the lines stay straight

The router can only route around the boxes it is given. Placement decides whether a diagram reads
cleanly, and placement is a question about meaning: which step comes first, and which store belongs
to which service. No layout engine knows that, so plan it before writing any coordinates.

## 1. Classify every edge first

Walk the edge list once and tag each edge:

- **main path**: the reader's primary journey. For architecture, the request path from the actor
  inward. For a flowchart, the common case from start to end.
- **branch**: a node that hangs off one main-path node: its store, its external call, the
  exceptional outcome of a decision.
- **shared**: a node used by two or more main-path nodes (a database that both api and worker
  use).
- **return**: an edge going back against the reading direction (a retry loop, a callback, a reply).
- **cross-link**: anything else. If there are many cross-links, the diagram may be two diagrams.

## 2. Assign grid cells

Lay the nodes on a grid of columns and rows, and write the plan down before the XML, for example:

```
cols:  0 actor | 1 entry | 2 services | 3 stores | 4 external
row 1: Shopper → CDN → storefront-api ................ Payments (api only)
row 2:                 fulfilment-worker ............. Carrier API (worker only)
shared between rows 1–2, col 3: Orders DB, Object store (api + worker)
```

Placement rules, in order of importance:

1. **Main path in reading order, on one line.** Architecture, topology and dependency maps read
   left→right, with the actor (browser, user, client) in the far-left column on the first
   node's row. Flowcharts read top→bottom. Readers expect that direction, so never flip or rotate
   it to fix a layout problem; fix the placement instead. Consecutive main-path nodes share a
   centre line, so their edge is straight. An edge coming into a group enters through the group's
   side, never through its title band, so put the first node inside a group on the same row as its
   caller outside.
2. **A branch sits directly beside its owner**, in the owner's row (architecture) or column
   (flowchart), on the side away from the main path. Its edge is one straight segment.
3. **A shared node sits between its users.** Two users in rows 1 and 3 put the shared store in
   row 2 of the next column. Both edges are short, and neither crosses the other. When several
   shared nodes have the same users, stack them in one column.
4. **Returns use an empty corridor.** Keep one side of the main path free (in a flowchart, usually
   the left, 40px or more outside the outermost box), and route the return there: give the edge
   `via` points at the corridor's corners. The router takes the shortest path, so without `via`
   a return cuts through the middle, even with its ports pinned.
5. **Spread a fan-out.** A node with four or more edges on one side spreads them over ports
   (`exit: "bottom:0.2"` … `"bottom:0.8"`), or moves some counterparts to another side. Two lines
   must never leave from the same point unless they share a destination direction. An N-way split
   (one answer into five outcomes) is a normal-size node centred over the row of outcomes. Never
   use one box stretched across all the columns: every box in a diagram has the same size.
6. **Group boundaries are rectangles.** If the members of a group cannot sit in one contiguous
   block of cells, rearrange the grid before you draw the group. Never let a non-member sit inside
   the rectangle.
7. **Externals go to the outer edge**, on the row of the node that calls them. If two nodes call
   the same external, it is a shared node (rule 3).

Then check each non-main edge against the plan: its straight or one-bend path must not cross a box
or another edge. If it does, move the endpoint that is *not* on the main path, and check again.

## 3. Turn cells into centre coordinates

The spec takes centres (`cx`, `cy`), so a row is one `cy` and a column is one `cx`.

- Every box gets its class size (the builder prints it, for example `box 180×52`). Step columns
  by box width + gap, and rows by box height + gap.
- **Column gap**: at least 60px, and at least the widest edge label crossing that gap + 40px. A
  10px label runs about 5px per character.
- **Row gap**: 40px with no labels on the vertical edges, 60px with labels.
- A group adds 20px on each side and 36px on top for its title. Leave that room between a group's
  members and any node outside it.
- Use multiples of 10.
- **Width budget: about 1000px, at most about 1100px.** Markdown viewers fit the image to their
  text column (about 980px on GitHub), so a 1400px diagram shrinks 12px text to 8px. Estimate
  before placing: sum of column widths + gaps + 40px per group + 32px border. If it is over, in this order:
  1. Stack a tier into two rows instead of one long row.
  2. Shorten subtitles; the class width follows the longest label.
  3. Narrow gaps that carry no label down to 60px.
  4. Split the diagram into an overview and a detail diagram.

  Never rotate the reading direction to save width.

## Diagram-type notes

**Architecture / deployment.** One question per diagram: "what runs where and what it talks to" is
a different diagram from "how a request is authenticated". Keep runtime boundaries (cluster,
project, external) as groups, and leave protocol details to edge labels.

**Flowchart / process.**
- The happy path is the spine, one column of shared centre `x`.
- At a decision, the answer that continues the spine goes down; the other answer goes right. Label
  both outgoing edges (`Yes`/`No`, or the condition).
- A branch that rejoins comes back into the spine from the side, with ports pinned.
- Several end states sit at the bottom, failures to one side. Use the failure style for error ends.
- Steps are verb phrases of six words or fewer.
- When who-does-what matters, use one boundary group per actor as a lane: stacked rows for a
  left→right flow, side-by-side columns for a top→bottom flow.

**Dependency / module graph.**
- Order the layers by dependency direction: dependents on the left, dependencies on the right
  (or top to bottom). Every runtime edge then points the same way.
- An edge against that direction is a return. Draw it in its weak style (for example type-only),
  in a corridor below the layers.
- When a node is imported by most of the others, put it last in a column of its own, so the edges
  into it converge instead of crossing.

## Visual review checklist

After the lint is clean, open the light and dark previews and check:

1. Trace the main path start to end. Does it start at the actor on the far left (or the start at
   the top, for a flowchart), and move in one direction without doubling back?
2. Follow every edge. Does its arrowhead land on the right box, pointing the right way?
3. Is every label next to its own line, and not covering another line?
4. Does any box look as if it belongs to a group it is not in?
5. In the dark preview, is all text readable, with no white boxes or invisible lines?
6. Is the spacing even, with no cramped column next to a large empty area?
7. Does every node and edge from the inventory appear exactly once?
