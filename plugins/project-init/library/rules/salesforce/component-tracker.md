## Component Tracker

`delivery/deployment/component-tracker.csv` is the one master inventory of
every Salesforce component this project authored. It holds **one row per
component**, with a Yes/No flag per org showing where that component is deployed.
There is exactly **one master tracker for the whole project**, no matter how many
work items or deploys; do not split it per work item.

Add a row the moment you author the metadata under `force-app/`. Update the org
flags when a deploy lands. New projects use `delivery/`. If an existing project
already uses `engagement/`, keep that path and do not create a parallel
`delivery/` tree. If the project uses another artifact root, keep the tracker
wherever it stores deployment records. The rules still apply.

### The deployment folder

Everything about deploying lives under one deployment folder,
`delivery/deployment/`:

```
delivery/deployment/
  component-tracker.csv        the master tracker (this file), whole project
  _master/
      package.xml              the master manifest: mirrors the tracker
      manual-steps.md          pre/post manual steps for the full cutover
  <work-item-id>/              one folder per work item that ships metadata
      package.xml              that item's new and changed components
      destructiveChanges.xml   only if the item removes components
      manual-steps.md          only if the item has manual steps
```

- The master tracker sits at the deployment-folder root; it indexes everything
  below it.
- `_master/` holds the full-cutover manifest (the package that can rebuild the
  whole org from source) and its manual-steps sheet.
- Each work-item folder is named for its work item, using the same id as under
  `delivery/work-items/` (for example `WI-12-account-merge`), so a manifest
  maps clearly to the work it deploys. These folders are flat under
  `delivery/deployment/`; the work-item folder already tracks status.

A **manifest** (`package.xml`) is the file that names which components a
Salesforce CLI deploy includes.

### Master tracker and master manifest stay in sync

The master manifest at `_master/package.xml` mirrors the master tracker: every
CLI-deployable tracker row is a member of the master manifest, and every
master-manifest member has a tracker row. **Keep both current in the SAME
change.** Whenever you author, modify, rename, or delete a deployable component
under `force-app/`, update the tracker row AND the master manifest member
together: add the new member under the correct `<types>` block (or remove it for
a destructive change) and refresh any member counts in the header. A component in
the tracker but missing from the master manifest is silently dropped from the
full-org cutover. This applies to every agent and every session, not just the
main one.

### Types that cannot go in the manifest yet

Some component types cannot be safely deployed by a CLI manifest today; they move
by change set or by hand: profiles, duplicate rules, matching rules, and
compact-layout assignments. Permission sets are NOT on this list: they deploy
from source by CLI to a sandbox behind the preflight in
`permissions-source-control.md`, so they get a normal tracker row AND a normal
manifest member. An earlier version of this section listed them as un-deployable
on the belief that a CLI retrieve was lossy; that was true before API version
40.0 and is not true now. For the types that remain:

- Still add a tracker row; the tracker is the full inventory.
- Keep them OUT of the master manifest.
- Capture their deploy as a step in the relevant `manual-steps.md` (which change
  set to build, which assignment to make, in what order).

Note the exclusions in the master manifest's header comment so a reader knows
they are left out on purpose. Making these types accurately source-controlled is
an open project work item; until it lands, the manual-steps sheet is their record.

### Per-work-item manifests

Each work item that ships metadata gets its own folder under the deployment
folder with its own manifest:

- `package.xml` names only that work item's new and changed components. It is a
  subset of the master manifest, so its members also appear there. Prefer
  deploying this narrow set over the master manifest, unless the goal really is a
  full cutover.
- `destructiveChanges.xml` names components the work item removes. Removals go
  here, never in a `package.xml` (a `package.xml` only adds and changes). The
  master manifest stays add-only and never names a removed component, so it can
  always rebuild the org from source. When a destructive deploy lands in every
  org, drop the component's tracker row too (see below).
- `manual-steps.md` holds the pre- and post-deploy steps this item needs, if any.

### Manual deployment steps sheet

Each manifest folder carries a `manual-steps.md` when its deploy needs steps the
deploy itself cannot perform. It separates:

- **Pre-deploy** steps: what must be true or done before the deploy (a change set
  built and validated, a custom setting present, a baseline snapshot taken).
- **Post-deploy** steps: what to do after (assign a permission set, run a
  backfill, schedule a job, verify field-level security).

Each step says what to do, how to run it (paste-ready commands, SOQL, or exact UI
clicks), and how to check it worked. This is the deployment runbook for that one
manifest; follow the step shape in `deployment-runbook.md` (title, phase, order,
owner, status, body). A folder whose deploy needs no manual steps needs no sheet.

### Schema

Columns, in a fixed order:

