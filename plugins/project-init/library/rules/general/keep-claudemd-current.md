# Keep CLAUDE.md Current

Keep this file current. If, during a session, we identify something future
sessions would need to know (a new convention, a corrected assumption, a
decision, a gotcha, a changed workflow), update CLAUDE.md to capture it before
the task ends. In particular, whenever you add or change a path, a project
instruction, or an agent/session workflow, check whether CLAUDE.md needs
updating to match. Do not let hard-won context evaporate when the session
closes. If unsure whether something belongs here, ask; a slightly-too-full
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
- **Everything else routes out.** `capture-the-thinking.md` holds the one table
  saying where each kind of content goes; follow it rather than a second list
  kept here. CLAUDE.md may carry a one-line pointer to a home, never a summary
  of it.
- **What is happening right now** (current phase, next action, open TODOs) does
  not belong here even as a pointer. It is stale the moment it is written.
- **What changed and when** belongs in git history, not in prose.

Then keep the shape:

- **The codemap stays one line per folder or module**, naming what lives there.
  Add an inline invariant only when a session that does not know it will break
  something ("gate on this flag, never that one"). A codemap entry that has
  grown into a dated changelog is the single most common way this file bloats:
  collapse it, and let git and the design doc carry the history.
- **Say each rule once.** If a rule is already a file in `.claude/rules/`, do not
  restate it in CLAUDE.md. Claude Code loads every `.md` file in that folder
  automatically at session start, so the rule is already in force and a second
  copy only drifts. Two deliberate exceptions: the second-brain v3 memory
  schema, covered below, and AGENTS.md, covered next.
- **Prune while you are in there.** When you edit a section, delete what is now
  wrong, superseded, or said twice. Removing a stale line is part of keeping the
  file current, not a separate cleanup task.

If a trim would renumber sections that other files cross-reference, say so and
let the owner decide before renumbering.

## AGENTS.md is not a copy of CLAUDE.md, on purpose

The two root files serve two programs that load rules differently. They are
allowed to differ and must not be flattened back into copies of each other.

- **Claude Code loads every `.md` file in `.claude/rules/` automatically** at
  session start, with no import needed. So CLAUDE.md can point at a rule instead
  of repeating it, and repeating one there is the duplication this rule bans.
- **Codex loads AGENTS.md and nothing else.** Not `CLAUDE.md`, not
  `.claude/rules/`, and `@` file references are ordinary text to it. So AGENTS.md
  has to write out, in full, every rule that causes real damage when broken.
  That restatement is not bloat; it is the only copy a Codex session ever sees.

Two hard constraints on AGENTS.md:

- **Codex caps it at 32 KB** and silently drops whatever is past that. Keep the
  file under about 24 KB and check with `wc -c AGENTS.md` (or
  `(Get-Item AGENTS.md).Length`) after editing.
- **Never add an import expecting it to load something.** Neither program
  expands a wildcard such as `@.claude/rules/**`. Claude Code resolves the text
  after `@` as a literal path and drops it with no warning when the file does
  not exist, so the line looks like it works and does nothing. Codex has no
  import syntax at all.

When a rule in AGENTS.md's always-in-force set changes, update its rule file and
that section together, in the same change.

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
- **Never let anything Codex needs live only in one.** Codex reads AGENTS.md and
  nothing else, and never reads any `CLAUDE.md`, root or nested. Detail that
  leaves the root `CLAUDE.md` for a folder file stays in AGENTS.md in full. That
  is why the two root files may differ in length below the shared memory
  section.
- **Never add a nested `AGENTS.md`.** Codex would not read it.
- **Never repeat a `README.md` index.** Where a folder has one, the README stays
  the one index and the folder file points at it, or the folder is skipped.

## The memory section: keep all three copies in step

When second-brain v3 is installed, the memory routing schema lives in three
places on purpose: the canonical rule `.claude/rules/second-brain.md`, and the
same section at the top of both CLAUDE.md and AGENTS.md. Routing has to happen
before an agent writes anything, and a rule it has not opened cannot route.

That exception comes with an obligation. Whenever the canonical rule's authority
map, its list of homes, or its document contract changes, update the section in
both root files in the same change. The canonical rule wins if they disagree.
Never let the two root files carry different authority maps, and never shorten
one of them into a summary; copy the section from the second-brain plugin's
`references/orientation-snippet.md` verbatim.

One passage inside the section is allowed to differ, and only this one. In the
steps for a save, CLAUDE.md tells the session to invoke `memory-verifier` at
`.claude/agents/memory-verifier.md`, which is a Claude Code agent file. Codex
cannot invoke it, so AGENTS.md instead tells the session to delegate to a
subagent and have that subagent read both that file and
`.claude/rules/second-brain.md` in full first. Same obligation, two programs.
Do not "fix" either one to match the other.

When trimming CLAUDE.md, this section is not a candidate. It stays first and
stays whole.
