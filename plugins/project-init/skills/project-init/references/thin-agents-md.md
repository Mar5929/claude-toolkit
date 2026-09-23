# Writing AGENTS.md and CLAUDE.md (Gate 5)

## What AGENTS.md is

A router and a map. It answers five questions and nothing else:

- What is this project?
- What is in each folder and file, and when do I open it?
- What tools does this project run on?
- Where is work tracked?
- Which configured folders use a quick save instead of ordinary branch work?

It loads into every session, so every line costs context in every conversation.
Aim for about 400 words. For each line ask "would removing this make an agent
get something wrong?" If no, cut it. Write short sentences, one instruction per
line. Source: https://code.claude.com/docs/en/memory

## What goes in it, in this order

1. The fixed line above the title, verbatim: the continuity instruction. It is
   quoted below.
2. Title, and one line saying what the project is.
3. `Read .claude/rules first.`
4. **Startup.** The section below.
5. **Path-scoped rules.** One line per rule with `paths:` frontmatter, and the
   one System Guide fallback line when that plugin is enabled.
6. **Codemap.** A table, one row per folder, module, or context source. Each row
   says what is in it and when to open it. Name the context sources, not only
   the code: captured outside documentation, reference data, the PRDs in
   `knowledge/prds/` (`prds/` in the `external` memory mode), the build plans
   in `docs/designs/`, which are kept after delivery. A
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

- **A rule that already has a file in `.claude/rules/`.** Two copies drift. The
  Quick saves table and the Path-scoped rules lines are the exceptions: they
  point to the rule without copying it.
- **How to talk to the owner.** That lives once, in the owner's own
  `~/.claude/`, and is in force in every project already.
- **A multi-step procedure.** That is a skill. Skills load on demand instead of
  in every session.
- **Anything an agent finds in one command:** what is Git-ignored, what is
  generated, which folders are empty. The local tracker row may say it is
  Git-ignored because that fact explains why it has no commit or push.
- **Where something came from or when it arrived.** Git history owns that.
- **Current status, next action, or open work.** The tracker owns that.
- **What `knowledge/` contains.** Its `knowledge-manual.md` owns that. In the
  `external` memory mode, `docs/knowledge-manual.md` owns what the memory
  service holds.

## The fixed line above the title

Copy it exactly. It is the owner's wording, and it is not to be reworded,
shortened, or repunctuated.

> Always execute work with the context in mind that the user will likely
> continue work across multiple AI coding sessions where the session context is
> cleared and picked up again. You must assist the user in helping establish
> that continuity across sessions while not adding context that might pollute
> future agents and skew them. Information must be curated and intentional.

The Startup section names `SOUL.md`, so no separate SOUL line is needed.

## Startup

Every equipped project in the `files` memory mode uses this section. A project
with no `.toolkit-memory.json`, or one that says `"memory": "files"`, is in
`files` mode:

```markdown
## Startup

- Read `SOUL.md`, `knowledge/project.md`, and `knowledge/memory/current.md`.
- Check `knowledge/memory-inbox.md` for unfinished saves.
- Read the three files again after resume, clear, or compaction.
- Procedures live in skills. The manuals in `knowledge/` are reference: open a
  section when a task needs it.
```

A project whose `.toolkit-memory.json` says `"memory": "external"` keeps its
memory in a memory service (mem0 or Hindsight) and uses this section instead:

```markdown
## Startup

- Read `SOUL.md` and `PROJECT.md`.
- Load working memory in full through the memory service named in
  `.toolkit-memory.json`. If its MCP server is not connected, tell the owner.
- List pending saves in the memory service.
- Repeat these steps after resume, clear, or compaction.
- Procedures live in skills. The manuals in `docs/` are reference: open a
  section when a task needs it.
```

Without project knowledge, keep only the files that exist and the last line;
the manual is then `knowledge/toolkit-manual.md`.
Never require a full read of either manual (`knowledge/toolkit-manual.md` and
`knowledge/knowledge-manual.md`, or their `docs/` copies in `external` mode) at startup, and never ask for an
acknowledgment. The startup hooks print the same route. This section is the
fallback when hooks do not run.

Do not copy the save policy, the routing table, the memory service's tool
names, or the knowledge specification into the root file. The knowledge manual
owns those.

## Path-scoped rules

Claude Code loads a rule with `paths:` frontmatter only when the agent reads a
matching file. Codex has no `paths:` support. Add one line per such rule:

```markdown
## Path-scoped rules

Claude Code loads these when a matching file is read. Codex: open the rule
before working on a matching path.

- `knowledge/**`, `docs/**`, `**/README.md`: `.claude/rules/knowledge-direct-commit.md`
```

List only rules installed in this project, with their actual patterns. In the
`external` memory mode, write `prds/**`, `PROJECT.md`, `docs/**`, `**/README.md`
for `knowledge-direct-commit.md`, and leave out `knowledge/**`.

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
`knowledge/` row only when project knowledge is configured in `files` mode. In
`external` mode, use the `prds/` row below instead: memory records are not
files, so they have no quick-save row. Include the
`.work-items/` row only when local work tracking is configured. A project with
no tracker, or a different tracker, gets no `.work-items/` row.

```markdown
## Quick saves

| Path | How updates land | Instructions |
| --- | --- | --- |
| Project documentation (use actual paths from the codemap) | Authorized documentation-only updates go straight to the default branch. | `.claude/rules/knowledge-direct-commit.md` and the `publish-docs` skill |
| `knowledge/` | Content approval follows the knowledge manual, then the route above. | `knowledge/knowledge-manual.md` and the `knowledge-save` skill |
| `prds/` and `PROJECT.md` (`external` mode only) | Content approval follows the knowledge manual, then the route above. Memory records go through the same skill. | `docs/knowledge-manual.md` and the `knowledge-save` skill |
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

When a path, tool, tracker, path-scoped rule, or startup route changes, update `AGENTS.md` in the
same change. Delete what is now wrong or said twice while you are in there.
`CLAUDE.md` never changes, because it holds nothing that can go out of date.

`root-file-examples.md` has a finished pair to write against.
`folder-agents-md.md` covers the short `AGENTS.md`, and its one-line
`CLAUDE.md`, inside each folder.
