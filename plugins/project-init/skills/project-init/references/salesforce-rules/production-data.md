## Production Data Artifacts Live Under `engagement/data/`

Every production data artifact for this project lives under `engagement/data/`,
in one of two homes, and each one goes in its **own subfolder with a required
`README.md`**:

- `engagement/data/production-backups/`: restore-point **backups** taken BEFORE
  a live data change.
- `engagement/data/data-loads/`: the **files loaded** to an org via Data Loader
  / Bulk API.

Never drop a backup or load file loose in either root, and never leave one as the
final copy anywhere else (not in a work-item folder, not in a temp/scratch
folder). Working and analysis extracts can stay with their work item; the backup
copy and the actual load file are what go here.

The `*.csv` / `*.xlsx` files in both trees are **gitignored** (they hold prod
data, PII, and record IDs, and must not push to a remote). Keep each tree's
`.gitignore`. Every `README.md` is NOT data, so it IS **committed**: that is how
each artifact stays self-describing in the repo even though the data never
pushes.

If this project uses a different top-level folder for engagement material, put
`data/` under that instead and mirror the same two-home layout. If there is no
engagement root at all, ask the owner where engagement artifacts live before
creating anything.

---

### Backups: `engagement/data/production-backups/`

A backup is a read-only export of records captured as a **restore point before a
live data change** (any Data Loader / Bulk API insert, update, upsert, or delete
an org will receive). It is the file you would load back to undo the change.

```
engagement/data/production-backups/
  .gitignore
  README.md                          # explains the convention (committed)
  prod-backup-<MMDDYYYY>-<slug>/      # one subfolder per backup event
    <descriptive-name>.csv
    README.md (REQUIRED)
```

- **Subfolder name:** `prod-backup-<MMDDYYYY>-<slug>`, the slug naming the change
  the backup protects (example: `prod-backup-07232026-contact-territory`).
- **One subfolder per backup event.** A single change that backs up several
  objects puts all its restore files in the same subfolder.
- **Restore file contents:** the record `Id` plus every field the live change
  will alter, so a Data Loader update/insert fully reverts it. Do not rely on
  partial files.

---

### Data loads: `engagement/data/data-loads/`

Every file actually loaded to an org (Data Loader / Bulk API insert, update,
upsert, or delete) is saved here after the load, in its own subfolder.

```
engagement/data/data-loads/
  .gitignore
  README.md                          # explains the convention (committed)
  <change-slug>-<MMDDYYYY>/           # one subfolder per load event
    <load-file>.csv
    README.md (REQUIRED)
```

- **Subfolder name:** `<change-slug>-<MMDDYYYY>`, one subfolder per load event.
  If a change ran several files, they share one subfolder.
- Keep the exact file that was loaded, so the change is reproducible and
  auditable.

---

### Every subfolder MUST have a `README.md`

A backup or a load file is useless to the next agent if they cannot tell what it
is. Every subfolder in both trees carries a `README.md` a fresh agent (or the
owner months later) can read cold. It states:

- **What** it is: the object(s), which records (population / filter), and the row
  count per file.
- **When**: the date.
- **Where** (loads only): which org it was loaded to (prod / sandbox).
- **Why**: the change it backs up or performs (the ticket / work item plus what
  the load did).
- **Operation + fields** (loads only): Insert / Update / Upsert / Delete, the
  field mapping, and the Insert-Null-Values setting.
- **Restore**: for a backup, the exact Data Loader command/steps to revert; for a
  load, a pointer to its pre-load backup subfolder.
- **Caveats**: workflow side effects, durability, full-field vs partial, etc.

Write this README in the SAME response that creates the backup or the load file.
Backfill a README for any existing subfolder that lacks one.

---

### Setting this up in a project

The first time a project needs either tree, create it so the empty folder is
self-describing:

- Create both trees with a `.gitignore` and a root `README.md` in each.
- Each `.gitignore` (both trees) contains exactly:

  ```
  # Data files (record IDs + PII). Local only. Do NOT commit.

  *.csv
  *.xlsx
  *.xls
  !.gitignore
  ```

  Add other data extensions if this project loads other formats. Never ignore
  `README.md`.
- Each root `README.md` (`production-backups/README.md`,
  `data-loads/README.md`) summarizes this convention so the empty folder
  explains itself.
- Confirm it works: a test `.csv` dropped in either tree shows as ignored by
  `git status`.

### Why

One home, one subfolder per event, dated and named for the change, each
self-describing. Backups and load files scattered across work-item folders make
it hard to find the right restore point or see what was pushed to prod. Keeping
the whole prod-data trail together makes the right restore point easy to find.

### Related

- `salesforce-safety-guardrails.md`: read-only exports are allowed; data writes
  are the owner's to run.
- Fill every target cell on a Data Loader update, so a restore is complete and a
  load does not blank fields it should not. This project may carry a dedicated
  rule for that; if not, treat it as a standing principle here.
- `deployment-runbook.md`: a pre-deploy snapshot for safe rollback is a
  deployment-list step.
