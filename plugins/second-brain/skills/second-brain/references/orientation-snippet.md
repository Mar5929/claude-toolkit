# Second-brain root orientation

Add this same section to both `CLAUDE.md` and `AGENTS.md`. Preserve the
project's existing content and voice.

## Where it goes: first, not buried

Place this section at the **top of the root file**, immediately after the title
and the line pointing at `.claude/rules/`, and before the codemap, the work
tracker, deployment, or any other section. Filing a fact in the wrong home, or
in no home, is the failure this system exists to prevent, and an agent that
stops reading halfway down never learns the routing.

Use the same position in both root files.

## What it carries

The routing schema goes in the root file in full: the authority map, and for
every home its purpose, when to use it, and when not to. That is what an agent
needs before it writes anything, and it must not depend on opening another file
first.

The canonical rule `.claude/rules/second-brain.md` stays authoritative and
carries the rest: worked good-and-avoid examples, the optional document aids
(`Status`, `Review after`, `Aliases`, `Tags`, `Sources`), evidence and
certainty, relationship rules, the supersession procedure, the worktree and Git
boundary, the privacy boundary, and failure behavior.

**Because the schema now exists in three places, keep them in step.** Any change
to the canonical rule's authority map, its homes, or its document contract must
update the section in both root files in the same change. The rule wins if they
ever disagree. This is a real maintenance cost, accepted on purpose so the
routing is never one file-open away.

## The section

```markdown
## Project memory and knowledge: read this before you write anything

`.claude/rules/second-brain.md` is the canonical rule and wins over this summary
if they ever disagree. Read it before work that changes approved behavior,
before any structural change to these folders, and whenever the routing below
does not clearly settle where something goes.

The committed Markdown files and Git history **are** the system. There is no
memory database, memory server, embedding index, transcript store, capture hook,
or background curator. Nothing is remembered automatically. If it is not written
down here, it is not remembered.

### Authority map: one truth, one home

| Question | Canonical home |
|---|---|
| What should the product or system do? | `specs/` |
| What ideas, options, and open questions were explored? | `brainstorms/` |
| What durable circumstance affects the work? | `memory/context/` |
| What is the high-level direction and sequence? | `memory/planning/` |
| What important choice was made, and why? | `memory/decisions/` |
| What reusable understanding should future work know? | `memory/knowledge/` |
| Which source matters, and what does it support? | `memory/references/` |
| What does this business term or rule mean? | `memory/domain/` |
| How is the system operated, released, or recovered? | `memory/operations/` |
| Where is a raw meeting, transcript, message, deliverable, or export? | The project's ordinary artifact folders |
| What is active, next, blocked, assigned, or landed? | The work tracker |
| What did an earlier version say? | Git history |

Link to the one home. Never copy a second version that can drift.

### When to use each home, and when not to

| Home | Use when | Do NOT use when |
|---|---|---|
| `brainstorms/` | Requirements or design are still being discovered, or the owner runs `grill-me`. One flat dated collection. | The behavior is already approved (that is `specs/`), or it is a raw meeting record with another home. |
| `specs/` | A capability, boundary, observable behavior, constraint, or acceptance expectation is **approved**. One `README.md` per capability under `specs/<area>/<capability>/`. | Capturing exploration, implementation trivia, ticket status, or a source. |
| `memory/context/` | A durable circumstance, stakeholder, constraint, or boundary affects several tasks or explains why work must be read a certain way. | It is a current task, next action, blocker, or temporary handoff. |
| `memory/planning/` | Direction or sequence matters beyond one ticket: vision, goals, roadmap, milestones, durable risks, assumptions. | Recording ticket status, assignments, or an operational blocker. |
| `memory/decisions/` | Knowing why a non-obvious choice was made will prevent confusion, reversal, or a repeated debate. | The choice is routine, temporary, obvious from the spec, or useful inside one ticket only. |
| `memory/knowledge/` | The understanding prevents a likely mistake, explains a failure mode, or helps several future tasks. | It is obvious from nearby code, temporary debug output, or belongs in a spec or decision. |
| `memory/references/` | A source is external or needs durable project-specific context explaining what it supports. | A raw artifact already has a clear home and can simply be linked. |
| `memory/domain/` | People use a term or business rule an agent could misread. | Defining product behavior or technical implementation. |
| `memory/operations/` | A repeatable procedure plus its verification or recovery will help future work. | Tracking a deployment ticket, storing a secret, or defining required behavior. |

### Raw artifacts stay where they are

The project's existing artifact folders keep owning raw material: meeting notes,
transcripts, communications, deliverables, client exports, and source documents.
Memory links to them and explains why they matter. It never holds a second copy.
Where an existing folder overlaps a memory type, the memory type owns the
curated version and the artifact folder owns the raw file.

### The work tracker owns live state

Ticket status, blockers, assignments, handoffs, branches, pull requests, and
landing proof belong to the work tracker, never to memory. Planning owns
direction; the tracker owns execution.

### Every durable document has

1. a descriptive title;
2. a one-sentence summary directly under it;
3. a type given by its folder path;
4. content shaped for that type;
5. links to related documents where they genuinely help; and
6. a one-sentence entry in the nearest `README.md` index.

No YAML frontmatter. No empty placeholder fields. `Status: Superseded` plus a
link to the replacement is required whenever a replaced document is kept.

### How to read

Start at the relevant root `README.md`, then the area index, then the specific
document. Follow only the links this task needs. Do not load every memory file
every session. Report conflicting current truth instead of silently picking one.

### How to write

Never write durable memory unprompted. Write when the owner approved a proposal,
asked for a change, approved behavior a specification must now reflect, or said
"remember this" or similar. Then invoke the memory librarian
(`.claude/agents/memory-librarian.md`) in this session's worktree and review the
diff it produces.

Propose durable updates at approved completion points only: a substantial task
finished, a brainstorm or requirements interview ended, or a milestone reached.
Not on every response, commit, or handoff.

Stop and show the owner before any structural change: removing durable
information, changing what is authoritative, moving or merging documents,
reorganizing, superseding current guidance, or adding a new top-level area or
type.
```

## Other root instruction files

If a project uses another root instruction filename in addition to or instead of
these two, preserve that file and give it the same section. Claude and Codex
must never receive different memory authority maps.
