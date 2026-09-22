# Writing AGENTS.md and CLAUDE.md (Gate 5)

## What AGENTS.md is

A router and a map. It answers five questions and nothing else:

- What is this project?
- What is in each folder and file, and when do I open it?
- What tools does this project run on?
- Where is work tracked?
- Which configured folders use a quick save instead of ordinary branch work?

It loads into every session, so every line costs context in every conversation.
Anthropic's guidance: keep it under 200 lines, and for each line ask "would
removing this make an agent get something wrong?" If no, cut it. A bloated file
makes agents ignore the instructions that matter.
Source: https://code.claude.com/docs/en/memory

## What goes in it, in this order

1. The fixed line above the title, verbatim: the continuity instruction. It is
   quoted below.
2. Title, and one line saying what the project is.
3. `Read .claude/rules first.`
4. The Toolkit operating-manual route below.
5. The project knowledge startup route, when that system is installed, and the
   one System Guide fallback line when that independent plugin is enabled.
6. **Codemap.** A table, one row per folder, module, or context source. Each row
   says what is in it and when to open it. Name the context sources, not only
   the code: captured outside documentation, reference data, the PRDs in
   `knowledge/prds/`, the build plans in `docs/designs/`. A
   source nothing points at is a source nobody opens, and a folder that is still
   empty is the easiest one to leave out.
7. **Tools.** The major tools this project runs on: MCP servers, generated
   graphs or indexes, build and deploy commands. One line each, naming the
   command and the file that holds the detail.
8. **Quick saves.** Route documentation publication to its rule unless explicitly
   declined, even without knowledge enabled. Name actual documentation paths
   and applicable configured-system routes. Do not copy their procedures here.
9. **Where work is tracked.** The tracker, and how an item is marked ready to
   build.

## What never goes in it

- **A rule that already has a file in `.claude/rules/`.** Claude Code loads that
  folder every session. Two copies drift, and an agent reading both picks one at
  random. The Quick saves table is the narrow exception: it names the action
  and points to the rule without copying its procedure.
- **How to talk to the owner.** That lives once, in the owner's own
  `~/.claude/`, and is in force in every project already.
- **A multi-step procedure.** That is a skill. Skills load on demand instead of
  in every session.
- **Anything an agent finds in one command:** what is Git-ignored, what is
  generated, which folders are empty. The local tracker row may say it is
  Git-ignored because that fact explains why it has no commit or push.
- **Where something came from or when it arrived.** Git history owns that.
- **Current status, next action, or open work.** The tracker owns that.
- **What `knowledge/` contains.** Its `knowledge-manual.md` owns that.

## The fixed line above the title

Copy it exactly. It is the owner's wording, and it is not to be reworded,
shortened, or repunctuated.

> Always execute work with the context in mind that the user will likely
> continue work across multiple AI coding sessions where the session context is
> cleared and picked up again. You must assist the user in helping establish
> that continuity across sessions while not adding context that might pollute
> future agents and skew them. Information must be curated and intentional.

Where the project has a `SOUL.md` and declined the project knowledge system, one
more line goes above both: `Read SOUL.md first and follow it throughout this
session.` When project knowledge is installed, its startup hook already requests a complete read of
`SOUL.md`, so do not add a second route.

## The Toolkit operating-manual route

Every equipped project uses this short route in `AGENTS.md`:

> Read `knowledge/toolkit-manual.md` completely during the first project
> orientation and after resume, clear, or compaction, and follow it throughout
> the work. If a read is shortened, open the file again from the first missing
> section, in chunks when needed. If it is missing or unreadable, report that
> instead of claiming readiness. Acknowledge receipt and intent only after the
> complete read.

This is the fallback when startup hooks are unavailable and the durable route
after host context changes. Keep it short. The manual owns the shared workflow;
component procedures remain in their own rules, skills, and manuals.

## The project knowledge startup route

When Gate 3 ran, use this wording and no more:

> The startup hook provides the ordered project-knowledge read route: `SOUL.md`,
> `knowledge/project.md`, `knowledge/knowledge-manual.md`, `knowledge/memory/current.md`,
> then check relevant inbox entries and use the memory/PRD/outside-source indexes. Follow that route once at session start. If it
> was not provided, read those files in that order. If a file is missing or a
> read is shortened, report it and continue the read from the project file.
> `knowledge/knowledge-manual.md` wins when project-knowledge instructions
> disagree.

Do not copy the save policy, the routing table, or the knowledge specification
into the root file. `knowledge/knowledge-manual.md` owns those.

## The System Guide fallback route

When `.system-guide.json` is enabled, add this one line to `AGENTS.md` exactly:

> When .system-guide.json is enabled, use the System Guide plugin's system-guide skill for questions or work about existing system structure, purpose, connections, or impact.

The System Guide plugin owns its Claude startup status and all detailed guide
policy. This line is the shared discovery fallback for Claude and Codex. Put it
once in `AGENTS.md`, which is the file both hosts read.

## Quick saves

Include a documentation-publication pointer in every equipped project unless
the owner opted out. Name its actual documentation locations from the codemap;
do not create a folder just to make this row fit. The rule applies without
knowledge or a tracker. Include the
`knowledge/` row only when project knowledge is configured. Include the
`.work-items/` row only when local work tracking is configured. A project with
no tracker, or a different tracker, gets no `.work-items/` row.

```markdown
## Quick saves

| Path | How updates land | Instructions |
| --- | --- | --- |
| Project documentation (use actual paths from the codemap) | Authorized documentation-only updates use the direct publication route. | `.claude/rules/knowledge-direct-commit.md` |
| `knowledge/` | Follow the knowledge manual for content approval, then the documentation publication route. | `knowledge/knowledge-manual.md` and `.claude/rules/knowledge-direct-commit.md` |
| `.work-items/` | Update the existing shared, Git-ignored local tracker. Do not create a worktree, commit, or push for the tracker update. | `.claude/rules/work-item-folders.md` and the `work` skill |
```

Keep each row to a pointer and one sentence. The linked manual, rule, or skill
owns approval, eligibility, commands, and conflict handling. A path is a route,
not permission to publish every file inside it. Behavior-bearing Markdown and
inseparable implementation changes keep their implementation workflow.

## CLAUDE.md

One line, and nothing else:

```
@AGENTS.md
```

That line is an import. Claude Code expands it and reads `AGENTS.md` through it,
on every version of Claude Code and in every kind of session, including the ones
that never read `AGENTS.md` on their own. Codex reads `AGENTS.md` by itself and
never reads `CLAUDE.md`. The content sits in one file, and Claude reads it once,
not twice.

Three rules go with the pair:

- `AGENTS.md` never contains an `@path` import line. Codex expands no imports, so
  an import line reaches it as literal text. Ordinary Markdown links and
  backticked paths are safe for both hosts.
- Never create `AGENTS.override.md` or `AGENTS.local.md`. Claude Code reads
  neither, and Codex prefers `AGENTS.override.md` over `AGENTS.md` and then
  ignores `AGENTS.md` in that folder.
- Never create an instruction file under `.agents/`. Neither host reads one.

## Keeping them current

When a path, tool, tracker, or startup route changes, update `AGENTS.md` in the
same change. Delete what is now wrong or said twice while you are in there.
`CLAUDE.md` never changes, because it holds nothing that can go out of date.

`root-file-examples.md` has a finished pair to write against.
`folder-agents-md.md` covers the short `AGENTS.md`, and its one-line
`CLAUDE.md`, inside each folder.
