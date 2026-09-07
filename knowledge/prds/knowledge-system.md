---
summary: How the knowledge system works, in enough detail to build it, covering the two file schemas, the find ladder, the routing table, the reasoning behind the save and approval design, and the lifecycle of a saved file.
area: knowledge-system
status: current
source: archive/memory-redesign/knowledge-system-north-star.md and the owner-approved requirements in GitHub issues #215, #219, and #221
created_at: 2026-08-21
confirmed_at: 2026-09-01
tags: [knowledge-system, memory, specifications, second-brain, schema, build-authority]
approved_by: Mike Rihm
approval_date: 2026-08-22
project: claude-toolkit
work_item: "221"
supersedes: knowledge/prds/memory-system.md, knowledge/prds/memory-system-v2.md
---

# How the knowledge system works

This is the build authority for agents changing the `second-brain` plugin in this
repository. It says what the system must do, precisely enough to build from.

Adopting projects never receive this build specification. They receive one
managed `knowledge/README.md` operating manual, task-specific skills, hooks,
tools, and folder templates. The manual is the runtime authority and is copied
unchanged from the plugin template. This specification remains the authority
for maintainers changing the plugin.

Project knowledge reaches an agent two ways.

The fail-open startup loader supplies, in order, `SOUL.md`, the manual,
`knowledge/project.md`, `knowledge/current.md`, and the entry lines of both
generated indexes. Claude Code and Codex register the same loader. Both root
instruction files contain only a short activation and fallback pointer. Rules,
skills, hooks, setup material, and machine-wide files point to the manual instead
of repeating shared policy.

A second fail-open hook then repeats a short reminder ahead of every prompt,
because the manual is long, loads once, and slides out of an agent's attention
over a session. The reminder names the manual's path, the one-line split between
a memory and a specification, the conditions a save must meet, what is never
saved, where rejected material goes instead, that saves run through the
`remember` skill with the owner's approval, and where the proposal format
lives. Three constraints hold it in shape.
It points at the manual and never copies a policy block, which
`tests/knowledge-startup-check.mjs` enforces. It asks whether this turn has a
specification to update or a memory to add, and answers "usually not" in the
same breath. The default of no is load-bearing: a bare order on every turn makes
an agent propose saves on turns that call for none. It stays silent unless
`knowledge/README.md` carries the managed manual marker, so it can never claim a
knowledge system that is not installed. It is registered on Claude Code's
`UserPromptSubmit`; whether Codex has an equivalent event is unconfirmed, and the
root instruction route remains the Codex fallback.

The design input is
`archive/memory-redesign/knowledge-system-north-star.md`. Where this
specification is more precise than the North Star, it is filling a gap the North
Star left. Where the two disagree on meaning, that is a bug in this file.

## What the system is for

An agent should accumulate durable project knowledge so the owner stops
re-explaining the same facts, decisions, constraints, and history. The goal is
not to remember everything. It is to remember the right things, and to keep what
is remembered small, current, and trustworthy.

Two failure modes matter equally. Remembering too little means the owner repeats
himself. Remembering carelessly is worse, because a future agent believes a
stale or over-general note and acts on it.

## Where information goes

Eleven destinations. Putting something in the wrong one causes real damage, so
this gets checked before anything is saved.

| The question | Where it goes |
| --- | --- |
| Who the agent is in this project | `SOUL.md` |
| A standing instruction for how the agent must behave | `.claude/rules/` |
| A repeatable procedure for a kind of work | A skill |
| How the system is meant to work, once settled | `knowledge/prds/` |
| A lasting fact, decision, event, or piece of context | `knowledge/memory/` |
| What is being worked on right now | `knowledge/current.md` |
| A work item's requirements and status | The project's work tracker |
| Only needed to finish the task at hand | Nowhere. It stays in the conversation. |
| Unchecked internal exploration | `knowledge/brainstorms/` |
| Outside source material | The project's reference or delivery files |
| A past conversation | Session history |

