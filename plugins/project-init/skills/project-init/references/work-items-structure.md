# Tracking work in local folders (Gate 1)

Read this only after the owner answers the Gate 1 tracker question with local
folders. `work-tracking-choice.md` owns the question and the other answers.

The `work-tracker` plugin is the executable local tracker. Do not create a
second hand-built folder system beside it.

## Where it goes

Every project uses `.work-items/` at the repository root. `work init` adds
`/.work-items/` to `.gitignore`.

The records stay in the current checkout. They do not travel through Git and do
not sync to another computer. Say this plainly before setup so the owner knows
the tradeoff they chose.

Linked Git worktrees in the same clone share the primary checkout's
`.work-items/` records and lock. Commands return the shared folder's full path
when called from a linked worktree. Separate clones do not share it.

## Requirements and active work

The `work` skill owns requirements, active-item selection, progress, and
completion commands. The `work-item-stages.md` rule owns lifecycle judgment.
Build and data-load execution require approved requirements. Discovery,
research, and solution design may proceed while they create clarity.

Keep owner-stated needs in `REQUIREMENTS.md` and technical design separately.
Select the branch's active item with `work active set ID` before updating it;
`work start ID` selects it when no item is active. Linked worktrees share
records while their branch selections remain separate.

## Initialize

After the owner approves local-folder tracking:

1. install the `work-tracker` plugin from this marketplace;
2. invoke its `work` skill;
3. run `work init`;
4. run `work validate`; and
5. name `.work-items/` in the root tracker pointer.

Do not create a parallel index or alternative status file.

## Canonical layout

```text
.gitignore
.work-items/
├── .work-tracker.yaml
├── README.md
├── DASHBOARD.md                  # generated and rebuildable
├── ACTIVE.json                   # branch selections, created when used
├── EVENTS.ndjson                 # approved completion notices, created when used
├── WI-014-example/
│   ├── ITEM.yaml                 # structured local record
│   ├── REQUIREMENTS.md           # owner-approved needs
│   ├── STATUS.md                 # readable current handoff
│   └── HISTORY.ndjson            # complete dated command history
├── WI-015-another-item/
└── archive/                      # items the owner set aside
    └── WI-003-older-example/
```

Every open item folder stays directly under `.work-items/`. `ITEM.yaml.status`
is authoritative. Status never moves the folder.

Items inside `archive/` are archived, and sitting there is the only record of
it. The owner drags folders in and out; no command is required. `work archive`
and `work unarchive` do the same move for an agent. Archiving is organizing, not
a status change, so nothing inside the item changes. Archived items are hidden
from `work status`, `work next`, and the dashboard, are listed by
`work status --archived`, stay validated and linked, and their ID numbers are
never reused.

## Existing staged trackers

The older toolkit convention may exist at `work-items/`,
`delivery/work-items/`, or `engagement/work-items/`. It uses four status folders
with `ITEM.json`, `SPEC.md`, `STATUS.md`, and `HISTORY.ndjson`.

Do not move or delete it automatically.

1. Run `work migrate --from <old path>` and show the preview.
2. Ask the owner to approve the copy.
3. Run the same command with `--apply`.
4. Run `work validate` against the new local tracker.
5. Show every refining requirements file that still needs the owner interview.
6. Keep the old tracker unchanged until the owner verifies the copy and
   separately approves removing it.

The copy preserves old and unknown files. Known data moves into `ITEM.yaml`.
Missing or invalid `REQUIREMENTS.md` files are created in `refining` state. Old
GitHub mirror settings are reported and not carried forward.

Duplicate IDs or target conflicts stop the conversion before writing.

## GitHub tracking is a different answer

Local-folder tracking has no GitHub mirror. A GitHub Projects board is another
answer to the Gate 1 question. If the owner needs shared tracking, choose and
set up that board instead of layering it onto `.work-items/`.

## How this pairs with project knowledge

The systems have separate authority:

- work-tracker owns current task status, blockers, branch and pull-request
  evidence, relationships, and handoff;
- project knowledge may link a lasting decision or specification to a work-item
  ID; and
- project knowledge never copies or overrules current work-item state.

The dashboard is derived. Deleting it cannot remove authoritative local
records.
