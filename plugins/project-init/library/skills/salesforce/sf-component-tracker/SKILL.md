---
name: sf-component-tracker
description: Use when you author, modify, rename, or delete Salesforce metadata under force-app/, when the owner reports a deploy that landed or failed, or when a deploy needs manual pre- or post-deploy steps. Keeps the component tracker CSV, the master manifest, the per-work-item manifests, destructiveChanges.xml, and manual-steps.md in sync.
---

# Salesforce component tracker

Keep the deployment records current in the same response as the change.

A project that already uses `engagement/` uses `engagement/deployment/` wherever this skill says `delivery/deployment/`. Do not create a parallel `delivery/` tree. A project with another artifact root keeps these records where it stores deployment records.

## Deployment folder

```
delivery/deployment/
  component-tracker.csv        master tracker, whole project
  _master/
      package.xml              master manifest; mirrors the tracker
      manual-steps.md          manual steps for the full cutover
  <work-item-id>/              one folder per work item that ships metadata
      package.xml              that item's new and changed components
      destructiveChanges.xml   only if the item removes components
      manual-steps.md          only if the item has manual steps
```

- One master tracker for the whole project. Never split it per work item.
- `_master/` holds the full-cutover manifest (it can rebuild the whole org from source) and its manual steps.
- Name each work-item folder with the work item's id from the project's tracker, for example `WI-12-account-merge`. With local tracking, that item is under root `.work-items/`.
- Keep work-item folders flat under `delivery/deployment/`. The tracker owns status.
- A manifest (`package.xml`) names the components a Salesforce CLI deploy includes.

## Step 1: update the tracker, master manifest, and work-item manifest

Do all three in the same response when any of these happens:

1. You author, modify, or rename metadata under `force-app/`.
   - Add the row if none exists, with the correct flags and Change Type. Otherwise edit the existing row.
   - A change to an existing component edits its one row. Never create a second row.
   - Add the member under the correct `<types>` block in `_master/package.xml`. Refresh member counts in its header.
   - Add the member to the work item's `package.xml`.
2. The owner reports a successful deploy: set that org's flag to `Yes` for every component in the deploy.
3. You stage a component for deletion:
   - Set Change Type to `Destructive`.
   - Add it to the work item's `destructiveChanges.xml`.
   - Leave the flags showing where it is still present.
4. The owner reports a successful destructive deploy:
   - Set the affected org's flag to `No`.
   - If the component is gone from every org and from `force-app/`, delete the row and its master-manifest member.

Rules for the master manifest:
- Every CLI-deployable tracker row is a member of `_master/package.xml`. Every member has a tracker row.
- A tracker row missing from the master manifest is dropped from the full-org cutover without warning.
- The master manifest is add-only. It never names a removed component.
- These rules apply to every agent and every session.

## Step 2: per-work-item manifests

- `package.xml` names only the work item's new and changed components. Its members also appear in the master manifest.
- Deploy this narrow set, not the master manifest, unless the goal is a full cutover.
- Removals go in `destructiveChanges.xml`, never in a `package.xml`.

## Step 3: types kept out of the manifest

These types cannot be deployed safely by a CLI manifest today: profiles, duplicate rules, matching rules, and compact-layout assignments. They move by change set or by hand.

- Add a tracker row for them. The tracker is the full inventory.
- Keep them out of the master manifest.
- Add their deploy as a step in the relevant `manual-steps.md`: which change set to build, which assignment to make, in what order.
- Name the exclusions in the master manifest's header comment.

Permission sets are not on this list. They get a normal tracker row and a normal manifest member. They deploy by CLI to a sandbox behind the preflight in `permissions-source-control.md`, which also decides when their flag flips.

## Step 4: manual steps (`manual-steps.md`)

Manual deploy steps live in `manual-steps.md` in the manifest folder they belong to: the work item's folder, or `_master/` for the full cutover. A folder whose deploy needs no manual steps has no sheet.

Add a step in the same response in which you author the triggering metadata. Triggers:

- New permission set or permission set group: assign it to users.
- New field fed by an external connector: configure the connector mapping.
- New record type that needs retroactive assignment: the data update or Apex script.
- New or changed rollup: capture a pre-deploy baseline and validate the post-deploy delta.
- New scheduled Apex or scheduled flow: schedule it after the deploy.
- Migration that must clear a field before re-stamping: ordered Pre-deploy steps.
- Deploy that depends on a managed-package version, remote site setting, custom setting, or org-wide setting: a Pre-deploy verification step.
- One-time post-deploy backfill (Batch Apex, anonymous Apex, data load): a step with the full kickoff script inline.
- Any deploy where you want a pre-flight snapshot for safe rollback.

Skip the step when the deploy is self-contained:

