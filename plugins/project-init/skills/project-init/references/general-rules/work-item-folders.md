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

Why: sessions end, context windows fill mid-task, and work moves between agents
and machines; a folder of plain files next to the code is the one thing every
session can read. Requirements stay loose on purpose: rigid acceptance
checkboxes go stale when the work shifts, and a later agent then builds to the
wrong target.
