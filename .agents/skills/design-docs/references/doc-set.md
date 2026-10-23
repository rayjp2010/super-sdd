# The doc set

How the documents fit together: folder layout, ownership, links and size. The layout follows
arc42 and the C4 model for architecture views, and Diátaxis for the split between reference
(what is true), explanation (why) and how-to (what to do).

## Folder layout

Group documents by kind. One folder per kind keeps each folder small, and a reader can guess
where a fact is before searching.

```text
<design root>/                 for example docs/design/ or openspec/designs/
├── README.md                  index: reading order and document map        (index)
├── glossary.md                every term, one meaning, names not to use    (glossary)
├── architecture/
│   ├── overview.md            system context, containers, repository layout (overview)
│   ├── deployment.md          where each container runs, scaling, rollout  (deployment)
│   └── diagrams/
├── api/
│   ├── conventions.md         auth, errors, paging, idempotency for all    (api-conventions)
│   ├── <resource>.md          one per resource group: rooms, documents     (api)
│   ├── openapi.yaml           request, response and status details, exported or hand-written
│   ├── events.md              realtime event catalogue                     (events)
│   └── diagrams/
├── data/
│   ├── data-model.md          entities, ER diagram, ownership              (data-model)
│   └── <aggregate>.md         one per large stored structure, if needed    (data-model)
├── workflows/
│   └── <process>.md           one per lifecycle or business process        (workflow)
├── components/
│   └── <app-or-module>.md     internal structure of one deployable or module (component)
├── integrations/
│   └── <external-system>.md   one per external system                      (integration)
├── security/
│   └── security.md            identity, sessions, authorization, threats   (security)
├── frontend/
│   └── <area>.md              client state, screens                        (frontend)
├── operations/
│   ├── configuration.md       every setting                                (configuration)
│   ├── observability.md       logs, metrics, alerts                        (observability)
│   └── runbooks/<task>.md     operator procedures                          (runbook)
└── decisions/
    └── NNNN-<title>.md        one decision record per cross-cutting decision (decision)
```

- Create a folder only when it has a document. A small system can have five documents.
- Name files in `kebab-case`. Name a document after its subject (`rooms.md`), not its kind
  (`rooms-api-design.md`): the folder gives the kind.
- Put diagrams in a `diagrams/` folder beside the documents that use them, as the
  `technical-diagrams` skill says.
- If the project already has a flat layout, do not move documents as a side effect of another
  task. Moving documents breaks links in code comments, tests, agent instructions and change
  records. Propose the move as its own change, and update every link in that change.

## Which document owns a fact

| The fact is about | Owner |
|---|---|
| A word and its meaning | `glossary.md` |
| How the parts of the system connect | `architecture/overview.md` |
| Replicas, scaling, network path, rollout order | `architecture/deployment.md` |
| Error format, auth on requests, paging, idempotency keys | `api/conventions.md` |
| One route: its purpose, processing flowchart, rules and events | `api/<resource>.md` |
| Parameters, request and response bodies, status codes | `api/openapi.yaml` (exported from code when the code generates it) |
| One event, its payload and recipients | `api/events.md` |
| A table, its columns, keys and constraints | `data/data-model.md` |
| The fields and rules of a stored document or JSON structure | `data/<aggregate>.md` |
| States and transitions of one item (job, request, document) | `workflows/<process>.md` |
| Folders, modules and import direction inside one deployable | `components/<app>.md` |
| Calls to one external system, field mapping, its failures | `integrations/<system>.md` |
| A setting, its default and limits | `operations/configuration.md` |
| What is logged, measured or alerted | `operations/observability.md` |
| Steps an operator does by hand | `operations/runbooks/<task>.md` |
| A choice with wide effect, and its rejected options | `decisions/NNNN-<title>.md` |

The question "which document owns this?" decides almost every placement. If two documents seem
to own a fact, one of them is about a different fact. For example: the data model owns the
column `registration_jobs.status` and its allowed values, and the workflow owns what moves a job
from one status to the next.

## Links

- Link to the owner with a relative link and a heading anchor: `[Leases](../workflows/agent-queue.md#leases)`.
- Use the target's name as the link text, not "here" or "this document".
- When a document needs a fact from another owner, write one sentence that says what the fact
  is for, and link. Do not repeat the details.
- `## Related documents` lists the documents a reader reads next, with one line each about why.

## Status of content

Each mechanism is one of these. Mark the ones that are not implemented.

| Status | Meaning | How to mark it |
|---|---|---|
| Implemented | Built and in use. | No marker. |
| Planned | Agreed, not built. | **Planned** in the status column, or in the heading. |
| Open | Not decided. | An entry in `## Limits and open questions`. |
| Accepted limit | Known gap that the design accepts. | An entry in `## Limits and open questions`, with its effect. |

## Size

- Target: under 2,500 words for one document (about 12 minutes of reading).
- Above 4,000 words, split it. Split by subject, not by kind. For example, split a large API
  document into one document per resource group, and a large workflow into one per lifecycle.
- After a split, update `README.md` and every link to a moved section.

## Code map

A design doc names contracts. Code locations change more often than contracts. When a reader
needs a code location (for example, which module enforces a rule), list it in a final
`## Code map` section, after `## Related documents`:

| No. | Concern | Location |
|---|---|---|
| 1 | Revision check on save | `apps/api/src/plugins/app/documents/` |

Prefer folders to files, and files to functions. When you rename or remove code, search the
design root for the old name. A design that names deleted code still passes every test.

## Changes and durable designs

Some projects (for example OpenSpec) let a change propose its design as a delta, and merge it
into the durable design tree when the change is archived.

- The durable content in the delta follows the template of the target document's kind, and the
  writing rules.
- The change's own context section holds the change-local reasoning. Move only the decisions
  that stay true into the durable `## Decisions` section.
- A delta adds, modifies or removes whole template sections. Do not add a new section type that
  the template does not have, unless the kind needs it for every future reader.
