# Second brain to-dos

Everything still open on the knowledge system, grouped by what it is about.
Written 2026-08-22.

This file exists because a chat session's task list dies when the session ends.
Anything here that turns into real work gets a GitHub issue on the
`Claude-Toolkit-Project` board, because `spec-before-you-build.md` says nothing
gets built off a note.

## What needs Mike's answer

Three things. Everything else waits on them or is already unblocked.

1. **A1**, how to start the architecture fix. Three approaches below.
2. **B1**, the project-versus-everywhere scope gap.
3. **C1**, what Codex gets back after the `AGENTS.md` trim.

---

## A. Make the second brain understandable

**The problem, in one line:** the same instruction is written out in so many
files that an agent new to the project cannot tell which copy is true.

**The measurement.** Inside a project that installs the plugin:

| Idea | How many copies |
|---|---|
| The find ladder | 7 |
| The approval bullets | 5, and two use different field names |
| The file shape, nine required fields | 4 |
| The routing table | 3 |

**Why it matters in practice.** Adding one rung to the find ladder meant editing
13 files. Only **two** of those genuinely need their own copy:

- `plugins/second-brain/skills/recall/SKILL.md`, which owns the ladder.
- `AGENTS.md`, because Codex reads that file and nothing else, and it cannot
  follow a pointer.

**The single biggest cause.** Six human-facing blurbs hardcoded the phrase
"five-tier find ladder" when none of them had any reason to know the rung count:
`.claude-plugin/marketplace.json`, both of second-brain's `plugin.json` files
(twice in the Codex one), `plugins/second-brain/README.md`, the root
`README.md`, and `.claude/toolkit-sync.md`. Dropping the number from those alone
would have cut the change from 13 files to 7.

**A second live example**, found while doing the save review for pull request
218: the approval bullets are named `What / Where / Source / Tags / Assumptions`
in `remember/SKILL.md` and `What / Where / Why / Assumptions / Unverified` in
`where-persistent-information-belongs.md`. Same idea, two files, different words.

### A1. Fix the file architecture

**Needs Mike's answer: which approach.**

- **Map it first (recommended).** One table naming, for every idea in the
  system, the single file that owns it and what every other file says instead.
  Mike approves the map, then the edits happen.
- **Fix the ladder first.** Do one idea properly as proof the pattern works,
  then apply it everywhere.
- **Write the standing rule first.** Say which kinds of file may repeat an
  instruction, which must point at it, and which must never mention it. Then
  apply the rule.

**Six questions still unanswered**, to be asked one at a time:

1. Is the job removing copies, simplifying the system, or both?
2. Some duplication is forced. Codex reads only `AGENTS.md`; a skill's body
   loads only when invoked. Is forced duplication acceptable when it is
   labelled and a test enforces it?
3. Who is the confused stranger: a fresh Claude session in an adopting project,
   a Codex session, or Mike reading it?
4. Adopting projects only, or the toolkit repository's own deliberate
   source-plus-installed double copy as well?
5. Does this get its own GitHub issue? `spec-before-you-build.md` says yes.
6. What is the success test? Something runnable, such as "a fresh agent reads
   one file and saves correctly without asking."

**Already answered:** the system's concepts do not shrink. The skill count, the
nine required fields, and the three value lists stay as they are. Mike was
offered cuts and said no. The file layout is the problem, not the design.

### A2. Add the work tracker to the find ladder

**Blocked by A1**, because A1 decides where the ladder lives and doing this
first means doing it twice.

**The change.** The work tracker becomes tier 5. Past sessions moves to tier 6.

**Why.** `/recall` walks the ladder and the work tracker is not on it, so recall
can answer "what did we decide" and cannot answer "what is still open", because
an open question lives on the ticket and nowhere else. Meanwhile `remember`
already searches the tracker. The two skills disagree with each other today.

**The wording for the new tier**, already drafted:

> Check wherever this project tracks work. The root instructions say where that
> is: a folder in the repository, GitHub issues, or something else.
>
> An open or closed work item may already own the answer, and this is the only
> tier that holds open questions. Nothing else in the ladder does: a saved file
> records what is settled, and a question nobody answered lives on the ticket.
> A closed ticket still counts, so read closed items too.

### A3. Renumber the ladder in the North Star

**Blocked by A2.** File: `work-items/memory-redesign/knowledge-system-north-star.md`.

Mike decided the approach: renumber the written-out list, leave his quote alone.

- Lines 588 to 601 are his blockquote. **Never touch these.** They are his words.
- Lines 604 to 618 are an agent-written expansion of the quote, so they may be
  edited. Add the work tracker as 5, past sessions becomes 6.
- Line 620's heading, and lines 625, 632, and 655, all shift by one tier.

### A4. Decide whether the remember skill's search list changes

**Blocked by A1.** File: `plugins/second-brain/skills/remember/SKILL.md`,
section "1. Search before drafting".

Its list already has five items and already ends at the work tracker. An earlier
plan said to add past sessions as a sixth item so the two skills match.

**That looks wrong.** The list exists so the agent can check whether a current
file already says the thing before writing a duplicate. A past session is never
a current file, so searching it there is a step that cannot pay off.

**Recommendation:** leave the list at five items and change only the framing
line above it, so the numbering still lines up with the six-tier ladder.

---

## B. Things the system cannot store yet

Three real gaps. All three are "write a ticket", not "build it now".

### B1. The routing table has no row for "true in every project"

**Needs Mike's answer.** He found this one.

File: `plugins/project-init/library/rules/general/where-persistent-information-belongs.md`,
and its byte-identical copy at `.claude/rules/`. That file auto-loads in every
session, so it is what actually decides where things go.