The North Star's own table has six rows. The five extra rows here make explicit
what it states elsewhere in prose: live work, raw exploration, outside sources,
and past conversations do not become memory or specifications by default.

Two of these get mixed up constantly, and both are damaging:

**A procedure is not a memory.** If the agent learns a repeatable way to do
something, that is a skill or a rule. Saving it as a memory means it comes back
later as a fact and gets followed as an instruction. That is how an agent quietly
changes how it works. When the agent notices a reusable procedure, it proposes a
skill or a rule. It never saves the procedure as a memory instead.

**A past fix is not a procedure.** One failure this project hit, and what
resolved it, is a memory. It records something that happened here on a date: the
symptom, the cause, and the fix. That is the "meaningful project events that
occurred" line in the manual's save test, not a standing instruction. The test
is whether the agent would follow it or read it. "Always deploy this way" is a
procedure and goes in a skill. "The pipeline failed with this error, and clearing
that cache fixed it" is a memory, and `recall` is what finds it the next time the
same error appears. Sending these to the rules folder instead would fill it with
hundreds of one-off rules and bury the standing instructions that belong there.

**A specification beats a memory.** Once behavior is settled, the specification
answers "how does this work." A memory may explain the history and point at it,
but it never becomes a competing answer. When a memory and a current
specification disagree, the agent says so out loud and names both. It never
quietly picks one.

## The four places knowledge lives

| Path | What it holds |
| --- | --- |
| `SOUL.md` | Who the agent is in this project, its role, its purpose. Project root. |
| `knowledge/current.md` | Short-term working memory. One file. Overwritten, never appended. |
| `knowledge/memory/` | Long-term memory. Flat. One file per topic. |
| `knowledge/prds/` | Approved system behavior. One file per process or function area. |

Plus two generated lists, described under "The two indexes" below.

`knowledge/memory/` is flat on purpose. There are no subfolders by type. One note
about a single topic is usually a fact, a decision, and a piece of history at
once, and forcing a choice between bins makes every save start with a question
that has no right answer. The `type` field records what kind of thing it mostly
is; it does not decide where the file sits.

## Short-term memory: `knowledge/current.md`

One file. It answers "what is happening right now" so an agent does not have to
read every work item's details on every turn.

**What it holds:**

- The current objective, in one or two sentences.
- Which work item it belongs to, if any.
- What is blocking it, if anything.
- The exact next step.
- Constraints or facts picked up this session that are not yet durable.

**What it never holds:**

- Anything treated as a lasting fact. Nothing in this file is trusted after the
  work finishes.
- A log of what happened. It is overwritten, not appended.
- A work item's requirements. Those live in the tracker.
- Secrets of any kind.

**How it behaves:**

- Read at session start, by the session-start hook.
- Rewritten whenever the situation changes: a phase ends, something blocks, or a
  handoff is coming.
- Written by the agent without an approval step. It is disposable by design, and
  requiring approval for a scratch note is what made the old system too expensive
  to use.
- Capped at 2,000 characters, enforced by `check-knowledge.mjs`. The cap is
  enforced rather than requested, because asking an agent or a person to keep a
  file short does not work.

Anything in `current.md` that turns out to be durable is promoted through the
normal save, with approval. Being in `current.md` is never grounds for it to
become long-term memory.

## Long-term memory: the file schema

One file, one topic. The filename is the topic in plain words: lowercase, words
separated by hyphens, ending in `.md`. Not a date, not a code, not a ticket
number.

Frontmatter is real YAML between `---` fences.

### Required on every memory file

| Field | What it is | Allowed values |
| --- | --- | --- |
| `summary` | One sentence saying what this file tells you. This is what the index shows. | Free text, one sentence |
| `type` | What kind of thing this mostly is. Does not decide the file's location. | `fact`, `decision`, `event`, `context`, `constraint` |
| `status` | Whether this answers questions about what is true now. | `current`, `superseded`, `retired` |
| `source` | Where this came from and where to go check it: a file path, a commit, a link, or the name of the person who said it. | Free text |
| `confidence` | How the agent knows. | `observed`, `reported`, `inferred` |
| `created_at` | The date the file was first written. Never changes. | `YYYY-MM-DD` |
| `tags` | How a topic is found across many files. Free-form, no fixed list, as many as needed. | YAML list of strings |
| `approved_by` | Who approved it. | A person's name |
| `approval_date` | When they approved it. Never empty. | `YYYY-MM-DD` |

