# Architecture overview

## Overview

<!-- At most 5 sentences: what the system does, for whom, its main parts, and which
documents give the details. -->

<System> <does what> for <users>. It has <N> deployable parts: <list>. This document shows how
the parts connect. It does not describe their internals. See [Document map](../README.md#document-map).

## System context

<!-- C4 level 1: the system as one box, its users and the external systems. Draw with the
technical-diagrams skill (draw.io). -->

![<The system, its users and the external systems it calls>](diagrams/overview-context.drawio.svg)

| No. | External system | Used for | Owner document |
|---|---|---|---|
| 1 | <name> | <one line> | [<Integration>](../integrations/<system>.md) |

## Containers

<!-- C4 level 2: each deployable or data store, and the protocol on each connection. -->

![<The containers and the connections between them>](diagrams/overview-containers.drawio.svg)

| No. | Container | Technology | Responsibility | Details |
|---|---|---|---|---|
| 1 | <name> | <framework, runtime> | <One sentence.> | [<Component>](../components/<app>.md) |

## Repository layout

<!-- Optional. Top-level folders only. The component documents own the inside of each. -->

| No. | Path | Responsibility |
|---|---|---|
| 1 | `<path>/` | <One sentence.> |

## Cross-cutting rules

<!-- Rules that apply to every container. One imperative line each. Link to the owner. -->

- <Rule.> See [<owner>](<path>).

## Capacity

| No. | Dimension | Design basis |
|---|---|---|
| 1 | <Concurrent users> | <value> |

## Risks

| No. | Risk | Effect | Response |
|---|---|---|---|
| 1 | <What can go wrong> | <What the user or operator sees> | <What to do, or a link to the runbook> |

## Decisions

<!-- One entry per decision. Format: bold title, then the reason, then the rejected options.
Cross-cutting decisions get a decision record in ../decisions/ and a one-line link here. -->

- **D1. <Decision as a statement.>** <Why, 1 to 3 sentences.> Rejected: <option, reason>.

## Limits and open questions

- <Limit or question.> Status: <accepted limit | open>.

## Related documents

- [<Document>](<path>): <why to read it next>.
