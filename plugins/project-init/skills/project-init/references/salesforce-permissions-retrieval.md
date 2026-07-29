# Permission sets and profiles in source control

The end-to-end process for keeping Salesforce permissions in git without silently
destroying grants. It pairs with the `salesforce-rules/permissions-source-control.md`
rule, which is the always-on policy version; this file is the how.

Corrected July 2026. An earlier version of this runbook applied one process to
both permission sets and profiles, on the belief that a permission set CLI
retrieve was lossy. It has not been since API version 40.0. Permission sets and
profiles now get different treatment here, because they behave in opposite ways.

Every command below is read-only against the org except the final deploy step,
which is sandbox-only and gated.

## The two types behave in opposite ways

| | Permission set | Profile |
|---|---|---|
| Retrieve alone | **Complete** since API 40.0 | **Lossy.** Only user permissions, login hours, and login IP ranges always come back |
| Deploy | **Replaces** the whole component; anything omitted is turned off | **Overlays.** Omitting a grant leaves the target's value alone |
| Can a diff show a revocation? | Yes, because deploy replaces | **No.** Deleting a line revokes nothing |
| Recommended | Track in git, deploy from git, behind a preflight | Exclude by default |

Sources, both at API version 67.0 (Summer '26):

- PermissionSet: "In API version 40.0 and later, when you retrieve permission set
  metadata, all content exposed in Metadata API for the permission sets is
  included." And: "In API Version 40.0 and later, if a permission isn't specified
  for a deployment, it's disabled."
  <https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_permissionset.htm>
- Profile: "the returned .profile files only include security settings for the
  other metadata types referenced in the retrieve request (except for user
  permissions, IP address ranges, and login hours, which are always retrieved)."
  And: "if you disable permissions for a profile, the newly disabled permission
  information isn't exported."
  <https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_profile.htm>
- Change sets and the replace behavior:
  <https://help.salesforce.com/s/articleView?id=platform.changesets_perm_sets_profiles.htm>

## Install the tool

Copy `tools/permsets.py` from this reference folder into the project at
`tools/permissions/permsets.py`, and add a short `tools/permissions/README.md`
pointing at the project's own runbook. Standard library Python 3.10 or later, no
dependencies. It reads `packageDirectories` from `sfdx-project.json`, so it needs
no per-project editing.

Five subcommands, all read-only against the org. It never deploys:

| Command | What it does |
|---|---|
| `fetch <Name...> --org <alias>` | Retrieve standalone, verify against the org, lint, sort, place in the default package directory. Refuses to place a file that fails any check. |
| `verify <file> --org <alias>` | Compare grant counts and enabled system permissions against the org. Non-zero exit on mismatch. |
| `check <file...>` | Lint for hand-editing mistakes. No org needed. |
| `tidy <file...>` | Canonical sort for readable diffs. `--strip-empty` also drops grant-nothing field blocks. No org needed. |
| `preflight <file> --org <alias>` | List every grant a deploy would remove or weaken, then exit non-zero to block. `--accept-removals` proceeds. |

## Prove the retrieve is complete on this org, once

Do not take the documentation on faith. Pick a permission set with plenty of
field permissions, fetch it, and let `verify` compare it against the org's own
records:

```
python tools/permissions/permsets.py fetch <PermissionSetApiName> --org <sandbox-alias>
```

`verify` runs inside `fetch`, and compares:

```
SELECT COUNT(Id) FROM FieldPermissions  WHERE Parent.Name = '<Name>'
SELECT COUNT(Id) FROM ObjectPermissions WHERE Parent.Name = '<Name>'
SELECT SetupEntityType, COUNT(Id) FROM SetupEntityAccess WHERE Parent.Name = '<Name>' GROUP BY SetupEntityType
```

Matching counts mean the standalone retrieve is complete on this org and this
Salesforce release. Also confirm by eye that the file contains grants on a
STANDARD object (Account, Contact, Case). Standard objects are what a manifest
wildcard silently skips, so their presence in a no-manifest retrieve is the
strongest single signal. Re-run after a major Salesforce release.

## Procedure: permission sets

1. **Fetch.** `permsets.py fetch <Name> --org <sandbox>`. Commit the fetch on its
   own, separate from any edit, so the next diff shows only the intended change.
2. **Re-add known retrieve blind spots** by hand. See the table below.
3. **Edit**, then `permsets.py check` and `permsets.py tidy`.
4. **Preflight before deploying.** `permsets.py preflight <file> --org <sandbox>`.
   It retrieves the target org's current copy, compares grant by grant, and blocks
   when anything would be lost.
5. **Deploy the narrowest set**, sandbox only, with the owner's go-ahead:
   `sf project deploy start -d <path to the one file> -o <sandbox>`.
6. **Check every permission set group** the permission set belongs to. A group not
   in `Updated` status serves the last successfully calculated version, so a
   successful deploy can leave the new grants inactive. Recalculate from the
   group's page in Setup.

## Procedure: profiles, only if a project opts in

Profiles are excluded by default. When a project decides it wants them anyway,
they enter git as a labelled read-only record and never as a deploy source.

1. **Generate the component list from the org, every time.** A hand-trimmed list
   rots, and a stale list makes new fields and objects vanish from the next
   retrieve, which reads as mass revocation.
   ```
   sf project generate manifest --from-org <alias> --name permissions-retrieval --output-dir manifest
   ```
   Keep the types permissions can point at: `CustomObject`, `ApexClass`,
   `ApexPage`, `Layout`, `CustomTab`, `CustomApplication`, `CustomPermission`,
   `ExternalDataSource`, `Flow`, `RecordType`, plus `Profile` itself. Name standard
   objects explicitly; the `*` wildcard on `CustomObject` does not match them.
   Name standard profiles by API name (`Admin`, not "System Administrator").
2. **Retrieve to a side folder, never into a package directory.** Retrieving this
   manifest into the project overwrites local source for every component it names.
   ```
   sf project retrieve start -x manifest/permissions-retrieval.xml -o <alias> --target-metadata-dir tmp-perms --unzip
   sf project convert mdapi --root-dir tmp-perms/unpackaged -d tmp-perms-source
   ```
3. **Copy only `profiles/`** into the package directory, then delete the temp
   folders.
4. **Verify before committing.** A complete profile for a real org runs to
   thousands of lines and contains `objectPermissions`, `fieldPermissions`, and
   `layoutAssignments`, including at least one grant on a standard object. A file
   that fails that check is a lossy retrieve, not a change. Do not commit it.
5. **Never CLI-deploy it.** Mark the folder or the file header as a record.

Note: those profile verification checks are profile-shaped. Do not apply them to
permission sets. A permission set legitimately has no `layoutAssignments` and can
be short; use `permsets.py verify` for those instead.

## Known retrieve blind spots

Permissions an org can hold that a retrieve will not return, so a replace-deploy
destroys them. Re-add each by hand after every fetch, and add to this list
whenever another is found.

| Permission | Status |
|---|---|
| `ManagePackageLicenses` ("Manage Package Licenses") | Salesforce CLI issue 2578, open since 2023-11-23. Salesforce confirmed the omission is in the Metadata API, not the CLI. Deploys correctly once added by hand. <https://github.com/forcedotcom/cli/issues/2578> |

The list is also encoded in the tool as `RETRIEVE_BLIND_SPOTS`; keep the two in
step.

## Trap list

Ordered by how likely each is to destroy grants without telling you.

| Trap | Why it bites | Guard |
|---|---|---|
| Omitted equals disabled on a permission set deploy | Deploy replaces the whole component | `preflight`, always |
| `deploy validate` and `deploy preview` cannot see it | Both work at whole-component level; a file missing hundreds of grants passes both | Never rely on them for this; use `preflight` |
| A permission the retrieve never returns | See blind spots above | Hand-maintained list, re-added after every fetch |
| The `CustomObject` wildcard skips standard objects | Only affects profiles now, but it is the classic cause of a plausible-looking empty file | Name standard objects explicitly; generate the manifest from the org |
| API version skew between retrieve and deploy | A file retrieved under one version's rules and deployed under another's can lose sections | Pin `sourceApiVersion`, match it everywhere, re-fetch on a bump |
| Unstable XML element order between retrieves | Diff noise trains reviewers to skip permission diffs, and a text merge across a reordered file can drop blocks | `tidy` on every commit |
| `viewAllFields` on an object suppresses its field list | An empty field list looks lossy and is not; removing View All Fields later takes away every field at once | `check` warns; rebuild per-field grants from the org first |
| Permission set group left `Outdated` or `Failed` | A successful deploy leaves new grants inactive, silently | Check group status after every deploy |
| `editable` true on a formula, roll-up, or autonumber field | Rejected, and a Salesforce known issue reports it silently no-oping instead, which then produces a phantom diff on every future fetch | `check` catches it from the field definition |
| `editable` true with `readable` false | Hard deploy failure | `check` |
| Activity vs Task and Event naming | CLI issue 2583 reported field access toggling across repeated identical deploys, closed with no published root cause | `check` treats `Activity.` as an error; manage that family in Setup |
| Same-element blocks split apart in the file | Hard deploy failure | `check`, and `tidy` fixes it |
| Required-field security | Cannot be retrieved or deployed at all, API 30.0 and later | Expect the absence; never add them |
| Permission sets grant but never deny | `readable` false looks like a revocation and does nothing | Use a muting permission set in a group |
| Managed-package components need namespaced names | Wildcards do not reach into packages, so their grants drop out of a profile retrieve | Name them explicitly in the profile manifest |
| Hand-resolved merge conflict in a large permission XML | Blocks disappear or interleave into valid-but-wrong XML | Take one side whole, re-apply the other as a fresh edit |

## What "complete" cannot mean

A permission set file lists what is granted; it is not a grid of every possible
permission with true or false beside it. Three limits are structural:

1. **Off is absent, not false.** System permissions, custom permissions, and field
   permissions are written out only when granted. A diff shows a whole block
   appearing or disappearing, not a value flipping.
2. **Required-field security never appears.**
3. **Some access only exists on a profile:** page layout assignment, login hours,
   login IP ranges, data category visibility.

Say this out loud to an owner who asks for "every possible permission in one
file", before they build expectations on it.

## What was considered and rejected

**Decomposing a permission set into per-object files.** Salesforce offers
`decomposePermissionSetBeta` and `decomposePermissionSetBeta2` via
`sf project convert source-behavior`. Rejected as a default: about two years in
beta with no GA date, a reported bug producing invalid XML in the custom
permissions file, effectively one-way with no undo, and it replaces one
reviewable file with a folder of a dozen. Canonical sorting solves the readable
diff problem it was meant to solve. Reconsider if it reaches GA, or on a large
team where merge conflicts on one file become the dominant pain.

There is no profile decomposition, and the Salesforce CLI team declined to build
profile completion into the CLI (discussion 1785, January 2023), citing the
platform's direction toward permission sets.

**Change sets as the safe transport.** Not safer. Salesforce documents that
permission set components in a change set do NOT include assigned apps or tab
settings, and change sets cannot come from git, so the diff stops being the audit
trail. They remain the right answer for profiles.

## Salesforce's direction

Salesforce cancelled the retirement of permissions on profiles on 2026-06-06
(Help article 003834041), citing customer feedback and remaining feature gaps.
There is no forced migration off profiles. Salesforce still recommends a
permission-set-led model and names permission sets and permission set groups as
where its investment goes. Ignore any blog post still presenting the Spring '26
removal as a live deadline.
