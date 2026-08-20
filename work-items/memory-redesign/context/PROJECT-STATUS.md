# Memory redesign: project status

Owner: Mike Rihm. Last updated 2026-08-20.

This is the one current status file for the memory redesign. It is maintained by
the product-manager agent defined at `.claude/agents/product-manager.md`. This
work item is that agent's first user.

## Where we are right now

Phase 1 of 3, the north star document, is in progress. Mike is being interviewed
to refine it. Nothing in Phase 2 or Phase 3 starts until Phase 1 is final.

```
Phase 1 of 3  [█░░]  now: north star document
```

## What is being built

A memory and knowledge system for AI coding agents, Claude Code and Codex,
shipped through the claude-toolkit plugin marketplace. It gives agents durable
project knowledge across sessions so Mike does not re-explain the same facts,
decisions, and context. The store is Markdown files in the repository, owned by
Git.

## Why it is being redesigned

A version 1 was built and reverted. It was badly overengineered: roughly 15,000
runtime lines, 24 tool names, 17 components, including a hand-rolled retrieval
router with its own stopwords, field weights, and scoring. The audit called that
router a worse version of Grep wrapped in ceremony, and put the honest size at
1,500 to 2,000 runtime lines. The audit is at `context/overengineering-audit.md`.

Root cause: the functional requirements document described behavior as
components, and a builder turned each component into code. Mike also found that
earlier agents had written content into the requirements document that he never
approved, and later agents then built from it.

## The failure that started it

Mike asked an agent in the Davis Advisors Salesforce project to build a
Lightning Web Component using the most important fields of Discovery, an
integration app. The agent did not know those fields. They had come up across
many earlier conversations and finished tasks, but the information was
incomplete, unorganized, and scattered, and no single record owned the answer.

Every requirement in this redesign should trace back to a real failure like this
one.

## Phases

Three phases, in order. Nothing starts before the one above it is final.

| # | Phase | File | State |
|---|---|---|---|
| 1 | North star document | `AI-operating-system-north-star.md` | In progress |
| 2 | Functional requirements | `functional-requirements.md` | Not started |
| 3 | Technical architecture spec | `technical-architecture-spec.md` | Not started |

## Document status

| Document | Lines | Status |
|---|---|---|
| `AI-operating-system-north-star.md` | 776 | Draft, being refined right now. Not final. |
| `architectural-decision-records.md` | 262 | Current and authoritative. Holds ADR-001 through ADR-005, all dated 2026-08-20. |
| `context/overengineering-audit.md` | - | Current and useful. Keep. |
| `functional-requirements.md` | 723 | DEAD. 131 requirements, polluted with mechanisms Mike never approved: a specific `current.md` file, a five-bullet format, a temporary review file, a `project_root` field, and scope resolution rules. To be rewritten from scratch after the north star is final, not edited. |
| `technical-architecture-spec.md` | 2,416 | DEAD. From the reverted build. Phase 3 has not started for real. |
| `archive/pm-tracker.md` | 606 | Archived history from the reverted build. Not current. |
| `archive/STATUS.md` | 157 | Archived history from the reverted build. Not current. |

The two archived files were moved out of `context/` on 2026-08-20 with `git mv`.
Both describe the reverted version 1 build: work items P0-1 through P4-9, the
old ADR-001 to ADR-038 numbering, and code that no longer exists in the working
tree. They are kept for history only. Their open questions and decision lists
are all about code that was reverted, so none of them carry forward.

## Decisions locked so far

Full reasoning lives in `architectural-decision-records.md`. Outcomes only here.

| ID | Outcome |
|---|---|
| ADR-001 | Save as you go is the core. Assemble on demand is the fallback. |
| ADR-002 | Durable memory has no categories. One kind of record. The only boundary enforced is placement: memory vs rule vs skill vs specification. |
| ADR-003 | Plain links inside notes. No backlink index, no automatic link repair. |
| ADR-004 | Markdown files are the store. No SQLite, no database, no vector store. |
| ADR-005 | Graphify is an optional view, off by default, never required. |

## Decided but missing an ADR

Both were decided in the 2026-08-20 session. Neither has been written into
`architectural-decision-records.md` yet.

- **D6:** The agent keeps a quiet running list of save candidates during a
  session and offers them as a batch at checkpoints. Mike can also say "remember
  this" at any time. No mid-session interruptions on the agent's own initiative.
- **D7:** The checkpoints are all four of: when a task or work item finishes,
  before a commit or pull request, before a handoff or clearing context, and
  when the session has run long. The fourth one needs a concrete threshold
  defined in the requirements document, or agents will fire it arbitrarily.

## Open questions

Being worked right now:

- **Q6:** What earns a place in memory. Proposed: replace the current 20-bullet
  promotion test with one question, "if this is not written down, will Mike have
  to explain it again, or will a future agent do the wrong thing?" Separately,
  which way the agent should lean when unsure. The session recommended leaning
  hard toward not saving, because agent judgment about importance is what
  produced the polluted requirements document.

Not yet raised with Mike:

- **Q7:** What loads at session startup, and how much.
- **Q8:** Whether `soul.md` is a real need or bloat.
- **Q9:** How the approval flow works and how Mike sees what is being written.
- **Q10:** Cross-host portability between Claude Code and Codex.
- **Q11:** What acceptance looks like.

## What the next agent should do first

1. Read `architectural-decision-records.md` and
   `AI-operating-system-north-star.md`.
2. Do not read `functional-requirements.md` or `technical-architecture-spec.md`
   as guidance. Both are dead.
3. Continue the north star interview from Q6 above.
