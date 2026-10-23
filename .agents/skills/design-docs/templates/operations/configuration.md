# Configuration

## Overview

<!-- At most 5 sentences: where settings come from, how they are validated, and that this is the
single list of settings. Business rules do not belong here: link to their owner. -->

Each application reads its settings from <source> at startup and refuses to start if a setting
is invalid. This document is the only list of settings. Secrets are delivered by <mechanism>.

## Sources

<!-- Where a value comes from, and which source wins. -->

| No. | Source | Used in | Precedence |
|---|---|---|---|
| 1 | <environment variables> | <all environments> | <1, highest> |
| 2 | <env file> | <local only> | <2> |

## Settings

<!-- One table per application. One line per setting. "Meaning" is one sentence. A setting that
needs more gets a note under the table. -->

### <Application>

| No. | Setting | Required | Default | Allowed values | Meaning |
|---|---|---|---|---|---|
| 1 | `<NAME>` | <yes, no> | <value> | <range, enum, format> | <One sentence.> |

## Startup validation

- <Rule. Example: a duration must be an integer number of milliseconds.>

## Derived values

<!-- Values computed from other settings. Give the formula and the constraint between them. Add a
timeline diagram only when several timings must fit inside each other. -->

| No. | Value | Formula | Constraint |
|---|---|---|---|
| 1 | <deadline> | `<A> - <B>` | <must stay below …> |

## Secrets

| No. | Secret | Delivered by | Rotation |
|---|---|---|---|
| 1 | `<NAME>` | <mechanism> | <how and how often> |

## Decisions

- **D1. <Decision.>** <Why.> Rejected: <option, reason>.

## Limits and open questions

- <Item.> Status: <accepted limit | open>.

## Related documents

- [Deployment](../architecture/deployment.md): where each setting is supplied.