`confidence` values mean: **observed**, the agent checked it directly.
**reported**, someone said it. **inferred**, the agent worked it out. Something
inferred stays inferred until somebody checks it. A file may not be promoted to
`observed` because it has been sitting there a while.

### Optional, written only when they apply

| Field | What it is |
| --- | --- |
| `confirmed_at` | The last time someone checked this is still true. Different from `created_at`. An old `confirmed_at` does not mean the file is wrong; it means nobody has checked it lately. |
| `source_quote` | The exact words the fact came from, when the wording matters. |
| `effective_from` | When the fact itself started being true. Different from when it was written down. |
| `effective_to` | When it stopped being true. |
| `project` | The project, where a file could otherwise be ambiguous. |
| `work_item` | The work item this came out of. A pointer, never a copy of its requirements or status. |
| `supersedes` | Path to the file this one replaced. |
| `superseded_by` | Path to the file that replaced this one. Present only when `status` is `superseded`. |
| `related_memories` | Paths to files worth reading alongside this one. |

### Dropped from the North Star's draft

- `id`. The file path is the identifier. A second one has to be kept in step with
  the filename and will not be.
- `statement`. It duplicated `summary`.
- `entities`. `tags` already does cross-file finding, and keeping both means
  deciding which one a name goes in on every save.

### The body

Below the frontmatter, a title in plain words, then what is true, written so
someone reading it a year from now understands it without the conversation that
produced it.

Links are plain file paths written in the body. There is no separate list of
links. To find what points at a file, search for its name.

## Specifications: the file schema

One file per process or function area. The filename is that area in plain words,
same rules as memory filenames.

A specification says how part of the system is meant to work: process flows,
logic flows, the path a user clicks, how someone is meant to use the thing. It is
testable in the sense that it could be used to check the system behaves right.

**A specification never restates the production code.** Nothing goes in a
specification that an agent could work out by reading the source. If it can be
cheaply and reliably rediscovered from the code, it does not belong here.

### Required on every specification file

`summary`, `area`, `status`, `source`, `created_at`, `tags`, `approved_by`,
`approval_date`. Same meanings and same allowed values as the memory schema.

`area` names the process or function area the file covers, and normally matches
the filename.

### Optional

`confirmed_at`, `source_quote`, `effective_from`, `effective_to`, `project`,
`work_item`, `supersedes`, `superseded_by`.

### Not present on specifications

- `confidence`. A specification is approved behavior. "How sure are we" does not
  apply to it. If something is uncertain, it is not ready to be a specification.
- `type`. Every file in this folder is the same kind of thing.

## The two indexes

Two generated files, one line per source file, never edited by hand.

- `knowledge/memory/memory-index.md`
- `knowledge/prds/spec-index.md`

Each line is built from the file's `summary` field, so the summary exists in one
place and is copied nowhere. Entry format:

```
- `filename.md` — the summary sentence
```

A file whose `status` is not `current` shows its status, so a superseded file is
visibly not an answer to what is true now:

```
- `filename.md` (superseded) — the summary sentence
```

Generated by `build-knowledge-index.mjs`. Ordering is deterministic so parallel
sessions do not fight over the diff. If an index disagrees with the files on
disk, the files win: rebuild it.

## The find ladder

When the agent needs to know something, it goes down these tiers and stops at the
first one that answers. Search here before asking the owner and before searching
the code broadly.

| Tier | Where | Notes |
| --- | --- | --- |
| 1 | `knowledge/current.md` | What is happening now. |
| 2 | `.claude/rules/` | The answer may be a standing instruction rather than a fact. Already loaded, so this is a check, not a search. |
| 3 | Skills | Is this a procedural thing rather than something to look up? |
| 4 | `knowledge/memory/` then `knowledge/prds/`, through their indexes, then the links inside what is found | A current specification beats a memory. |
| 5 | Past sessions, through `session-search` | The lowest tier, not a last resort. |

