# <Resource group> API

## Overview

<!-- At most 5 sentences: which resource, who calls it, and what is out of scope (with links).
This document holds the high-level design and the processing of each operation. Parameters,
request bodies, response bodies and status codes are in the OpenAPI file. Shared rules
(authentication, error format, paging) are in conventions.md. Do not repeat either. -->

The <resource> API lets <callers> <do what>. It covers <list>. The stored structure of
<resource> is in [<Data document>](../data/<doc>.md). Rules shared by every route are in
[API conventions](conventions.md).

## Contract

<!-- Link the OpenAPI file. Say whether it is generated from code or written by hand. The lint
checks that every row of the API list exists in this file. -->

The request and response details are in [openapi.yaml](openapi.yaml). <It is generated from the
route schemas. | It is written by hand until the routes are built.>

## API list

<!-- One row per operation. Method and path in separate columns. The No. is the operation's
number, and the section below uses the same number. -->

| No. | Method | Path | Summary | Auth required | Caller |
|---|---|---|---|---|---|
| 1 | `<METHOD>` | [`<path>`](#<anchor>) | <One sentence.> | <Yes: session \| No> | <role> |

## Shared rules

<!-- Only rules shared by the operations of THIS resource that a flowchart cannot show, for
example a limit or an ordering. Delete this section if there are none. -->

- <Rule, one line.>

## Operation details

<!-- One ### section per operation, in the order and with the number of the API list. Each
section holds exactly two things: one or two sentences of purpose, and the processing flowchart.
Do not add tables, lists or more text. Everything the operation does goes in the flowchart:
every check in order, the transaction boundary, locks, writes, idempotent branches, published
events and every response with its status code. Response bodies, sort order and field rules go
in openapi.yaml. Event payloads and recipients go in the event catalogue. The heading is
"<No.>. <METHOD> <path>" so the lint can find the flowchart. -->

### 1. <METHOD> <path>

<One or two sentences: what the operation does, and who may call it.>

![Processing of <METHOD> <path>: checks, transaction and response](diagrams/<resource>-<operation>.drawio.svg)

## Decisions.> |

| No. | Event published | Recipients | When |
|---|---|---|---|
| 1 | [`<event>`](events.md#<anchor>) | <who> | <After commit, on …> |

## Decisions

- **D1. <Decision.>** <Why.> Rejected: <option, reason>.

## Limits and open questions

- <Item.> Status: <accepted limit | open>.

## Related documents

- [API conventions](conventions.md): authentication, errors and paging for every route.
- [<Document>](<path>): <why>.
