# Writing rules

These rules adapt ASD-STE100 Simplified Technical English (STE), Issue 9 (2025), to software
design documents. STE was made for maintenance manuals that readers with any level of English
must understand correctly the first time. A design doc has the same reader: a person, often not
a native speaker, who must act on the text without asking the writer.

The rules below are paraphrased. ASD owns the copyright of the standard and its dictionary.
Do not copy the standard's text or its dictionary into a repository. The rule numbers refer to
Issue 9, so you can look up the official wording.

**What this adaptation changes.** Full STE allows only the words of its dictionary. A design doc
uses many names that no dictionary has: code identifiers, table names, product names, domain
terms. STE calls these *technical nouns* (rule 1.5) and allows them. This adaptation keeps all
the STE writing rules. In place of the dictionary, it uses the project glossary as the list of
approved terms.

## Contents

- [A. Words](#a-words)
- [B. Verbs](#b-verbs)
- [C. Sentences and paragraphs](#c-sentences-and-paragraphs)
- [D. Procedures](#d-procedures)
- [E. Warnings and cautions](#e-warnings-and-cautions)
- [F. Punctuation and word counts](#f-punctuation-and-word-counts)
- [G. Design-doc rules](#g-design-doc-rules)
- [H. Word choices](#h-word-choices)
- [I. Review checklist](#i-review-checklist)

## A. Words

| STE | Rule | Lint |
|---|---|---|
| 1.3, 9.2 | Use a word with one meaning only. "Lock" is the document lock. Do not also use it for a row lock in the same document. Write "row lock". | — |
| 1.5, 1.8 | Technical nouns are allowed: identifiers in backticks, table and column names, routes, events, settings, product names and domain terms. Each one must be in the glossary or be a code contract. | — |
| 1.7 | Do not use a technical noun as a verb. Write "add a row to `agent_queue`", not "queue it". | — |
| 1.9 | If no term exists, choose a short one (at most 3 words) that a new reader understands. Add it to the glossary. | — |
| 1.10 | No slang, jargon or metaphors: *wedged*, *teeth*, *load-bearing*, *honest*, *arm*. | `rhetoric` |
| 1.11, 9.4 | Use the same term for the same item every time. The glossary lists the names you must not use. | — |
| 1.14 | Use American English spelling. Keep quoted UI text and domain terms as they are. | — |
| 2.1 | A noun cluster has at most 3 words. Write "the lease of the registration job", not "registration job lease expiry check". A code identifier counts as one word. | — |
| 2.2 | Write a term in full at its first use in each document, with its abbreviation in parentheses. Then use the abbreviation. | — |

**Domain terms in another language.** Use the domain term itself (for example 出向者) when the
business uses it and no English word has the same exact meaning. Give it an English meaning in
the glossary. Use the same form every time: 日曜日の取扱い and 日曜日の取り扱い are two terms
to a reader and to a search.

## B. Verbs

| STE | Rule | Lint |
|---|---|---|
| 3.2 | Use simple tenses: present for what the system does ("The api refuses the save"), past for a recorded fact ("The test measured 3 s"). Use the future only for planned items, and also mark them **Planned**. | `perfect-tense` |
| 3.4, 3.6 | Use the active voice and name the actor: the api, the worker, the member, the agent, the operator. Use the passive only when the actor is unknown or does not matter. | `passive` (info) |
| 3.5 | Do not use "-ing" forms as verbs ("is cascading"). An "-ing" word is allowed as a noun or a technical noun ("logging", "routing"). | `progressive` |
| 3.7 | Use a verb for an action, not a noun. "The worker validates the payload", not "performs validation of". | `filler` |
| 9.3 | Do not use phrasal verbs. "Configure" not "set up", "find" not "find out", "do" not "carry out". | `phrasal-verb` |

**Must, imperative, or statement.**
- A rule for the implementer: imperative. "Store the lease end in `lease_expires_at`."
- A behavior of the system: simple present. "The api answers 409 when the revision is stale."
- An invariant that code and data must keep: "must". "The `revision` must increase on each save."
- Use "should" only for a recommendation, and say what happens if the reader ignores it.

## C. Sentences and paragraphs

| STE | Rule | Lint |
|---|---|---|
| 6.3 | A descriptive sentence has at most 25 words. Aim for 15 to 20. | `sentence-length` |
| 6.1 | One subject per sentence. Give information step by step. | — |
| 4.2 | Do not leave out words to make a sentence short. Keep articles ("the", "a") and "that". | — |
| 4.3 | Put complex text in a vertical list. If a sentence has three "and"s or "or"s, make a list. | — |
| 4.4 | Use connecting words between sentences: "then", "because", "if", "but", "also". | — |
| 6.4, 6.5 | One topic per paragraph. The first sentence states the topic. | — |
| 6.6 | A paragraph has at most 6 sentences. | `paragraph-length` |
| — | At most one negation in a sentence. State what is true: "Only the creator can delete a room", not "No member except the creator can delete a room". | `negation` |
| — | Put the most important information first: the rule, then the condition, then the reason. | — |

## D. Procedures

Runbooks and any numbered list of steps that a person or a process does.

| STE | Rule | Lint |
|---|---|---|
| 5.1 | A step has at most 20 words. | `sentence-length` (numbered items) |
| 5.2 | One action per step. Two actions in one step are allowed only if they happen at the same time. | — |
| 5.3 | Write the step as a command: "Run …", "Stop …", "Record …". | — |
| 5.4 | Put a condition first: "If the job status is `failed`, go to step 6." | — |
| 5.5 | A note gives information. It does not give an instruction. | — |
| — | After a step that changes a state, give the expected result: "Result: the query returns one row." | — |

## E. Warnings and cautions

Use a warning or a caution when a reader can lose data, break security, or corrupt the state of
an external system (STE 7.1–7.3).

- **WARNING:** a risk to people, security or personal data.
- **CAUTION:** a risk of data loss, data corruption, or damage to an external system.

Start with a clear command, then give the risk. Put it immediately before the step or rule it
applies to.

> **CAUTION:** Hold the advisory locks until step 4 commits. If you release them before, a
> superseded worker can write to the registry in the same period.

## F. Punctuation and word counts

| STE | Rule | Lint |
|---|---|---|
| 8.1 | Do not use semicolons. Write two sentences or a list. | `semicolon` |
| — | Do not use a dash to add a second idea to a sentence. Write a second sentence. | `dash-aside` |
| 8.3 | Use parentheses only for a reference, an abbreviation, a unit, or a short explanation. | — |
| 8.4 | The colon before a list counts as a period. The lead-in and each list item are separate sentences. | — |
| 8.5–8.7 | These count as one word: a code identifier, a number with its unit, a quoted label, a proper noun, a hyphenated group, and text in parentheses. | (the lint counts them so) |

## G. Design-doc rules

These rules are not in STE. They come from the failures that make design docs hard to read (see
[failure-patterns.md](failure-patterns.md)).

| Rule | Why | Lint |
|---|---|---|
| Write the current design only. No "previously", "no longer", "legacy", "today", issue numbers or migration stories. | History is wrong after the next change. Git and the change record keep it. | `history` |
| Separate the rule from its reason. The body states rules. `## Decisions` holds the reasons and the rejected alternatives. A table can have a short "Why" column with one sentence. | The reader scans for the rule. The argument hides it. | — |
| Name the thing again instead of a pointer ("the same way", "as above", "that mechanism"). | The reader must not search for the antecedent. | `vague-reference` |
| Define a term or a numbered item (for example "condition 2") before its first use, or link to its definition. | A forward reference makes the reader jump. | — |
| A table cell holds one fact in at most 25 words. | Tables are for scanning. | `cell-length`, `cell-sentences` |
| Every table starts with a `No.` column, numbered from 1 in each table. | Readers count rows and refer to a row by its number. | `table-number` |
| A table row describes one item. A data-model column table has one database column per row. | A reader who looks for one item must find its row. | `one-column-per-row` |
| Every flowchart is a draw.io `.drawio.svg`. Sequence, ER and state diagrams stay Mermaid. | Mermaid lays out flowcharts badly. | `flowchart-format` |
| API request and response details go in the OpenAPI file, not in markdown tables. | One machine-checkable contract, no hand-written copy. | `openapi` |
| An API operation section has its purpose and its flowchart only. The flowchart is the only description of the processing. | A text copy of a flow drifts from the picture. | `operation-text` |
| Explain a reference item (a database table, an entity) with bullet points, one fact each (STE 4.3). Keep everything about it in its own section, including its indexes and constraints. | The reader finds all facts about one item in one place, one line each. | `entity-bullets`, `entity-local` |
| Name contracts, not code. A table, column, route, event, setting or exported schema is a contract. A file path or a private function is not. List code locations only in `## Code map` at the end. | Code paths rot, and design-doc drift is invisible to tests. | `code-path` |
| Mark the status of each mechanism that is not built: **Planned** or **Open**. Do not mix planned behavior into a description of built behavior. | The reader must know what exists. | — |
| Mark observed facts about external systems as observed, and give the date and the method. Mark assumptions as assumed. | An assumption that looks like a fact causes outages. | — |
| Document an unused column or unreachable state in one line in `## Limits and open questions`. | Paragraphs about dead things cost reading time and suggest that they matter. | — |
| No rhetoric, no "we", no persuasion. State the fact. | A reference informs. It does not argue. | `rhetoric` |
| One owner per fact. Link to the owner, do not copy. | Copies drift apart. | — |
| A heading names a topic in at most 10 words. It does not state an argument. | Headings are the reader's map. | `heading-length` |

## H. Word choices

| Use | Do not use |
|---|---|
| to | in order to |
| use | utilize, make use of, leverage |
| before, after | prior to, subsequent to |
| if | in the event that |
| about | with regard to |
| can | is able to |
| some, 3 (the number) | a number of |
| start, configure, do, find, stop, remove | kick off, set up, carry out, find out, shut down, take out |
| for example, followed by every item | etc., and so on |
| the api, the worker, the member | we, our, us |
| (delete it) | simply, merely, clearly, obviously, actually, really, very, note that |

## I. Review checklist

Read the document once as a new team member who knows the technology but not this system.

1. Does `## Overview` say, in at most 5 sentences, what the document covers and what it does
   not cover?
2. Can the reader answer the document's main question in two minutes?
3. Is every term in the glossary or defined at its first use? Is each name the glossary name?
4. Does every flow, sequence or set of states have a diagram? Do the names in the diagram match
   the text?
5. Is every rule in the body, and every reason in `## Decisions`?
6. Is every planned or open item marked?
7. Does each fact appear in this document only, with links from the others?
8. Is there any sentence that the reader must read twice? Rewrite it.
