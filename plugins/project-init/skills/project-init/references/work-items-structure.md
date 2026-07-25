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
│   └── BACKLOG.md          # the running index of ALL work items, every stage
├── 02-in-progress/
├── 03-completed/
└── 04-archived/
```

- The four stage folders are a pipeline; a work item is one folder that moves
  between stages (`git mv`) as its status changes. After a move, search the
  repo for the old path and update references (BACKLOG entries especially).
- `01-backlog/BACKLOG.md` is the single running index: any session may append;
  nothing gets dropped; each entry is a short pointer to the item's folder,
  where the detail lives. Status key: `[ ]` open, `[~]` in progress, `[x]`
  done, `[-]` decided against.
- Git does not track empty folders: give each empty stage folder a `.gitkeep`.

## Inside a work-item folder

One folder per work item. Name it `WI-<number>-<slug>/` (the number gives
creation order); ticket-driven projects can use the ticket key instead
(`PROJ-123-<slug>/`). It holds:

- `SPEC.md` — the goal in plain words, requirements kept deliberately loose,
  and decisions. Update it in the same session when the work changes direction.
- `STATUS.md` — the living handoff: where we are, what has been done, the
  exact next step, with dated entries (absolute dates). Read this FIRST when
  picking an item up.
- Any scratch notes, copied ticket text, or file links the item needs.

## BACKLOG.md starter template

```markdown
# Backlog: running index of work items

The single place work items are tracked. Any session may append; nothing gets
dropped. Each entry points at the item's folder (SPEC.md + STATUS.md hold the
detail).

Status key: `[ ]` open, `[~]` in progress, `[x]` done, `[-]` decided against.

---

## Items

(none yet)
```

## How this pairs with the second brain

If the project also installs `second-brain`, the two split cleanly and are not
redundant:

- **The tree owns status.** `work-items-status.mjs` (a SessionStart hook) reads
  these stage folders and injects what is wanted, what is in progress with each
  item's next step, and what is already done. Status is read, never asserted, so
  it cannot go stale or be misremembered.
- **Memory owns the links.** A `work-item` node holds the want, a `folder:`
  pointer into this tree, and typed edges to the decisions and knowledge nodes
  produced while working the item, so "what did we decide while doing this?"
  resolves in one recall. The curator is forbidden from storing a stage
  (brain-curator invariant 13).

## Why this shape

Sessions end and context windows fill mid-task; work moves between agents and
machines. The stage folders make status visible in the file tree; the per-item
folder is the durable memory that lets a fresh agent pick the item up cold; the
index keeps the one place to scan. The behavioral rules (read the folder
first, keep it current, end every session with a next step, and ALWAYS close
out a finished item in the same session: record completion in `STATUS.md`,
mark the index entry done, move the folder to `03-completed/`) are the
`work-item-folders.md` rule in `general-rules/`; make sure Gate 5 copies it into
`.claude/rules/` when this structure is scaffolded.
