---
name: openspec-sync-designs
description: Sync a change's durable design delta into the designs tree. Use when the user wants to merge the "## Durable Design" sections of a change's design.md into openspec/designs/, typically just before archiving (archiving does NOT sync designs).
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: hr-agent
  version: "1.0"
---

Sync a change's durable design delta into the `openspec/designs/` tree.

This is an **agent-driven** operation - you will read the change's `design.md` and directly
edit the durable design docs to apply the changes. Archiving only syncs the `specs/` delta;
nothing touches `openspec/designs/`, so this skill is the design counterpart of
`openspec-sync-specs` and MUST run **before** the change folder is archived.

Unlike spec deltas, design docs have no fixed grammar - they are whatever form the design
needs: free-form prose, Mermaid diagrams, OpenAPI, tables, or a structured spec format.
There is no `### Requirement` / `#### Scenario` grammar to parse. Merge by judgment: locate
the section named by the delta, apply the change, and preserve everything else.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show changes that have a `design.md`.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Find the durable design delta**

   Run `openspec status --change "<name>" --json` and read `design.md` from the change root it
   reports (`artifactPaths` / `changeRoot`) rather than assuming a repo-relative path.

   `design.md` contains:
   - `## CONTEXT` - change-local rationale; **NOT synced** to the durable doc
   - zero or more `## Durable Design: <durable-path>` sections, where `<durable-path>` is the
     target file such as `openspec/designs/architecture.md`, `openspec/designs/api/openapi.yaml`,
     or `openspec/designs/data-model/data-model.md`

   Each `## Durable Design` section holds the operations to apply, as subsections:
   - `### ADDED` - new content to insert into the durable doc
   - `### MODIFIED` - content whose heading is quoted from the durable doc and changes
   - `### REMOVED` - content to delete

   **No durable design impact**: if `design.md` says `No durable design impact.` or has no
   `## Durable Design` section, there is nothing to sync. Inform the user and stop.

3. **For each `## Durable Design` section, apply changes to its target**

   a. **Read the section** to understand the intended changes, and read `## CONTEXT` for rationale
      (context informs your merge but is never copied).

   b. **Read the durable target** at `<durable-path>` (may not exist yet).

   c. **Apply changes intelligently**:

      **ADDED:**
      - Insert the new content into the durable doc at the sensible location.
      - If a section with that heading already exists → treat as implicit MODIFIED (reconcile to match).

      **MODIFIED:**
      - Locate the section by its quoted heading in the durable doc.
      - Apply the described change - replacing or amending the content.
      - Preserve sibling sections and unrelated content not mentioned in the delta.

      **REMOVED:**
      - Delete the named section from the durable doc.

      **Structured-format targets** (the durable doc is a machine format, not prose - e.g. OpenAPI YAML, JSON Schema, a config file):
      - Merge by the format's natural unit instead of by heading. For OpenAPI that is path + operation + schema; for other formats, the equivalent keyed entry.
      - ADDED = add the entry; MODIFIED = update it in place; REMOVED = delete it. Keep the rest of the document intact and valid.

   d. **Do NOT sync `## CONTEXT`**, and do not carry the `## Durable Design: <path>` heading itself
      into the durable doc - it is a routing label, not content.

   e. **Create the durable target** if it does not exist yet:
      - Create `<durable-path>` (and any parent directory).
      - Seed it with the ADDED content. Add a short heading/intro if the doc needs one.
      - Preserve any cross-doc convention used by neighbouring designs (e.g. the `> Part of the architecture overview` lead line) when creating a sub-design under `openspec/designs/`.

4. **Show summary**

   After applying all changes, summarize:
   - Which durable design files were updated or created
   - What changed in each (sections added/modified/removed)

**Key Principle: Intelligent Merging**

- The delta represents *intent*, not a wholesale replacement of the durable doc.
- Quote-and-locate: a MODIFIED section names the heading to find; you apply the change and leave the rest of the doc untouched.
- Diagrams stay Mermaid; never convert a flow/sequence/state diagram to ASCII art.
- The operation should be idempotent - running twice should give the same result.

**Output On Success**

```
## Designs Synced: <change-name>

Updated durable designs:

**openspec/designs/<topic>.md**:
- Added section: "Account export pipeline"
- Modified section: "Authentication"

**openspec/designs/api/openapi.yaml**:
- Added operation: POST /accounts/export

Durable designs are now updated. Run `openspec-archive-change` next to sync the spec delta and move the change folder.
```

**Guardrails**
- Run BEFORE the change folder is archived (archiving does not sync designs).
- Read both the delta and the durable target before making changes.
- Preserve existing durable content not mentioned in the delta.
- Never sync `## CONTEXT`.
- If something is unclear, ask for clarification.
- Show what you're changing as you go.
- The operation should be idempotent - running twice should give the same result.
