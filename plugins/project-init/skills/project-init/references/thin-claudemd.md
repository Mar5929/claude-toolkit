# Writing CLAUDE.md and AGENTS.md (Gate 5)

## What CLAUDE.md is

A router and a map. It answers four questions and nothing else:

- What is this project?
- What is in each folder and file, and when do I open it?
- What tools does this project run on?
- Where is work tracked?

It loads into every session, so every line costs context in every conversation.
Anthropic's guidance: keep it under 200 lines, and for each line ask "would
removing this make an agent get something wrong?" If no, cut it. A bloated file
makes agents ignore the instructions that matter.
Source: https://code.claude.com/docs/en/memory

## What goes in it, in this order

1. The two fixed lines above the title, verbatim: the self-check instruction
   and the continuity instruction. Both are quoted below.
2. Title, and one line saying what the project is.
3. `Read .claude/rules first.`
4. The project knowledge startup route, when that system is installed.
5. **Codemap.** A table, one row per folder, module, or context source. Each row
   says what is in it and when to open it. Name the context sources, not only
   the code: captured outside documentation, specifications, reference data, the
   build plans in `docs/designs/`, the product requirements in `docs/PRDs/`. A
   source nothing points at is a source nobody opens, and a folder that is still
   empty is the easiest one to leave out.
6. **Tools.** The major tools this project runs on: MCP servers, generated
   graphs or indexes, build and deploy commands. One line each, naming the
   command and the file that holds the detail.
7. **Where work is tracked.** The tracker, and how an item is marked ready to
   build.

## What never goes in it

- **A rule that already has a file in `.claude/rules/`.** Claude Code loads that
  folder every session. Two copies drift, and an agent reading both picks one at
  random.
- **How to talk to the owner.** That lives once, in the owner's own
  `~/.claude/`, and is in force in every project already.
- **A multi-step procedure.** That is a skill. Skills load on demand instead of
  in every session.
- **Anything an agent finds in one command:** what is Git-ignored, what is
  generated, which folders are empty.
- **Where something came from or when it arrived.** Git history owns that.
- **Current status, next action, or open work.** The tracker owns that.
- **What `knowledge/` contains.** Its `README.md` owns that.

## The fixed lines above the title

Copy each exactly. They are the owner's wording, on one line each, and they are
not to be reworded, shortened, or repunctuated.

> After you generate your response. Simulate the user saying "Huh? What are you
> saying?". Then regenerate your response based on that.

> Always execute work with the context in mind that the user will likely
> continue work across multiple AI coding sessions where the session context is
> cleared and picked up again. You must assist the user in helping establish
> that continuity across sessions while not adding context that might pollute
> future agents and skew them. Information must be curated and intentional.

Where the project has a `SOUL.md` and declined the project knowledge system, one
more line goes above both: `Read SOUL.md first and follow it throughout this
session.` When project knowledge is installed, its startup hook already loads
`SOUL.md`, so do not add a second route.

## The project knowledge startup route

When Gate 3 ran, use this wording and no more:

> The startup hook loads `SOUL.md`, then `knowledge/README.md` once, then
> `knowledge/project.md`, `knowledge/current.md`, and the two knowledge indexes.
> If that map is not already in this session, read those files once in that
> order. If a file is missing, continue and report it. `knowledge/README.md`
> wins when project-knowledge instructions disagree.

Do not copy the save policy, the routing table, or the knowledge specification
into the root file. `knowledge/README.md` owns those.

## AGENTS.md

One line, and nothing else:

```
Read CLAUDE.md in this folder and follow it.
```

Codex reads `AGENTS.md` and expands no import syntax, so `@CLAUDE.md` would sit
there as literal text. A plain instruction to open a file is what it follows.

Never create a nested `AGENTS.md`.

## Keeping them current

When a path, tool, tracker, or startup route changes, update `CLAUDE.md` in the
same change. Delete what is now wrong or said twice while you are in there.
`AGENTS.md` never changes, because it holds nothing that can go out of date.

`root-file-examples.md` has a finished pair to write against.
`folder-claudemd.md` covers the short `CLAUDE.md` inside each folder.
