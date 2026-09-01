# Tasks

Implementation plan only; reference design.md instead of restating it.

## Scope

Replace the placeholder with exactly one `Scope: <value>` line at column 1:

- `runtime` - production behavior changes; verification requires implementation commits and at
  least one completed task.
- `no-runtime` - spec, schema, config, generated metadata, or docs only.

Scope: <value-here>

## Files To Create Or Modify

| Path | Operation | Purpose |
|---|---|---|
| `<path>` | create / modify / delete | ... |

## Task Checklist

These are the file's only checkbox lines. Apply tracks every checkbox; this workflow requires each
task ID to be unique and to match its `## N.` group (the CLI does not check numbering for custom
schemas). State how each task is verified.

## 1. `<group name>`

- [ ] 1.1 `<first executable task, and how it is verified>`
- [ ] 1.2 `<second executable task, and how it is verified>`

## 2. `<next group>`

- [ ] 2.1 `<executable task, and how it is verified>`

## Execution Plan

2-5 minute steps per task with exact files and commands. RED/GREEN/REFACTOR for runtime behavior
changes; explicit no-runtime/doc/config labels where TDD does not apply. No checkbox syntax here.

### Task 1.1 - `<description from the checklist>`

1. RED - write or update the failing test.
   - File: `<path>` | Command: `<test command>` | Expected: `<expected failure>`
2. GREEN - smallest change that passes.
   - File: `<path>` | Command: `<test command>` | Expected: pass
3. REFACTOR - clean up, behavior unchanged.
   - Command: `<test command>` | Expected: pass
4. COMMIT - `<commit message>`

### Task 1.2 - `<description from the checklist>`

1. ...

## Validation Commands

- The commands that prove the tasks are done (tests, lint, type check, schema validation, manual
  checks).

## Review Checkpoints

- When spec-compliance, code-quality, or human review happens. A task is `- [x]` only after its
  implementation and required review pass.

## Rollback Or Recovery Notes

- How to revert or recover if validation fails.

## Deferred Items

- Item, rationale, owner or follow-up, and confirmation that deferring it does not affect accepted
  specs or durable design.
