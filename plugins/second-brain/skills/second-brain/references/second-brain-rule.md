# Project memory and knowledge

This is the always-loaded procedure for second-brain v3. It says how a save
works, who does which part, and where things go. Claude, Codex, the main agent,
and the memory verifier all follow it.

The longer companion, `second-brain-reference.md`, says what each home is for in
detail, plus the rules on evidence, repetition, links, and superseding. Open it
when the routing is genuinely unclear, not on every save.

The committed Markdown files and Git history are the system. There is no memory
database, memory server, embedding index, transcript store, or background
curator. Nothing reaches memory automatically. The one raw-capture exception is
an owner-invoked `grill-me` interview, which checkpoints its own brainstorm file
as it runs.

## Authority map

| Question | Canonical home |
|---|---|
| What should the product or system do? | `specs/` |
| What ideas and questions were explored? | `brainstorms/` |
| What durable circumstance affects the work? | `memory/context/` |
| What is the high-level direction and sequence? | `memory/planning/` |
| What important choice was made and why? | `memory/decisions/` |
| What reusable understanding should future work know? | `memory/knowledge/` |
| Which source matters and what does it support? | `memory/references/` |
| What does this business term or rule mean? | `memory/domain/` |
| How is the system operated or recovered? | `memory/operations/` |
| Where is a raw meeting, transcript, communication, deliverable, or source artifact? | The project's ordinary artifact scaffolding |
| What is active, next, blocked, related, or landed? | The configured work tracker |
| What did an earlier version say? | Git history |

One truth has one canonical home. Link to it instead of copying a second
version that can drift.

`specs/` and `memory/` are the split that gets guessed wrong most often.
Approved behavior, meaning what the system has to do, goes to `specs/`. Things
worth knowing, meaning what would otherwise have to be worked out again, go to
`memory/`. When something is both, it produces two documents and the owner sees
both. Never pick one and drop the other half.

## How a save works

1. **Something starts it.** The owner asks, or the work reaches a completion
   point listed under `When to run this`.
2. **The main agent drafts the real words.** It reads the session and the actual
   changes and writes the exact specification and memory edits it proposes, with
   the destination path for each. Every claim carries where it came from. Before
   proposing a fact it searches for a document that already owns it, and links
   to that instead of repeating it.
3. **The memory verifier checks the draft**, before the owner sees anything.
   Invoke `memory-verifier` in the foreground and wait for its report. It reads
   only. It confirms each source, flags anything that cannot be confirmed, and
   reports drafted facts that already have a home elsewhere.
4. **The main agent fixes what came back wrong**, and marks anything the
   verifier could not confirm so the owner can see it is unchecked.
5. **The owner sees the actual words** that would be saved, already checked, and
   approves, cuts, or edits any of them.
6. **The main agent saves them**, runs the index builder, and runs the shape
   check. If the shape check fails, the save is not finished: tell the owner in
   plain words what is missing, and fix it.
7. **Before the pull request merges**, the main agent brings the branch current
   through the project's Git workflow and invokes `memory-verifier` again for
   the duplicate and conflict review.

Nothing that writes a file runs in the background. Every agent that produces a
report is run in the foreground, so its report reaches the session that called
it without that session having to ask.

## Where every fact came from

Every claim in a draft is one of three kinds, and each gets a different check.

| Kind | What it means | How it is checked |
|---|---|---|
| In a file | The words are in the repository, the configuration, or a running system | Open the file and confirm it |
| The owner said it | The owner or a named person stated it | Compare the draft against their actual words |
| The agent worked it out | An agent concluded it and nobody has checked it | It cannot be confirmed, so it is flagged as unchecked |

Anything of the third kind is written so a later reader can see it is unchecked.
It never appears in the same confident voice as a checked fact. It is not
quietly dropped either: the owner decides what happens to it.

Every document under `memory/` carries a `Basis:` line directly under its
one-sentence summary, with one of these values:

