# The operating system: how a project works

**Status: draft, 2026-08-20. Not approved.**

This is the manual for how a project set up with the toolkit works. Read it once
at the start and you know where everything is and how to behave.

`CLAUDE.md` and `AGENTS.md` point here. This file is the map. When you need the
details of one part, this file tells you which other file has them.

---

## 1. What this is

The toolkit is an operating system for coding agents. It gives every project the
same shape, so an agent dropped into any of them already knows how things work.

It does four things:

- **Tells you who you are** in this project and what you are here to do.
- **Gives you rules** you follow without being asked.
- **Gives you skills**, which are step-by-step instructions for jobs that come up
  again and again.
- **Gives you memory**, so what the project learned last month is still here
  today.

It is all plain Markdown files in the project's own Git repository. There is no
database, no hidden store, and nothing that only an agent can read. The owner can
open any of it, and Git shows exactly what changed.

---

## 2. The six places information lives

This is the most important thing in this manual. Every piece of information
belongs in exactly one of six places. Putting something in the wrong one causes
real damage.

| The question | Where it goes | What it is |
|---|---|---|
| Who am I here? | `SOUL.md` | Your identity and purpose in this project. |
| How must I behave? | `.claude/rules/` | Standing instructions. Always on. |
| How do I do this job? | Skills | Step-by-step instructions for a repeated job. |
| How is this supposed to work? | `knowledge/specs/` | Settled, approved behavior. |
| What do we know? | `knowledge/memory/` | Lasting facts, decisions, events, context. |
| Do I only need this right now? | Nowhere | It stays in the conversation and disappears. |

Three mistakes happen over and over:

**A procedure is not a memory.** If you learn a repeatable way to do something,
that is a skill or a rule. Save it as a memory and it comes back later as a fact
and gets followed as an instruction. That is how an agent quietly changes how it
works.

**A specification beats a memory.** Once behavior is settled, the specification
answers "how does this work." A memory explains history and points at it. If the
two disagree, say so out loud instead of quietly picking one.

**Most things belong nowhere.** What you searched, what you tried, what the test
said, which files you opened. None of that is worth keeping. Saving it is how the
project fills up with noise nobody trusts.

---

## 3. The folder map

```
SOUL.md                  Who you are in this project.
CLAUDE.md                How Claude Code works here. Points at this manual.
AGENTS.md                The same, for Codex. Codex reads nothing else.
README.md                What this project is, for humans.

.claude/
  rules/                 Standing instructions. Every one loads every session.
  skills/                Step-by-step instructions for repeated jobs.
  hooks/                 Small programs that run automatically at set moments.
  output-styles/         How to write when talking to the owner.
  settings.json          Configuration.

knowledge/
  project.md             What this project is and what it is for.
  current.md             What is being worked on right now.
  index.md               A generated list of everything written down. Never edit by hand.
  memory/                Lasting facts, decisions, events, context.
  specs/                 Settled, approved behavior.
  brainstorms/           Rough ideas. Not true yet. Never quote as fact.

work-items/              Active work, one folder per item. Only in some projects.
```

Two of these are easy to get wrong:

**`knowledge/brainstorms/` is not true.** It holds unfinished thinking. Never
treat anything in it as settled, and never quote it as a fact.

**`knowledge/index.md` is generated.** A script builds it from the files. Editing
it by hand does nothing, because the next rebuild overwrites you.

---

## 4. How a session starts

Every session, before doing real work, you should know:

1. **Who you are here.** `SOUL.md`, if the project has one.
2. **What the project is.** `knowledge/project.md`.
3. **What is happening right now.** `knowledge/current.md`.
4. **The rules.** Claude Code loads every file in `.claude/rules/` on its own.
   Codex does not, which is why `AGENTS.md` writes the important ones out in
   full.
5. **Where to find everything else.** This manual.

You do not load the memory folder at startup. There is too much of it, and most
of it is not about today's task. You load the map and search when you need
something.

---

## 5. Rules

Rules are standing instructions. They are in force the whole session and you
follow them without being asked.

They live in `.claude/rules/`, one file each. Claude Code loads all of them
automatically at the start of every session.

Rules cover things like: ask before guessing, do not claim you tested something
you did not test, work in your own branch when other agents are around, show
progress when work has phases, and propose the best answer even when it is more
work.

**Two things about rules:**

- **Codex does not load them.** It only reads `AGENTS.md`. So any rule that
  causes real damage when broken is written out in full inside `AGENTS.md` as
  well. That copy is deliberate. Do not delete it as a duplicate.
- **A rule is not a memory.** If the owner says "always do X from now on," that
  is a rule, not something to write in the memory folder.

---

## 6. Skills

A skill is step-by-step instructions for a job that comes up again and again. You
load one when the job appears, and it tells you how to do it properly.

Skills the toolkit provides:

**Working with knowledge**
- `remember` decides where something belongs and saves it after the owner
  approves.
- `recall` finds what the project already wrote down.
- `cleanup` reviews the knowledge folder for stale, repeated, or conflicting
  content.
- `session-search` searches past conversations, read-only, when current files do
  not answer.

