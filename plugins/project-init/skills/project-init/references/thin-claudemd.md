# Writing a thin CLAUDE.md (Gate 5)

The behavioral rules do not go inside CLAUDE.md. They live as individual files in
the project's `.claude/rules/` folder, copied there from the toolkit's rules
libraries (`general-rules/` for every stack, `salesforce-rules/` for Salesforce
projects). CLAUDE.md stays short and points at that folder.

Keeping CLAUDE.md thin is the point: a session reads it first, so it should
orient fast, not scroll through nineteen rules. The rules are still read every
session, because a line in CLAUDE.md tells the session to read `.claude/rules/`.

## What Gate 5 does

1. **Copy the selected rule files** into the project's `.claude/rules/`:
   - From `general-rules/`: every default-ON file, unless the owner drops it,
     plus the two conditional files (`memory-system-ground-rules.md`,
     `knowledge-layer-ground-rules.md`) only if Gate 3 or Gate 4 ran. See
     `general-rules/README.md` for the list and which are default ON.
   - From `salesforce-rules/` (Salesforce projects only): the set the owner
     chose in Gate 1, if not already copied there.
   - Adapt wording to the project's voice if the owner wants; the file is the
     intent, not fixed prose.
2. **Write a thin CLAUDE.md** with only the sections below.
3. **Add or confirm a `.claude/rules/README.md`** so the folder has an index of
   what each file does (copy the library READMEs' shape).

## What a thin CLAUDE.md contains

- **Title and one-line description** of what the project is.
- **`Read .claude/rules`**, a single line telling every session to read the
  rules folder first. This is what keeps the behavioral rules in force.
- **Codemap / structural pointers**: the project's own layout and conventions
  that are not behavioral rules. Keep the codemap to **one line per folder or
  module**, naming what lives there, plus an inline invariant only where a
  session that does not know it will break something. Dated history ("changed X
  on this date, decision #17") never goes here; git and the design doc carry it.
  A codemap that drifts into a changelog is how a thin CLAUDE.md becomes a
  scrolled-past one. Examples of what belongs:
  - the backlog / work-items structure and where the index lives
  - the deployment layout (Salesforce projects)
  - the toolkit port-back convention (if the project uses the toolkit), and how
    to pull toolkit updates into this project: update the plugin
    (`/plugin marketplace update claude-toolkit`), then run `/project-sync`
  - which gates ran (memory system, knowledge layer, hooks) so future sessions
    know they exist and where.
- **MCP tool rules**: only for the MCP servers the project actually uses, folded
  in from `mcp-best-practices.md` (or copied as their own `.claude/rules/`
  files if the project prefers one file per rule everywhere).

Everything else, the writing style, the response style, the working-style rules,
the multi-agent worktree protocol, is a file in `.claude/rules/`, not prose in
CLAUDE.md.

## Why file-per-rule instead of one big CLAUDE.md

- CLAUDE.md stays skimmable; a new session orients in seconds.
- Each rule is individually skippable at setup and individually editable later.
- A rule ported back to the toolkit lands as one file that projects copy
  verbatim, instead of being retyped into each CLAUDE.md.
- It matches how `salesforce-rules/` already works, so the two libraries behave
  the same way.