- `Basis: Observed` when it was seen directly in the repository, configuration,
  or running system.
- `Basis: Owner-confirmed <YYYY-MM-DD>` when the owner or a named person stated
  it on that date.
- `Basis: Source` when an external, vendor, or regulatory document supports it.
  Link the source or its reference document.
- `Basis: Inferred, unconfirmed` when an agent concluded it and nobody has
  checked it yet.

Add a short clause after the value when the exact file, person, or source helps:
`Basis: Observed in force-app/main/default/classes/InvoiceRetry.cls`. An
unconfirmed document is still worth keeping. Promote it by editing that line
once someone checks it, and say in the same edit what confirmed it.

A basis value never raises a document above its type. An owner-confirmed
knowledge document still does not authorize product behavior.

Specifications carry no `Basis:` line. A specification is approved behavior by
definition, because the owner approved it.

## Who may write, and who may not

**The main agent writes.** It drafts the words, it saves them after approval,
and it owns whether they are true.

**The memory verifier never writes.** It has no Write or Edit tool, and it uses
Bash only to read. When it thinks a file should change, it says which file and
what is wrong, and the main agent makes the change.

Writing is authorized when any of these has happened:

- the owner approved the drafted words;
- the owner clearly asked for a specification or memory change;
- the owner approved behavior during design and the specification must now
  reflect it; or
- the owner clearly said `remember this`, `save this`, or something equivalent.

A clear remember request approves the content it names. It does not need a
second approval for the filing.

**Asking the owner a yes-or-no question is not approval.** They approve the
words they were shown. If the exact text is not in front of them, there is
nothing to approve yet.

**An edit the owner makes is taken exactly as written.** It needs no further
checking, because the owner is the source. If an agent thinks the edit is wrong,
it says so and they talk about it. It does not quietly change the words back.

## What the owner sees

The real text, already checked, with the destination path for each piece, and
anything unchecked visibly marked. Not a table describing what would be written.

Number the pieces so the owner can answer with a number. They may approve all,
approve some, cut any, edit any, or defer. There is no required approval phrase
and no proposal limit.

A deferred proposal changes no document and creates no queue. If the possible
update should be tracked, it goes in the project's work tracker.

**When nothing is worth saving, say so in one line and show nothing else.**

## When to run this

Run the review for durable updates:

- when a substantial task is complete, at the moment its pull request is opened.
  The pull request does not wait for the owner's answer: it opens with the code
  in it, its description says what the review found, and approved memory is
  committed to the same branch before it merges;
- at the end of a brainstorming or requirements interview;
- at the end of a milestone or project phase;
- when a session hands off to a fresh one or its context is about to be cleared.
  This is the one with the most at stake, because the context is about to be
  destroyed and nothing can catch a clear after it happens. Save what the owner
  approves and carry everything else inside the handoff prompt; and
- at another natural stopping point after meaningful work, when the owner ends
  or pauses the task and a settled durable result exists.

Do not run it merely because a response ends, a commit is created, or a trivial
action finishes.

One review may satisfy several nearby stopping points. Do not repeat an
unchanged review because the chat, commit, and pull-request steps happen close
together. Review again only when later work changes a durable conclusion.

Unfinished work state is not memory. Live status, blockers, and next actions
belong in the work tracker and in the handoff prompt.

A hook may start the review at one of these points by holding the command that
opens a pull request. That is the hook remembering, not a new trigger. The hook
only sees commands typed in the terminal, so this rule is the backup for every
pull request it cannot see.

## Read before you change something

When a task changes system behavior or depends on project history:

1. Read the root instruction file and this rule.
2. **Find the specification for the area you are about to change, and read it
   before changing anything.** Start at `specs/README.md`, then the area index.
   When no specification covers the area, say so before building.
3. Read the relevant memory indexes for that area.
4. Follow only the links this task actually needs.
5. Search the repository text when the right area or document is uncertain.
6. Report conflicting current truth instead of silently picking one.

