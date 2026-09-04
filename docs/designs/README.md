# docs/designs: the build plan for one work item

A design says **how** one work item gets built. It is written after that item's
requirements are approved, and before any code is written.

One file per work item, named `<issue number>-<short-slug>.md`. For example,
`270-work-item-upkeep.md`.

## What goes in one file

- How each approved requirement will be met.
- The files the change touches.
- How it will be tested.
- The order the work is done in.
- Decisions made while designing, and the reason for each.

## How long a file lives

- Created at stage `04-solution-design`.
- Merged in the same pull request as the code it describes.
- **Deleted at stage `14-spec-update`**, once the PRD has been brought up to
  date.

Deleting it loses nothing. Git history keeps the file forever.

The reason to delete it: a design that outlives its build stops matching the
code. A later agent reads it, believes it, and builds against a plan that
changed during the build. After the build, `knowledge/prds/` is what is true.

So this folder only ever holds designs for work happening right now. An empty
folder is the normal state, not a gap.

Nothing checks that the file was deleted. There is no test and no hook. Whoever
finishes the work item has to do it.

## What this folder is not

- **Not requirements.** One work item's requirements live in the work tracker.
  A whole feature area's live in `knowledge/prds/`.
- **Not settled behavior.** That is `knowledge/prds/` too. Requirements and
  settled behavior are the same document at two points in time, told apart by
  its `status` line.
