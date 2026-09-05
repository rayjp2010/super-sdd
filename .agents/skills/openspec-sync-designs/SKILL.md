---
name: openspec-sync-designs
description: Sync all of a change's durable design deltas into openspec/designs/ before archiving. Use when asked to sync designs or prepare design sync for archive, including multiple designs/**/*.md documents and legacy design.md changes. OpenSpec's spec sync and archive do not merge designs.
compatibility: Requires OpenSpec CLI 1.11.x and filesystem access.
metadata:
  author: rui
  version: "2.0"
---

Merge design deltas into durable documents, then verify every destination before the change moves.
This is an agent-driven merge: OpenSpec discovers files but does not parse or merge design content.

## 1. Resolve the change and paths

Use the change named by the user or unambiguously established in the conversation. Otherwise run
`openspec list --json` and ask the user to select; do not guess between changes.

Run `openspec status --change <name> --json`. Resolve:

- Change-local files from `changeRoot` and `artifactPaths.design.existingOutputPaths`.
- The proposal from `artifactPaths.proposal.existingOutputPaths`.
- Durable destinations from `planningHome.root`, under its `openspec/designs/` tree.

Read every reported design file, not just the first. Read the proposal's **Design Documents** inventory.
Also inspect `changeRoot` for legacy `design.md` and files under `designs/` so neither layout is hidden by
an old schema's output pattern. A missing design set is an error, not a no-op.

**Legacy changes:** if only `design.md` exists, read it and reconcile its targets against the proposal's
**Durable Design Impact** section. Legacy-only sync remains supported even when a newer schema reports
no matching outputs. If both layouts exist, stop before writes and reconcile them into the new layout
and inventory; never merge both blindly or silently ignore either. For continued work under revision 8,
migrate the legacy file to `designs/overview.md` and update the inventory and links first. Do not rewrite
archived changes as part of migration.

## 2. Check full coverage before editing

OpenSpec marks a glob artifact complete after one matching file exists. Status `done` is not evidence
that all planned documents exist or that their content is finished.

Compare the complete actual file set with the proposal inventory, then read all routing sections:

- Every listed document must exist and every actual document must be listed. Resolve unfinished
  placeholders and broken links between change-local design documents.
- Each inventoried destination must have exactly one nonempty `## Durable Design: <target>` section
  in its owning document. No undeclared targets or duplicate target ownership, even if deltas agree.
- Each document without destinations must explicitly say `No durable design impact.` and contain no
  durable delta sections. Missing sections without this marker are an error. In legacy mode, also require
  the proposal's explicit no-impact declaration for a no-op.
- Resolve target paths against `planningHome.root`. Reject targets that escape its `openspec/designs/`
  tree, including through symlinks. Compare normalized destinations to catch duplicate aliases.
- Read every existing destination and identify all ADDED/MODIFIED/REMOVED operations before any writes.
  Resolve ambiguous headings/keys or conflicting operations first. A new destination requires ADDED
  content; do not silently treat MODIFIED against a missing destination as creation.

If any check fails, report source files and mismatches and stop before editing. When every document is
explicitly no-impact, report a successful no-op with the checked source list. Do not archive yourself.

## 3. Merge each owned destination

`## CONTEXT` explains the chosen approach and rationale. Read it to inform the merge, but never copy it
or the `## Durable Design:` routing heading into the durable document.

Use only the operations present:

- **ADDED:** insert new content at the appropriate location. If already present and equivalent, leave
  it unchanged; reconcile a matching heading/key to the intended content without duplicating it.
- **MODIFIED:** locate the exact existing heading or structured key, then update its content while
  preserving unrelated sections. If already in the intended state, leave it unchanged.
- **REMOVED:** delete the named section/key, preserving its siblings. Already absent is a no-op.

For Markdown, merge by headings. For OpenAPI, JSON Schema, or other structured formats, merge by natural
keys (for example, path + operation + schema), not Markdown headings. Preserve valid syntax and use
available format validation. Create missing destinations from ADDED content, following neighboring
conventions. Keep flow, sequence, and state diagrams in Mermaid.

Merge synchronously while `changeRoot` still exists. If an error occurs after some writes, report the
partial results and stop; do not claim success or proceed to archive. A rerun should recognize already
applied operations and safely finish the remaining changes.

## 4. Verify and report

Re-read every destination and compare it with all intended operations. Confirm unrelated content was
preserved, structured files remain valid, and a second application would introduce no further changes.
If any mismatch remains, report it as a failure and block archive.

Report one row per source/destination with `synced`, `already synced`, `no-impact`, or `failed`, plus a
brief description of changed sections/keys. Include no-impact source documents even in mixed changes.
Record this result in the change's prepared archive.md when present. On complete success, the caller
can run `openspec-archive-change` to sync specs and move the change folder. This skill never moves it.
