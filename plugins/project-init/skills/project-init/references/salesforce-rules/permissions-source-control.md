# Permission Sets in Git: Prove Complete, Preflight Every Deploy

Permission sets can be tracked in source control and deployed from it, safely,
provided every file is proven complete before it is trusted and every deploy is
preflighted. Profiles cannot give the same guarantee and are excluded by default.

The full runbook, including the exact commands, is the toolkit reference
`salesforce-permissions-retrieval.md`. The tool that enforces every gate below is
`tools/permissions/permsets.py`, copied into the project by `project-init`.

## The asymmetry that drives every rule here

**Retrieving a permission set is safe.** Since API version 40.0 (Summer '17) a
retrieve returns the complete permission set on its own, with no need to name
the objects, fields, or classes it grants. Salesforce: "In API version 40.0 and
later, when you retrieve permission set metadata, all content exposed in Metadata
API for the permission sets is included."

**Deploying a permission set destroys what the file omits.** A deploy replaces
the whole component. Salesforce: "In API Version 40.0 and later, if a permission
isn't specified for a deployment, it's disabled."

Do not repeat the old belief that a permission set CLI retrieve is lossy and must
be driven by a manifest naming every object. That was true before API 40.0 and is
false now. It is still true for profiles, which is a different rule.

**Prove it on this org once.** Before relying on the above, run
`permsets.py verify` against one real permission set with plenty of field
permissions. It compares the local file's grant counts against the org's own
`FieldPermissions`, `ObjectPermissions`, and `SetupEntityAccess` records. If they
match, the retrieve is complete on this org and this Salesforce release. Re-run
after a major release before relying on it again.

## Rules

1. **Bring a permission set into git only through the tool.**
   `permsets.py fetch <Name> --org <sandbox>` retrieves, verifies against the
   org, lints, sorts, and places the file. Never hand-place a retrieved file, and
   never commit one that has not verified clean.
2. **Never edit a file whose completeness you have not just proven.** Fetch
   fresh, then edit. An org drifts; a week-old file is not a safe base.
3. **Preflight before every deploy, with no exceptions.**
   `permsets.py preflight <file> --org <sandbox>` lists every grant the deploy
   would remove or weaken and blocks when anything would be lost. `sf project
   deploy validate` and `sf project deploy preview` CANNOT catch this: both work
   at whole-component level, so a permission set missing hundreds of grants
   passes both and then deletes them. Never treat either as the safety check.
4. **Sandbox only, and only with the owner's go-ahead in that same chat.** The
   owner runs every production deploy. Confirm the target is a sandbox first.
5. **Never `--ignore-conflicts` on a permission file.** It silences the one
   automatic warning that the org has drifted from your file.
6. **Keep the API version pinned and matched.** `sourceApiVersion` in
   `sfdx-project.json` should match the org's version. Version skew between the
   retrieve that produced a file and the deploy that ships it is a documented way
   to wipe a permission set. Re-fetch everything when the version is bumped.
7. **Lint and sort before committing.** `permsets.py check` then
   `permsets.py tidy`. The Metadata API does not guarantee stable element order
   between retrieves, so without canonical sorting every refresh produces a diff
   full of meaningless moves, reviewers stop reading permission diffs, and the one
   real revocation sails through. A readable diff is the precondition for rule 3
   being worth anything.
8. **Re-add known retrieve blind spots by hand after every fetch.** Some
   permissions an org holds are never returned by a retrieve, so a deploy destroys
   them. The known list is in the runbook and in the tool's
   `RETRIEVE_BLIND_SPOTS`. Add to it whenever another is found.
9. **After a deploy, check every permission set group the permission set belongs
   to.** A group holds a calculated combined permission set with a status of
   Updated, Outdated, Updating, or Failed. When it is not Updated, users get the
   last successfully calculated version, so a successful deploy can leave the new
   grants inactive. Nothing in the deploy output says so. Fix it with Recalculate
   on the group's page in Setup.
10. **Never hand-resolve a git merge conflict inside a permission set file.**
    Take one side whole, then re-apply the other side's change as a fresh edit.
    Hand-merging XML permission blocks is how grants vanish.
11. **Profiles are excluded by default.** A profile retrieve is genuinely lossy
    and a profile deploy is an overlay, so removing a line from a profile file
    revokes nothing and a profile diff cannot show removals. If a project decides
    to track profiles anyway, they come in as a labelled read-only record produced
    by the full-manifest process in the runbook, never as a deploy source, and
    that decision gets written down.

## Hand-editing, in brief

A field must be readable to be editable. Formula, roll-up summary, and autonumber
fields can never be editable. `readable` false revokes nothing; permission sets
grant but never deny, and denial needs a muting permission set inside a permission
set group. Never write an `Activity.` field permission, use `Task.` or `Event.`.
Field security on required fields cannot be retrieved or deployed at all, so those
never appear and must not be added. When `viewAllFields` is on for an object,
Salesforce returns no individual field permissions for it, so an empty field list
is correct rather than lossy. `permsets.py check` enforces all of these; the
runbook explains each one.

## Prefer many small permission sets

One permission set per feature or persona, composed with permission set groups,
beats a few large ones. It shrinks the blast radius of a bad deploy, cuts merge
conflicts in large XML files, and matches Salesforce's own current guidance.

## Enforcement

Rule 3 is backed by a hook. `.claude/hooks/guard-permission-set-deploy.js` blocks
any deploy shipping a permission set that has no fresh clean preflight receipt.
Do not edit or disable it to get past a block; read what the preflight says would
be removed, and accept the losses on purpose if they are intended by re-running
the preflight with `--accept-removals`, which records that decision.

**A receipt goes stale after 30 minutes**, because the org drifts. A preflight
run before a long review does not cover the deploy that follows it. Re-run the
preflight rather than treating an old clean result as still true.

**Known false positive.** The hook reads the whole command string, so it also
fires when a deploy command appears as quoted TEXT inside a different command,
for example inside a commit message. Put the text in a file and pass it by path
instead of writing it inline.

## Related rules

- `salesforce-safety-guardrails.md`: what any agent may do against an org,
  including the sandbox-only deploy permission this rule depends on.
- `component-tracker.md`: every permission set authored or deployed needs its
  tracker row updated in the same change.
- `deploy-hitchhiker-check.md`: catch components that would ride along into the
  target org on any deploy.

The evidence behind every claim here, with sources and dates, is the toolkit
reference `salesforce-permissions-research.md`. Read that before re-litigating
any of this.