- Pure UI or LWC changes with no permission, data, or config follow-up.
- Apex refactors that change only internal behavior.
- Formula-field changes that affect only existing in-scope data.
- Label or text-only changes.

When unsure, add the step. A step closed as "skipped" costs less than a missed action.

Step shape:

| Field | Content |
| --- | --- |
| Title | Short imperative step name. |
| Phase | `Pre-deploy`, `Deploy`, or `Post-deploy`. |
| Order | Sequence in the sheet. Use gaps of 10 (10, 20, 30). |
| Owner | Who runs the step. |
| Status | Not started, in progress, or done. |
| Body | Purpose (one or two sentences), numbered operator instructions, a verification section (SOQL, screenshot, or UI check), and inline scripts in fenced code blocks. |

- Put scripts (anonymous Apex, SOQL, CLI commands) inline in the body. Do not link to a repo file for a script that fits inline.
- Link the originating implementation task and any local work-item folder.
- The owner runs the deploys and updates each step's status.

Not in `manual-steps.md`:
- Routine steps that need no ordering.
- Work-item documentation. It lives with the work item.
- Implementation tasks. They live in the task list.
- Generic deploy commands for every Salesforce deploy.

## Tracker schema

Columns, in this fixed order:

| Column | Content |
| --- | --- |
| Component Type | Metadata type: `CustomField`, `CustomObject`, `Flow`, `ApexClass`, `ApexTrigger`, `LightningComponentBundle`, `Layout`, `FlexiPage`, `RecordType`, `QuickAction`, `PermissionSet`, `ValidationRule`, and so on. One value per row. |
| Object/Parent | Parent object for fields, layouts, record types, quick actions, validation rules. Blank for objectless types (Flow, ApexClass, LWC, PermissionSet, CustomApplication, CustomTab). |
| API Name | Full API name including any suffix. |
| Label | Label shown in Setup, or the bundle masterLabel for LWC or Aura. |
| Work Item | One link to the primary task in the project's tracker. Fall back to the work-item folder path. |
| Change Type | `New`, `Modified`, or `Destructive`. |
| Sandbox | `Yes` if deployed in the working sandbox, else `No`. Rename or add columns to match the project's orgs. |
| Production | `Yes` if deployed in production, else `No`. |
| Notes | One short current-state line: type details (`Text(255)`, `Number(18,0)`), what the component does, and any caveat (renamed-from, superseded-by, manual-step, gated-off). Use `;` instead of `,`, or quote the cell. |

## Org flags

- Flags are independent. A component can be in one org, another, or both.
- A new component not yet deployed: all flags `No`.
- When a deploy to an org lands, set that org's flag to `Yes`.
- The owner runs production deploys. When the owner reports a successful production deploy, set `Production=Yes` for its components.
- Order does not matter. `Sandbox=No, Production=Yes` is valid if that is what happened.
- Never change a flag for a failed deploy.

## Change Type

- `New`: this project created the component. Default. A created component that was later renamed is still `New`.
- `Modified`: the component existed and this project changed it. Start Notes with `Modified: ...`.
- `Destructive`: the component is being removed. Keep the row while the deletion is pending in any org. The flags mean "still present there". Delete the row once it is gone from every org and from `force-app/`.

## One row per component

- Key: Component Type + Object/Parent + API Name. One row per key.
- Renamed: keep one row under the new API name, drop the old row, note the rename in Notes.
- Replaced: keep the replacement's row and drop the replaced row, with a note. If the replaced component is still being removed, set its Change Type to `Destructive` until the deletion lands.
- Do not keep rows for components that are gone from `force-app/` and deployed nowhere. The tracker is current state. Git and the task tracker hold history.

## Project-authored only

- Track only components this project created or modified.
- Do not add components pulled into `force-app/` by a backfill or reverse-engineering snapshot. A manifest may list them; the tracker does not.
- A pre-existing component this project modified gets a row with a `Modified: ...` Notes line.

## CSV editing

- Use RFC 4180 quoting. Quote any cell with a comma, newline, or double quote. Escape `"` as `""`.
- Prefer `;` or `/` over `,` inside Notes.
- The header and column order are fixed. Ask the owner before adding a column.
- Group rows by Component Type.

## Not in the tracker

- Config changes made in the org UI with no `force-app/` file.
- Managed-package metadata this project did not author.
- Local-only files: documents, scripts, work-item folders, manifests.
- Dated deploy history. Dates live in the work log or task tracker.

## Related rules

- `deploy-hitchhiker-check.md`: reads this tracker as a hint before any deploy.
- `salesforce-safety-guardrails.md`: what an agent may do against an org.
- `permissions-source-control.md`: how permission sets are fetched, verified, and deployed.
