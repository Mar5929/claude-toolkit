---
name: sf-data-change
description: Use when Salesforce production data must be created, updated, upserted, or deleted, when a backup is needed before a data change, or when you create or edit files under delivery/data/ or engagement/data/. Produces the owner's handoff package (load file, backup file, numbered load steps, success check, undo steps) and files it in the production-backups and data-loads layout with the required README.
---

# Salesforce data change handoff

No agent writes data to production. The owner runs the change. This skill produces what the owner needs to run it without going back and forth.

## Limits

| Operation | Production | Sandbox |
|---|---|---|
| Read (SOQL, export, describe) | Allowed | Allowed |
| Create, update, upsert, delete data | Never | Only after the owner says yes in the same chat |
| Anonymous Apex | Never | Only after the owner says yes in the same chat |

- A yes covers one change, in the chat where it was given. It does not carry to the next change, session, or org. Ask again.
- Not by CLI, API, anonymous Apex, or any tool that wraps them.

## Step 1: build the package

1. The load file. A CSV with the record `Id` plus every field the change sets, one row per record, ready to load as is. Never a fragment, a sample, or a description.
2. The backup file, when the change overwrites anything. The same records with their current values, so loading it back undoes the change. Label it as the undo file.
3. Numbered load steps. Name the tool (Data Loader, Import Wizard, Workbench, or what the owner uses), the operation (Insert, Update, Upsert, Delete), the object, the field mapping, the Insert-Null-Values setting, and the file's full path.
4. The success check. The expected row count, the success and error files the tool writes, and one query the owner runs afterwards to confirm it.
5. The undo steps. The exact steps to load the backup file back.

## Step 2: write the steps

- Use the real file path and the real values.
- "Map the fields appropriately" is not a step. Name each mapping.
- Write for someone who has not run this load before.
- Fill every target cell on an update, so a restore is complete and a load does not blank fields it should not.

## Step 3: file it

Use `delivery/data/`. A project that already uses `engagement/data/` keeps it; do not create a parallel `delivery/data/` tree. A project with another delivery root puts `data/` under it with the same layout. With no delivery root, ask the owner where the files go before creating anything.

```
delivery/data/
  production-backups/
    .gitignore
    README.md                              convention (committed)
    prod-backup-<MMDDYYYY>-<slug>/         one folder per backup event
      <descriptive-name>.csv
      README.md                            required
  data-loads/
    .gitignore
    README.md                              convention (committed)
    <change-slug>-<MMDDYYYY>/              one folder per load event
      <load-file>.csv
      README.md                            required
```

- A backup is a read-only export taken before a live data change. It is the file you load back to undo the change.
- Backup folder name: `prod-backup-<MMDDYYYY>-<slug>`, the slug naming the change. Example: `prod-backup-07232026-contact-territory`.
- One backup folder per backup event. A change that backs up several objects puts all its restore files in one folder.
- A restore file holds the record `Id` plus every field the change will alter. No partial files.
- Load folder name: `<change-slug>-<MMDDYYYY>`. Several files for one change share one folder.
- Save the exact file that was loaded, after the load.
- Never leave a backup or load file loose in either root, or as the final copy anywhere else (a work-item folder, a temp folder). Working extracts may stay with their work item.
- Never commit a data file. It holds record IDs and PII. README files are committed.

## Step 4: write the folder README

Write it in the same response that creates the backup or load file. Backfill one for any folder that lacks it. It states:

- What: the objects, which records (population or filter), and the row count per file.
- When: the date.
- Where (loads only): the org it was loaded to.
- Why: the work item and what the change does.
- Operation and fields (loads only): Insert, Update, Upsert, or Delete; the field mapping; the Insert-Null-Values setting.
- Restore: for a backup, the exact Data Loader steps to revert; for a load, the path to its pre-load backup folder.
- Caveats: workflow side effects, full-field or partial, and similar.

## First use in a project

Create both trees:

1. Add a `.gitignore` to each tree with exactly:
   ```
   # Data files (record IDs + PII). Local only. Do NOT commit.

   *.csv
   *.xlsx
   *.xls
   !.gitignore
   ```
   Add other data extensions the project loads. Never ignore `README.md`.
2. Add a root `README.md` to each tree that summarizes this convention.
3. Drop a test `.csv` in each tree. Confirm `git status` shows it as ignored. Delete it.

## Step 5: hand over

Give the owner the package in the reply: both file paths, which file is which, the numbered steps, the success check, and the undo steps. "You'll need to update those records" is not a handoff.

## Related rules

- `data-change-handoff.md`: the always-loaded trigger for this skill.
- `production-data.md`: the path-scoped summary of the folder layout.
- `salesforce-safety-guardrails.md`: which commands are allowed against an org.
- `deployment-runbook.md`: a pre-deploy snapshot for rollback is a manual step.
