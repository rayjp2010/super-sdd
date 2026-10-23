# Observability

## Overview

<!-- At most 5 sentences: which signals exist, where they go, and what an operator uses them for. -->

<The system> writes <logs, metrics, traces> to <destination>. This document owns the log levels,
the required fields, what may never be logged, the metrics and the alerts.

## Signals

| No. | Signal | Tool | Retention | Owner |
|---|---|---|---|---|
| 1 | Logs | <tool> | <days> | <team> |

## Logs

| No. | Level | Use when | Example event |
|---|---|---|---|
| 1 | `error` | <an operation failed and needs an operator> | <…> |
| 2 | `info` | <…> | <…> |

| No. | Required field | Meaning |
|---|---|---|
| 1 | `<requestId>` | <One sentence.> |

| No. | Never log | Log instead |
|---|---|---|
| 1 | <tokens, personal data> | <a hash, an id> |

## Correlation

<!-- How one user action is followed across processes. A sequence diagram if it crosses more
than two processes. -->

- <Rule.>

## Metrics

| No. | Metric | Type | Labels | Meaning |
|---|---|---|---|---|
| 1 | `<name>` | <counter, gauge, histogram> | <labels> | <One sentence.> |

## Alerts

| No. | Alert | Condition | Severity | Response |
|---|---|---|---|---|
| 1 | <name> | <expression, duration> | <page, ticket> | [<Runbook>](runbooks/<task>.md) |

## Decisions

- **D1. <Decision.>** <Why.> Rejected: <option, reason>.

## Limits and open questions

<!-- Include what is not yet verified in a deployed environment. -->

- <Item.> Status: <accepted limit | open>.

## Related documents

- [<Document>](<path>): <why>.