**When tier 4 finds nothing**, say so plainly and name what was searched. Never
invent a believable answer, and never hand back something recent but unrelated.

**Then offer tier 5.** Ask the owner whether to search past sessions. He may say
yes, or the agent may use its own judgment and search. Either way it is offered
or announced, never done silently.

**Everything from tier 5 comes back flagged.** A past session is a record of what
was said once, not current truth. Every result is handed back with the question
attached: "I found this in a previous session. Is this still accurate?" Nothing
found there is written into memory or a specification on the strength of having
been found there. If it is still true, it goes through the normal save like
anything else.

**Only `current` files answer questions about what is true now.** A superseded
file answers questions about history.

## What gets saved, and what never is

`knowledge/README.md` owns this, in its "What should be saved into the memory
base" and "What never goes in memory" sections. It is the file that actually
ships to every equipped project and the one an agent reads at session start, so
it is the only copy.

This specification deliberately does not restate it. It used to, and the two
copies drifted: the manual was rewritten on 2026-08-31 to replace a seven-
question save test with a working-memory / long-term-memory split and two
non-negotiables, and this file went on describing the deleted version.

What belongs here instead is the reasoning behind the design, which the manual
has no room for:

- **The gate runs before search, drafting, or an owner review.** Testing late
  means an agent has already written a proposal it is now motivated to defend.
- **"Already written down" is mechanical, not a judgment call.** Two copies of
  a fact drift and then neither can be trusted. Two files saying the same thing
  from genuinely different sources are two pieces of evidence, not a copy.
- **A fact that goes out of date is worse than no fact**, because a future agent
  will believe it.
- **What the agent did is not project history.** "Wrote fourteen files today" is
  not a memory. What those files changed about the project might be.
- **A rejected generic candidate is not rerouted to global memory.** A stable,
  repeated, broadly useful lesson needs a separate global rule or skill review.
- **When unsure, do not save.** Not saving costs one missed note. Saving
  carelessly makes everything else in the folder less trustworthy. The owner can
  always say "remember this."

## When a save happens

At natural stopping points:

- When a task or work item finishes.
- Before a commit or pull request. A hook raises this moment.
- Before a handoff or before clearing context. The handoff skill raises it.
- When the session has run long.
- Any time the owner says "remember this" or runs the save skill.

The owner saying "remember this" starts the review. It is not permission to
write, and it does not skip any step.

**Nothing writes without approval.** No hook, background job, or helper agent
writes to memory or a specification on its own. That is what makes what is saved
worth trusting. The single exception is described under "Converting existing
files" below.

## How approval works

`knowledge/README.md` owns the field list, in its "Get exact approval before
changing lasting knowledge" section. Do not copy it here.

The shape itself lives in one file, `references/proposal-template.md` in the
`remember` skill, which the skill reads on every run before showing the owner
anything. The manual states the contract and points at that file, so there is
never a second copy of the shape to drift.

Four things about that format are design decisions rather than mechanics, and
they belong in this file:

- **A plain subject line comes first.** It names what is being saved in
  ordinary words, so the owner knows what he is looking at before he reads a
  single detail.
- **`Save as` carries the word Memory or Specification.** The destination was
  once shown only as a folder path, and the owner had to decode
  `knowledge/memory/` against `knowledge/prds/` to know what he was approving.
  He asked twice in one session on 2026-08-31, which is how the field got added.
- **The proposal is rendered Markdown, never inside a code fence.** The shape
  used to sit in the manual inside a fence, so agents echoed the fence and the
  owner read his own proposals as monospace with no title and no white space. A
  blank line after every label is part of the shape, not decoration.
- **`What I checked` is shown with the block, not held back.** The owner sees
  the reasoning on screen before answering, so weak reasoning is visible instead
  of hidden.