**Working inside one conversation**
- `braindump` plays a rough spoken dump back in simple words and waits for a yes.
- `explain-simply` says the last answer again as plain bullets.
- `grill-me` interviews the owner one question at a time and writes every answer
  down as it goes.
- `handoff` writes a prompt a fresh session can start from.
- `session-summary` tables what the owner asked for and where each thing stands.
- `track-tasks` keeps every open topic on the task list.
- `spec-check` reads a specification before you build from it and flags anything
  that would skew the work.

**Git**
- `pull-latest` gets the latest changes without rewriting history.
- `reset-to-remote` makes local match remote exactly, behind a confirmation.
- `merge-and-clean-up` lands an approved pull request and removes only its branch
  and worktree.

**Setup**
- `project-init` sets up a new project, one step at a time.
- `project-sync` checks an existing project against the toolkit and fills the
  gaps.
- `machine-sync` sets up a whole computer.

**Work tracking**
- `work` manages the work tracker in projects that use it.

**Salesforce**
- `sf-architect-solutioning` designs a Salesforce solution before any building
  starts.

**You may propose a new skill, never install one silently.** If you notice
something you just did is a repeatable job, say so and offer to make it a skill.
The owner decides.

---

## 7. The knowledge system

This is the part with its own manual. The short version:

**Short-term memory** is `knowledge/current.md`. What is being worked on, what is
blocking it, the exact next step. It gets overwritten, never added to. A new
agent reads it and carries on without the earlier conversation.

**Long-term memory** is `knowledge/memory/`. One Markdown file per topic. Each
file says what it is about, where it came from, when it was written, whether it
is still current, and how strongly it is known.

**Specifications** are `knowledge/specs/`. Settled, approved behavior. A current
specification beats a memory.

**Four things that are always true:**

1. **Nothing is written without the owner approving it.** No hook, no background
   job, no helper agent writes knowledge on its own.
2. **Never just add.** Check whether a file on the topic already exists. Update
   it, or replace it and mark the old one replaced. Writing a new file every time
   is how the folder becomes a mess.
3. **When unsure, do not save.** Not saving costs one note. Saving carelessly
   makes everything else less trustworthy.
4. **Search before asking.** Look in `knowledge/` before asking the owner
   something the project already answered.

**For the details, read
[the knowledge system north star](../memory-redesign/knowledge-system-north-star.md)
for the intent, and
[how the knowledge system works](../../knowledge/specs/knowledge-system.md) for
the buildable version.** Between them they hold the file format, the seven
questions that decide what to save, when to offer a save, the bullets to show the
owner, the find ladder, and how to update, replace, or retire something.

**This part is being rebuilt right now** under issue #215. The memory folder is
becoming one flat folder with free-form tags, replacing the subfolders per
category. `knowledge/specs/knowledge-system.md` is the current design; follow it
rather than the old layout.

---

## 8. Work tracking

Some projects track work as folders in the repository. Some use GitHub. Some use
something else. `CLAUDE.md` says which one this project uses.

Two things hold no matter which:

- **Every piece of work is written down before it is built.** Not in a
  conversation. In the tracker.
- **Nothing gets built from a title alone.** The ticket has to say what has to be
  true for it to count as finished, what it is for, why, what the person using it
  experiences, how it behaves from the outside, and the odd cases.

Live status, blockers, and the next action stay in the tracker. They never go in
the memory folder.

---

## 9. Hooks

Hooks are small programs that run automatically at set moments. You do not call
them. They fire on their own.

- `no-ai-attribution-guard` refuses any commit or pull request that credits an AI.
- `spec-check-reminder` asks once, at the first file edit, whether the
  specification was checked.

If a hook blocks you, fix what it caught. Never work around it, and never turn it
off to get past it.

---

## 10. You are not the only agent here

Several sessions often work the same repository at the same time. Assume another
agent is editing the same files this minute, because one usually is.

- **Look before you edit.** `git worktree list`, `git status`, `git fetch`.
- **Work in your own worktree and branch** when creating files or touching more
  than one.
- **Never run `git add -A`, `git add .`, or `git commit -a`.** They sweep up
  another session's unfinished work and put your commit message on it. Name the
  paths you are staging.
- **Never fix a messy working tree you do not recognize.** Another session is
  probably mid-task. Tell the owner.
- **Land work by pull request** and merge only when the owner says so.

---

## 11. Keeping the toolkit current

The toolkit lives in its own repository. A change there does not reach a project
on its own. Three steps, and each has to be done on purpose:

1. **Refresh the plugin on the machine:** `/plugin marketplace update claude-toolkit`.
2. **Roll machine-wide changes in:** run `/machine-sync`.
3. **Roll changes into a project:** run `/project-sync` inside it.

Nothing spreads by itself. Each machine and each project pulls the change in.

---

## 12. The short version

If you remember five things from this manual:

1. **Six places, and most things belong nowhere.**
2. **Never write knowledge without the owner approving it.**
3. **Search what the project already wrote down before asking.**
4. **A procedure is a skill or a rule, never a memory.**
5. **Another agent is probably editing right now. Work in your own branch.**
