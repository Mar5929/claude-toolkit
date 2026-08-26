# Keep CLAUDE.md Current

## What the root files are for

`CLAUDE.md` and `AGENTS.md` are the first thing an agent reads in a session,
before it knows anything else about the project. They do two jobs and nothing
else.

**They carry what an agent must know before it does anything.** How to talk to
the owner, the rules whose breach causes real damage, and the startup route into
project knowledge.

**They route.** When someone asks for something, the root file is how the agent
knows where that thing lives in this repository, so it can go open it. Every
folder, every index, and every source of context the project keeps on hand gets
one line naming what is in it and when to open it.

Routing is the half that gets forgotten. Take an agent asked to design a
Salesforce role hierarchy. The project may already hold vendor documentation on
sharing and visibility, captured into `ai-external-knowledge/` for that exact
question. The agent uses it only if the root file says the folder is there and
what is in it. A source nothing points at is a source nobody opens.

Space in these two files is the most expensive space in the project. Every line
takes attention away from every other line, so a line that does neither of the
two jobs above is not harmless. It costs.

## Keep them current

If, during a session, we identify something future sessions would need to know
(a new convention, a corrected assumption, a decision, a gotcha, a changed
workflow), update CLAUDE.md to capture it before the task ends. In particular,
whenever you add or change a path, a project instruction, or an agent/session
workflow, check whether CLAUDE.md needs updating to match. Do not let hard-won
context evaporate when the session closes.

## Three tests before you add a line

Most lines that do not belong here were written by an agent being helpful at the
end of a task, often a sub-agent that saw one corner of the project. Run these
three tests first. Any yes means leave it out.

1. **Could an agent find this out in one command?** That a folder is
   Git-ignored, that a file is generated, that a directory is empty right now:
   `git check-ignore`, `ls`, and opening the file answer all of those faster
   than a line here, and they are never out of date.
2. **Is it about where something came from, or when it arrived?** "This folder
   came in with the latest toolkit sync" tells an agent nothing about how to
   work. Git history owns that.
3. **Would a session that never read this line still do the right thing and
   still find what it needed?** Then the line is not earning its place.

If a line passes all three and you are still unsure, ask. A slightly-too-full
CLAUDE.md beats a stale one.

## Current also means thin

Every session is told to add to this file, and nothing tells it to subtract, so
the file ratchets. Left alone it grows into something a new session skims
instead of reads, which loses the context just as surely as letting it go stale.
So the rule is two-sided: add what the next session needs, and route everything
else to where it belongs.

Before adding, ask where the thing actually lives:

- **A rule the session must follow** belongs in CLAUDE.md or `.claude/rules/`.
  That is the only category this file owns.
- **Everything else routes out.** When the project knowledge system is present,
  `knowledge/README.md` holds the one routing table. CLAUDE.md may carry a short
  pointer to a canonical home, never a summary of it.
- **What is happening right now** (current phase, next action, open TODOs) does
  not belong here even as a pointer. It is stale the moment it is written.
- **What changed and when** belongs in git history, not in prose.

Then keep the shape:

- **The codemap stays one line per folder or module**, naming what lives there.
  Add an inline invariant only when a session that does not know it will break
  something ("gate on this flag, never that one"). A codemap entry that has
  grown into a dated changelog is the single most common way this file bloats:
  collapse it, and let git and the design doc carry the history.
- **The codemap names the context sources too, not just the code.** A folder of
  captured vendor documentation, a specifications folder, a reference dataset:
  one line each, saying what is inside and when to open it. These lines are
  worth the most, because nothing else in the session will mention those folders
  and an agent will not go looking.
- **Say each rule once.** If a rule is already a file in `.claude/rules/`, do not
  restate it in CLAUDE.md. Claude Code loads every `.md` file in that folder
  automatically at session start, so the rule is already in force and a second
  copy only drifts. `AGENTS.md`, covered next, is the deliberate host-specific
  exception.
- **Prune while you are in there.** When you edit a section, delete what is now
  wrong, superseded, or said twice. Removing a stale line is part of keeping the
  file current, not a separate cleanup task.

