# Work tracking in Gate 1

Offer the `work-tracker` plugin to every project. It is the executable version
of the toolkit's established work-item folder convention, not a second
tracking system.

## Where it goes

- Most projects: `work-items/`.
- Salesforce engagement projects: `engagement/work-items/`.

## Offer two independent choices

1. **Local Git tracker:** recommended. Requires only Node.js and Git.
2. **GitHub Project mirror:** optional. Requires an existing `gh` login with
   the `project` scope and explicit approval for external changes.

Installing the local tracker does not authorize GitHub writes.

## Initialize

After the owner approves:

1. install the `work-tracker` plugin from this marketplace;
2. invoke its `work` skill;
3. run `work init` at the chosen path;
4. run `work validate`; and
5. show any adopted items whose inferred metadata needs review.

Do not manually create a parallel index or alternative status file.

## Canonical layout

```text
work-items/
├── .work-tracker.json
├── README.md
├── DASHBOARD.md                  # generated and rebuildable
├── 01-backlog/
│   ├── BACKLOG.md                # generated and rebuildable
│   └── WI-014-example/
│       ├── ITEM.json             # structured canonical record
│       ├── SPEC.md               # user-authored specification
│       ├── STATUS.md             # readable current handoff
│       └── HISTORY.ndjson        # complete dated event history
├── 02-in-progress/
├── 03-completed/
└── 04-archived/
```

The structured status in `ITEM.json` is authoritative:

| Status | Stage folder |
|---|---|
| Backlog, Ready | `01-backlog/` |
| In Progress, In Review | `02-in-progress/` |
| Done | `03-completed/` |
| Cancelled | `04-archived/` |

A Done item may later be archived without losing its verified Done status.

## Existing manual folders

The earlier toolkit convention used the same four stage folders with
`SPEC.md`, `STATUS.md`, and a hand-edited `BACKLOG.md`. `work init` adopts that
tree safely:

- it never overwrites tickets or notes;
- it creates missing structured records beside existing files;
- it infers only the ID, title, and coarse status that the folder proves;
- it marks inferred metadata for owner review; and
- it replaces the hand-edited index only with a generated, rebuildable view.

If duplicate IDs or ambiguous paths exist, initialization stops and reports
them. Do not guess which item wins.

## Optional GitHub Project

With separate owner approval, `work github connect` can create or link a
Project for the repository. It uses:

- statuses: Backlog, Ready, In Progress, In Review, Done, Cancelled; and
- labels: bug, enhancement, task.

Git remains authoritative. The adapter creates or updates repository issues and
Project items from local records. It reports GitHub drift instead of silently
importing external edits.

## How this pairs with second-brain v2

The systems have separate authority:

- work-tracker owns task status, blockers, branch and pull-request evidence,
  relationships between work items, and the current handoff;
- second-brain v2 may link decisions, requirements, and durable knowledge to a
  work-item ID; and
- second-brain must never copy or overrule task status.

Generated dashboards, future search indexes, and GitHub mirrors are derived
views. Deleting them cannot remove the authoritative local records.
