# Proposal

## Source

- Project context read:
  - `<paths or commands>`

## Why

`<problem or opportunity, why now; 1-2 sentences>`

## What Changes

- `<addition, modification, or removal; mark breaking changes **BREAKING**>`

## Intended Direction

`<provisional direction in one line; leave comparison and justification to design.md>`

## Capabilities

Paths may nest (`identity/user-auth`); use kebab-case for new segments.

### New Capabilities

| Capability path | Delta spec | One-line description |
|---|---|---|
| `<capability-path>` | `specs/<capability-path>/spec.md` | ... |

### Modified Capabilities

List only spec-level behavior changes whose main spec already exists.

| Capability path | Delta spec | What requirements change |
|---|---|---|
| `<existing-path>` | `specs/<existing-path>/spec.md` | ... |

### No Spec-Level Change

For zero-capability changes, delete both tables, explain why behavior is unchanged, and set
`skip_specs: true` in `.openspec.yaml`.

## Impact

- `<affected code, APIs, dependencies, or services>`

## Durable Design Impact

Each target gets a `## Durable Design: <target>` section in design.md.

| Target | Operation | Reason |
|---|---|---|
| `openspec/designs/<topic>.md` | create / update | ... |

If nothing durable is affected, replace the table with: `No durable design impact.`
