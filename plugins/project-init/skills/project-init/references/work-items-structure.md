# Work-items structure (Gate 1)

The standard tracking tree for a project's work items, for ANY stack. It pairs
with the `work-item-folders.md` rule (every work item gets its own folder): that
rule is the behavior, this is the folder structure Gate 1 scaffolds for it. Offer
it to
every project; confirm before creating. Piloted on DragonFly (WI-004/WI-005).

## Where it goes

- Most projects: `work-items/` at the repo root.
- Salesforce projects using the engagement scaffold: `engagement/work-items/`
  (see `salesforce-project-scaffold.md`).

## Tree

```
work-items/
├── README.md               # explains this layout (adapt the template below)
├── 01-backlog/
├── 02-in-progress/
├── 03-completed/
└── 04-archived/
```

- The four stage folders are a pipeline; a work item is one folder that moves
  between stages (`git mv`) as its status changes.
- Git does not track empty folders: give each empty stage folder a `.gitkeep`.

## The folder is the status: scaffold no index file

**Do not create a `BACKLOG.md`, an `INDEX.md`, or any other file that lists work
items with a status beside each one.** The stage folder an item sits in is its
status, and that is the only place it is recorded. A second copy means every
`git mv` needs a matching hand edit, and the hand edit is the one that gets
forgotten: the item stays listed as open long after it moved.

This bit DragonFly, the project this structure was piloted on. Its `BACKLOG.md`
carried a status marker per item on top of the stage folders. In July 2026 a work
item was archived and the index still showed it as open backlog, because moving
the folder and editing the file are two actions and only one of them happened.
The fix was to stop writing the status down twice.

So there is nothing to keep in sync here. To change an item's status, move its
folder. To see where everything stands, read the tree (`ls` the stage folders),
or use the session-start injection described below on projects that have it.

**A want with no folder yet still gets a folder,** per the "capture a want the
moment the owner says it" part of the `work-item-folders.md` rule: make it a
`01-backlog/` folder with a one-line `SPEC.md` right away. That is what replaces
a scratch list of un-started ideas. A project that genuinely wants a free-text
scratch pad may keep one, but it must hold no statuses, or the same drift comes
straight back.

## Inside a work-item folder

One folder per work item. Name it `WI-<number>-<slug>/` (the number gives
creation order); ticket-driven projects can use the ticket key instead
(`PROJ-123-<slug>/`). It holds:

- `SPEC.md` - the goal in plain words, requirements kept deliberately loose,
  and decisions. Update it in the same session when the work changes direction.
- `STATUS.md` - the living handoff: where we are, what has been done, the
  exact next step, with dated entries (absolute dates). Read this FIRST when
  picking an item up.
- Any scratch notes, copied ticket text, or file links the item needs.

## README.md starter template

```markdown
# Work items

One folder per work item. Everything an agent needs to pick that item up cold
lives inside it: `SPEC.md` (the goal, requirements kept loose on purpose,
decisions) and `STATUS.md` (the living handoff: where we are, what is done, the
exact next step, with dated entries).

## Layout

Stage folders, in pipeline order. **The folder a work item sits in IS its
status**, and nothing else records one:

- `01-backlog/` - captured, not started
- `02-in-progress/` - being worked
- `03-completed/` - done
- `04-archived/` - dropped or superseded, kept for the record

To change a status, `git mv` the folder to the matching stage. Afterwards,
search the repo for the old path, since any file that spelled it out by hand
still points at the old spot.

The full convention is the `work-item-folders.md` rule in `.claude/rules/`.
```

## How this will pair with second-brain v2

Do not install second-brain v1; it is retired. When the Git-native
v2 system ships, the two systems split cleanly and are not redundant:

- **The tree owns status.** `work-items-status.mjs` (a SessionStart hook) reads
  these stage folders and injects what is wanted, what is in progress with each
  item's next step, and what is already done. Status is read, never asserted, so
  it cannot go stale or be misremembered. That hook is exactly why no index file
  belongs in the tree: the reading is done fresh at every session start.
- **Memory will own the links.** A work-item memory record holds the want, a `folder:`
  pointer into this tree, and typed edges to the decisions and knowledge nodes
  produced while working the item, so "what did we decide while doing this?"
  resolves in one retrieval. Memory must never store a copied stage.

## Why this shape

Sessions end and context windows fill mid-task; work moves between agents and
machines. The stage folders make status visible in the file tree, with no file to
maintain and nothing to fall out of date; the per-item folder is the durable
memory that lets a fresh agent pick the item up cold. The behavioral rules (read
the folder first, keep it current, end every session with a next step, and ALWAYS
close out a finished item in the same session: record completion in `STATUS.md`
and move the folder to `03-completed/`) are the `work-item-folders.md` rule in
`general-rules/`; make sure Gate 5 copies it into `.claude/rules/` when this
structure is scaffolded.
