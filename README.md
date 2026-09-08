# super-sdd

A custom OpenSpec workflow with adaptive design documents, durable design sync, and evidence gates.
Version **1.11.0.8**: revision **8**, checked against **OpenSpec CLI 1.11.0** and compatible with **1.11.x**.

The six artifacts are proposal, specs, design, tasks, verify, and archive. Implementation happens after
tasks, verification records fresh evidence afterward, and archive records the sync and move results.
The `design` artifact is a set of files, not a fixed document list.

## Install

Prerequisites: OpenSpec CLI 1.11.x and the Superpowers skills for brainstorming, writing plans,
subagent-driven development, and verification. Those four skills are binding: the relevant phase stops
if its skill is unavailable. Companion skills support TDD, worktrees, review, and debugging.

In the target project's `mise.toml`:

```toml
[tools]
"github:rayjp2010/super-sdd" = "1.11.0.8"
```

Then, from that project's root:

```bash
mise install
openspec init          # skip if the project already has openspec/
super-sdd install
```

`super-sdd install` copies the schema into `openspec/schemas/` and the sync skill into
`.agents/skills/`, mirroring the skill into `.claude/skills/` when that directory already exists.
It warns, without blocking, when the installed OpenSpec CLI is outside the series this version
targets. A `openspec/config.yaml` that still holds only the defaults from `openspec init` is replaced
with this repository's config; one carrying real project settings is left alone, and you merge the
`context` and `operations` blocks yourself. Existing files are never overwritten without `--force`,
which is also how you re-run the installer after `mise up`.

Without mise, clone this repository and run its `bin/super-sdd install` from the target project, or
copy `openspec/schemas/super-sdd` and `.agents/skills/openspec-sync-designs` across by hand.

Use the CLI-generated OpenSpec skills; do not copy their implementations from another project.
Run all commands from the intended project's root. If mise has the CLI installed but no active version,
use `mise exec npm:@fission-ai/openspec@1.11.0 -- openspec ...` without changing global settings.

```bash
openspec schema validate super-sdd --verbose
openspec templates --schema super-sdd
openspec new change <change-id> --schema super-sdd
```

## Versioning

Releases are `<openspec-version>.<super-sdd-revision>`: the full OpenSpec CLI version this workflow
was checked against, then this workflow's own revision. Version `1.11.0.8` is revision 8, checked
against OpenSpec CLI 1.11.0.

The revision keeps counting up as the workflow changes, so 1.11.0.8 is followed by 1.11.0.9. When a
new OpenSpec release is checked, the first three fields move to it and the revision carries on:
1.11.1.10, then 1.12.0.11.

Pin `= "1.11.0.8"` for an exact revision. Shorter pins take the newest release under that prefix:
`= "1.11.0"` stays on revisions checked against OpenSpec 1.11.0, and `= "1.11"` follows the 1.11.x
series without ever crossing into a release built for a different one.

The root `VERSION` file is the source of truth. It must have four numeric fields, its last field must
equal `version:` in `openspec/schemas/super-sdd/schema.yaml`, and a release tag must be
`v$(cat VERSION)`; the release workflow refuses to publish otherwise. Releasing is `git tag v<version> && git push --tags`, which
attaches a `git archive` tarball of the repository to a GitHub release.

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

Bump the pin in `mise.toml`, then `mise install && super-sdd install --force`. That replaces the
schema and sync skill together; merge any revised config guidance by hand, since an edited
`openspec/config.yaml` is never overwritten. The schema revision number is informational; it does not
pin older changes to an older copy of the schema.

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

When you change the schema, raise `version:` in `schema.yaml` and the last field of `VERSION` together,
and run `bash test/install_test.sh`; it checks that pairing along with the installer's behavior. When
you check the workflow against a new OpenSpec release, move `VERSION`'s first three fields to that
release's version.
