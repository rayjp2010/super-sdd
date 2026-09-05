# Verification

Date: <YYYY-MM-DD>
Implementation range: <BASE>..<HEAD>

## Structural Validation

| Command | Result | Evidence |
|---|---|---|
| openspec validate <change-id> --type change --strict --json | <pass/fail> | <fresh output summary> |
| openspec schema validate super-sdd --verbose | <pass/fail/n/a> | <evidence or reason> |

## Design Coverage

- Expected documents: <proposal inventory>
- Actual documents: <CLI-reported files>
- Content, links, and target ownership: <check result; list any mismatches>

## Task Completion

<Completed/total; non-blocking rationale and follow-up for each open or deferred task.>

## Validation Evidence

| Command or check | Result | Evidence or not-applicable rationale |
|---|---|---|
| <every command promised in tasks> | <pass/fail/n/a> | <fresh output summary> |

## Sync Readiness

| Kind | Source document | Durable destination | State |
|---|---|---|---|
| spec / design | <change-local path> | <target, or none> | will-sync / already-manually-synced / not-applicable |

## Deviations, Risks, And Lessons

<Brief findings and follow-ups, including blocking status; or None with rationale.>

Decision: <PASS / PASS WITH WARNINGS / FAIL>
