---
name: retire
description: >-
  Take one knowledge file out of current use by superseding, retiring, or
  deleting it. Use when the owner says something is out of date, wrong,
  replaced, or should be removed. Never deletes merely to tidy up.
---

# retire

This skill handles one file. Use `reflect` for a folder-wide review. Read the
lifecycle, approval, and trust sections of `knowledge/README.md` before acting.
If the manual is missing, change nothing and recommend `project-sync`.

## Inspect and propose

Open the file, its source, related current files, and every repository reference
to its filename. Decide which lifecycle action from the manual fits. An update
belongs to `remember` instead.

Show the normal numbered block, in the shape the `remember` skill's
`references/proposal-template.md` sets out. The proposed meaning
must name what stops being current, what replaces it if anything, and the exact
action. For deletion, name the allowed reason. Then wait.

## Apply one complete change

For a supersede:

1. Write the approved replacement through `remember`, with `supersedes` pointing
   to the old file.
2. Mark the old file `superseded` and point `superseded_by` at the replacement.
3. Use `rg` to find every reference to the old filename. Repair links that treat
   it as current and preserve links that deliberately describe history.

All three steps happen together or the supersede is unfinished.

For a retirement, mark the file `retired`, leave `superseded_by` absent, and
repair current references.

For an approved deletion, remove only the named file and repair its references.
If it held a credential, tell the owner to rotate that credential because Git
may retain it.

## Verify

Run:

```text
node .claude/tools/build-knowledge-index.mjs
node .claude/tools/check-knowledge.mjs
```

Report the action, every repaired reference, and anything left unresolved. If a
step or check fails, say the change is unfinished.

## Boundaries

- Never act because a file is merely old.
- Never mark a file superseded before its replacement exists.
- If several files will change, show the complete list before touching any.
- If the file is already non-current, say so and change nothing.
- This skill never commits, pushes, opens a pull request, or merges.