If a trim would renumber sections that other files cross-reference, say so and
let the owner decide before renumbering.

## AGENTS.md points at CLAUDE.md; it is not a second copy

The two root files serve two programs that load files differently.

- **Claude Code loads every `.md` file in `.claude/rules/` automatically** at
  session start, with no import needed. So CLAUDE.md can point at a rule instead
  of repeating it, and repeating one there is the duplication this rule bans.
- **Codex reads `AGENTS.md` and nothing else on its own.** Not `CLAUDE.md`, not
  a folder `CLAUDE.md`, not `.claude/rules/`. It does follow a plain instruction
  to open a file, which is what AGENTS.md gives it: read `CLAUDE.md`, then every
  rule file, then the folder file before editing in a folder.

So AGENTS.md stays short. It carries the fixed lines above the title, the title,
those read instructions, the rules whose breach causes real damage in short form,
and the shared `Communication` and `Project knowledge` sections. It does not
carry the codemap, the structural pointers, or the folder detail. One copy of
each thing, and a pointer to it.

Three hard constraints on AGENTS.md:

- **Never add an import expecting it to load something.** Codex has no import
  syntax at all, so an `@CLAUDE.md` line sits there as plain text and loads
  nothing while looking like it worked. Claude Code does expand `@` in
  `CLAUDE.md`, but resolves the text after it as a literal path and drops the
  line with no warning when the file does not exist. Neither program expands a
  wildcard such as `@.claude/rules/**`. Write the instruction in words instead.
- **Codex caps it at 32 KB** and silently drops whatever is past that. The
  pointer version is nowhere near it, which is part of the point. Check with
  `wc -c AGENTS.md` (or `(Get-Item AGENTS.md).Length`) after editing.
- **A rule too dangerous to wait stays written out**, in short form, naming the
  rule file that holds the whole thing. When one of those rules changes, update
  its rule file and that section together, in the same change.

## This rule covers the folder CLAUDE.md files too

A project's major folders each carry their own short `CLAUDE.md`, which Claude
Code loads only when an agent reads a file in that folder. Everything above
applies to those files as well: keep them current, keep them thin, and prune
while you are in there.

- **When work changes what a folder is for, update that folder's `CLAUDE.md` in
  the same session**, the same way the root file is updated today. A folder file
  nobody maintains is worse than none, because a session trusts it.
- **When a folder is created, write its `CLAUDE.md` with it**, even when the
  folder starts empty.
- **Never move a rule into one.** Rules live in `.claude/rules/`, which loads at
  the start of every session. A folder file loads only when an agent reads a
  file in that folder, and never when an agent only runs a command against it. A
  folder file may point at a rule; it may never hold the only copy of one.
- **AGENTS.md sends Codex into the folder files rather than copying them.**
  Codex reads no `CLAUDE.md` on its own, so AGENTS.md tells it to open a
  folder's file before editing files there. That instruction is what keeps
  folder detail in one place, and it is why the two root files differ in length.
- **Do not add nested `AGENTS.md` files in toolkit projects.** Codex supports
  layered AGENTS.md files, but this toolkit keeps one root file so the Claude and
  Codex maps can be audited together.
- **Never repeat a `README.md` index.** Where a folder has one, the README stays
  the one index and the folder file points at it, or the folder is skipped.

## Keep the project-knowledge route small and current

When project knowledge is installed, both root files carry only a short startup
and fallback route. The fail-open `SessionStart` loader reads `SOUL.md`, the
managed `knowledge/README.md`, `knowledge/project.md`, `knowledge/current.md`,
and the entry lines of both generated indexes, in that order. Claude and Codex
register the same loader. The root route tells either host to read that map once
if the hook did not supply it.

`knowledge/README.md` owns the shared policy: placement, finding, saving, file
shape, approval, trust, lifecycle, and the skill map. Rules and skills may point
to it and keep only their own task steps. They never restate its sections.

When those paths or delivery mechanisms change, update the applicable root
route in the same change. Never copy the manual's policy into a root file, rule,
hook, or skill.