Do not load every memory file in every session.

## What every durable document has

1. a descriptive title;
2. a one-sentence summary immediately after the title;
3. a `Basis:` line under that summary, for everything under `memory/`;
4. a type given by its folder path, and content shaped for that type;
5. an entry in the nearest `README.md` index; and
6. links to related documents where they genuinely help.

No YAML frontmatter. No empty placeholder fields. `Status: Superseded` plus a
link to the replacement is required whenever a replaced document is kept.

The shape check enforces items 1, 2, 3, and 5, and it runs in about a second. It
is the enforcement, not an agent reading this file. When it fails, the save is
not finished.

Index files list their documents from the documents themselves, built by the
index builder rather than typed by hand. The prose around that list, saying what
the folder owns and what it does not, is written by hand and left alone.

## Structural changes need a visible proposal

After content approval, ordinary filing needs no second decision: choosing the
right existing folder, creating the document, updating the nearest index, adding
the mandatory links.

Show the owner first, in words, before any change that could:

- remove durable information;
- change meaning, authority, or canonical ownership;
- disrupt an established path or incoming links;
- reorganize many documents;
- split or merge durable documents;
- supersede current guidance; or
- create a new top-level system area, specification type, or memory type.

These are maintenance tools, not forbidden operations. They are allowed once the
exact change is visible and approved. When uncertain, show it.

Finding an existing duplicate is not authority to delete it. Report it and
propose the repair.

## Requirement changes

Specifications own current approved behavior. Code and tests implement and
verify it. When an authorized task changes required behavior, update the
specification, the code, and the tests together, normally in the same pull
request. Do not treat an exploratory brainstorm answer as approved behavior.

## Before a merge

Before a pull request containing specification or memory changes merges, bring
its branch current through the project's Git workflow, then invoke
`memory-verifier` for a read-only comparison against the latest project state.

It looks for the same truth filed in two different places by parallel work, and
for two current documents that now disagree. A clean Git merge is not proof the
memory is consistent.

The review is sized to the change: a new durable document gets the full read, an
amendment gets that document and what it links to, a generated index line gets a
quick look. The review does not fetch, merge, commit, push, or open pull
requests.

When it finds something, report both paths and the exact truth that overlaps or
disagrees. Do not discard either branch's information. Any repair that deletes,
merges, moves, splits, or supersedes goes through the visible approval above.

## Worktree and Git boundary

Every active session works in its own worktree and branch, and every write lands
there. Task code, tests, specifications, and approved memory normally use one
pull request. A discovery-only or memory-maintenance session may use a
documentation-only pull request.

Second-brain does not commit, push, open or merge pull requests, deploy, or
clean up worktrees. The project's Git workflow owns those.

## Privacy boundary

Each project repository owns its specifications and memory. Do not copy client
or project content into the toolkit, another project, or a shared store.

Do not store passwords, tokens, credentials, or secrets; private personal
information that does not belong in the repository; raw chat transcripts;
proprietary source material the project cannot redistribute; or temporary debug
output with no durable value. Operational guidance may explain how to obtain a
secret without storing it.

Retired second-brain v1 Worker, Neon, curator, outbox, cache, and hook content
is not v3 truth. Do not read it, import it, or use it as a migration source.

## When something goes wrong

- Placement unclear: open `second-brain-reference.md`. Still unclear: recommend
  the best home and say why.
- Approval unclear: ask before writing.
- Current documents conflict: surface the conflict, do not pick one.
- A link target is missing: repair it in the approved change, or report it.
- A proposal is not approved, or is deferred: change nothing, queue nothing.
- Nothing durable should be added: say so.
- The shape check fails: the save is not finished. Say what is missing in plain
  words and fix it.
- An approved update cannot be completed: retry or report it, keep the task
  unfinished, and do not merge as though it succeeded unless the owner
  explicitly waives it. The pull request may still open.
- The worktree is unclear: stop before writing.
