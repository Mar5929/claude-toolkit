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
- **Why a decision was made, and what was traded off**, belongs in the design or
  decision doc, with at most a one-line pointer here.
- **What is happening right now** (current phase, next action, open TODOs)
  belongs in the work tracker or live status doc, never here.
- **What changed and when** belongs in git history, not in prose. A requirement
  change belongs in the applicable specification, code, and tests together.
  Other durable conclusions use second-brain v3 when it is installed. The main
  agent proposes them at the approved completion points and the memory
  librarian writes approved updates. Never write them into retired v1.

Then keep the shape:

- **The codemap stays one line per folder or module**, naming what lives there.
  Add an inline invariant only when a session that does not know it will break
  something ("gate on this flag, never that one"). A codemap entry that has
  grown into a dated changelog is the single most common way this file bloats:
  collapse it, and let git and the design doc carry the history.
- **Say each rule once.** If a rule is already a file in `.claude/rules/`, do not
  restate it here; the line pointing at that folder is what keeps it in force.
  Duplication is worse than absence, because the two copies drift.
- **Prune while you are in there.** When you edit a section, delete what is now
  wrong, superseded, or said twice. Removing a stale line is part of keeping the
  file current, not a separate cleanup task.

If a trim would renumber sections that other files cross-reference, say so and
let the owner decide before renumbering.

When second-brain v3 is installed, preserve the compact project-memory route in
both CLAUDE.md and AGENTS.md. Do not copy the complete schema into either root
file or let the two route to different authority maps.
