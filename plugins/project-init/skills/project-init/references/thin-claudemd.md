# Writing thin root instructions (Gate 5)

The behavioral rules do not go inside CLAUDE.md. They live as individual files in
the project's `.claude/rules/` folder, copied there from the toolkit's rules
libraries (`library/rules/general/` for every stack, `library/rules/salesforce/` for Salesforce
projects). CLAUDE.md stays short and points at that folder.

Keeping CLAUDE.md thin is the point: a session reads it first, so it should
orient fast, not scroll through nineteen rules. The rules are still read every
session, because a line in CLAUDE.md tells the session to read `.claude/rules/`.

**Thin has exactly one exception: the second-brain v3 memory schema.** When Gate
3 ran, the routing schema goes into both root files in full and goes in first.
See "The memory section is the exception" below. Everything else on this page
still applies.

## What Gate 5 does

1. **Copy the selected rule files** into the project's `.claude/rules/`:
   - From `library/rules/general/`: every default-ON file, unless the owner drops it.
     See `library/rules/general/README.md` for the current list.
   - From `second-brain`: keep `.claude/rules/second-brain.md` when Gate 3 ran.
     This rule comes from the second-brain plugin and is not duplicated in the
     general-rules library.
   - From `library/rules/salesforce/` (Salesforce projects only): the set the owner
     chose in Gate 1, if not already copied there.
   - Adapt wording to the project's voice if the owner wants; the file is the
     intent, not fixed prose.
2. **Write a thin CLAUDE.md** with only the sections below.
3. **Write or update AGENTS.md** with the same content list (see "What AGENTS.md
   contains"). When v3 is installed, both root files carry the identical memory
   section from the second-brain plugin, in the same position, pointing at the
   same canonical rule.
4. **Add or confirm a `.claude/rules/README.md`** so the folder has an index of
   what each file does (copy the library READMEs' shape).

## What a thin CLAUDE.md contains

In this order:

- **Title and one-line description** of what the project is.
- **`Read .claude/rules`**, a single line telling every session to read the
  rules folder first. This is what keeps the behavioral rules in force.
- **The project memory and knowledge section**, when Gate 3 ran. It comes before
  the codemap and everything else. Copy it verbatim from the second-brain
  plugin's `references/orientation-snippet.md`; do not retype or summarize it.
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
  - which gates ran; when second-brain v3 was declined, say only that it was not
    adopted (when it ran, the memory section above already covers it)
  - where raw artifacts live (meeting notes, communications, deliverables,
    client exports) when the project has such folders, so an agent can tell them
    apart from curated memory at a glance
- **MCP tool rules**: only for the MCP servers the project actually uses, folded
  in from `library/guides/mcp-best-practices.md` (or copied as their own `.claude/rules/`
  files if the project prefers one file per rule everywhere).

Everything else, the writing style, the response style, the working-style rules,
the multi-agent worktree protocol, is a file in `.claude/rules/`, not prose in
CLAUDE.md.

## The memory section is the exception

Every other rule is said once, in `.claude/rules/`, and CLAUDE.md only points at
the folder. The v3 memory schema breaks that on purpose, and the reason is
narrow: routing has to happen **before** an agent writes, and a rule an agent has
not opened yet cannot route anything. A one-line label like
"`memory/decisions/`: important choices and rationale" names a folder without
telling anyone when to use it, so facts land in the wrong home or in none.

So the root files carry the full routing schema: the authority map, and per home
the purpose, the use-when, and the do-not-use-when. The canonical rule keeps
everything else (worked examples, optional document aids, evidence and
certainty, relationships, supersession, the Git and privacy boundaries, failure
behavior) and stays authoritative if the two ever disagree.

**The cost is real and must be paid.** The schema now exists in three files. Any
change to the canonical rule's authority map, homes, or document contract has to
update both root files in the same change. The `keep-claudemd-current.md` rule
states this too. Do not extend this exception to any other rule.

## What AGENTS.md contains

Codex reads `AGENTS.md` the way Claude reads `CLAUDE.md`, so it needs the same
authority, not a stub:

- Title and the same one-line project description.
- The same `Read .claude/rules` line.
- The **identical** memory section, in the same first position, byte-for-byte
  from the orientation snippet. Never a shortened variant.
- The same structural pointers, or a pointer to the CLAUDE.md section holding
  them, so the two do not drift.
- Codex-specific repository instructions, if any, which is the only content that
  legitimately differs between the two files.

Where the hosts genuinely differ, say so inline rather than forking the section.
The known case: Claude invokes the installed `memory-verifier` agent, while
Codex delegates to a subagent told to read `.claude/agents/memory-verifier.md`
and `.claude/rules/second-brain.md` in full first.

## Why file-per-rule instead of one big CLAUDE.md

- CLAUDE.md stays skimmable; a new session orients in seconds.
- Each rule is individually skippable at setup and individually editable later.
- A rule ported back to the toolkit lands as one file that projects copy
  verbatim, instead of being retyped into each CLAUDE.md.
- It matches how `library/rules/salesforce/` already works, so the two libraries behave
  the same way.

The memory schema is the one deliberate exception, for the reason given above.
Weigh any future request to duplicate a rule into the root files against that
bar: routing that must happen before the agent opens anything.
