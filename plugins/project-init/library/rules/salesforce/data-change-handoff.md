# Never Change Production Data; Hand the Owner a File and the Steps

No agent on this project, Claude or Codex, main agent or subagent, may create,
update, or delete data in a production org. Not by CLI, not by API, not by
anonymous Apex, not through a tool that wraps any of those, and not because
someone said it was fine. A production data change is the owner's to run.

Refusing is only half the rule. The other half is what you hand over instead, and
it is the half that gets skipped: an agent says "you'll need to update those
records" and leaves the owner with a problem rather than a file. That is not a
handoff. The rule is not satisfied until the owner has the exact file and the
exact steps.

## What you may do

| Operation | Production org | Sandbox |
|---|---|---|
| Read (SOQL query, export, describe) | Yes, approved by default | Yes, approved by default |
| Create, update, upsert, delete data | **Never** | Only after the owner says yes in that same chat |
| Run anonymous Apex | **Never** | Only after the owner says yes in that same chat |

A yes covers the one change discussed, in the chat where it was given. It does
not carry to the next change, the next session, or a different org. Ask again.

## What you hand over instead

When production data needs to change, produce a complete package the owner can
run without going back and forth:

1. **The file itself.** A CSV holding the record `Id` plus every field the change
   sets, one row per record, ready to load as-is. Never a fragment, never a
   sample, never a description of what the file should contain.
2. **A backup file, when the change overwrites anything.** The same records with
   their current values, so loading it back undoes the change. Say plainly that
   this is the undo file.
3. **Numbered steps to load it.** The tool (Data Loader, Import Wizard, Workbench,
   whichever the owner uses), the operation (Insert, Update, Upsert, Delete), the
   object, the field mapping, the Insert-Null-Values setting, and where the file
   is on disk. Written for someone who has not done this before.
4. **What success looks like.** The row count expected, the success and error
   files the tool writes, and one query the owner can run afterwards to confirm
   it worked.
5. **What to do if it goes wrong.** The exact steps to load the backup file back.

Write these steps in plain words, with the real file path and the real values.
"Map the fields appropriately" is not a step. Assume the owner has no technical
background, per the project's `plain-language` output style.

## Where the files go

A project with a production data folder convention keeps the backup file and the
load file there, each in its own dated subfolder with a README. See
`production-data.md`. Without that convention, put both files somewhere the owner
can find them, tell them the full path, and say which is which.

## Why

An agent that writes to production can destroy real records in one command, with
no undo, and the mistake is usually invisible until someone notices bad data days
later. Keeping the write in human hands puts a person between the plan and the
records. Handing over a finished file and real steps is what keeps that boundary
from turning into a burden the owner has to solve themselves.

## Related rules

- `salesforce-safety-guardrails.md`: the command-level policy, which commands are
  allowed against an org, and the guard hook that backs part of it.
- `production-data.md`: where the backup file and the load file live on disk, and
  what each subfolder README must say.
- `salesforce-change-clarify.md`: confirm before object-model, security,
  integration, or data-source-priority changes.
