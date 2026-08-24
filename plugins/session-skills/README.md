# session-skills

Eight skills for working inside one conversation: play back a brain dump, explain
it simply, get grilled on it, check the spec, unslop a draft, hand it off, recap
it, and track what is still open.

**Setup: install and go.** One install per machine. Nothing is copied into a
project and nothing has to exist first. Only `grill-me`, `handoff`, and `unslop`
write files, and only where you approve it.

```text
/plugin install session-skills
```

## The eight

| Skill | Command | Reach for it when |
| --- | --- | --- |
| braindump | `/braindump` | You pasted a loose brain dump and want it played back in simple words before any work starts |
| explain-simply | `/explain-simply` | An answer did not land and you want it again in plain bullets |
| grill-me | `/grill-me` | A plan or design is half-formed and you want it pulled out of your head |
| handoff | `/handoff` | A session is getting long and you are about to start a fresh one |
| session-summary | `/session-summary` | You lost the thread, or you are closing the window |
| spec-check | `/spec-check` | You are about to build from or design a solution from a specification |
| track-tasks | `/track-tasks` | Several unrelated things are open at once |
| unslop | `/unslop` | A document or draft reads as machine-written and you want it cleaned up |

All eight also trigger from plain words. You never have to type the command.

---

## braindump

Paste a loose, spoken-style dump of what you want, type `/braindump`, and get
back what was understood, in words a five year old could follow, before
anything is done.

The playback opens with the big idea in one or two sentences, lists each
separate ask on its own line, says plainly what was a guess or could be read
two ways, and ends with the questions that need answering before work can
start. No files are written and no work begins until you say yes.

If you correct something, only the corrected part is played back, then
confirmed again. Once you confirm, the playback is the agreed scope, and the
project's normal rules (tickets, specs, worktrees) take over from there.

### Triggers

"play that back", "tell me what you heard", "make sure you understood that
before you start", or `/braindump` after the dump.

---

## explain-simply

Say that again in short bullets, without losing a single number.

Ask for it and you get bullets, grouped under bold headings, at a reading level
anyone follows in one pass. One idea per bullet, one line per bullet, four to
six groups, one screen.

### The rule that makes it worth having

**Simplify the wording. Never simplify the facts.**

Numbers, dates, counts, file paths, people's real names, record ids, field
names, what is blocked and what is blocking it, and anything that costs money or
cannot be undone: all of it survives into the simple version.

This is the whole point. The usual failure of a "simpler" explanation is that it
drops the specifics, and then it is not simpler, only vaguer, and the reader
cannot act on it. When a fact will not fit, the skill keeps the fact and cuts a
different bullet.

### What it explains

Whatever you name: a file path, a plan, a work item, a topic. If you name
nothing, the last substantial answer in the conversation.

It does not go and re-research the subject. It explains what is already on the
table, so it is fast and it cannot quietly change the answer.

### Triggers

"explain that like I'm five", "explain it like I'm 5 years old", "put that in
plain bullets", "simpler", or `/explain-simply path/to/file.md`.

---

## grill-me

An interview that turns an incomplete plan, design, or idea into persistent notes.
It asks one question at a time, recommends a likely answer, and writes every
response to a file before asking the next one.

### The persistence contract

The capture file is the source of truth, not the conversation. It creates a
dated file under `knowledge/brainstorms/` when project knowledge is installed,
walks the topic in dependency order, records every answer and open flag before
continuing, then closes with a contradiction check and a short recap.

An interrupted interview loses nothing, because the answers were already on
disk.

In a project with no knowledge system it uses a clearly identified standalone
brainstorm folder instead, rather than creating half a system.

### It is raw material, never approved truth

A brainstorm is not a specification and not a work item's `REQUIREMENTS.md`. It is the
record of how the answers were reached.

At the end it invokes `remember`, which follows the installed knowledge manual
and saves only the meaning you approve. The raw brainstorm checkpoint is the
one place content reaches a file before that review, because the checkpoints
make an interrupted interview safe.

The `spec-before-you-build.md` rule requires a refinement session before work is
built, and this is a good way to hold one. That rule names no skill on purpose,
so removing this plugin never leaves it stale.

### Triggers

"grill me on this plan", "stress-test this design", "help me extract this idea
into a document".

---

## handoff

Save what a session learned, then write a checked prompt a fresh session can
start from.

### The five steps, in this order

1. **The persistent review.** It invokes the installed `remember` skill to decide
   what is worth keeping and where it belongs.
