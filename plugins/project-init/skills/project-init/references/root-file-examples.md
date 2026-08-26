# Worked examples: a finished CLAUDE.md and AGENTS.md

`thin-claudemd.md` says what the two root files are for and what goes in them.
This file shows one finished pair, so Gate 5 has something to write against
instead of assembling the structure from prose each time.

The project is `acme-crm`: a Salesforce delivery repository that took `SOUL.md`,
the project knowledge system, captured outside documentation, and a GitHub
board. Adapt the content, keep the shape.

## The three fixed lines at the top

Three instructions sit above the title in both root files, in this order. The
first is conditional; the other two are in every project.

1. **The SOUL route**, only when `SOUL.md` exists and the project declined the
   project knowledge system. When knowledge is installed, its startup hook loads
   `SOUL.md` already and a second route is duplication.

   > Read SOUL.md first and follow it throughout this session.

2. **The self-check instruction**, in every project, verbatim. It goes directly
   under the SOUL route where there is one, and is the first line otherwise.
   Copy it exactly; it is the owner's wording and it is not to be reworded,
   shortened, or repunctuated.

   > After you generate your response. Simulate the user saying "Huh? What are
   > you saying?". Then regenerate your response based on that.

3. **The continuity instruction**, in every project, verbatim. Same handling:
   copy it exactly, on one line, and do not reword or shorten it. Both are
   quoted here for readability; in a root file each is one line, as the samples
   below show.

> Always execute work with the context in mind that the user will likely
> continue work across multiple AI coding sessions where the session context is
> cleared and picked up again. You must assist the user in helping establish
> that continuity across sessions while not adding context that might pollute
> future agents and skew them. Information must be curated and intentional.

   It is the standing reason the rest of this file exists. A session works
   knowing its context will be cleared and picked up by an agent that was not
   here, so it writes down what that agent needs and leaves out what would
   mislead it.

The sample below has project knowledge installed, so it carries the two
unconditional lines and no SOUL route.

## Sample CLAUDE.md

````markdown
After you generate your response. Simulate the user saying "Huh? What are you saying?". Then regenerate your response based on that.

Always execute work with the context in mind that the user will likely continue work across multiple AI coding sessions where the session context is cleared and picked up again. You must assist the user in helping establish that continuity across sessions while not adding context that might pollute future agents and skew them. Information must be curated and intentional.

# CLAUDE.md: working in acme-crm

Salesforce delivery for Acme's sales org. Everything deployable lives in
`force-app/`; work is tracked on the Acme CRM board.

Read `.claude/rules` first. Every file in that folder is a rule for how you work
here, and they are in force for the whole session.

## Communication

Sarah is technical but not a Salesforce developer. Name the object and field,
not the API name, unless the API name is the point.

## Project knowledge

The startup hook loads `SOUL.md`, then `knowledge/README.md` once, then
`knowledge/project.md`, `knowledge/current.md`, and the two knowledge indexes.
If that map is not already in this session, read those files once in that order.
If a file is missing, continue and report it. `knowledge/README.md` wins when
project-knowledge instructions disagree.

## Codemap

| Path | What lives there, and when to open it |
| --- | --- |
| `force-app/main/default/` | The org's metadata: objects, flows, Apex, permission sets. Detail: `force-app/CLAUDE.md`. |
| `ai-external-knowledge/` | Salesforce documentation captured as Markdown, one folder per topic. Open it before designing against a platform feature, instead of searching the web. Today: `sharing-and-visibility/`, `flow-limits/`, `omnistudio/`. |
| `knowledge/` | What this project decided and why: specifications, memory, current state. The routing table in its `README.md` says which goes where. |
| `docs/` | Documents written for Acme, not for agents. Detail: `docs/CLAUDE.md`. |
| `scripts/` | Deploy and data-load scripts. Detail: `scripts/CLAUDE.md`. |
| `.claude/` | Rules, hooks, output style, settings. |

## Where work is tracked

The Acme CRM board on GitHub, connected to this repository. The issue body holds
the requirements and nothing else; progress and decisions go in the comments. An
issue is ready to build when it carries the `refined` label.
````

## Sample AGENTS.md

Codex does not read `CLAUDE.md`, any folder `CLAUDE.md`, or anything in
`.claude/rules/` on its own, and it expands no import syntax. It does follow a
plain instruction to open a file. So AGENTS.md is a short pointer file plus the
few things that have to land before Codex opens anything.

````markdown
After you generate your response. Simulate the user saying "Huh? What are you saying?". Then regenerate your response based on that.

Always execute work with the context in mind that the user will likely continue work across multiple AI coding sessions where the session context is cleared and picked up again. You must assist the user in helping establish that continuity across sessions while not adding context that might pollute future agents and skew them. Information must be curated and intentional.

# AGENTS.md: working in acme-crm

Salesforce delivery for Acme's sales org.

## Read these before you do anything

Codex does not load Claude's instruction files on its own, and this repository
keeps one copy of each thing rather than two. So open and read, in order:

1. `CLAUDE.md` in this folder. It is the map: what this project is, where
   everything lives, and where work is tracked.
2. Every `.md` file in `.claude/rules/`. Each one is a rule for how you work
   here, and all of them are in force for the whole session.
3. The `CLAUDE.md` inside any folder before you edit files in it.

## Two rules that cannot wait until you have read them

- Never run a destructive deploy or data command. The full list is in
  `.claude/rules/salesforce-safety-guardrails.md`, which you are about to read.
- Never edit files, switch branches, or reset in the shared primary checkout.
  Work in your own worktree on your own branch.

## Communication

Sarah is technical but not a Salesforce developer. Name the object and field,
not the API name, unless the API name is the point.

## Project knowledge

The startup hook loads `SOUL.md`, then `knowledge/README.md` once, then
`knowledge/project.md`, `knowledge/current.md`, and the two knowledge indexes.
If that map is not already in this session, read those files once in that order.
If a file is missing, continue and report it. `knowledge/README.md` wins when
project-knowledge instructions disagree.
````

## Why AGENTS.md is short

It used to repeat the codemap, the folder detail, and the working rules, because
Codex reads none of those files by itself. That bought a Codex session a map it
was guaranteed to have, and cost a second copy of everything, maintained by hand,
drifting from the first.

The pointer version trades that guarantee for one instruction Codex has to
follow. It is the same bet the toolkit already makes for `.claude/rules/`, which
has never been inlined. One copy of each thing is worth more than a guarantee
that the second copy is present but wrong.

Three things still stay written out in AGENTS.md, because a session that ignores
the read instruction still must not do damage:

- the three fixed lines at the top;
- the rules whose breach causes real damage, in short form, each naming the rule
  file that holds the whole thing; and
- the shared `Communication` and `Project knowledge` sections, which are short,
  are needed before anything else, and are identical in both files.

## What is deliberately not in either file

- Any rule already in `.claude/rules/`. Claude Code loads that folder at session
  start and AGENTS.md sends Codex to read it.
- Anything a session could find in one command: what is Git-ignored, what is
  generated, which folders are empty.
- Where anything came from or when it arrived. Git history owns that.
- Current phase, next action, or open work.
- What the knowledge folder contains. Its `README.md` owns that.
