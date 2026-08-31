# Track Local Work in Ignored Folders the Owner Arranges

This rule is for projects whose owner chose local folders for work tracking.
It covers what is specific to the `work-tracker` plugin.

Capture every ticket, feature, setup task, or deferred want in `.work-items/`.
Use the plugin commands instead of directly editing `ITEM.yaml`.

One thing is the owner's and not the tool's: where a folder sits. That is how
they group related work and how they archive, and it is the only record of
either. Read it, never override it.

Git ignores the whole `.work-items/` folder. These records stay in the current
checkout. Do not claim that they sync to another computer or survive deleting
the checkout.

Linked Git worktrees in the same clone share the primary checkout's tracker and
ID lock. Always use `work add` so parallel sessions cannot choose the same ID.

Each item has one `WI-<number>-<name>/` folder containing:

- `ITEM.yaml`: description, status, priority, dates, next step, blockers,
  relationships, and Git evidence;
- `REQUIREMENTS.md`: owner-stated and owner-approved requirements;
- `STATUS.md`: readable current handoff and recent dated history; and
- `HISTORY.ndjson`: complete command history.

## Protect the requirements

`REQUIREMENTS.md` answers six things: the goal, the reason, the requirements,
what the person using it experiences, how it behaves from the outside, and the
edge cases.

Its YAML status is `refining` until the owner has reviewed and approved the
complete file. Only then may it become `finalized`.

- Interview the owner one question at a time.
- Record what the owner said and suggestions they explicitly approved.
- Keep an agent suggestion out until the owner says yes.
- Keep build steps, file choices, tools, versions, research, and technical
  design out.
- Show the completed file before finalizing it.
- When direction changes, reopen it in that same session and return the item to
  refinement.

An item stays in `Backlog` while requirements are refining. Finalizing them
makes it `Ready`. Do not start anything else.

## Keep the handoff current

- Picking an item up? Run `work status`, then read `REQUIREMENTS.md`,
  `STATUS.md`, and `ITEM.yaml` before touching implementation.
- Starting it? Run `work start` so the branch and exact next step are recorded.
- Working on it? Run `work update` when the next step, blockers, or direction
  changes.
- Relating tickets? Use `work link`; do not edit only one side.
- Finished on a branch? Run `work finish`. It keeps the item `In Review` until
  Git proves the completion commit is in the default branch.
- Ending a substantial session? Run `work validate` and leave an exact next
  step.

Date every `STATUS.md` entry absolutely, never "yesterday" or "last week".

The structured status in `ITEM.yaml` is authoritative. Status never moves a
folder, whatever it changes to. `DASHBOARD.md` is generated and is never a
source of truth.

## Leave the owner's folders alone

Any folder under `.work-items/` may hold work items, and every one of them is
searched. There are two kinds and they behave identically:

- **A plain folder the owner made**, such as `security-and-permissions/`. It has
  no status, no requirements, and nothing to finish. The tracker records nothing
  about it.
- **A work item holding other work items.** The owner works a large area as one
  item, so it keeps its own status, requirements, and next step, holds that
  area's shared documents, and the pieces sit inside it.

Nesting goes as deep as the owner takes it. Notes and documents in any of those
folders are left alone and never treated as tracker input.

- Create an item inside a folder with `work add --group NAME`, naming a
  work-item folder when it belongs under one.
- Never move an item between folders, invent a grouping, or reorganize the
  owner's folders on your own initiative. Ask.
- Archiving a folder archives everything inside it, so `work archive` on a work
  item that holds others moves them all. Say how many are moving first.
- Folder position and relationships are separate. Nesting an item inside another
  writes no `parent` link, and linking moves no folder. When items have to
  happen in order, use `depends_on`.

`.work-items/` is ignored by Git, so a document kept in a group folder is not
backed up or shared. Notes are fine there. Say so once when the owner first
keeps something in a group folder that others would need, and point at the
project's own documentation home instead.

## Leave the archive folder to the owner

`.work-items/archive/` holds items the owner set aside, at any depth inside it.
Sitting in that folder is the only record of it, so the owner archives things by
dragging folders and no command runs, and dragging a whole group in archives
everything inside it. Use `work archive` and `work unarchive` when the owner
asks you to move one; both keep the item in its group, so it comes back where it
came from.

Archiving is organizing, not a status change. Never archive an item on your own
initiative, and never treat it as a way to close, cancel, or finish work.
Archived items are hidden from `work status`, `work next`, and the dashboard;
`work status --archived` lists them. Their IDs are never reused and links to them
still work, so an archived item is set aside, not gone.

If the plugin is not installed but an older staged tracker exists, preserve it
and offer the preview-first `work migrate` flow. Never move or delete it without
the owner's approval, and never create a competing hand-built tracker.

Capture a want when the owner says it. A request that exists only in a finished
conversation is lost.

When project knowledge is installed, link a work item to a lasting
specification, decision, or memory only when that relationship helps. Never
copy current item status, blockers, or handoff into project knowledge.
