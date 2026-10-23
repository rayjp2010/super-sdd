---
name: design-docs
description: "Write, merge, restructure or review prose that explains how a system works — design documents in the project's design folder (for example openspec/designs/ or a change's designs/), and any architecture, API, data-model, workflow, integration, configuration, security, observability, runbook, ADR or glossary doc. Typical asks: document a new endpoint; write up a job's states and what on-call does when it is stuck; merge an integration that several docs describe differently; restructure a huge doc without losing facts; make a change's design text follow the templates before sync or archive; check long sentences, stacked negations or Simplified Technical English (STE). Gives a template per doc kind, a doc-set folder layout, STE writing rules and a lint script. Not for READMEs, user manuals, translations, implementation plans, WHEN/THEN spec scenarios, code changes or diagram-only edits."
---

# Design docs

A design doc is a reference that a reader scans to answer one question fast: "what does the
system do here, and what must stay true?" Most hard-to-read design docs fail in the same ways:

- They mix the rule and the argument for the rule, so the reader cannot find the rule.
- They tell the history of the code, which is wrong soon.
- They use long sentences with many negations, vague pointers ("the same way") and project slang.
- They put essays into table cells, and copy one fact into several documents.
- They describe a flow or a state machine in prose where a diagram and a table do the job.

[references/failure-patterns.md](references/failure-patterns.md) shows each failure with a real
example and its rewrite. This skill prevents them with three tools: a **template** per document
kind, **writing rules** based on ASD-STE100, and a **lint script**. Diagrams follow the
`technical-diagrams` skill.

`<skill-dir>` below is the directory that holds this SKILL.md. Run the lint with Node 18+:
`node <skill-dir>/scripts/ste-lint.mjs <file.md> --kind <kind>`. If the project pins Node with
a version manager, use its `node` binary.

## 1. Classify: one document, one kind

Find the kind before you write. One document holds one kind. If the material has two kinds
(for example an API doc that also defines the stored document schema), write two documents and
link them.

| Kind (`--kind`) | Answers | Template | Required diagram |
|---|---|---|---|
| `index` | Where is each fact? What do I read first? | `templates/README.md` | None |
| `glossary` | What does this term mean? | `templates/glossary.md` | None |
| `overview` | What are the parts of the system and how do they connect? | `templates/architecture/overview.md` | C4 context and container (draw.io) |
| `deployment` | Where does each part run, and how does it scale and roll out? | `templates/architecture/deployment.md` | Deployment topology (draw.io) |
| `api` | What can a client call, and what happens on each call? | `templates/api/api.md` + `openapi.yaml` | One draw.io processing flowchart **per operation** |
| `api-conventions` | What is shared by all operations (auth, errors, paging)? | `templates/api/conventions.md` | None |
| `events` | Which events exist, who publishes them, who receives them? | `templates/api/events.md` | Fan-out sequence |
| `data-model` | What is stored, who owns it, what constraints hold? | `templates/data/data-model.md` | ER diagram |
| `workflow` | Which states exist, and what moves an item between them? | `templates/workflows/workflow.md` | State diagram |
| `component` | How is one application or module built inside? | `templates/components/component.md` | Dependency map (draw.io) |
| `integration` | How do we talk to one external system, and what if it fails? | `templates/integrations/integration.md` | Sequence per operation |
| `configuration` | Which settings exist, with which defaults and limits? | `templates/operations/configuration.md` | Timeline, only for derived timings |
| `observability` | What do we log, measure and alert on? | `templates/operations/observability.md` | None |
| `security` | Who is trusted, how are they identified, what threats are controlled? | `templates/security/security.md` | Trust boundaries, auth sequence |
| `frontend` | Who owns client state, and how does each screen behave? | `templates/frontend/frontend.md` | Event-to-UI sequence, if any |
| `runbook` | What steps does an operator do, in which order? | `templates/operations/runbook.md` | None |
| `decision` | Why did we choose this, and what did we reject? | `templates/decisions/decision.md` | None |

