# Retrieving complete profiles and permission sets into source control

The end-to-end process for pulling COMPLETE profile and permission set files
out of a Salesforce org and into git. Follow it whenever a project wants its
permissions picture in source control, and re-run it for every refresh. It
pairs with the `salesforce-rules/permissions-source-control.md` rule, which is
the always-on policy version of this runbook; this file is the how.

Every command here is read-only against the org: list metadata, retrieve,
convert. Nothing in this process deploys or changes anything.

## The problem this solves

Salesforce builds a retrieved profile's content from the OTHER components
named in the same retrieve request. Retrieve a profile by itself and you get a
nearly empty file: user permissions, login hours, and login IP ranges come
back (they always do), but object permissions, field-level security, layout
assignments, record type visibilities, Apex class access, Visualforce page
access, tab settings, and app visibilities are included only for components
that were also in the request.

So a naive `sf project retrieve start -m "Profile:Admin"` produces a file that
looks plausible but is silently missing almost everything. In git that file is
worse than nothing: diffs show grants "removed" that were never retrieved, and
an agent reading it concludes access does not exist when it does.

Permission sets had the same behavior through API version 39.0. From API 40.0
on, a retrieved permission set includes all of its content regardless of what
else is in the request. This process retrieves them together with the full
component list anyway, so completeness never depends on remembering a version
cutoff.

## What this process is for (and not for)

- **For:** a truthful, complete, diffable record of the org's permissions in
  git. Onboarding, impact analysis, change review, "who can see this field".
- **Not for:** deploying profiles or permission sets back to an org by CLI.
  A CLI deploy replaces the whole permission set or profile with the local
  file, and the org-side copy drifts (admins grant things in the UI). The
  change-set policy in `salesforce-rules/salesforce-safety-guardrails.md`
  still applies in full. Treat these files as documentation of the org, where
  the org is authoritative.

## Step 1: build the full component list

The retrieve manifest must name every component whose permissions you want
reflected. These are the types that unlock each section of a profile or
permission set:

| Manifest type | Unlocks (profile) | Unlocks (permission set) |
|---|---|---|
| `CustomObject` (objects bring their fields and record types along) | objectPermissions, fieldPermissions, recordTypeVisibilities | objectPermissions, fieldPermissions, recordTypeVisibilities |
| `ApexClass` | classAccesses | classAccesses |
| `ApexPage` | pageAccesses | pageAccesses |
| `Layout` | layoutAssignments | (not in permission sets) |
| `CustomTab` | tabVisibilities | tabSettings |
| `CustomApplication` | applicationVisibilities | applicationVisibilities |
| `CustomPermission` | customPermissions | customPermissions |
| `ExternalDataSource` | externalDataSourceAccesses | externalDataSourceAccesses |
| `Flow` | flowAccesses (where exposed) | flowAccesses |

Plus the targets themselves: `Profile`, `PermissionSet`, and (if the org uses
them) `PermissionSetGroup`.

**Recommended way to build the list:** generate a full-org manifest, then trim
it to these types. This one command asks the org for the explicit member list
of every type, which sidesteps every wildcard trap at once:

```
sf project generate manifest --from-org <alias> --name permissions-retrieval --output-dir manifest
```

Then edit `manifest/permissions-retrieval.xml`: delete every `<types>` block
except the ones in the table above plus `Profile`, `PermissionSet`, and
`PermissionSetGroup`. Keep the members exactly as generated; they are explicit
names, which is what makes this path safe.

**Fallback way (older CLI, or you want tighter control):** start from the
template in the next section and fill the member lists with read-only
list-metadata calls, one per type:

```
sf org list metadata -m CustomObject -o <alias> --json
sf org list metadata -m Profile -o <alias> --json
```

Collect the `fullName` values. `sf org list metadata -m CustomObject` returns
BOTH standard and custom objects, which is exactly what you need (see trap 1).

## Step 2: the manifest template (fallback path)

Save as `manifest/permissions-retrieval.xml`. The wildcard lines are fine for
unmanaged local metadata; the two commented blocks are the ones that MUST be
explicit lists.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types><members>*</members><name>ApexClass</name></types>
    <types><members>*</members><name>ApexPage</name></types>
    <types><members>*</members><name>CustomApplication</name></types>
    <types><members>*</members><name>CustomPermission</name></types>
    <types><members>*</members><name>CustomTab</name></types>
    <types><members>*</members><name>ExternalDataSource</name></types>
    <types><members>*</members><name>Flow</name></types>
    <types><members>*</members><name>Layout</name></types>
    <types>
        <!-- Paste EVERY object from `sf org list metadata -m CustomObject`,
             one <members> line each. The * wildcard returns custom objects
             only; standard objects (Account, Contact, ...) MUST be named or
             their permissions silently vanish from every profile. -->
        <members>Account</members>
        <members>Contact</members>
        <name>CustomObject</name>
    </types>
    <types>
        <!-- Paste profile API names from `sf org list metadata -m Profile`.
             The * wildcard returns custom profiles only; standard profiles
             must be named, and API names differ from UI labels (the System
             Administrator profile is `Admin`). -->
        <members>Admin</members>
        <name>Profile</name>
    </types>
    <types><members>*</members><name>PermissionSet</name></types>
    <types><members>*</members><name>PermissionSetGroup</name></types>
    <!-- Match the project's sourceApiVersion and keep it pinned so diffs
         between refreshes stay comparable. Must be 40.0 or later. -->
    <version>64.0</version>
