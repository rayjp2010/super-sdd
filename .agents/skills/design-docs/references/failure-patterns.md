# Failure patterns

A review of 15 design documents (about 91,000 words) found the same 14 failures in almost every
document. A review of the first skill outputs found one more (number 14). Each entry below has a real example, the rewrite, and the rule that prevents it.
Use this file to learn what to look for when you restructure or review a document.

Measured on that set:

| No. | Measure | Value | Target |
|---|---|---|---|
| 1 | Largest document | 17,000 words, about 85 minutes of reading | Under 2,500 words |
| 2 | Table cells over 25 words | 413, the longest has 191 words | 0 |
| 3 | Negation words per 1,000 words | 28 to 89, typical 45 | Under 15 |
| 4 | Sentences over 25 words | 5 % to 26 % | 0 |
| 5 | Documents with a glossary | 0 of 15 | One glossary for the set |

Average sentence length was normal (17 words). The difficulty came from structure, negations,
pointers and slang more than from sentence length.

## 1. The rule is inside its argument

The reader looks for the rule and finds an essay. Rules, reasons and rejected alternatives are
in one paragraph, often in a table cell.

> `resolution` is not a cached status, and the distinction is the whole of why it is allowed
> here. A cached status would be a local answer to *what Adobe says*, consulted in place of
> asking; the step never does that, and completion asks the service every time.

**Rewrite.** Put the rule in the reference table. Put the reason in `## Decisions`.

| No. | Column | Data type | PK | FK | Nullable | Default | Note |
|---|---|---|---|---|---|---|---|
| 5 | `resolution` | `text` | | | Yes | | Whether this room has an outstanding signature request. The document lock reads it. |

> **D4. Store only whether a request is outstanding.** The lock reads the value on every panel
> read. A call to Adobe Acrobat Sign on each read makes every render depend on that service.
> Completion asks Adobe Acrobat Sign every time. Rejected: cache the signature status.

## 2. History instead of the current design

Text that tells how the code got here is wrong after the next change.

> `inviter_user_id` is nullable: rows written before it existed have none, and a reader
> substitutes the room's creator.

**Rewrite.** "`inviter_user_id` can be null. If it is null, show the room creator as the
inviter." The migration and the change record keep the history.

## 3. Negations and double negatives

The reader must invert each negation to find the rule, and makes mistakes.

> A conditionally required field that is not currently required is not outstanding and does
> not hold up approval.

**Rewrite.** "A conditionally required field blocks approval only when its condition applies."

## 4. Vague pointers

"The same way", "for that reason" and "as above" send the reader to search.

> Conversion is per-pod for the reason the drainer is.

**Rewrite.** "Each worker pod runs its own conversion sidecar. The sidecar and the queue
drainer start and stop with the pod, and a failure stays inside one pod."

## 5. Project slang and undefined terms

The documents used about 15 private terms with no definition: *fence*, *held*, *wedged*,
*drainer*, *reaper*, *settle*, *arm*, *teeth*, *the four-or-five answer*. "Gate" had three
meanings.

> A document whose job ends unresolved is wedged.

**Rewrite.** "If a registration job ends with outcome `unresolved`, the document stays
read-only for members and for the agent. Only a manual resolution releases it (see the runbook
[Resolve an unresolved registration](...))." Put *registration job* and *unresolved* in the
glossary. Do not use *wedged*.

## 6. One thing, many names

Readers think that different names are different things.

| No. | One thing | Names found |
|---|---|---|
| 1 | The resync read | sync, resync, resynchronization, resynchronisation, reconnection read |
| 2 | A blocked document | locked, read-only, frozen, closed, held |
| 3 | The external registry | 人事出向DB, 出向管理システム, the record, the external system, remote |

**Rewrite.** Pick one name in the glossary. Put the other names in its "Do not use" column.

## 7. Overloaded table cells

A table is for scanning. A 145-word cell with bold text and three rules cannot be scanned.

**Rewrite.** One fact per cell, at most 25 words. One item per row: a data-model row holds one
database column, never "six `source_*` columns". If a row needs more, add a note under the
table with the row name as its label, or a `###` section that the cell links to.

## 8. Long sentences with stacked clauses

> Whether a request is outstanding is asked by every panel read that computes a lock,
> synchronously and constantly, and is answered from the room's own note of the terminal fact
> once some act has learned it.

**Rewrite.** "Every panel read computes the document lock. To do this, the api reads
`adobe_sign_requests.resolution`. The api does not call Adobe Acrobat Sign for this read."

## 9. File paths and private function names

They rot. One document had 21 links to files that no longer existed.

> `progressFor` in `apps/api/src/plugins/app/rooms/rooms-repository.ts` decides that moment.

**Rewrite.** State the rule: "The api derives the step list from the room's `documents` rows."
If readers need the code location, add it to the final `## Code map` section.

## 10. Content in the wrong document

- About 600 lines of document field schemas were in the Room API document.
- A database repair runbook was in the architecture overview.
- Frontend state rules were in the local-development document.

**Rewrite.** Classify each section by kind (see SKILL.md, step 1). Move it to the document of
that kind and link to it.

## 11. One fact in several documents

The converter sidecar was described in 4 documents. The event list was in 2 documents, and the
two lists did not agree.

**Rewrite.** One owner per fact. The other documents link to the owner.

## 12. No entry point

1,900-line documents started with a 3-sentence overview, no table of contents and no reading
order. One document used "condition 2 below" 1,300 lines before it defined the conditions.

**Rewrite.** Start with `## Overview`: scope, what is out of scope, and the main rules at a
glance. Define a term or a numbered condition before its first use.

## 13. Flows and states in prose only

The registration job lifecycle (held, pending, processing, done, failed, with outcomes) was
spread over three documents and had no state diagram. The lock conditions had no decision table.

**Rewrite.** One state diagram and one transition table, in the workflow document that owns the
lifecycle.

## 14. Flowcharts that do not read well

Mermaid placed the nodes of even an 8-node API flowchart badly. Reviewers asked for draw.io for
every flowchart.

**Rewrite.** Draw every flowchart in draw.io (technical-diagrams skill). Keep Mermaid for
sequence, ER and state diagrams.

## 15. Dead things and essay style

- Unused columns and unreachable states had paragraphs of explanation ("It is not dead.").
- Rhetoric: "three honest states", "The predicate's teeth are the single-flight index",
  "Order matters more than it looks", "We keep the fold."

**Rewrite.** Put one line for each unused item in `## Limits and open questions`. Remove the
rhetoric and state the fact.

## What worked and is kept in the templates

- Ownership statements: "This document owns three things" and a `Design | Owns` map.
- Rule tables with a reason column: `Mechanism | Rule | Failure prevented`.
- Outcome and recovery tables: `Case | Row | Event | Other viewers`,
  `Stall | What holds the room | How it clears`.
- Imperative one-line rules: "Enqueue the message and its queue entry in one transaction."
- Worked examples that make a rule checkable, for example a rounding table.
- Explicit limits: "What is not enforced", "Validation caveats", "Accepted limit".
- Sequence diagrams with concrete values, for example "sub E10000001 becomes mnno 10000001".
