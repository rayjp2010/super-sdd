# Archive

Written after verify.md records `Decision: PASS` or `PASS WITH WARNINGS`. Precheck:

```
test -f <changeRoot>/verify.md
grep -qE '^Decision: (PASS|PASS WITH WARNINGS)$' <changeRoot>/verify.md
```

Order matters, because step 2 moves the change folder:

1. `openspec-sync-designs` merges each `## Durable Design` section of design.md into its target
   under `openspec/designs/`. Nothing else does this.
2. `openspec-archive-change` syncs the delta specs (via `openspec-sync-specs`), re-verifies each
   capability, then moves the folder to `openspec/changes/archive/YYYY-MM-DD-<change-id>/`.
3. Fill in Archive Execution Result below - after the move this file lives in the archived folder.

## Designs To Archive

| Durable Design section | Durable target | Sync result |
|---|---|---|
| `## Durable Design: openspec/designs/<topic>.md` | `openspec/designs/<topic>.md` | synced / failed |

If design.md records no durable design impact, replace the table with `No durable design impact.`

## Specs To Archive

| Delta spec | Main spec | Operation |
|---|---|---|
| `specs/<capability-path>/spec.md` | `openspec/specs/<capability-path>/spec.md` | added / modified / retired |

If there is no spec delta (`skip_specs: true`), write `No spec delta.`

## Commands Run Before Archive

| Command | Result | Notes |
|---|---|---|
| `openspec validate <change-id> --type change --strict --json` | pass / fail | ... |

## Archive Execution Result

Leave as `not-yet-executed` while this artifact is still a plan.

| Field | Value |
|---|---|
| Archive path taken | `openspec-archive-change` |
| Outcome | success / failure |
| Date | YYYY-MM-DD |
| Post-archive folder | `openspec/changes/archive/YYYY-MM-DD-<change-id>/` |
| Capabilities synced | ... |
| Durable design files synced | ... or none |

No main spec this change created may still carry a `TBD - created by archiving change` Purpose
placeholder; check with `grep -rn "TBD - created by archiving change" openspec/specs/`.

## Residual Follow-Ups

- From verify.md, or `None`.