</Package>
```

## Step 3: retrieve to a side folder, never into force-app

Retrieving this manifest straight into the project would overwrite the local
source of every named component (every class, layout, and object file) with
the org's version, clobbering in-progress work. Retrieve to a side folder in
metadata format instead, then convert:

```
sf project retrieve start -x manifest/permissions-retrieval.xml -o <alias> --target-metadata-dir tmp-perm-retrieve --unzip
sf project convert mdapi -r <the folder under tmp-perm-retrieve that contains package.xml> -d tmp-perm-src
```

(The `--unzip` flag leaves an `unpackaged` folder tree inside the target dir;
point `convert mdapi -r` at the level that holds `package.xml`.)

Then copy only the permission files into the project, and delete the temp
folders:

```
cp tmp-perm-src/main/default/profiles/*.profile-meta.xml        force-app/main/default/profiles/
cp tmp-perm-src/main/default/permissionsets/*.permissionset-meta.xml  force-app/main/default/permissionsets/
cp tmp-perm-src/main/default/permissionsetgroups/*  force-app/main/default/permissionsetgroups/   (if any)
rm -rf tmp-perm-retrieve tmp-perm-src
```

Add the temp folder names to `.gitignore` if the project re-runs this often.

## Step 4: verify completeness (do this every refresh)

1. **Size sanity.** A complete profile from a real org is typically thousands
   of lines; a naive retrieve is usually under a hundred. Run `wc -l` on each
   profile file and investigate anything suspiciously small before committing.
2. **Section sanity.** A complete profile should contain `<objectPermissions>`,
   `<fieldPermissions>`, `<layoutAssignments>`, `<classAccesses>`, and
   `<tabVisibilities>` blocks. `grep -c "<fieldPermissions>"` on a major
   profile should return hundreds or more, not single digits.
3. **Known-grant spot check.** Pick two or three grants you know exist from
   the org's UI and grep for them in the retrieved file. Always include one
   on a STANDARD object (for example a custom field on Contact that a profile
   can edit): `grep -A2 "Contact.Some_Field__c" <profile file>` should show
   the expected `<editable>` / `<readable>` values. A standard-object grant is
   exactly the one a bad manifest misses.
4. **Standard-object presence.** If no standard object appears anywhere in a
   profile's objectPermissions or fieldPermissions, the standard objects were
   missing from the manifest. Fix the member list and re-run; do not commit.

If any check fails, the retrieve was incomplete. Never commit a file that
failed verification: a partial file in git is actively misleading.

## The trap list

1. **The `CustomObject` wildcard skips standard objects.** `*` returns custom
   objects only; Account, Contact, and every other standard object must be
   named explicitly. Symptom: profiles with no standard-object permissions at
   all. This is the most common way this process silently fails.
2. **The `Profile` wildcard skips standard profiles, and API names differ
   from labels.** `*` returns custom profiles only; standard profiles must be
   named, using the API name from list metadata (`Admin`, not "System
   Administrator").
3. **Wildcards skip managed-package components.** `*` does not include
   components from managed packages, so profile grants on managed objects,
   classes, and tabs drop out. The generate-manifest-from-org path avoids
   this because it emits explicit member names; on the template path, paste
   explicit lists for any type where managed grants matter.
4. **Retrieving the manifest into `force-app` overwrites local source.**
   Always use `--target-metadata-dir` (or a throwaway SFDX project). Step 3
   exists because of this trap.
5. **A partial profile looks plausible.** User permissions, login hours, and
   IP ranges come back even in a naive retrieve, so the file has content.
   "The file is not empty" is never proof of completeness; only step 4 is.
6. **A stale component list rots the picture.** New fields, objects, and
   classes added after the manifest was built are absent from the next
   refresh, so their permissions silently vanish. Regenerate the member lists
   (step 1) as part of every refresh, not just the first run.
7. **Retrieve size limits on big orgs.** A single retrieve caps out (10,000
   files, roughly 39 MB zipped); a full component list on a large org can
   exceed it. If it does, keep the FULL component list in every request and
   split the `Profile` / `PermissionSet` members across several retrieves
   instead. Never split the component types across retrieves: a profile
   retrieved without the full component list comes back partial again.
8. **The API version floor.** The manifest version must be 40.0 or later for
   permission sets to retrieve completely. Pin it to the project's
   `sourceApiVersion` and keep it pinned so refresh diffs stay comparable.

## Refresh cadence and ownership

- Re-run the whole process (steps 1 to 4, including regenerating member
  lists) whenever the project needs the permissions picture current: before
  a permissions-related change, after an admin makes grants in the org UI,
  or on whatever cadence the project sets.
- Commit refreshes as their own commit ("refresh profiles and permission sets
  from <org>, <date>") so permission drift is readable in history.
- The org stays authoritative. If a file in git disagrees with the org, the
  answer is a fresh retrieve, not an edit to the file.