| Column | Notes |
| --- | --- |
| Component Type | Salesforce metadata type: `CustomField`, `CustomObject`, `Flow`, `ApexClass`, `ApexTrigger`, `LightningComponentBundle`, `Layout`, `FlexiPage`, `RecordType`, `QuickAction`, `PermissionSet`, `ValidationRule`, etc. One value per row. |
| Object/Parent | Parent object for fields, layouts, record types, quick actions, validation rules. Blank for objectless types (Flow, ApexClass, LWC, PermissionSet, CustomApplication, CustomTab). |
| API Name | Full API name including any suffix. |
| Label | User-facing label as shown in Setup, or the bundle masterLabel for LWC/Aura. |
| Work Item | One link to the primary task in the project's task tracker; fall back to the work-item folder path if there is no task. |
| Change Type | `New`, `Modified`, or `Destructive`. See below. |
| Sandbox | `Yes` if deployed in the working sandbox, else `No`. Rename or add columns to match the project's org set (for example one column per sandbox). |
| Production | `Yes` if deployed in production, else `No`. |
| Notes | One short current-state line: type details (`Text(255)`, `Number(18,0)`), what the component does, and any caveat (renamed-from, superseded-by, manual-step, gated-off). Use `;` instead of `,` inside Notes, or quote the cell. |

### Org flags

The org flags are independent. A component can be in one org, another, or both.

- A brand-new component you authored but have not deployed: all flags `No`.
- When a deploy to an org lands, flip that org's flag to `Yes`.
- Production deploys are run by the owner (per `salesforce-safety-guardrails.md`). When the owner reports a successful production deploy, set `Production=Yes` for the components in it.
- A component need not move through orgs in order; `Sandbox=No, Production=Yes` is fine if that is what happened.
- Do not change a flag for a failed deploy. The flag stays `No` until a deploy actually lands.

### Change Type

The org flags say *where* a component is; Change Type says *what kind of change*
this project made to it.

- `New` - this project created the component; it did not exist in the org before. Default for most rows. A component this project created and later renamed is still `New`.
- `Modified` - the component already existed and this project changed it (a stock layout, a managed record type, a pre-existing formula field). The Notes line says what changed, usually starting with `Modified: ...`.
- `Destructive` - the component is being removed by a destructive deploy. Keep the row while the deletion is still pending in at least one org so the pending drop stays visible; the org flags mean "is it still present there". Once dropped from every org and removed from `force-app/`, delete the row.

### When to update

Update the tracker in the **same response** in which any of these happen:

1. You author, modify, or rename metadata under `force-app/`: add the row (if none) with the correct flags and Change Type, or update the existing row. A change to an existing component edits its one row; it never creates a second. In the same change, update the master manifest and the relevant work-item manifest.
2. The owner reports a successful deploy: flip the named org's flag to `Yes` for every component in that deploy.
3. You stage a component for destructive deletion: set Change Type to `Destructive`, add it to the work item's `destructiveChanges.xml`, and leave the flags showing where it is still present.
4. The owner reports a successful destructive deploy: set the affected org's flag to `No`; if retired everywhere and removed from `force-app/`, delete the row and its master-manifest member.

Permission set rows follow `permissions-source-control.md`, which governs how their deploys happen and therefore when the flag flips;
that governs how the flag flips, not the tracker schema.

### One row per component

Each component is keyed by (Component Type + Object/Parent + API Name) and gets
exactly one row. Never log the same component twice; edit its existing row when
it changes.

### Renamed, replaced, and dropped components

- **Renamed:** keep one row under the new API name, drop the old name's row, and note the rename in the survivor's Notes.
- **Replaced:** keep the replacement's row, drop the replaced component's row, and note it. If the replaced component is still being removed, set its row's Change Type to `Destructive` until the deletion lands.
- Do not keep rows for components that no longer exist in `force-app/` and are deployed nowhere. The tracker is a current-state inventory, not a history log; git and the task tracker hold history.

### Project-authored only

The tracker covers only components this project created or modified.

- Do not add components that already existed in the org and were pulled into `force-app/` by a backfill or reverse-engineering snapshot. A deploy manifest may list those alongside authored components; only the authored ones get tracker rows.
- A pre-existing component this project **modified** does get a row, with a `Modified: ...` Notes line.

### CSV editing rules

- Standard RFC 4180 quoting. Quote any cell with a comma, newline, or double quote; escape `"` as `""` inside a quoted cell.
- Prefer `;` or `/` over `,` inside Notes so cells stay unquoted and readable.
- The header row and column order are fixed. Do not rename, reorder, add, or drop columns without a stated reason; if you need a new column, ask first.
- Group rows by Component Type for readability.

### What does NOT belong

- Config changes made directly in the org UI with no `force-app/` artifact.
- Managed-package metadata this project did not author.
- Local-only artifacts (markdown docs, scripts, work-item folders, manifests).
- Dated deploy history: the flags show current state; dates live in the work log or task tracker.

### Related rules (if the project has them)

- `deployment-runbook.md`: the step shape the `manual-steps.md` sheets follow.
- `deploy-hitchhiker-check.md`: before any deploy, catch components or edits that would ride along; it reads this tracker as a hint and verifies against the org.
- `salesforce-safety-guardrails.md`: what any agent may do against an org; the owner runs all production deploys.
- `permissions-source-control.md`: how permission sets are retrieved, verified, and deployed; why profiles are excluded.
- `permissions-source-control.md`: keeping tracked profiles and permission sets complete in git.
