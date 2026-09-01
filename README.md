# super-sdd

A custom OpenSpec workflow schema. It adds three things to the built-in `spec-driven` workflow:

1. **Two evidence artifacts after implementation.** `verify.md` (did it work, is the artifact set
   consistent) and `archive.md` (what was synced where, and the archive result).
2. **A durable design tree.** OpenSpec's `design.md` is change-local: it gets archived with the change
   and nothing carries its decisions forward. Here a change's `design.md` can declare
   `## Durable Design: <path>` sections, merged at archive time into a long-lived `openspec/designs/`
   tree the way spec deltas are merged into `openspec/specs/`.
3. **Binding Superpowers skills** on the phases where a shortcut costs most: brainstorming for design,
   writing-plans for tasks, verification-before-completion for verify, subagent-driven-development for
   apply.

Verified against **OpenSpec CLI 1.11.0**.

## Contents

Paths mirror where each file installs, so installing is a copy.

```
openspec/schemas/super-sdd/schema.yaml       the workflow: 6 artifacts + apply
openspec/schemas/super-sdd/templates/*.md    one template per artifact
openspec/config.yaml                         repo-wide context + apply/archive guidance
.agents/skills/openspec-sync-designs/        the design-sync skill (no CLI equivalent exists)
```

That is everything custom. The nine `openspec-*` skills a project needs (`openspec-new-change`,
`openspec-continue-change`, `openspec-apply-change`, `openspec-archive-change`, ...) come from the CLI.
Do not copy them from another repo or they will drift from your CLI version.

## Prerequisites

- **OpenSpec CLI 1.11.x** (`openspec --version`). Older CLIs lack `openspec instructions`,
  `openspec status`, and the `skip_specs` / `retire_capabilities` metadata the schema relies on.
- **The Superpowers plugin**, for the four binding skills. Without it, the design, tasks, verify, and
  apply artifacts are told to stop rather than proceed ad hoc. To drop that coupling, delete the
  `REQUIRED SKILL (binding)` paragraph from those four instructions in `schema.yaml`.

## Install into a project

```bash
cd <your-project>
openspec init                 # generates openspec/ and the openspec-* skills for your tools

SUPER_SDD=/Users/rui.a.ding/workspace/playground/super-sdd
cp -R "$SUPER_SDD/openspec/schemas/super-sdd" openspec/schemas/
cp -R "$SUPER_SDD/.agents/skills/openspec-sync-designs" .agents/skills/
```

Then point the project at the schema. If `openspec/config.yaml` is still just `schema: spec-driven`,
replace it wholesale:

```bash
cp "$SUPER_SDD/openspec/config.yaml" openspec/config.yaml
```

If you already have a config, merge by hand: set `schema: super-sdd` and copy the `context:` and
`operations:` blocks across. Both matter, see *How the pieces reach the agent*. Edit `context:` to
match your project's conventions; it is repo-specific by nature.

If your tool reads skills from `.claude/skills/`, symlink like the CLI does:

```bash
ln -s ../../.agents/skills/openspec-sync-designs .claude/skills/openspec-sync-designs
```

Verify:

```bash
openspec schema validate super-sdd --verbose     # expect: valid
openspec templates --schema super-sdd            # expect: all 6 templates resolve
openspec schemas                                 # expect: super-sdd (project)
```

Run these from the project root. `openspec` resolves the nearest `openspec/` from the working
directory, so a stale `cd` makes it report the schema as missing.

## Using it

The workflow is `proposal -> specs -> design -> tasks -> [apply] -> verify -> archive`.

```bash
openspec new change <change-id> --schema super-sdd
```

Then drive it with the CLI-generated skills; each reads this schema and does the right thing:

| Step | What to invoke |
|---|---|
| Create the next artifact | `openspec-continue-change` |
| All artifacts in one pass | `openspec-propose` |
| Implement the task checklist | `openspec-apply-change` |
| Merge the durable design delta | `openspec-sync-designs` (before archiving) |
| Archive | `openspec-archive-change` |

Useful directly:

```bash
openspec status --change <change-id> --json                  # which artifacts are done
openspec instructions <artifact> --change <change-id>        # exactly what the agent is told
openspec validate <change-id> --type change --strict --json  # structural check
```

**Archive order matters.** `openspec-sync-designs` must run *before* the change folder moves.
Archiving only syncs `specs/`; nothing else merges `## Durable Design` sections, and an unsynced delta
is archived silently with the change. `operations.archive.guidance` in `config.yaml` reminds the agent
of this, because the archive skill reads that field.

