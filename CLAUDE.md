# CLAUDE.md: working in claude-toolkit

Mike's single source of truth for the reusable pieces he wants in every project,
packaged as a Claude Code plugin marketplace. `README.md` has the full picture.

<!-- shared-with-agents-md:start -->

Read `.claude/rules` first. Every file in that folder is a rule for how you work
here, and they are in force for the whole session.

Communication

I have ADHD. Talk to me like I am smart but not technical. Sixth-grade reading level. Short sentences. Plain words.

#### Structure every reply this way

1. The answer. One or two lines. What happened, or what I asked for. Nothing else first.
2. The details. Bullet points only. One idea per bullet. One line per bullet.
3. What I need to do. Only if I actually need to do something. Say it as a direct instruction: "Click X" or "Tell me if you want Y."
4. Also found (optional). If you learned other things while working, list them here as bullets at the very bottom. One line each. Then stop. Do not explain them. Let me ask if I want more.

#### Communication Rules

- Never start with a preamble. No "Great question," no "I've gone ahead and," no restating what I asked.
- Never narrate your process. I don't need to know which files you opened or what you tried first.
- No em dashes. Ever.
- One topic per reply. If you have to cover a second topic, put it under "Also found" and keep it to one line.
- No jargon. If a technical word is unavoidable, add a four-word plain-English tag after it.
- Skip the closing offer of more help unless there is a real decision only I can make.
- Do not pad. If the answer is one sentence, send one sentence.

#### When you have a question for me

- Ask one question at a time.
- Give me the options as bullets.
- Tell me which one you recommend and why, in one line.

#### When something goes wrong

- Say what broke in one line.
- Say what it means for me in one line.
- Say what you want to do next in one line.
- Do not paste error logs unless I ask.

#### When I ask for real writing

Long is fine for drafts, scripts, posts, and documents. This whole style guide is about how you talk to me in chat, not about the work itself.

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
<!-- host-specific:start -->
2. Invoke `memory-verifier` (`.claude/agents/memory-verifier.md`) in the
   foreground and wait for its report. It reads only and never writes. It opens
   the file behind each in-a-file claim, compares each owner claim against the
   owner's actual words, and flags anything the agent worked out, because that
   cannot be confirmed.
<!-- host-specific:end -->
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

<!-- shared-with-agents-md:end -->

Everything above that marker is in `AGENTS.md` word for word, apart from the
`host-specific` passage. Everything below it may differ, and does: this file
keeps one line per folder and sends the detail to that folder's own `CLAUDE.md`,
while `AGENTS.md` writes the same detail out in full because Codex never reads
any `CLAUDE.md`. Change anything below this line and change the matching passage
in `AGENTS.md` too. `.claude/rules/keep-claudemd-current.md` owns the rule and
`tests/installed-copy-check.mjs` checks it.

## Codemap

| Path | What lives there |
| --- | --- |
| `plugins/` | The nine plugins this repo ships, and the `project-init/library/` material other projects receive. Detail: `plugins/CLAUDE.md`. |
| `.claude-plugin/marketplace.json` | Registers every plugin for Claude Code. `.agents/plugins/marketplace.json` does the same for Codex. |
| `docs/` | `toolkit-map.md`, the cross-cutting catalog. Detail: `docs/CLAUDE.md`. |
| `tests/` | Three Node checks, run by hand before every pull request. Detail: `tests/CLAUDE.md`. |
| `archive/` | Retired material kept for history. Never a source of current truth. |
| `.claude/` | What this repo runs on itself: the rule copies, the memory verifier, the output style, the three hooks, and the setup record in `toolkit-sync.md`. |

This repo runs the toolkit on itself. `.claude/rules/`, `.claude/hooks/`,
`.claude/output-styles/`, `.claude/agents/`, `brainstorms/`, `specs/`, and
`memory/` are the same setup every other toolkit project gets, installed here so
a change is felt where it is written instead of three weeks later in another
project. That means most files under `.claude/` are copies of files this repo
also ships. `tests/installed-copy-check.mjs` fails when a shipped file and its
copy stop matching, so nobody has to remember to change both.

## Where work is tracked

The `Claude-Toolkit-Project` board on GitHub, which is connected to this
repository. `.claude/rules/spec-before-you-build.md` says what has to be true of
every ticket before work starts. What is specific to this board:

- Move the issue to `Refining` when the refinement session starts. When the
  session ends and the spec is agreed, add the `refined` label and move it to
  `Ready`. Work may start then, and not before.
