# API conventions

## Overview

<!-- Rules that every operation of every resource follows. A resource document links here and
does not repeat these rules. If the API has an OpenAPI document, say where it is and which of
the two is the source of truth. -->

These rules apply to every route of <API>. The machine-readable contract is <OpenAPI location>.
<Which one wins if they disagree.>

## Authentication and authorization

| No. | Rule | Enforced by |
|---|---|---|
| 1 | <Every route needs a session, except …> | <layer or hook> |

## Errors

<!-- One error format for the whole API, for example RFC 9457 problem details. -->

| No. | Field | Meaning |
|---|---|---|
| 1 | `type` | <…> |

| No. | Status | Used when |
|---|---|---|
| 1 | 400 | <The request does not parse.> |
| 2 | 404 | <The resource is missing, or the caller may not see it.> |
| 3 | 409 | <…> |

## Paging

<!-- Delete if no route pages. -->

| No. | Parameter | Meaning |
|---|---|---|
| 1 | `<after>` | <…> |

## Idempotency and retries

| No. | Operation type | Safe to retry | How duplicates are handled |
|---|---|---|---|
| 1 | <GET> | Yes | — |

## Compatibility

<!-- How the API changes without breaking clients: versioning policy, deprecation. -->

- <Rule.>

## Decisions

- **D1. <Decision.>** <Why.> Rejected: <option, reason>.

## Limits and open questions

- <Item.> Status: <accepted limit | open>.

## Related documents

- [<Resource> API](<resource>.md): <why>.