2. **The save decision.** `remember` follows the installed manual and waits when
   your approval is required. Full file text appears only when you ask for it.
3. **The draft.** A prompt for a fresh session, opening with the goal of the
   work, then the task, what to read first, the decisions nobody has written
   down yet, the open questions, and one concrete first action. You do not see
   it yet.
4. **The check.** A helper agent that has not seen the conversation reads the
   draft against the repository and reports what is wrong, what it cannot
   confirm, and whether the goal is there at all.
5. **The short list, then the prompt.** A few one-line notes on what was
   corrected and what could not be confirmed, then one block to copy.

**The order is the whole point.** Write the prompt first and the persistent review
gets skipped, because once the prompt is on screen the session is over in your
head. Show the prompt before the check and the check never happens.

Anything you do not approve for project knowledge is carried inside the prompt
instead, so it is never silently dropped. Anything the checker could not confirm
is labelled inside the prompt, so it is never passed on as fact.

### Why it exists

The sessions that produce the most understanding are the ones most likely to
lose it. Two things go wrong with the prompt itself.

**The goal disappears.** The first session knew what the work was for. The prompt
carries the next step, so the fresh session does a piece of work with no idea
what it serves, and the session after that knows even less. So the prompt now
opens with the goal, the reason, and a pointer to the file or ticket holding
them, and a prompt without a goal is never shown to you.

**Nothing checked it.** Whatever the writing session believed went in as fact,
including what it had worked out for itself. The next session read that as
settled and passed it on, and the facts got less accurate each time the work was
handed on. So a second agent now reads the draft cold.

### The checker

`agents/handoff-verifier.md`, at the plugin level. It reads, and it changes
nothing.

It has not seen the conversation, which is what makes its answer worth having:
it can only believe what it can open. It checks that the goal is stated, that
the goal's pointer resolves, that every path exists, that every branch, ticket,
and number is what the draft claims, and that every file says what the draft
says it says. Everything it cannot check is marked unchecked rather than quietly
passed on or quietly deleted.

Two limits, on purpose:

- **It never runs tests, builds, or scripts.** Those take minutes you do not
  have at a handoff. A claim that tests passed, with no command output behind
  it, is reported as not confirmed.
- **It never blocks the handoff.** If it fails or cannot run, the prompt is
  still written and says inside it that it was not checked.

### Checking a prompt you already have

`/handoff check` runs the checker on its own, against a prompt from an earlier
session, another agent, or written by hand. No persistent review, nothing saved,
nothing from the current session added. You get the same short list and the
corrected prompt.

### Its known limit

**A clear with no warning is not caught.** Type `/clear` without running this
first and nothing fires and nothing is saved. Two things reduce that: the
`offer-context-handoff.md` rule tells the agent to raise a handoff before the
session gets that heavy, and asking for one in plain words works as well as
typing the command.

Nothing can catch the moment context is cleared. Claude Code's session-end event
fires on a clear, but it is side-effects only: it cannot stop the clear and
cannot say anything to the agent. So the trigger has to be something you do on
purpose.

---

## session-summary

Recaps a session as a table, one row per main request you made, each with an
honest status, then pulls anything that still needs you into its own block below.

First, the table. One row per request, in the order you asked:

| # | What you asked | Status | Where it landed |
| --- | --- | --- | --- |
| 1 | Fix the login timeout on staging | ✅ **Done** | Session cookie lifetime corrected in `auth/session.ts`, deployed to staging. |
| 2 | Add a retry to the payment webhook | ⏳ **Partly done** | Retry is in. The dead-letter queue for repeated failures is still open. |
| 3 | Why does the nightly job run twice? | 💬 **Answered** | Two cron entries exist, one left over from the old deploy. |

Then, always last, the block that says what needs you. In a flat list every line
looks the same, so the one thing that needs you is buried among the things that
do not. When nothing needs you it still appears and says so in one line, so a
finished session does not read as an open loop.

### One row per ask, not per step

A long session usually holds one to three real requests. Everything else is the
work those requests caused, and it does not earn its own row. Choosing from
options, approving a proposal, answering a question, and confirming work in
flight are all decisions inside a request. A request that took six pieces of
work is still one row.

The test: would this have come up at all if the earlier request had not been
made? If not, it belongs to that request.

### The status words