- **The issue body holds the functional requirements and nothing else.** The
  goal, why it matters, what has to be true for it to count as finished, the use
  cases and scenarios, and what the person using it should experience. What and
  why, never how. Keep out file paths, version numbers, and the step-by-step
  build plan: they are read once and are wrong as soon as a file moves.
- **Everything else goes in the issue comments.** Progress, decisions made while
  building, blockers, and pointers to files by relative path. Comments are dated
  and in order, so they carry the story of the work without letting it rot the
  requirements. This is the same split `work-tracker` makes between `SPEC.md`
  and `STATUS.md`: here the body is the `SPEC.md` and the comments are the
  `STATUS.md`.
- When direction changes, edit the body in that same session rather than leaving
  the old target standing, and put the reason in a comment.
- The `grill-me` skill is one way to run the refinement session. What the rule
  requires is the session and the agreed spec, whether that comes from the skill
  or from a plain conversation.

## Parallel sessions in this repo

`.claude/rules/parallel-agent-sessions.md` is the rule. Two things are specific
to this repo:

- Worktrees are siblings of the primary checkout, named
  `claude-toolkit-<issue number>`, on a branch named `issue-<number>-<slug>`.
- Memory and specification writes land in the worktree and reach `main` when the
  pull request merges, so two sessions saving at once both touch the same index
  files. Git can merge that with no reported conflict and still leave the memory
  wrong. The pre-merge review in `.claude/rules/second-brain.md` is what catches
  it, and it has to actually run here.

## Your main job here: fold new lessons into the toolkit

Most sessions in this repo start with Mike saying some version of "I want every
new project to also do X" or "remember this for future projects." Don't just
write X down somewhere. Fit it into the system:

1. **Classify it, then place it.**

   | X is... | It goes... |
   | --- | --- |
   | A rule for how agents behave, write, or work in every project | A new file in `plugins/project-init/library/rules/general/`; also add a row to that folder's `README.md` index (default ON or conditional) |
   | A setup step for new projects | Into the right gate in `plugins/project-init/skills/project-init/SKILL.md` and `references/setup-flow.md` (or propose a new gate) |
   | A guard hook or automation | The `hooks-library` plugin. A hook checks an output, triggers a process agents forget to run, or orients a session at its start; if it needs none of those, it stays a rule |
   | A whole reusable system | A new plugin under `plugins/`, each with its own `README.md`, registered in `.claude-plugin/marketplace.json`, offered by `project-init`, and listed in `docs/toolkit-map.md` |

2. **Clean up the language, keep the intent.** Mike describes things loosely;
   tighten the wording. If placement or intent is ambiguous, ask before writing.
3. **Then follow `plugins/CLAUDE.md`** for the rest: one canonical home and
   every document that has to be updated with it, opt-in by default, giving a
   new agent the writing rules in its own text, the three version numbers to
   bump, and keeping `main` installable. It loads as soon as you open a file
   under `plugins/`, which is where all of that work happens.

Older files may still contain em dashes and section signs; clean them up in any
file you are already editing.

## The other direction: pull a merged change onto your machines and into projects

Folding a change into `main` (above) is only half the trip. A change starts
helping other projects only once each machine pulls it and each project adopts
it. Pushing to GitHub updates nothing on its own. After a PR merges to `main`:

1. **Refresh the plugin on each machine.** The installed copy at
   `~/.claude/plugins/marketplaces/claude-toolkit` is a git clone that does not
   auto-update. Inside a Claude Code session run
   `/plugin marketplace update claude-toolkit`; from a terminal run
   `claude plugin marketplace update claude-toolkit`. That git-pulls the copy
   and refreshes the plugin cache. Restart the session to be sure it picks up
   the new content.
2. **Roll the change into each existing project.** Refreshing the plugin does
   NOT touch a project that is already set up: its rules were copied into
   `.claude/rules/` when the project was initialized, so a new rule or system
   does not appear there on its own. In each project that should get the change,
   run the `project-sync` skill (`/project-sync`, or just "sync this project
   with the toolkit"). It audits the project against the refreshed toolkit and
   adds what is missing, with your approval. project-sync refreshes the plugin
   first as its own Step 1, so running it inside a project also covers step 1
   for that machine.

In one line: push to GitHub, then on every machine `/plugin marketplace update`,
then in every project `/project-sync`. Nothing propagates across machines by
itself; each machine and each project pulls the change in.

This repo is one of those projects now. It runs the toolkit on itself, so a
merged change reaches it the same way: refresh the plugin, then sync.
