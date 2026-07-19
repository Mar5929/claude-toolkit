## Profiles and Permission Sets in Git Must Be Complete

If this project tracks profiles or permission sets in source control, every
one of those files must be COMPLETE, produced by the full retrieval process
below. Never commit a profile or permission set that came from a naive
retrieve, and treat any suspiciously small one already in git as wrong until
a fresh retrieve proves otherwise.

### Why a naive retrieve lies

Salesforce builds a retrieved profile's content from the other components
named in the same retrieve request. Retrieve a profile alone and you get user
permissions, login hours, and IP ranges, and almost nothing else: no object
permissions, no field-level security, no layout assignments, no class access.
The file still looks plausible, which is the trap. In git it is worse than
nothing: diffs show grants "removed" that were never retrieved, and an agent
reading it concludes access does not exist when it does. Permission sets had
the same behavior before API version 40.0; the process below makes both
complete without depending on a version cutoff.

### The process, in brief

1. **Build the full component list.** The manifest must name everything
   permissions can point at: all objects (standard objects explicitly, the
   wildcard skips them), Apex classes, Visualforce pages, layouts, tabs,
   apps, custom permissions, external data sources, and flows, plus the
   profiles and permission sets themselves. Easiest:
   `sf project generate manifest --from-org <alias>`, then trim to those
   types. Standard profiles must be named by API name (`Admin`, not "System
   Administrator").
2. **Retrieve to a side folder, never into `force-app`.** Use
   `sf project retrieve start -x <manifest> --target-metadata-dir <tmp>
   --unzip`, then `sf project convert mdapi`. Retrieving the manifest into
   the project would overwrite local source for every named component.
3. **Copy only the permission files** (`profiles/`, `permissionsets/`,
   `permissionsetgroups/`) into `force-app`, delete the temp folders.
4. **Verify before committing.** Line-count sanity (complete profiles run to
   thousands of lines), section sanity (fieldPermissions, objectPermissions,
   layoutAssignments present), and a known-grant spot check including at
   least one grant on a STANDARD object. A file that fails verification does
   not get committed.
5. **Regenerate the component list on every refresh.** A stale list makes
   newly added fields and objects silently vanish from the next retrieve.

The full runbook with the manifest template, exact commands, and the complete
trap list is the toolkit's project-init reference
`salesforce-permissions-retrieval.md`. If this project has a copy of the
retrieval manifest (usually `manifest/permissions-retrieval.xml`), keep it
current as part of this rule.

### These files are documentation, not a deploy source

Everything in this process is read-only against the org. The retrieved files
record what the org grants; the org stays authoritative. Never deploy a
profile or permission set from these files by CLI: a CLI deploy replaces the
whole component and wipes org-side drift. Permission sets move by change set,
per the safety guardrails rule.

### Related rules (if the project has them)

- The read-only org-safety rule (`salesforce-safety-guardrails.md`): the
  change-set policy for permission sets, and why CLI round-trips are unsafe.
- The deploy hitch-hiker check: complete profile files are large and touch
  everything, one more reason they never ride along in a deploy set.