| Status | Written as | Means |
| --- | --- | --- |
| Done | ✅ **Done** | Finished, and checked |
| Done, unverified | ⚠️ **Done, unverified** | Finished, but not tested or confirmed |
| Partly done | ⏳ **Partly done** | Some landed, and what is left is named |
| Blocked | 🔴 **Blocked** | Cannot proceed, and what is blocking it is named |
| Waiting on you | 🔴 **Waiting on you** | Needs your own action, and the action is named |
| Not started | ⚪ **Not started** | Agreed but not begun |
| Dropped | ⛔ **Dropped** | You changed direction or withdrew it |
| Answered | 💬 **Answered** | It was a question, not a build |

The status has to match what actually happened, including the parts that failed
or were never verified. A request recorded as done when it was only attempted
quietly becomes a wrong assumption weeks later.

It also works on a session other than the current one. Point it at a transcript,
a log, or an exported chat.

---

## track-tasks

Every topic still open in this session, in one list you can call up any time.

A long session drifts. You raise a question, the conversation moves on, and four
topics later nobody remembers the first one is still unanswered. This keeps a
running list of all of them on Claude Code's built-in task list.

### What it tracks that is easy to lose

- **Topics you parked.** Parked stays on the list. Parked is not finished, and
  nothing is removed without you saying so.
- **Questions asked of you that you have not answered.**
- **Work blocked behind something else**, with the blocking item named.
- **Work waiting on a background agent.** Background work finishing is not the
  same as the topic being resolved.

### What each entry carries

Enough that a different person could pick it up cold: what has to be decided or
done, plus the numbers, names, and file paths already established. An entry
reading "fix the index" is worthless a day later.

An item is marked finished only when it actually is. Not when the work is nearly
done, not when a check is still failing, not when the last step was skipped.

### The limit, said out loud

**The list belongs to this session and does not survive the session ending or
the context being cleared.** Anything that has to outlive the conversation is
named, along with where it should go instead: wherever its work item is being
tracked, or a handoff prompt.

### The rule is what makes it automatic

The skill gives you a command. The rule is what makes a session keep the list
without being asked.

`track-open-topics.md` ships in the general rules library, not in this plugin,
and is copied into a project's `.claude/rules/` during setup, where Claude Code
loads it at the start of every session. It names no skill, so removing this
plugin never leaves a rule pointing at something that is not there.

### The name

`/tasks` is already a built-in Claude Code command, and it lists a session's
background work including finished subagents. Hence `/track-tasks`.

---

## spec-check

