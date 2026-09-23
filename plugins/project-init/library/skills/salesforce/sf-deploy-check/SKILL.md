---
name: sf-deploy-check
description: Use when you are about to deploy Salesforce metadata to a shared or higher org (full-copy, staging, or production), or to hand the owner any production deploy command. Runs the hitch-hiker check that finds components or pending edits that would ship with the deploy before their feature is ready.
---

# Salesforce deploy hitch-hiker check

A metadata deploy ships the whole current source of every component it names, not only your edit. A hitch-hiker is a component in the deploy set, or an undeployed edit inside a named component's file, that would land in the target org although it is not the intended change or its feature is not ready there.

Two shapes:
1. A whole component the target does not have yet. The deploy creates it. Example: a field whose LWC, Apex, page, or backfill has not shipped.
2. Extra edits inside a file you touch for one reason. Example: you change a field's help text; the deploy also ships a renamed label, a new rollup filter, a changed formula, or added picklist values in that file.

## When to run

- Before every deploy to a shared or higher org, by `-x`, `-m`, or `-d`.
- Before you give the owner any production deploy command.

## The check

1. List the exact deploy set: every `<members>` in the `-x` manifest, every member in the `-m` list, every file or folder under `-d`. An `-x` deploy of a full-cutover manifest is the highest risk. Check the whole member list.
2. For each named component, the whole current `force-app/` definition ships: label, inline help text, formula, rollup and summary filters, picklist values, all field metadata, and the component itself if the target lacks it.
3. For each component, decide whether its feature is already live in the target. Hitch-hiker signals:
   - The component tracker (if the project keeps one) marks it as not in the target org.
   - It belongs to a work item or feature the owner has not called ready for that org.
   - The file has edits beyond the intended one. Diff it against the last deployed commit, or run `git log` on the path.
   - When `tools/kb/` exists, run `python tools/kb/query_graph.py <Object.Field>` to see what the component connects to. A connected component that is not in the target org is a candidate hitch-hiker.
4. Treat any tracker as a hint, not proof. Before you call a component missing, verify against the target org read-only: `sf sobject describe`, or a SOQL or Tooling query for the field, class, or flag. Do not block a deploy on a stale tracker alone. Do not tell the owner something rides into production until a read-only check confirms it is not already there.
5. If a confirmed hitch-hiker remains, stop. Do not deploy. Do not hand over the command. Tell the owner which component, what would ship, and why it may be unintended. The owner decides: narrow the deploy set, or confirm the rider is wanted.

## Narrow the deploy set

- Name only the components the change needs. For a help-text change on three fields, name those three fields, not a broad manifest.
- Naming a component still ships its whole file. Run the per-file diff in step 3 on a narrow deploy too.
- Prefer the work item's `package.xml` over `_master/package.xml` unless the goal is a full cutover.

## Why the check ends with an org read

A tracker can be stale in either direction. In one real case a help-text deploy was suspected of carrying a new field, label renames, and a rollup filter to production. A read-only production check showed they were already live. The mechanism is real; the tracker was wrong.

## Related

- `salesforce-safety-guardrails.md`: the read-only verify in step 4 is allowed there.
- `sf-component-tracker` skill: the tracker this check reads.
- The production-org guard hook asks before a production deploy runs. This check runs before that prompt.