Template paths are relative to `<skill-dir>`. The template folders match the doc-set layout in
[references/doc-set.md](references/doc-set.md). Put a new document in the same folder of the
project's design tree.

## 2. Find the owner of each fact

Every fact has exactly one owning document. Other documents link to it and do not copy it.
Copies drift apart, and then the reader cannot know which copy is correct.

1. Read the doc set's index (`README.md`) and glossary first, if they exist.
2. For each fact you want to write, find the document that owns it. If one exists, edit that
   document or link to it.
3. Follow the project's own rules for where design lives. For example, a project can say that
   a change proposes its design as a delta and a sync step merges it. The templates apply to
   the durable content inside such a delta, too.

## 3. Collect the facts before you write

List the facts in your working notes, not in the document. Take them from the code, the specs,
the change, or the existing document. For each fact, record:

- **Status:** implemented, planned or open. Readers must see which is which.
- **Kind of statement:** rule or contract (goes in the body), reason (goes in `## Decisions`),
  limit or gap (goes in `## Limits and open questions`), operator steps (goes in a runbook),
  history (goes nowhere; git and the change record keep it).

When you restructure an existing document, this list is also the proof that you lost nothing.
At the end, check every fact on the list against the new text. Report facts you removed on
purpose (history, dead code), so a reviewer can disagree.

## 4. Fill the template

Copy the template, then fill it section by section.

- Keep the section order. Readers learn where to look, and the order puts the summary first and
  the reasons last.
- Delete optional sections you do not need. Keep the required ones. Write `None.` in a required
  section that has no content, so the reader knows the gap is real and not forgotten.
- Delete every `<!-- guidance -->` comment and every `<placeholder>`. The lint fails on them.
- Every document of a common kind ends with these sections, in this order:
  `## Decisions`, `## Limits and open questions`, `## Related documents`.
  - `## Decisions`: one short entry per decision. The rest of the document states only what is
    true. A decision that affects several documents gets its own decision record.
  - `## Limits and open questions`: accepted limits, known gaps, unused columns or code, and
    open questions. Write one line each, with its status.
- Keep a document under about 2,500 words (about 12 minutes of reading). Above 4,000 words,
  split it by topic and update the index.
- **Every table starts with a `No.` column**, numbered 1, 2, 3 in each table. Readers count
  rows and refer to a row by its number. One row describes one item.

### API documents: the markdown and the OpenAPI file

The markdown holds the high-level design: the API list, the shared rules, and one section per
operation. An operation section has only its purpose (one or two sentences) and its processing
flowchart. The flowchart is the only description of the processing. Do not repeat it in a
table or a list: a second copy in text drifts from the picture. Parameters, request and
response bodies, sort order and status codes go in an OpenAPI file beside the markdown
(`openapi.yaml`). Event payloads and recipients go in the event catalogue. The markdown links
to the OpenAPI file, and the lint checks that every row of the API list exists in it.

1. Check whether the code generates OpenAPI: a build or export script, or a route that serves
   the document (for example `/openapi.json` from route schemas). Read the project's API
   architecture document and its package scripts.
2. If it does, export it. Do not write by hand what the code generates:
   `node <skill-dir>/scripts/openapi-export.mjs <url|file.json|-> <api-dir>/openapi.yaml --paths <prefix>`.
   `--paths` keeps one resource group and the schemas it references.
3. If it does not, or the operations are not built yet (a design for a change), write the file
   by hand in OpenAPI 3.1 from `templates/api/openapi.yaml`. Use the schema names that the code
   will export. Replace the file with the export once the code generates it.
4. In the API list, put the method and the path in separate columns, and fill the
   `Auth required` column for every operation.

### Data-model documents: everything about a table in its own section

Each `### <table>` section has three parts, in this order:

1. Bullet points that explain the table: what one row is, how many rows per parent, who writes
   it, when it is deleted, and other facts about the whole table. One fact per bullet, in
   short STE sentences (rule 4.3: put complex text in a vertical list). No paragraphs.
