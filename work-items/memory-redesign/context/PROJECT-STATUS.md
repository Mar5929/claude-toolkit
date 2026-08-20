# Memory redesign: project status

Owner: Mike Rihm. Last updated 2026-08-20.

This is the one current status file for the memory redesign. It is maintained by
the product-manager agent defined at `.claude/agents/product-manager.md`. This
work item is that agent's first user.

## Next action

Mike reviews `work-items/instruction-manuals/knowledge-system-manual.md` section
by section. Nothing else is queued ahead of it.

## The scope, in Mike's words

> "instructions that go in the CLAUDE.md file, maybe a reference instruction
> manual document for the agent, and some skills."

That is the whole system. Not a large codebase. This replaced the earlier
assumption that the redesign produces a substantial amount of runtime code, and
it is the biggest change to the shape of this work so far.

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

## How to work on the north star, and why

Earlier in the 2026-08-20 session an agent rewrote the north star wholesale,
cutting about 450 lines. Mike rejected it. It was reverted with `git checkout`
and the original 776-line document is intact.

The agreed process now: section by section, proposed to Mike, approved or denied
before anything is written. Do not repeat the wholesale rewrite.

## Phases

Three phases, in order. Nothing starts before the one above it is final.

| # | Phase | File | State |
|---|---|---|---|
| 1 | North star document | `AI-operating-system-north-star.md` | In progress, PAUSED |
| 2 | Functional requirements | `functional-requirements.md` | Not started |
| 3 | Technical architecture spec | `technical-architecture-spec.md` | Not started |

Phase 1 is paused partway through its section-by-section review, because Mike
redirected to writing the instruction manuals instead.

- Section 1: approved and committed. It now points at
  `architectural-decision-records.md`.
- Sections 2 and 3: need no change.
- **Section 4, the four-part memory model: proposed, never resolved. This is the
  resume point.**

## Parallel work item: instruction manuals

`work-items/instruction-manuals/`, committed in `840b855`. Two documents. Both
are DRAFTS. Neither is approved.

| File | Lines | What it covers |
|---|---|---|
| `operating-system-manual.md` | 306 | The top-level manual: the six places information belongs, the folder map, how a session starts, rules, skills, hooks, work tracking, parallel agent sessions, and how a toolkit change reaches a machine and a project. Covers the knowledge system briefly and links to the second manual. |
| `knowledge-system-manual.md` | 247 | Short-term and long-term memory, the file format and its fields, the seven questions that decide what to save, when to offer a save, the four approval bullets, and how to update, supersede, retire, and delete. |

## Commits

Three commits, all local on `main`, none pushed.

| Commit | What it did |
|---|---|
| `ba5af4c` | Restart the memory redesign with decision records and status tracking |
| `840b855` | Add draft operating system and knowledge system manuals |
| `1ec2399` | Point the north star at the decision records |

## Document status

| Document | Lines | Status |
|---|---|---|
| `AI-operating-system-north-star.md` | 776 | Draft, paused mid-review at Section 4. Not final. |
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

All six were decided in the 2026-08-20 session. None has been written into
`architectural-decision-records.md` yet.

- **D6:** The agent keeps a quiet running list of save candidates during a
  session and offers them as a batch at checkpoints. Mike can also say "remember
  this" at any time. No mid-session interruptions on the agent's own initiative.
- **D7:** The checkpoints are all four of: when a task or work item finishes,
  before a commit or pull request, before a handoff or clearing context, and
  when the session has run long. The fourth one needs a concrete threshold
  defined in the requirements document, or agents will fire it arbitrarily. See
  Q9.
- **D8:** The seven-condition save test is agreed. Four conditions decide
  whether a memory should exist. Three decide whether it is safe to write. Full
  text is in `knowledge-system-manual.md` section 4.
- **D9:** Memory files carry YAML frontmatter with `summary`, `created`,
  `confirmed`, `status`, `superseded_by`, `confidence`, `source`, and `tags`.
  This is Mike's requirement. Tags replace categories, because a tag does not
  force one choice and does not split a record.
- **D10:** The approval review is four bullets, not the old five: What (three
  sentences maximum), Where, Tags, Assumptions. Mike specified these.
  Assumptions get approved separately from the content, because an assumption is
  how memory gets polluted.
- **D11:** Memory is never append-only. Update, supersede, retire, or delete.
  Deletion is limited to a mistaken copy, a secret that should never have been
  written, or something that was never true.

## Research finding: memory types mostly do not earn their place

A research agent reviewed Mem0, Zep/Graphiti, Letta, Honcho, LangMem, Cognee,
Basic Memory, Cloudflare Agent Memory, and OpenAI.

Finding: a memory type only earns its place if it changes where a record is
stored, what happens when something contradicts it, or when it expires.

- LangMem names semantic, procedural, and episodic memory in its prompt, and has
  one class with one field and no type in the code.
- Cognee defines five sections and its runtime never references them.
- Basic Memory, the closest system to ours, deliberately refused to fix a
  taxonomy.

This is evidence supporting ADR-002.

## Gaps found, not yet logged as work anywhere

- **G1:** `CLAUDE.md` says the repo ships nine plugins. There are seven.
- **G2:** The `remember`, `recall`, and `cleanup` skills all exist but describe
  the old system. All three need rewriting when this redesign lands.
- **G3:** Three things in `operating-system-manual.md` describe a target that
  does not exist: `knowledge/current.md`, a flat `knowledge/memory/` folder (it
  currently has seven subfolders), and `SOUL.md` as standard rather than
  optional.
- **G4:** Verbatim prompt research from the memory providers was saved to a
  temporary scratchpad folder that will be deleted. If those quotes matter for
  the requirements phase, they need a real home.

## Open questions

**Q6 is CLOSED.** What earns a place in memory is settled by D8, the
seven-condition save test.

- **Q7:** What loads at session startup, and whether the owner can pin a few
  memories to always load. Mike has not answered.
- **Q8:** Whether `SOUL.md` is a real need. An optional `SOUL.md` step shipped in
  commit `fba7970` and has never been discussed.
- **Q9:** What "the session has run long" means concretely. Needs a number.
- **Q10:** Cross-host portability between Claude Code and Codex.
- **Q11:** What acceptance looks like.
- **Q12:** Whether the north star should shrink now that the manuals hold the
  how. Mike said he does not want it cut short, but the two documents overlap and
  that is unresolved.

## What the next agent should do first

1. Read `architectural-decision-records.md` and
   `AI-operating-system-north-star.md`.
2. Do not read `functional-requirements.md` or `technical-architecture-spec.md`
   as guidance. Both are dead.
3. Take Mike through `knowledge-system-manual.md` section by section. That is
   the current action.
4. When the north star resumes, start at Section 4, the four-part memory model,
   and work section by section as described above.