A specification that many sessions have touched drifts: agents add context,
research, and detail, and each later agent builds from a slightly more
polluted version, further from the goal. Run `/spec-check` before building
from or designing a solution from a specification, meaning a
`knowledge/specs/` file or a ticket body (a GitHub issue, a Linear ticket, or
a work item's `REQUIREMENTS.md`).

The check names what it read, restates the goal in one line, then flags
anything that could skew the work: contradictions, build details that crept
into the requirements, statements that read two ways, research sitting in the
body, and requirements with no reason attached. Every flag comes with a
proposed fix. Nothing changes without your approval, a dismissed flag stays
dismissed for the session, and approved fixes land in the specification
itself before building starts. A clean specification gets one line saying so.

The `spec-before-you-build` rule in the project-init library tells agents to
run this check, and the `hooks-library` plugin ships `spec-check-reminder`,
which asks once at the session's first file edit whether the check has run.

---

---

## unslop

Point it at writing that already exists and it names every pattern in there that
reads as machine-written, shows the fix for each one, and hands back a rewritten
version. It writes to a file only after you say yes.

It works on a file you name, on text you paste, or on the last substantial
answer in the conversation if you name nothing.

### Removing the tells is only half of it

Text with every tell stripped out and nothing put back reads as machine-written
too, just blander. So the rewrite also puts a voice in: an actual opinion about
a fact, sentences of different lengths, a thing allowed to be two things at
once, "I" where it fits, some mess instead of perfect parallel structure.

The limit on that half: adding voice never adds a claim. It does not invent an
opinion about something it cannot check, and it does not add colour that asserts
something the original did not say.

### What it will not touch

Numbers, dates, money, file paths, branch names, commands, people's real names,
record ids, object names, and field names all survive the rewrite exactly as
they were. `dd_Universe_Identifier__c` keeps its spelling even though it looks
like jargon; only the prose around it changes. Quoted material and code blocks
are left alone, because rewriting a quotation changes what somebody said.

Where a tell cannot go without losing one of those, the fact wins and you get
one line saying which tell was left and why.

### The project's voice wins

It reads the active output style first. Where one of its patterns and that style
disagree, the style wins, and it tells you which rule it followed. It is a
cleanup pass over existing text, not a second set of instructions competing with
the project's own voice.

### What you get back

A findings list first, one line per fix, naming the pattern, quoting the phrase,
and giving the replacement:

```text
Line 4   metaphor noun       "the north star for the team"  ->  "what the team is aiming at"
Line 11  passive voice       "the records are merged"       ->  "the batch job merges the records"
Line 19  inline-header list  "**Cost:** Cost dropped 40%."  ->  "Cost dropped 40%."
Line 26  em dash             two of them                    ->  full stops
```

Then the rewrite. Then it stops. You can take some fixes and not others.

On writing that is already clean it says so in one line and stops, rather than
inventing findings to look useful.

### Where the pattern list came from

The public `unslop` skill in the `cursor/plugins` repository, adapted. The
always-on instruction was dropped so this runs only when asked, the approval
step was added, and the rule about deferring to the project's output style was
added so it does not compete with the project's voice.

### Triggers

"this reads like AI wrote it", "unslop this", "make this sound human", "take the
AI out of this", "remove the AI tells", or `/unslop path/to/file.md`.

## How the eight relate

They overlap less than they look.

- **braindump versus explain-simply.** Opposite directions. `braindump` checks
  that what you said was understood before work starts. `explain-simply` says
  what was already answered again, more simply, after the fact.
- **braindump versus grill-me.** `braindump` is one playback and a yes, for a
  dump you already have. `grill-me` is a long interview that pulls the plan out
  of your head question by question and writes it to a file.
- **handoff versus session-summary.** Both run at the end of a session and
  answer different questions. `session-summary` answers "which of my requests
  are where, and what still needs me", is read-only, and writes nothing.
  `handoff` answers "how does somebody else pick this up". Run both if you want
  both; neither covers the other.
- **explain-simply versus session-summary.** One is a status view of a whole
  session. The other is a second reading of one piece of material that did not
  land.
- **spec-check versus grill-me.** `grill-me` writes the specification during
  refinement, before the ticket is ready. `spec-check` re-reads it later,
  possibly many sessions later, to catch what drifted in between. One builds
  the spec, the other defends it.
- **track-tasks versus session-summary versus the work tracker.** Three views of
  what is outstanding, at three lifespans. `track-tasks` holds what is open right
  now and dies with the session. `session-summary` is a snapshot taken once, not
  a list that is kept. The work tracker owns anything that outlives the
  conversation, and is the only one of the three that survives a `/clear`.
- **grill-me versus the work tracker.** `grill-me` captures raw discovery. It
  does not replace a work item's `REQUIREMENTS.md` or `STATUS.md`.
- **unslop versus explain-simply.** Both rewrite something that is already
  written, for different reasons. `explain-simply` is for an answer that did not
  land: it drops the reading level and keeps every fact. `unslop` is for writing
  that landed fine but sounds machine-made: it keeps the reading level and
  changes the voice.
- **unslop versus the output style.** The output style governs how Claude writes
  new text and reaches only the main conversation. `unslop` runs over text that
  already exists, whoever or whatever wrote it, and defers to the style wherever
  the two disagree. Nothing else in the toolkit cleans up a document after the
  fact.

## Why they are one plugin

Packaging a small skill used to cost more than writing it: two plugin
description files, two marketplace entries, catalog rows, README rows, a plugin
count, and version bumps, for one file of instructions.

Splitting them bought nothing at runtime. Claude Code loads each skill's name
and one-line description into every session whether they sit in one plugin or
five, so the cost in front of the agent is identical either way.

What is given up: you cannot install one without the others, and a change to any
one of them moves the shared version number, so every machine sees an update
even for parts it does not use. Accepted, because you would always want all
eight.

## If you had the old plugins

`explain-simply`, `grill-me`, `handoff`, and `session-summary` were separate
plugins and no longer exist under those names. Remove them and install this one:

```text
/plugin uninstall explain-simply
/plugin uninstall grill-me
/plugin uninstall handoff
/plugin uninstall session-summary
/plugin install session-skills
```

Every command keeps working exactly as before.

## It follows the project's own voice

Before writing, these skills read the project's active output style, found
through the `outputStyle` setting in `.claude/settings.local.json`, then
`.claude/settings.json`, then `~/.claude/settings.json`. So their output sounds
like the rest of the project rather than like a different assistant. With no
output style installed, their own rules are enough.

## Maintaining this plugin

A content change to any of the eight bumps `version` in both plugin manifests and
`metadata.version` in the repo's `.claude-plugin/marketplace.json`. Keep this
README, the top-level README, and `docs/toolkit-map.md` current when a skill
changes.
