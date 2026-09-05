---
name: work-item-lifecycle
description: >-
  Apply the project's file lifecycle to work-item information. Use when
  creating, saving, moving, organizing, completing, closing, or archiving
  work-item files, or when deciding where architecture, solution designs,
  specifications, lasting decisions, implementation records, presentation
  deliverables, or retired material belong. Also use for questions like "where
  should this file go?" and "what happens to this when the ticket is done?" Do
  not use for a status-only ticket update that changes no project files or
  lasting information.
---

# Work item lifecycle

Apply the project's file lifecycle to one real question or work-item event. This
skill finds the project's actual homes, applies the principle below, and keeps
the action inside the user's request.

## The principle

Each kind of project information gets one lasting home and stays there. A closed
work item is not a reason to archive something that is still true, and only
retired or replaced material moves to an archive.

Read these to find where things actually go:

1. The project's root instructions and their codemap. They name the work
   tracker, the delivery root, and the source folders.
2. `docs/designs/README.md`, for where a solution design lives and what happens
   to it afterwards.
3. `knowledge/README.md`, for what belongs in persistent project knowledge, in a
   project that has it.

Once information is routed into the declared tracker, knowledge system, or
source tree, that system's own instructions govern work inside that home. Name
any disagreement instead of silently choosing one.

## Find the project's real homes

Identify these from the root instructions and existing files:

- the declared work tracker;
- the delivery root, if the project has one;
- the specification and persistent-knowledge homes, if the project has them;
- the source folders for code, metadata, and configuration; and
- any existing authoritative file for the topic.

Search before proposing a new file. Check filenames, file contents, tracker
links, and the project's routing documents. When one authority already owns the
meaning, update or link to it instead of making another copy.

If two files both appear authoritative, or the project declares no suitable
home, show the conflict and ask the owner before writing or moving anything.

## Route the solution design

A solution design says how one work item gets built. Where it goes depends on
where the work item itself is kept.

- **Work items in the Git-ignored `.work-items/` folder.** The design stays with
  its item, the way every other file of that item does.
- **Work items tracked outside the repository**, on a GitHub issue board or in
  Linear or Jira or anything else. The design goes in `docs/designs/`, one file
  per item, named `<work item id>-<short-slug>.md`.

Either way the design is written after the item's requirements are approved,
merged in the same pull request as the code it describes, and deleted once the
specification is brought up to date. Git history keeps it, so deleting it loses
nothing. The project's `docs/designs/README.md` holds the detail.

## Match the action to the request

For an advice, review, or placement question, inspect and answer without
changing files or tracker state.

For a request to create, move, organize, complete, close, or archive something,
make only the requested changes. Selecting this skill does not grant permission
to move files, edit an external tracker, save persistent knowledge, or create a
new top-level project structure.

Apply the principle above to determine:

- which existing file is authoritative, or the exact new home when none exists;
- which work item or supporting file should link to that authority;
- what stays current when the work item closes; and
- whether any replaced working material belongs in the delivery archive.

Do not create `delivery/`, `knowledge/`, or a substitute documentation system
only because this skill ran. Use the project paths that already exist or ask the
owner to choose the missing home.

## Closing a work item

Before closing or archiving the tracker record:

1. Confirm that the work item links to the current architecture,
   specifications, lasting decisions, and implementation that actually exist.
2. Keep those current files in their authoritative homes.
3. Archive only retired or replaced working material.
4. Close or archive the work item using the declared tracker's normal process.

Do not create missing architecture, decisions, or specifications merely to make
the checklist look complete. Report what is missing or unverified.

## Report the result

Use short bullets:

- **Authority:** the existing or proposed authoritative file.
- **Home:** the exact folder or tracker.
- **Why:** what puts it there.
- **Action:** what changed, or `No changes` for advice-only work.
- **Links or gaps:** links updated and anything missing, conflicting, or
  unverified.