What the owner is approving is **What it says**, **Why keep it**, and **Where it
came from**. The other parts are shown so he can see how it is being filed, and
he may change any of them.

Rules for the review:

- **`Guesses I made` is approved separately from the content.** A guess is how
  memory gets polluted. If the owner approves the content but not a guess, the
  guess comes out and the file is written without it.
- **Silence is not approval.** No answer, an unclear answer, or asking to see the
  full text all mean nothing gets written. Asking to see the text is not
  approval.
- **The owner can change anything.** The wording, the location, the tags, or drop
  it entirely.
- **Write only what was approved.** Not the surrounding context, not an improved
  version, not one extra sentence that seemed useful.
- **When the owner edits the words, his words are written exactly as typed**, with
  no argument and no further checking. He is the source.

The agent fills every field. The owner approves the meaning and the source, not
each field.

## Updating, superseding, retiring, deleting

**Never just add.** Writing a new file every time something comes up is how the
folder turns into a mess nobody trusts. Before writing anything new, check
whether a file on this topic already exists.

**Update** when the new information agrees with the file and adds to it. Edit the
file, set `confirmed_at` to today, and note what changed. No new file.

**Supersede** when the new information contradicts the file and the new
information is right. Three steps, done together or not at all:

1. Write the new file, with `supersedes` pointing at the old one.
2. On the old file, set `status` to `superseded` and `superseded_by` to the new
   file's path.
3. Search for the old file's name and fix anything still pointing at it as though
   it were current.

The old file stays. Often the fact that something changed is the useful part.

**Retire** when a file no longer applies but its history still matters. Set
`status` to `retired`. It stops answering questions about what is true now and
stays findable.

**Delete** only for these three reasons, and say which one out loud:

- A copy created by mistake.
- A password or key that should never have been written down.
- Something that was never true, which is different from something that stopped
  being true.

Something that stopped being true is superseded or retired, never deleted.

**Being old is never a reason to retire something.** Written two years ago and
still true means still true.

## Consolidating

The folder is not an append-only transcript. As it grows, the system recognises
duplicates, overlapping facts, contradictions, changed preferences, superseded
decisions, repeated episodes that imply a broader pattern, and memories whose
value has expired.

New information is reconciled with what exists rather than added beside it. The
right action may be to create a new file, enrich an existing one, link related
files, merge duplicates, supersede an older file, retire stale knowledge,
preserve an old file for historical context, or delete something that was simply
wrong.

The goal is not to maximise the number of files. It is a small, trustworthy,
connected body of durable knowledge.

## Work items and specifications

A work item is one piece of work: a feature, a fix, a change. Where work items
are tracked differs by project, and this system does not dictate it. Whatever the
tracker is, it owns the work item's requirements and its status. Those are live
work state. The knowledge system never holds a copy of them.

**When a work item finishes, evaluate the specifications.** Ask whether the work
changed how any part of the system is meant to work. If it did, the specification
for that area is updated to match what was actually built, through the normal
approval process. A hook raises this moment.

This is what keeps specifications trustworthy. One that never gets updated after
the work lands drifts away from the real system and then answers questions wrong.

## Converting existing files

Converting knowledge already saved in an earlier shape is the one place the
approval-before-write rule is relaxed, and only because those files were already
approved once.

The agent converts them using this specification, its best judgment, and no
guessing about meaning. It shows the owner the converted set in batches he can
actually read, and he approves after the fact. Anything that will not convert
cleanly is stopped on and named, never guessed. No fact is lost: a file that says
something before says the same thing after.

## What the system does not include

- **No database.** Markdown files plus two generated indexes cover search and
  listing. The North Star allows SQLite only if needed, and nothing here needs
  it.
- **No shipped test framework.** One read-only checker, `check-knowledge.mjs`,
  and the fixtures it runs against. The earlier system shipped 2,659 lines of
  health checks, layout tools, and harnesses, and that machinery is a large part
  of why saving became too expensive to do.
- **No agent that writes on its own.** No background writer, no private agent
  memory, no second source of truth outside these files. Markdown and Git stay
  authoritative.
