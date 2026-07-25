# Every Work Item Gets Its Own Folder

One folder per work item, and that folder is the durable memory. Each work item
(a ticket, a feature, a setup task) gets its own folder in the repo, named with
a numbered prefix for creation order (`WI-001-<slug>/`). Inside: `SPEC.md` (the
goal in plain words, requirements kept deliberately loose, decisions) and
`STATUS.md` (the living handoff: where we are, what has been done, the exact
next step, with dated entries).

- Picking an item up? Read its folder first, before chat history or memory.
- Working on it? Update the folder as part of the work, in the same session, and
  end every working session with a current next step in `STATUS.md`.
- Finished it? ALWAYS close it out in the same session: record the completion in
  `STATUS.md` (date and where it landed), mark its backlog-index entry done, and
  move its folder to the completed stage.

Work-item folders live in stage folders (backlog / in progress / completed /
archived; Gate 1's work-items structure scaffolds them): move the folder
whenever its status changes and update references to the old path.

**The folder is the status.** An item's stage is which stage folder it sits in,
full stop. Never record a stage anywhere else and then rely on the copy: not in
CLAUDE.md, not in a summary, not in long-term memory. Projects with the memory
system get a session-start hook that reads the tree and tells you what is
wanted, in progress, and done, so when your recollection and the tree disagree,
the tree is right. Memory stores the pointer and the links, never the stage.

**Capture a want the moment the owner says it.** "I'd like X at some point",
said in the middle of unrelated work, is the thing that gets forgotten. Make it
a backlog folder with a one-line `SPEC.md` there and then, or say plainly that
you are not doing so. A want that lives only in a finished conversation is gone.

Why: sessions end, context windows fill mid-task, and work moves between agents
and machines; a folder of plain files next to the code is the one thing every
session can read. Requirements stay loose on purpose: rigid acceptance
checkboxes go stale when the work shifts, and a later agent then builds to the
wrong target.
