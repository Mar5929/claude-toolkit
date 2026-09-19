---
name: retire
description: >-
  Take one knowledge file out of current use by superseding, retiring, or
  deleting it. Use when the owner says something is out of date, wrong,
  replaced, or should be removed. Never deletes merely to tidy up.
---

# retire

This skill handles one file. Use `reflect` for a folder-wide review. Read the
lifecycle, approval, and trust sections of `knowledge/knowledge-manual.md` before acting.
If the manual is missing, change nothing and recommend `project-sync`.

During filename migration, if the canonical manual is absent, use
`knowledge/README.md` only when it starts with the managed-manual marker.
Report the legacy path for project-sync. Conflicting marked copies require
reconciliation before policy-dependent work; never choose meaning silently.

## Inspect and propose

Open the file, its source, related current files, and every repository reference
to its filename. Decide which lifecycle action from the manual fits. An update
belongs to `remember` instead.

Show the normal numbered approval group from the manual. The proposed meaning
must name what stops being current, what replaces it if anything, and the exact
action. For deletion, name the allowed reason. Then wait.

## Apply one complete change

Before writing, choose the checkout and publication route from the project's
publication rule for the complete approved operation, including reference
repairs. If a newly discovered repair changes scope or requires a different
route, keep the operation unpublished until that is resolved.

For a supersede:

1. Prepare the approved replacement through `remember`, with `supersedes`
   pointing to the old file. Do not publish the replacement yet.
2. Mark the old file `superseded` and point `superseded_by` at the replacement.
3. Use `rg` to find every reference to the old filename. Repair links that treat
   it as current and preserve links that deliberately describe history.

All three steps happen together or the supersede is unfinished. Never publish a
replacement without the old file's lifecycle change and repaired current links.

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

After both checks pass, publish the complete approved lifecycle change as one
save through the route the project's publication rule assigns to the actual
diff. Use the direct documentation route only when every changed file is
eligible for it. If a required reference repair changes behavior-bearing
instructions or accompanies implementation, keep the whole lifecycle operation
in that implementation's review route. Reference repair does not authorize a
policy change. If checking or publication fails, preserve the whole change as
unfinished and report the exact next step; never split the operation to evade
review or publish or retry a subset.

Report the action, every repaired reference, and anything left unresolved. If a
step or check fails, say the change is unfinished.

## Boundaries

- Never act because a file is merely old.
- Never mark a file superseded before its replacement exists.
- If several files will change, show the complete list before touching any.
- If the requested lifecycle change is already complete, say so and change
  nothing. For an interrupted approved operation, verify what remains and resume
  only its unfinished steps; a non-current status alone does not prove completion.
- Publish only the paths and meaning covered by the approval.
