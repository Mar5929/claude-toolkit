# Permission sets in source control

How this project retrieves, reviews, hand-edits, and deploys Salesforce
permission set metadata without silently destroying grants.

<!--
TEMPLATE. Copy into the project as its operating runbook, then:
  1. Replace <SANDBOX> with the project's sandbox alias.
  2. Replace <PACKAGE_DIR> with the default package directory
     (usually force-app/main/default).
  3. Fill in the "Verified on this org" section by running the check below.
  4. Delete this comment.
Where it goes: knowledge/memory/operations/salesforce-permissions.md when the
project uses project knowledge, otherwise docs/ or engagement/deployment/.
Keep it next to whatever the project already uses for operating procedures.
-->

This is the operating runbook. The short binding rule every session must follow
is `.claude/rules/permissions-source-control.md`; it points here for the detail.
The tool that enforces each gate is `tools/permissions/permsets.py`. The evidence
behind every claim is in the toolkit reference
`salesforce-permissions-research.md`.

## Scope

Permission sets only. Profiles are excluded: their retrieve is lossy, their
deploy is an overlay, so a profile diff cannot show a revocation. See the
research reference for the full reasoning and for what to do if this project
later decides it wants profiles anyway.

## The two facts everything else follows from

**Retrieving a permission set is safe.** Since API version 40.0 a retrieve
returns the complete permission set on its own, with no need to name the objects,
fields, or classes it grants.

**Deploying a permission set is destructive.** A deploy REPLACES the whole
component. Anything absent from the file is turned off in the org. Salesforce:
"In API Version 40.0 and later, if a permission isn't specified for a deployment,
it's disabled."

So the danger sits entirely on the deploy side. The defence is to prove a file is
complete before trusting it, and to know exactly what a deploy would remove
before running it.

## Verified on this org

<!-- Fill in after the first run, then keep it current. -->

Not yet verified. Run this and record the result here:

```
python tools/permissions/permsets.py verify <a permission set file> --org <SANDBOX>
```

Record: the date, the permission set used, and whether the counts matched.
Re-run after each major Salesforce release before relying on the process again.

## What the Salesforce CLI will NOT tell you

`sf project deploy validate`, `--dry-run`, and `sf project deploy preview` all
work at whole-component level. A permission set missing 400 field grants is a
perfectly valid permission set: validation passes, preview shows one row saying
the component will deploy, and the deploy then removes 400 grants exactly as
instructed. None of these commands can warn you.

That gap is why `permsets.py preflight` exists, and why the deploy guard hook
blocks a deploy that has not been preflighted.

## Procedure 1: bring a permission set into git

```
python tools/permissions/permsets.py fetch <PermissionSetApiName> --org <SANDBOX>
```

Retrieves standalone, compares against the org, lints, sorts into canonical
order, and only then writes into `<PACKAGE_DIR>/permissionsets/`. It refuses to
place a file that fails any check.

Then re-add any permission the Metadata API refuses to return; see "Known
retrieve blind spots".

Commit the fetch on its own, separate from any edit, so the next diff shows only
the intended change.

## Procedure 2: hand-edit a permission set

1. Fetch fresh first. Never edit a file whose completeness you have not just
   proven; an org drifts, and yesterday's verified file is today's incomplete one.
2. Make the edit.
3. Lint and re-sort:
   ```
   python tools/permissions/permsets.py check <file>
   python tools/permissions/permsets.py tidy  <file>
   ```
4. Read your own diff. Every removed line is a revocation you are asking for.

### Hand-editing rules

- **A field must be readable to be editable.** `editable` true with `readable`
  false fails the deploy.
- **Formula, roll-up summary, and autonumber fields can never be editable.**
  Setting `editable` true is rejected, and a Salesforce known issue reports it
  silently no-oping instead, which then produces a phantom diff on every future
  fetch.
- **`readable` false does not revoke anything.** Permission sets grant; they
  never deny. To take access away, remove the grant, or use a muting permission
  set inside a permission set group.
- **Never write `Activity.` field permissions.** Use `Task.` or `Event.`.
- **Watch for View All Fields.** When `viewAllFields` is true on an object,
  Salesforce returns no individual field permissions for it, so an empty field
  list is correct rather than lossy. Removing View All Fields without first
  rebuilding the per-field grants from the org takes away every field at once.
- **Required fields never appear** and must not be added.

`permsets.py check` enforces all of these.

## Procedure 3: deploy to a sandbox

Sandbox only, and only with the owner's go-ahead in that same chat. The owner
runs every production deploy.

1. **Preflight. Not optional, and the hook enforces it.**
   ```
   python tools/permissions/permsets.py preflight <file> --org <SANDBOX>
   ```
   It retrieves the target org's current copy, compares grant by grant, and lists
   everything the deploy would remove or weaken. It blocks when anything would be
   lost. If every loss is intended, re-run with `--accept-removals`.

2. **Confirm the API version pair.** The deploy prints a line like
   `Deploying v<N> metadata with SOAP API v<N> connection`. Both must match
   `sourceApiVersion` in `sfdx-project.json`. Version skew between a retrieve and
   a deploy is a documented way to wipe a permission set.

3. **Deploy the narrowest possible set.**
   ```
   sf project deploy start -d <file> -o <SANDBOX>
   ```

4. **Never use `--ignore-conflicts` on a permission file.** It silences exactly
   the drift warning you want to hear.

5. **After the deploy, check every permission set group** the permission set
   belongs to. A group not in `Updated` status serves the last successfully
   calculated version, so your new grants are not live even though the deploy
   succeeded. Fix with Recalculate on the group's page in Setup. Nothing in the
   deploy output tells you this happened.

6. **Update the component tracker** in the same change, if this project keeps one.

## Known retrieve blind spots

Permissions the org can hold that a retrieve will not return. Each is destroyed
by the next deploy unless re-added to the file by hand.

| Permission | Status |
|---|---|
| `ManagePackageLicenses` ("Manage Package Licenses") | forcedotcom/cli issue 2578, open since 2023-11-23. Salesforce confirmed the omission is in the Metadata API. Deploys correctly once added by hand. |

Treat any permission visible in Setup but absent from a fresh fetch as a new
member. Add it here and to `RETRIEVE_BLIND_SPOTS` in the tool.

## What "complete" cannot mean

A permission set file lists what is granted; it is not a grid of every possible
permission with true or false beside it.

1. **Off is absent, not false.** A diff shows a whole block appearing or
   disappearing, not a value flipping.
2. **Required-field security never appears.**
3. **Page layout assignment, login hours, login IP ranges, and data category
   visibility only exist on profiles.**

## Structural recommendation

Prefer many small permission sets, one per feature or persona, composed with
permission set groups, over a few large ones. It shrinks the blast radius of a
bad deploy, cuts merge conflicts, and matches Salesforce's own guidance.

Never hand-resolve a git merge conflict inside a permission set file. Take one
side whole, then re-apply the other side's change as a fresh edit.

## Related

- `.claude/rules/permissions-source-control.md`, the binding rule.
- `.claude/rules/salesforce-safety-guardrails.md`, what any agent may do against
  an org.
- `.claude/hooks/guard-permission-set-deploy.js`, which blocks an unpreflighted
  deploy.
- Toolkit reference `salesforce-permissions-research.md`, the evidence and
  sources behind every claim here.