**The problem.** Its routing table has 11 rows and every one points inside the
project. An agent that learns something general, such as how a Claude Code tool
behaves or a shell quirk, reads the table, finds "a lasting fact, decision,
event, or piece of context goes in `knowledge/memory/`", and files general
knowledge as project knowledge. The table does not fail to instruct. It
instructs wrongly.

**The worked example.** A note about the Bash tool collapsing doubled
backslashes was proposed for project memory. Mike rejected it and was right: it
is true in every repository, not this one.

**The options:**

- Add the scope test to the rule now, and ticket the missing home separately.
- Ticket both together and change nothing yet.
- Build both at once, which is much larger.

**Draft wording** for the fix, if it goes ahead:

> **Would this still be true in a project that has nothing to do with this one?**
> If yes, it is not project memory. That covers how a Claude Code tool behaves,
> a shell quirk, a language gotcha, and how a third-party library works.
>
> There is no machine-wide store yet, so say it out loud in the session and do
> not save it. Tell the owner it has no home rather than filing it in the wrong
> one.

### B2. No machine-wide memory exists

**Blocked by B1.** Write the ticket, do not build.

`~/.claude/rules/` holds machine-wide **rules**, meaning standing instructions
about behavior. There is no machine-wide **memory**, meaning facts true
everywhere. So a general fact learned in one project has two bad options: file
it in the wrong place, or lose it.

**What the ticket has to answer:**

- Where does it live? Probably `~/.claude/memory/`, beside `~/.claude/rules/`.
- What loads it, and does it load every session or only on demand?
- Does `remember` write to it, and what does approval look like?
- Does `recall` search it, and at which tier?
- Does `machine-sync` install and keep it current?
- Same file schema as project memory, or a smaller one?

Check it against the existing two-question test in
`plugins/project-init/machine/README.md`, which decides what belongs to a whole
computer rather than to one project.

### B3. There is no `question` type

Write the ticket. **Do not build it here:** it changes the saved file format,
which reaches every project that installs the plugin.

**The gap.** A memory file's `type` is one of `fact`, `decision`, `event`,
`context`, or `constraint`. There is no `question`. So an open question can only
live on a work item, and closing that ticket buries any question nobody
answered.

**Why it matters, in Mike's framing:** open questions are often the most
valuable thing in a conversation. Walking into a vendor call, the useful output
is not what you know, it is the list of things you still have to ask.

**What the ticket should ask for:**

- `question` as a sixth `type` value.
- A question file carries where it came from and who has to answer it.
- Answering a question supersedes it into a decision, using the existing
  three-step supersede.
- The checker accepts the new value.

**Name the size in the ticket** so whoever picks it up knows what it touches:
the schema tables in `knowledge/specs/knowledge-system.md`, the `TYPE_VALUES`
list in `plugins/second-brain/tools/check-knowledge.mjs`, the file-shape section
of `remember/SKILL.md`, and the field list in `plugins/second-brain/README.md`.

---

## C. Loose end from the pull request 218 merge

### C1. Codex lost two instructions

**Needs Mike's answer.**

**What happened.** Mike's commit `8f82b66` edited `CLAUDE.md` and removed two
blocks from inside the `shared-with-agents-md` markers:

- "Read `@.claude/output-styles/plain-language.md` every time"
- "When you have a question for me: ask one question at a time, give me the
  options as bullets, tell me which one you recommend and why, in one line."

He moved his intent into a new `SOUL.md`, which carries neither instruction.

**The mechanical consequence.** That block has to be identical in `CLAUDE.md`
and `AGENTS.md` or `tests/installed-copy-check.mjs` fails. So the same removal
was applied to `AGENTS.md` during the merge, keeping his change.

**The cost.** Codex reads `AGENTS.md` and nothing else. Not `CLAUDE.md`, not
`.claude/rules/`, and it has no import syntax. Both instructions are now gone
from anywhere a Codex session can see them.

**Evidence he still wants them:** in the same session he told Claude "ask me one
at a time."

**The options:**

- Put both back in the shared block, in both files. Undoes part of his edit.
- Put them **below** the markers in `AGENTS.md` only, where the two files are
  allowed to differ. Codex keeps them and `CLAUDE.md` stays trimmed as he
  wanted. **This looks right.**
- Add them to `SOUL.md`, which both agents are now told to read first.
- Leave it. He removed them on purpose and Codex does without.

---

## D. Parked

### D1. DragonFly is still on the old knowledge layout

GitHub issue #171. It has 32 converted documents waiting for Mike to read and
approve. Kept deliberately separate so that reading time never blocked the
knowledge system rebuild from merging.

Do not start without Mike saying so.

---

## Finished on 2026-08-22

- **Pull request 218 merged** as `49ac5c1`, closing issue #215. The knowledge
  system rebuild is on main: flat memory, `SOUL.md`, `knowledge/current.md`,
  `cleanup` split into `retire` and `reflect`, and one read-only checker in
  place of 2,659 lines of old machinery.
- **Mike's four archive moves committed** as `3cbba10` before the pull, because
  three of them collided with moves the merge was also making. Git recorded all
  four as pure renames with no content change.
- **The plugin refreshed to 4.0.0** on Mike's machine. It had been running
  3.6.0, which still described seven memory subfolders and a `tags.md`
  vocabulary that no longer exist.
- **The duplication measured**, which is what section A is built on.
- **A proposed date stamp** on `nothing-catches-a-drifted-copy-before-it-lands.md`
  was shown at the pull request save review. Mike chose to skip it. Do not
  propose it again.
