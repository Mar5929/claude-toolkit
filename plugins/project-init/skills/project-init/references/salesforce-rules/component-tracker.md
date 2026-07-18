## Component Tracker

`engagement/deployment/component-tracker.csv` is a plain inventory of every
Salesforce component this project authored. It holds **one row per component**,
with a Yes/No flag per org showing where that component is deployed.

Add a row the moment you author the metadata under `force-app/`. Update the org
flags when a deploy lands. (If the project does not use the `engagement/` layout,
keep the CSV wherever it stores deployment records; the rules below still apply.)

### Keep the deployment manifest in sync (all agents)

If the project keeps a full-cutover manifest (for example `manifest/package.xml`)
that names every component for the production cutover, **update it in the SAME
change you update this tracker** whenever you author, modify, rename, or delete a
deployable component under `force-app/`. Add the new member under the correct
`<types>` block (or remove it for a destructive change) and refresh any member
counts. A component that is in the tracker but missing from the manifest is
silently dropped from the cutover. Items the manifest excludes by design
(permission sets, profiles, matching/duplicate rules, compact-layout
assignments, which move by change set) stay out; do not add those.

### Schema

Columns, in a fixed order:

| Column | Notes |
| --- | --- |
| Component Type | Salesforce metadata type: `CustomField`, `CustomObject`, `Flow`, `ApexClass`, `ApexTrigger`, `LightningComponentBundle`, `Layout`, `FlexiPage`, `RecordType`, `QuickAction`, `PermissionSet`, `ValidationRule`, etc. One value per row. |
| Object/Parent | Parent object for fields, layouts, record types, quick actions, validation rules. Blank for objectless types (Flow, ApexClass, LWC, PermissionSet, CustomApplication, CustomTab). |
| API Name | Full API name including any suffix. |
| Label | User-facing label as shown in Setup, or the bundle masterLabel for LWC/Aura. |
| Work Item | One link to the primary task in the project's task tracker; fall back to a local work-item folder path if there is no task. |
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

1. You author, modify, or rename metadata under `force-app/`: add the row (if none) with the correct flags and Change Type, or update the existing row. A change to an existing component edits its one row; it never creates a second.
2. The owner reports a successful deploy: flip the named org's flag to `Yes` for every component in that deploy.
3. You stage a component for destructive deletion: set Change Type to `Destructive` and leave the flags showing where it is still present.
4. The owner reports a successful destructive deploy: set the affected org's flag to `No`; if retired everywhere and removed from `force-app/`, delete the row.

Permission set rows follow the change-set rule in `salesforce-safety-guardrails.md`;
that governs how the flag flips, not the tracker schema.

### One row per component

Each component is keyed by (Component Type + Object/Parent + API Name) and gets
exactly one row. Never log the same component twice; edit its existing row when
it changes.

### Renamed, replaced, and dropped components

- **Renamed:** keep one row under the new API name, drop the old name's row, and note the rename in the survivor's Notes.
- **Replaced:** keep the replacement's row, drop the replaced component's row, and note it. If the replaced component is still being removed, set its row's Change Type to `Destructive` until the deletion lands.
- Do not keep rows for components that no longer exist in `force-app/` and are deployed nowhere. The tracker is a current-state inventory, not a history log; git and the task tracker hold history.

### Engagement-authored only

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