2. The column definition table: `No. | Column | Data type | PK | FK | Nullable | Default |
   Note`. One database column per row. Do not group columns ("six `source_*` columns").
   Use the exact database type (`varchar(8)`, `timestamptz`, `jsonb`). In the FK cell, give
   the referenced `table.column` and the delete rule.
3. The table's own indexes and constraints. Do not collect them in a separate section: a
   reader who looks at a table must see all of its keys there.

## 5. Draw the diagrams

Read the `technical-diagrams` skill before you draw. It decides Mermaid or draw.io, and it has
the render-and-lint script for draw.io. Rules that come from the reader's side:

- If the text describes a flow, a sequence or a set of states, draw it. Prose is the caption of
  the diagram, not a replacement for it.
- **Every flowchart is a draw.io `.drawio.svg`**, also a small one. Mermaid lays flowcharts out
  badly. Sequence, ER and state diagrams stay Mermaid. The lint refuses a Mermaid flowchart.
- Put the diagram before the table that gives its details.
- Use the same names in the diagram, the tables and the text. Use the glossary terms.
- **API operations:** each operation has a draw.io flowchart of its processing, and the
  flowchart holds all of it: the checks in order, the transaction boundary, locks, the writes,
  idempotent branches, the published events and every response. Label
  each refusal edge with its status code. Use one shared refusal node. Add a Mermaid sequence
  diagram only when the operation crosses processes (for example api → queue → worker).
- Layout of an API flowchart: put the whole success path in one straight column, top to bottom,
  from the request to the success response. Put one shared refusal node, "Refuse (roll back if
  open)", in a column to the right, level with the middle checks. Do not add a separate
  rollback node: refusals before and inside the transaction then use the same target. Put an alternative success path (for example "already
  pinned") in a column to the left. Leave a full row between two decisions so the "Yes" label
  has room.

## 6. Write in Simplified Technical English

Read [references/writing-rules.md](references/writing-rules.md) before you write prose. These
are the rules with the largest effect:

- Descriptive sentences have at most 25 words. Procedure steps have at most 20 words.
- A paragraph has at most 6 sentences and one topic. Its first sentence states the topic.
- Use active voice and simple present tense. Name the actor: "The worker retries the job".
- State the positive rule. Do not use more than one negation in a sentence.
- Use one term for one thing, as the glossary gives it. Define a term before its first use.
- Name the thing again. Do not write "the same way", "as above" or "for that reason".
- A table cell holds one fact in at most 25 words. Put the detail in a note under the table.
- Write the current design only. No "previously", "no longer", "legacy", or issue numbers.
- Name contracts (tables, columns, routes, events, settings, exported schemas). Do not name
  file paths or private functions in the body. If a reader needs them, list them in a final
  `## Code map` section, so a rename touches one place.

## 7. Lint, then read it as a new reader

```bash
node <skill-dir>/scripts/ste-lint.mjs <doc.md> --kind <kind>
```

- Exit 1 means errors: sentence, paragraph or cell length, missing required sections or
  diagrams, a table without `No.`, a Mermaid flowchart, an API list row missing from the
  OpenAPI file, text or tables in an API operation section, grouped database columns, prose
  in a database table section, a separate index section, or template leftovers. Fix every error.
- Fix each warning, or keep it on purpose. Warnings are candidates, for example a negation
  that is the rule itself ("Do not log the token.").
- `info` findings are passive voice without an actor. Name the actor where it is known.
- Run it on every document you touched. Report the final summary line.

The lint measures form only. Then read the document once as a new team member, with the
checklist at the end of [references/writing-rules.md](references/writing-rules.md). The main
test: can that reader find the answer to the document's main question in two minutes?

## 8. Report

Tell the user:

- the documents you created or changed, and their kinds
- the final lint line for each document, and the warnings you kept, with reasons
- the diagrams you added (and the `technical-diagrams` lint result for draw.io files)
- for a restructure: the facts you removed on purpose, and where moved facts now live
- open questions you found while you collected facts
