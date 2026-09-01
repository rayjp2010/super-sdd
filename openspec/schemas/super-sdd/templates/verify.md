# Verification

Every claim cites fresh command output or an explicit not-applicable rationale.

## Verify Date

YYYY-MM-DD

## Implementation Range

Commit range: `<BASE>..<HEAD>`

## Overall Decision

Replace this section with exactly one `Decision: <value>` line at column 1.

- `Decision: PASS` - all blocking checks pass.
- `Decision: PASS WITH WARNINGS` - non-blocking warnings recorded; safe to proceed.
- `Decision: FAIL` - a blocking check failed; loop back to apply.

Move the chosen line out of this indented example:

```
    Decision: <CHOSEN-VALUE>
```

## 1. Structural Validation

| Command | Result | Notes |
|---|---|---|
| `openspec validate <change-id> --type change --strict --json` | pass / fail | ... |
| `openspec schema validate super-sdd --verbose` | pass / fail / n/a | Only when schema files were touched |

## 2. Task Completion

- Task Checklist complete: yes / no. Completed: `<done>/<total>`.
- Open or deferred rows: each with its reason and whether it blocks archive.

## 3. Behavior And Validation Evidence

Every command from tasks.md Validation Commands, plus manual or no-runtime checks.

| Command or check | Result | Evidence summary |
|---|---|---|
| `<command>` | pass / fail / n/a | ... |

## 4. Delta-Spec Sync State

Pre-archive the expected state is `will-sync`.

| Capability path | State | Notes |
|---|---|---|
| `<capability-path>` | will-sync / already-manually-synced / not-applicable | ... |

## 5. Design-Delta Sync State

One row per `## Durable Design` target in design.md. If design.md records no durable design impact,
replace the table with `Not applicable - no durable design impact.`

| Target | State | Notes |
|---|---|---|
| `openspec/designs/<topic>.md` | will-sync / already-manually-synced / not-applicable | ... |

## 6. Deviations, Residual Risks, And Lessons

- **Deviations** - task, scope, spec, or durable-design deviations. `None` if there are none.
- **Residual risks** - risk, owner or follow-up, blocking status. `None` if there are none.
- **Lessons** - evidence-backed and worth carrying forward. `None` if there are none.

## Blockers

List blockers, or `None`.
