# Memory v2: overengineering audit

Date: 2026-08-20. Requested by Mike after the build. Auditor: independent
review agent. Nothing in the build was changed by this audit.

## The short answer

You are mostly right, and the spec is where it started. The functional
requirements have 131 items and mostly describe behavior. The architecture doc
then turned each behavior into a component (section 8 lists 17) and each
component into a callable (section 16.1 lists 24 tool names). Once a document
says "retrieval router" and memory_search(query, filters), a builder writes a
search engine. It did. The planning docs are 7,561 lines. You approved the
frame, and the frame is the bloat.

The sharp question holds. The router hand-rolls stopwords, field weights, and
scoring (memory.mjs lines 531-1332). That is a worse Grep wrapped in ceremony.

## Subsystem measurements

| Subsystem | Lines | Verdict | Reason |
|---|---|---|---|
| Write guard hook | 785 | Earns it | Must be non-bypassable, no model in the path |
| Validator, 22 MV checks | 1,604 | Partly | Cheap and repeatable is right, but 22 checks is a spec wish list |
| Migration engine | 1,487 | Earns it, then delete | Byte-exact one-time job, useless after it runs |
| Gold set runner | 1,378 | Does not | Measures a search engine you should not have |
| CLI dispatch and envelope | 1,093 | Does not | Pure plumbing that exists only because it is a CLI |
| Lifecycle engine | 975 | Partly | 8 named ops where a skill checklist plus a writer would do |
| Health tool | 950 | Does not | Overlaps the validator |
| Boot brief | 898 | Earns it | Must run before a model loads, must fit a byte budget |
| Session search | 871 | Partly | A grep over transcripts wearing a gate |
| Retrieval router | 802 | Does not | Agent has Read, Grep, Glob and better judgment |
| Review engine | 655 | Does not | Judgment work, exactly what a checklist is for |
| Apply transaction | 418 | Earns it | Hash binding, one write path |
| Schema lib | 449 | Earns it | Deterministic shape check |
| Scope lib | 391 | Earns it | Path boundaries must be exact |
| Pin manager | 339 | Partly | Hash check yes, 339 lines no |
| Move and rename, links | 610 | Does not | Grep and edit |
| Propose plus review file | 444 | Partly | Five bullets is a skill instruction |
| Tracker adapter | 247 | Does not | Optional, unused, an agent can read a board |
| Lock and journal | 132 | Earns it | Crash safety is real |
| View generator, index builder | 290 | Does not | Default v2 has no derived views |

## Minimal v2, honestly

Markdown records in knowledge/. One skill file per job: remember, recall,
cleanup. The skill tells the agent the four record types, the five approval
bullets, and to use Grep. One validator (~500 lines) for schema, links, and
scope, run in CI. One write guard (~400 lines) so no path but the approved one
touches canonical files. One boot brief (~250 lines) so startup is
deterministic and inside budget. One small writer with the hash binding and
journal (~350 lines). Migration runs once, then gets deleted.

Runtime: about 1,500 to 2,000 lines.

What you lose: consistent search ranking, measured retrieval quality, a
machine-checked review worklist, and scripted lifecycle ops. For a single
owner with one brain reading the output, those losses do not matter. You would
notice them on a team product where twenty agents must behave identically and
nobody reads the diff.

## Recommendations, by lines saved

1. Delete gold set (1,378). It grades a thing you are removing.
2. Delete health tool (950). Fold its two useful checks into the validator.
3. Simplify CLI dispatch to one thin entry (save ~840).
4. Delete retrieval router, move to skill text (802).
5. Simplify lifecycle engine to a checklist plus writer (save ~775).
6. Simplify session search to a grep wrapper (save ~720).
7. Delete review engine, move to cleanup skill (655).
8. Trim validator to schema, links, scope (save ~1,000).
9. Simplify boot brief (save ~650).
10. Delete move/rename, links, view generator, index builder, tracker adapter (~1,150).
11. Keep guard, apply, journal, schema, scope libs.
12. Keep migration until v1 projects are converted, then delete it.

Realistic removal: 8,000 to 9,500 runtime lines, leaving 6,000 to 7,500.
Tests drop by roughly half with them.
