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

Two files carry the rest. `.claude/rules/second-brain.md` is the always-loaded
procedure and stays authoritative: how a save works, who writes, when to run the
review, the boundaries, and what to do when something goes wrong.
`.claude/references/second-brain-reference.md` holds the detail on each home,
the optional document aids, evidence, repetition, links, and superseding. It is
opened only when the routing is genuinely unclear.

**Because the schema now exists in three places, keep them in step.** Any change
to the canonical rule's authority map, its homes, or its document contract must
update the section in both root files in the same change. The rule wins if they
ever disagree. This is a real maintenance cost, accepted on purpose so the
routing is never one file-open away.

## One passage is worded differently in each root file

Claude Code can invoke the `memory-verifier` agent by name. Codex cannot, so
`AGENTS.md` tells the session to delegate to a subagent and have that subagent
read `.claude/agents/memory-verifier.md` and `.claude/rules/second-brain.md` in
full before it reports. Same obligation, two programs.

The passage is step 2 of `How to write` below. Wrap that one step in
`<!-- host-specific:start -->` and `<!-- host-specific:end -->` in both root
files. The block below carries the Claude wording, without the marker lines, so
copy it in and add the markers around step 2. Everything outside those two
markers has to match word for word between `CLAUDE.md` and `AGENTS.md`.

The Codex wording of step 2:

```text
2. Delegate to a subagent, tell it to read
   `.claude/agents/memory-verifier.md` and `.claude/rules/second-brain.md` in
   full first, and wait for its report. It reads only and never writes. It opens
   the file behind each in-a-file claim, compares each owner claim against the
   owner's actual words, and flags anything the agent worked out, because that
   cannot be confirmed. Codex cannot invoke the verifier agent directly, which
   is why this passage differs from the one in `CLAUDE.md`.
```

## The section

```markdown
## Project memory and knowledge: read this before you write anything

`.claude/rules/second-brain.md` is the canonical rule and wins over this summary
if they ever disagree. Read it before work that changes approved behavior, and
before any structural change to these folders. When the routing below does not
settle where something goes, open
`.claude/references/second-brain-reference.md`.

The committed Markdown files and Git history **are** the system. There is no
memory database, memory server, embedding index, transcript store, or background
curator. Nothing is remembered automatically. If it is not written down here, it
is not remembered. A hook may remind you of a rule or start a review, and never
writes memory itself. The one raw-capture exception is an owner-invoked
`grill-me` interview, which checkpoints only its non-authoritative brainstorm
and index.

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

Link to the one home. Never copy a second version that can drift. When you are
about to write something another document already owns, `Repetition` in
`.claude/references/second-brain-reference.md` says what to do instead.

**`specs/` against `memory/` is the split most often guessed wrong.** Approved
behavior, meaning what the system has to do, goes to `specs/`. Things worth
knowing, meaning what would otherwise have to be worked out again, go to
`memory/`. When something is both, it produces two documents and the owner sees
both. Never pick one and drop the other half.

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
3. a `Basis:` line under that summary, for everything under `memory/`;
4. a type given by its folder path, and content shaped for that type;
5. an entry in the nearest `README.md` index; and
6. links to related documents where they genuinely help.

Every populated `memory/<type>/<system-area>/` folder has its own `README.md`.
Create it with the area's first durable document. The list of documents inside
an index is built from the documents by the index builder, not typed by hand.

No YAML frontmatter. No empty placeholder fields. `Status: Superseded` plus a
link to the replacement is required whenever a replaced document is kept.

The `Basis:` line says where the content came from: `Basis: Observed`,
`Basis: Owner-confirmed <YYYY-MM-DD>`, `Basis: Source`, or
`Basis: Inferred, unconfirmed`. Trust a document only as far as its basis
allows, and never quietly upgrade an inference to a confirmed fact.
Specifications carry no `Basis:` line, because the owner approved them.

### How to read

Start at the relevant root `README.md`, then the area index, then the specific
document. Follow only the links this task needs. Before changing behavior in an
area, find and read that area's specification first. Do not load every memory
file every session. Report conflicting current truth instead of silently picking
one.

### How to write

Never write durable memory unprompted. Authority to write comes from the owner:
they approved the drafted words, asked for the change, approved behavior a
specification must now reflect, or said "remember this" or similar.

A save runs in this order:

1. The main agent drafts the exact words and the destination path for each
   piece. Every claim carries where it came from, and it is one of three kinds:
   it is in a file, the owner said it, or the agent worked it out. Before
   proposing a fact, search for a document that already owns it and link to that
   instead of repeating it.
2. Invoke `memory-verifier` (`.claude/agents/memory-verifier.md`) in the
   foreground and wait for its report. It reads only and never writes. It opens
   the file behind each in-a-file claim, compares each owner claim against the
   owner's actual words, and flags anything the agent worked out, because that
   cannot be confirmed.
3. Fix what came back wrong, and mark anything unconfirmed so the owner can see
   it is unchecked.
4. Show the owner the real words, not a table describing them. They approve,
   cut, or edit. An edit is written exactly as the owner wrote it and needs no
   further checking.
5. Save them, rebuild the indexes, and run the shape check. A failed shape check
   means the save is not finished: say what is missing in plain words and fix
   it.

Nothing that writes a file runs in the background, and any agent producing a
report is run in the foreground so its report comes back without being asked
for.

Propose durable updates at approved completion points only: a substantial task
finished, a brainstorm or requirements interview ended, a milestone reached, a
session handing off or about to have its context cleared, or another natural
stopping point after meaningful work with a settled durable result. Not on every
response, commit, or trivial action. One review can satisfy several nearby
stopping points unless later work changes the durable result.

A deferred proposal changes no durable document and creates no memory queue. If
an approved write fails, retry or report it and keep the task unfinished. The
pull request may open, but it does not merge as though the write succeeded
unless the owner explicitly waives it.

Before a pull request containing specification or memory changes merges, bring
its branch current through the project's Git workflow. Then run the memory
verifier again for a read-only comparison with the latest relevant memory and
indexes. It uses judgment to find duplicate canonical homes or conflicting
current truth that parallel work could merge without a text conflict, and it is
sized to the change: a new document gets the full read, one generated index line
gets a quick look. Any destructive or meaning-changing repair still requires
visible owner approval, and the main agent makes it.

Stop and show the owner before any structural change: removing durable
information, changing what is authoritative, moving, splitting, or merging
documents, reorganizing, superseding current guidance, or adding a new top-level
area or type. These operations are allowed after approval so memory can be
maintained instead of only accumulating.
```

## Other root instruction files

If a project uses another root instruction filename in addition to or instead of
these two, preserve that file and give it the same section. Claude and Codex
must never receive different memory authority maps.
