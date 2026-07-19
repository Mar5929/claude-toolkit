## Check for Deploy Hitch-Hikers Before Any Deploy

A Salesforce metadata deploy ships the **whole current source of every component it names**, not just the one thing you changed. So a deploy (to a full-copy or staging sandbox, or a production command you hand the owner) can quietly carry along components or edits that belong to a feature not meant to be live in the target org yet. These riders are "hitch-hikers." Catch them before they ship.

### What a hitch-hiker is

Any component in the deploy set, or any un-deployed edit inside a component's source file, that would land in the target org even though it is not the change you meant to make, or whose feature is not ready for that org.

Two common shapes:

1. **A whole component that is not in the target yet.** You name it in a `-m` list or it sits in the manifest, and the target org does not have it, so the deploy creates it. Example: a field whose feature (its LWC, Apex, page, or backfill) has not shipped, so the field appears in the target ahead of the thing that fills or uses it.
2. **Extra edits inside a file you are touching for one reason.** You change a field's help text and deploy that field. The deploy also ships every other pending edit in that file: a renamed label, a new rollup filter, a changed formula, added picklist values. A "help-text-only" deploy is not help-text-only at the file level.

### When this check runs

- **Before every deploy to a shared or higher org** (a full-copy or staging sandbox, or production), whether by manifest `-x`, by `-m`, or by `-d`.
- **Before you give the owner any production deploy command.** The same risk applies to a command you write for the owner to run; check it before you hand it over.

### The check

1. **List the exact deploy set.** Every `<members>` in the `-x` manifest, every member in the `-m` list, every file or folder under `-d`. If the project keeps a full-cutover manifest that names every engagement component, an `-x` deploy of it is the highest-risk case: check the whole member list.
2. **Remember what actually ships.** For each named component the entire current `force-app/` definition goes: label, inline help text, formula, rollup/summary filters, picklist values, all field metadata, and the component itself if the target does not have it. Deploying one file ships all pending edits in that file.
3. **For each component, ask: is its feature already live in the target, or would this introduce something new?** Signals of a hitch-hiker:
   - The project's deployment or component tracker (if it keeps one) marks the component as not yet in the target org.
   - The component belongs to a work item or feature the owner has not said is ready for that org.
   - The file has edits beyond the one you intend. Diff the file against the last deployed commit (or `git log` for that path) to see what else changed.
4. **Treat any tracker as a hint, not proof.** A tracker can be stale: a component can be live in the org with its record still marked "not deployed," or the reverse. So when you suspect a hitch-hiker, **verify against the target org read-only first** (`sf sobject describe`, a SOQL or Tooling query for the field, class, or flag) before you call it missing. Flag, then verify. Do not block a deploy on a stale tracker alone, and do not tell the owner something is "riding along into production" until a read-only check confirms it is not already there.
5. **If a real hitch-hiker survives the check, stop.** Do not deploy, and do not hand over the command yet. Tell the owner plainly: which component, what would ship, and why it may be unintended. Let the owner decide: narrow the deploy set, or confirm the rider is wanted.

### Prefer the narrowest deploy set

If the goal is a help-text change on three fields, name those three fields, not a broad manifest, so fewer components can hitch-hike. Naming a component still ships its whole file, so the per-file diff in step 3 still applies even on a narrow deploy.

### Why

A metadata deploy is all-or-nothing per component. An un-deployed feature edit sitting in a shared field file, or a "not ready for this org" component left in the manifest, can ride a routine deploy into an org before its feature is ready. Real example: a help-text-only field deploy was suspected of carrying a new field, label renames, and a rollup filter to production; a read-only production check showed those were already live and the tracker was just stale. The suspicion was wrong that time, but the mechanism is real, which is exactly why the check ends with read-only verification rather than a flag based on the tracker.

### Related rules (if the project has them)

- The production-org guard hook (the automated backstop that confirms before an `sf`/`sfdx` deploy hits production). This rule is the reasoning layer that catches unintended riders before that prompt.
- A component or deployment tracker rule, if the project keeps one (the where-is-it-deployed record this check reads).
- The read-only org-safety rule (read-only against the orgs; the read-only verify step in this check is the allowed exception).
- The close-out step that hands the owner a production deploy command: run this check on that command first.
