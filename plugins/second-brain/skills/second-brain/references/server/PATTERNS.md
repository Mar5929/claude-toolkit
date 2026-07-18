# Conversation patterns the memory system must handle

Source: 12 real patterns from the Davis Advisors engagement (40+ sessions over
3 months), provided by Mike on 2026-07-15 specifically to refine this
architecture. This file records the design commitments those patterns drove.
It is the requirements input for Phase 2 (write tools + curator port) and
Phase 3 (server-side curation).

## Pattern -> commitment

| # | Pattern | Commitment | Where |
|---|---|---|---|
| 1 | Decisions get reversed weeks later; interim work acted on the old one | Supersede, never overwrite: `status: superseded` + `supersedes`/`superseded-by` edges, dated and attributed. Old versions kept (node_versions). Dependents flaggable via edges. | schema + curator |
| 2 | Corrected inputs invalidate derived conclusions | `derived-from` edges give provenance; a correction adds a `corrects` edge and marks dependents needs-review (`review_after`). Corrections are events, not silent edits: the wrong belief survives in node_versions. | schema + curator |
| 3 | Deployment/state facts drift; assertion is not verification | Frontmatter distinguishes `source` (who asserted, when) from `verified` (how confirmed: org query > user said > assumed, with date). Unverified state facts are "open confirms" with `review_after` set. | convention |
| 4 | Requirements converge through revisions | The node's current body IS the current answer (one-hop retrieval); every prior revision is auto-kept in node_versions with date; `refines` edges link drivers. | schema |
| 5 | A scope change invalidates a sibling design's premise | `premise-of` edges between designs and their assumptions; superseding a premise flags dependents needs-review instead of leaving a dead plan. | schema + curator |
| 6 | Standing always/never rules, with exceptions added later | First-class `rule` node type. Body MUST include the why (rules without rationale get argued with). Exceptions append to the rule node; the base rule stays. | convention |
| 7 | Hard-won gotchas must be findable by symptom | Gotcha nodes carry a "Symptoms" section written in the words a stuck person would search ("sum is wrong", "test fails mysteriously"). Full-text + (Phase 2) semantic search covers it. | convention |
| 8 | Open questions with owners; answers arrive much later | First-class `question` node type: `owner`, `blocks` edges to what it holds up, `answers` edge on resolution. Answering unblocks linked items, not just adds a loose fact. | convention + edges |
| 9 | Stakeholder claims vs verified facts; informal terminology | Claims attributed + dated via `source`, `confidence`; `confirms`/`contradicts` edges when evidence lands. Glossary (`entity`) nodes map informal terms to exact API names. | convention |
| 10 | Blockers have a lifecycle (open, waiting-external, cleared) | First-class `blocker` node type with status, `blocks` edges, pointer to the resolving artifact. Cleared blockers leave the digest immediately (stale blockers cause wrong refusals). | convention + curator |
| 11 | Exact numbers are regression baselines | Control totals stored verbatim (no rounding, no "about 516k"), tied to their run, `pinned` when load-bearing. Curators are forbidden to summarize numbers. | convention |
| 12 | Memory is the routing layer, not a second copy | Pointer nodes ("X lives at Y: ClickUp/hub doc/work log") instead of duplicated bodies. Duplication is the failure mode; copies drift. | convention |

## Node type vocabulary (Phase 2 curator port)

`decision | knowledge | preference | rule | session | entity | question | blocker`

(`rule`, `question`, `blocker` added by this document; the DB does not constrain
the column, so no migration is needed for types.)

## Edge vocabulary additions

Existing: `depends-on/enables`, `implements/implemented-by`, `refines/refined-by`,
`part-of/has-part`, `example-of/has-example`, `derived-from/informs`,
`contradicts`, `supersedes/superseded-by`, `relates-to`.

Added: `blocks/blocked-by`, `confirms`, `corrects/corrected-by`,
`premise-of/has-premise`, `answers/answered-by`.

## Schema effects (upgrade-002-history.sql, applied 2026-07-15)

- `node_versions`: automatic snapshot of a node's prior content on every
  update, kept even if the node is later deleted. Gives revision history
  (patterns 1, 2, 4) and "what did we believe on date X" audit.
- `nodes.review_after`: timestamp for open confirms / flagged dependents /
  stale open items; curation sweeps surface anything past due (patterns 2, 3,
  5, 8, 10). A session that loads a stale open item behaves worse than one
  that loads nothing.

## Server behaviors these require (Phase 2+)

1. `upsert_node` writes the previous version to node_versions before updating.
2. Correction flow: new truth node/edit + `corrects` edge; walk
   `derived-from`/`premise-of` edges backward and set `review_after` on
   dependents.
3. Digest assembly: open questions/blockers with owners get their own section;
   pinned baselines always included; cleared blockers dropped same-pass.
4. Recall: expand matches with linked neighbors (edges), so "the decision"
   arrives with the constraint it depends on and the note that replaced it.
