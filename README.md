# super-sdd

A custom OpenSpec workflow with adaptive design documents, durable design sync, and evidence gates.
Revision **8**, compatible with **OpenSpec CLI 1.11.x**; checked against **1.11.0**.

The six artifacts are proposal, specs, design, tasks, verify, and archive. Implementation happens after
tasks, verification records fresh evidence afterward, and archive records the sync and move results.
The `design` artifact is a set of files, not a fixed document list.

## Install

Prerequisites: OpenSpec CLI 1.11.x and the Superpowers skills for brainstorming, writing plans,
subagent-driven development, and verification. Those four skills are binding: the relevant phase stops
if its skill is unavailable. Companion skills support TDD, worktrees, review, and debugging.

From the target project:

```bash
openspec init
SUPER_SDD=/path/to/super-sdd
cp -R "$SUPER_SDD/openspec/schemas/super-sdd" openspec/schemas/
cp -R "$SUPER_SDD/.agents/skills/openspec-sync-designs" .agents/skills/
```

Set `schema: super-sdd` in `openspec/config.yaml` and merge this repository's `context` and `operations`
blocks with your project conventions. For a fresh config, copy this repository's config directly.
If your tool uses `.claude/skills/`, create its directory and link the custom skill there:

```bash
mkdir -p .claude/skills
ln -s ../../.agents/skills/openspec-sync-designs .claude/skills/openspec-sync-designs
```

Use the CLI-generated OpenSpec skills; do not copy their implementations from another project.
Run all commands from the intended project's root. If mise has the CLI installed but no active version,
use `mise exec npm:@fission-ai/openspec@1.11.0 -- openspec ...` without changing global settings.

```bash
openspec schema validate super-sdd --verbose
openspec templates --schema super-sdd
openspec new change <change-id> --schema super-sdd
```

## Normal use

| Phase | Action |
|---|---|
| Plan | Use `openspec-continue-change` to create the next artifact, or `openspec-propose` to prepare implementation prerequisites. |
| Implement | Use `openspec-apply-change`; it reads all designs and tracks tasks.md. |
| Verify | Produce verify.md after implementation, with fresh evidence and a passing decision before archive. |
| Archive | Prepare archive.md, run `openspec-sync-designs`, then `openspec-archive-change`; finalize the record at the reported archive destination. |

Configuration's archive operation guidance coordinates those steps. A prepared record is not proof of
execution. Never archive after a failed or incomplete sync; OpenSpec's archive does not merge designs.
The sync skill also works independently when explicitly requested.

Inspect the current workflow with:

```bash
openspec status --change <change-id> --json
openspec instructions design --change <change-id> --json
openspec instructions apply --change <change-id> --json
openspec validate <change-id> --type change --strict --json
```

## Adaptive designs

The proposal's **Design Documents** table inventories change-local paths, purposes, and durable targets.
Choose the smallest useful set from the application, existing designs, and user instructions. These are
examples, not required presets:

| Change | Possible change-local documents |
|---|---|
| Small refactor or docs change | designs/overview.md |
| Web checkout change | designs/checkout-ui.md, designs/payment-api.md |
| Batch ingestion change | designs/ingestion.md, designs/recovery.md |
| Multiple applications | designs/web/session.md, designs/api/authorization.md |

Each document uses the same small template. `CONTEXT` holds change-local decisions and alternatives.
`Durable Design: openspec/designs/<target>` sections carry ADDED/MODIFIED/REMOVED content to sync before
archive. A document may own multiple destinations; a destination has only one owner per change.
Cross-reference related documents instead of repeating decisions. Update the inventory when the split
changes. With no durable destination, keep brief context and the explicit `No durable design impact.` line.

Paths inside a change start from CLI-reported `changeRoot`. Durable targets start from `planningHome.root`
and stay inside its `openspec/designs/` tree. Archive paths start from `planningHome.changesDir`.
Use `artifactPaths.design.existingOutputPaths` for discovery and read every path in apply `contextFiles`.

**Completion limitation:** OpenSpec treats `designs/**/*.md` as done once any matching file exists.
It does not check the inventory, content, or target ownership. Before tasks, apply, verification approval,
and sync, the workflow checks the complete set and stops on missing/unlisted files, unfinished content,
broken design links, or conflicting destinations. These are agent-enforced checks, not CLI validation.

## Upgrade existing projects

Replace the schema and sync skill together, and merge the revised config guidance. The schema revision
number is informational; it does not pin older changes to an older copy of the schema.

For each active legacy change:

1. Resolve `changeRoot` through status JSON. Move its design.md to designs/overview.md inside that root,
   preserving all context and durable delta sections. Split it further only when useful.
2. Replace **Durable Design Impact** in the proposal with **Design Documents**, including every local
   document and its destinations. Use `none` for an explicit no-impact document.
3. Update design links in tasks and other artifacts. Re-run coverage and verification before proceeding.

The sync skill can still read a legacy-only design.md and its old proposal section. Under revision 8,
however, that file alone does not complete the design artifact: migrate before continuing the workflow.
If both layouts exist, reconcile them before sync. Leave archived changes untouched.

## Maintaining the schema

Templates define document structure; schema instructions define workflow rules. Project `context` is
injected into artifact instructions, `rules` can add per-artifact guidance, and `operations` supplies
apply/archive guidance. Unknown schema keys are silently stripped, so do not invent fields for gates.
Check rendered instructions as well as schema validation. In 1.11.0, `instructions archive` is a reserved
operation command and does not return the archive artifact's instruction/template. That is why archive
sequencing lives in `operations.archive.guidance`, which resolves the template through `openspec templates`.
Likewise, apply's `all_done` response replaces its custom instruction; operation guidance retains the
verification requirement. See the official
[schema reference](https://openspec.dev/docs/schemas/schema-yaml),
[customization guide](https://openspec.dev/docs/customize-schemas), and
[configuration reference](https://openspec.dev/docs/configuration/config-yaml).

Preserve these contracts when simplifying:

- Specs use capability directories, body-level SHALL/MUST, and level-4 Scenario headings. MODIFIED
  includes the full requirement and every scenario. New capabilities need a meaningful Purpose.
- No-spec changes set `skip_specs: true`; retiring a capability sets `retire_capabilities: true`.
- Only task checklists use checkboxes. Unique task IDs and removal Reason/Migration metadata are
  workflow conventions, not custom-schema CLI checks.
- Verify retains scope/commit prechecks and evidence decisions. Files existing does not mean these
  gates passed; verify/archive must happen after implementation, not during initial planning.

On CLI upgrades, check supported schema fields, glob output discovery, and generated apply/archive
instructions. Run `openspec update` to refresh generated skills; it does not update this custom schema
or the custom sync skill. Revalidate the schema and all six templates afterward.