## How the pieces reach the agent

Worth understanding before editing, because the CLI fails quietly here.

`openspec instructions <artifact>` assembles the prompt from three sources:

| Source | Field | Rendered as |
|---|---|---|
| `schema.yaml` | `artifacts[].instruction` | `<instruction>` |
| `schema.yaml` | `artifacts[].template` | `<template>` |
| `config.yaml` | `context:` | `<project_context>`, on every artifact |
| `config.yaml` | `rules: {<artifact-id>: [...]}` | `<rules>`, on that artifact only |
| `config.yaml` | `operations.{apply,archive}.guidance` | guidance in `openspec instructions apply\|archive` |

**The schema loader silently strips unknown keys.** It keeps only:

```
name, version, description, artifacts, apply
artifacts[]: id, generates, description, template, instruction, requires
apply:       requires, tracks, instruction
```

Anything else, such as `completion_criteria`, `required_skills`, `global_output_rules`, or a
`workflow:` block, is dropped by a non-strict Zod schema, and `openspec schema validate` still reports
the schema as valid. An earlier version of this schema lost about 28% of its content that way. So:

- Per-artifact gates belong in that artifact's `instruction` (here, as a `DONE WHEN:` tail).
- Repo-wide rules belong in `config.yaml` `context:`.
- Nothing belongs in a key you invented.

To check that an edit to `schema.yaml` landed, read it back through the CLI's own loader instead of
trusting `schema validate`. From the project root:

```bash
P=$(dirname $(dirname $(readlink -f $(which openspec))))/@fission-ai/openspec
node -e "import('$P/dist/core/artifact-graph/schema.js').then(m=>{
  const s=m.loadSchema('openspec/schemas/super-sdd/schema.yaml');
  console.log(Object.keys(s), Object.keys(s.artifacts[0]));})"
```

Whatever it does not print, the agent never sees. The cheaper check is
`openspec instructions <artifact> --change <id> --json`: if your text is not in that output, it does
not exist as far as the workflow is concerned.

## CLI behavior the artifact instructions encode

These rules are already written into the instructions and templates. The list is for whoever edits
them next.

- **SHALL/MUST must sit on the requirement's body line**, not only in the `### Requirement:` header.
  A header-only keyword is reported as missing.
- **A scenario is any non-fenced level-4 heading** under a requirement, not only `#### Scenario:`.
  A level-3 heading is not a scenario, and the requirement is reported as having none. Use the
  canonical `#### Scenario: <name>` form anyway, since the tooling and readers both expect it.
- **A new capability's delta should open with `## Purpose`** (1-2 sentences, 50+ characters). The sync
  copies it verbatim into the new main spec. Without it, the main spec gets a
  `TBD - created by archiving change ...` placeholder to fix by hand. Do *not* add `## Purpose` to a
  delta for an existing capability; it is ignored.
- **`## MODIFIED Requirements` needs the entire original block** copied in before editing, every
  scenario included. Partial content silently loses the omitted scenarios at archive time.
- **Zero-delta changes need `skip_specs: true`** in `openspec/changes/<id>/.openspec.yaml`, or
  `openspec validate` rejects them. Use it for pure refactor, tooling, and docs work. Never invent a
  requirement to satisfy validation.
- **Removing a capability's last requirement needs `retire_capabilities: true`** in the same file, or
  archive aborts rather than delete the main spec.
- **A delta spec at `specs/spec.md`** (no capability directory) is ignored by the merge path; the CLI
  errors on it.
- **Task-ID numbering is not checked for custom schemas.** `collectTaskNumberingIssues` returns early
  unless the change uses the built-in `spec-driven` schema. The unique-ID and matching-`## N.`-group
  rules in `tasks.md` are this workflow's convention, enforced by review, not by the CLI.
- **`REMOVED Requirements` metadata** (`**Reason**`, `**Migration**`) is likewise this workflow's
  convention. OpenSpec parses only the requirement names.

## Upgrading OpenSpec

On a new CLI version, re-check the two version-coupled things:

1. The loader's accepted key set (`dist/core/artifact-graph/types.js`). A newly supported field may let
   you delete prose from an `instruction`.
2. Whether `openspec-archive-change` still archives agent-side. In 1.11.0 it merges specs via
   `openspec-sync-specs` and moves the folder itself; it does **not** call `openspec archive`. The
   `archive` artifact's instruction names that path explicitly and would need updating if it changes.

Then run `openspec update` to regenerate the `openspec-*` skills, and re-run the verification commands
above.
