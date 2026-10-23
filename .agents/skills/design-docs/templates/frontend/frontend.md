# <Frontend area>

## Overview

<!-- At most 5 sentences: which screens, which stack, and what this document owns. -->

The <area> lets <users> <do what>. It is built with <stack>. This document owns client state,
how server events change the screen, and the behavior of each screen.

## Stack

| No. | Concern | Choice |
|---|---|---|
| 1 | <framework> | <name> |

## State ownership

<!-- Every piece of client state has one owner. -->

| No. | State | Owner | Source | Lifetime |
|---|---|---|---|---|
| 1 | <room list> | <store> | <route, event> | <session> |

## Server events

| No. | Event | Client action |
|---|---|---|
| 1 | [`<event>`](../api/events.md#<anchor>) | <One sentence.> |

## Screens

<!-- One ### section per screen or panel: purpose, layout, editability, messages. -->

### <Screen>

<One sentence: purpose.>

| No. | Element | Editable when | Message when locked |
|---|---|---|---|
| 1 | <cell or control> | <condition> | <text> |

## Accessibility

| No. | Rule | Check |
|---|---|---|
| 1 | <Every control has a label.> | <test or tool> |

## Errors and offline behavior

| No. | Situation | Screen behavior |
|---|---|---|
| 1 | <socket closed> | <…> |

## Decisions

- **D1. <Decision.>** <Why.> Rejected: <option, reason>.

## Limits and open questions

- <Item.> Status: <accepted limit | open>.

## Related documents

- [<Document>](<path>): <why>.
