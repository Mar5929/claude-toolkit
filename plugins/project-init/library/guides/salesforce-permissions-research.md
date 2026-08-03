# Permission set and profile research: findings and evidence

The durable record of what was established about Salesforce permission set and
profile metadata, so no future project repeats the research. Researched July
2026 against API version 67.0 (Summer '26), with a live read-only test against a
real full-copy sandbox.

The runbook `salesforce-permissions-retrieval.md` is what to DO. This file is
what is TRUE and how it is known. Read this when someone questions the process,
when a Salesforce release lands, or when a claim here needs re-checking.

## The headline

Two facts, opposite in direction, and almost everyone gets them backwards:

1. **Retrieving a permission set is safe and complete.** Since API version 40.0
   (Summer '17) a permission set retrieve returns everything, standalone, with no
   need to name the objects, fields, or classes it grants.
2. **Deploying a permission set is destructive.** It replaces the whole
   component. Anything absent from the file is switched off in the org.

The widely repeated advice to drive permission set retrieves from a giant
manifest, and to move permission sets by change set, is a cache of pre-2017
behavior. It is still correct for profiles.

## Verified live, not just read

A permission set was retrieved from a full-copy sandbox naming ONLY the
permission set, no manifest and no related components, then compared against the
org's own records:

| Grant type | Org (SOQL) | Retrieved file | Match |
|---|---|---|---|
| `FieldPermissions` | 308 | 308 | yes |
| `ObjectPermissions` | 2 | 2 | yes |
| `SetupEntityAccess`, ApexClass | 23 | 23 | yes |

The file also contained grants on Account, Contact, Task, and Event. Those are
STANDARD objects, which a manifest wildcard silently skips. Their presence in a
no-manifest retrieve is the strongest single disproof of the lossy-retrieve
belief.

Any project can repeat this in about a minute with `permsets.py verify`. Do it
once per project and after each major Salesforce release rather than trusting
this page forever.

## Salesforce's own documentation contradicts itself here

The PermissionSet page carries both of these:

> "In API version 40.0 and later, when you retrieve permission set metadata, all
> content exposed in Metadata API for the permission sets is included."

> "When you retrieve permission sets, also retrieve the related components with
> assigned permissions. For example, to retrieve objectPermissions and
> fieldPermissions for a custom object, you must also retrieve the CustomObject
> component."

The second sentence reads like the profile rule and is the likely origin of the
persistent folklore. The live test above settles it in favour of the first: the
related-components sentence appears to be stale guidance carried over from before
API 40.0. This is exactly why the process ends with an empirical check rather
than a citation.

## Permission set versus profile, side by side

| | Permission set | Profile |
|---|---|---|
| Retrieve alone | Complete, API 40.0+ | Lossy. Only user permissions, login hours, login IP ranges always return |
| Everything else on retrieve | Always included | Only when the matching component is in the same retrieve request |
| Deploy semantics | **Replace** the whole component | **Overlay.** Omitted grants keep the target's value |
| Can a diff show a revocation? | Yes | **No.** Deleting a line revokes nothing |
| Decomposition available | Yes, beta | No |
| Recommended | Track and deploy from git | Exclude by default |

That asymmetry is why one policy cannot cover both. A lossy profile file is
useless but mostly harmless to the org. A lossy permission set file is a loaded
weapon.

## What no Salesforce CLI command will tell you

`sf project deploy validate`, `--dry-run`, and `sf project deploy preview` all
operate at whole-component level. A permission set missing 400 field grants is a
perfectly valid permission set: validation passes, preview shows one row saying
the component will deploy, and the deploy then removes 400 grants exactly as
instructed.

There is no additive or merge mode, no `--upsert`, and no flag that reports
grant-level loss. This gap is the entire reason `permsets.py preflight` exists.
Do not accept "but validate passed" as evidence of anything.

## Permission set element reference

Every child element of `PermissionSet` at API 67.0, with the child field that
identifies each repeatable block. The tool's `GRANT_KEYS` mirrors this; update
both together.

| Element | Key field | Added |
|---|---|---|
| `agentAccesses` | `agentName` | 63.0 |
| `applicationVisibilities` | `application` | 29.0 |
| `classAccesses` | `apexClass` | 23.0 |
| `customMetadataTypeAccesses` | `name` | 47.0 |
| `customPermissions` | `name` | 31.0 |
| `customSettingAccesses` | `name` | 47.0 |
| `emailRoutingAddressAccesses` | `name` | 62.0 |
| `externalCredentialPrincipalAccesses` | `externalCredentialPrincipal` | 59.0 |
| `externalDataSourceAccesses` | `externalDataSource` | 27.0 |
| `fieldPermissions` | `field` | 23.0 |
| `flowAccesses` | `flow` | 47.0 |
| `objectPermissions` | `object` | 23.0 |
| `pageAccesses` | `apexPage` | 23.0 |
| `recordTypeVisibilities` | `recordType` | 29.0 |
| `servicePresenceStatusAccesses` | `servicePresenceStatus` | 64.0 |
| `tabSettings` | `tab` | 26.0 |
| `userPermissions` | `name` | all |

Scalars: `label` (required), `description`, `license` (38.0, replaced the
deprecated `userLicense`), `hasActivationRequired` (37.0).

`objectPermissions` children: `allowCreate`, `allowRead`, `allowEdit`,
`allowDelete`, `viewAllRecords`, `modifyAllRecords`, and `viewAllFields`
(added 63.0).

**Profile-only, with no permission set equivalent:** `layoutAssignments`,
`loginHours`, `loginIpRanges`, `categoryGroupVisibilities`, `loginFlows`,
`custom`, `userLicense`. Profile calls tab visibility `tabVisibilities`, not
`tabSettings`; using the wrong element name is a hard schema error.

## What "complete" cannot mean

Say this out loud to any owner who asks for "one file with every possible
permission", before they build expectations on it:

1. **Off is absent, not `false`.** `userPermissions`, `customPermissions`, and
   `fieldPermissions` are written out only when granted. A diff shows a whole
   block appearing or disappearing, not a value flipping. The file is a list of
   grants, not a grid.
2. **Required-field security is invisible.** Not retrievable, not deployable, API
   30.0 and later. This includes master-detail fields.
3. **Inactive record types are excluded**, API 29.0 and later.
4. **`viewAllFields` suppresses the field list.** With View All Fields on for an
   object, Salesforce returns no individual field permissions for it. An empty
   field list is then correct rather than lossy, and removing View All Fields
   later takes away every field at once because the per-field grants were never
   in the file.
5. **Assignments are data, not metadata.** Who has the permission set lives in
   the `PermissionSetAssignment` object and is not in any file.
6. **Profile-only powers are out of reach**, per the table above.

## Known retrieve blind spots

Permissions an org can hold that a retrieve never returns, so a replace-deploy
destroys them silently. This is the purest form of the danger and the reason the
tool keeps a hand-maintained list.

| Permission | Evidence |
|---|---|
| `ManagePackageLicenses` | forcedotcom/cli issue 2578, opened 2023-11-23, still open as of 2026-07-29. The reporter tested API 55.0 through 59.0 and the metadata-directory retrieve. A Salesforce engineer confirmed the CLI does not touch permission set XML, so the omission is in the Metadata API itself, and converted it to a platform bug. It deploys correctly once added by hand. |

Treat any permission visible in Setup but absent from a fresh retrieve as a new
member. Add it here and to `RETRIEVE_BLIND_SPOTS` in the tool.

## Tracked bugs worth knowing

| Issue | State | Why it matters |
|---|---|---|
| forcedotcom/cli 2578 | **Open** since 2023-11-23 | The blind spot above |
| forcedotcom/cli 2583 | Closed 2023-12-15, **no published root cause** | Field access toggled on and off across repeated identical deploys. A Salesforce engineer asked about the Activity/Task/Event naming split, then the thread stops. Stay out of `Activity.` field permissions; use `Task.` and `Event.` |
| forcedotcom/cli 2543 | Closed 2024-02-14 | With source tracking on, changing a permission set inside a group retrieved only the group, leaving the permission set file stale. Do not trust source tracking for permission sets; retrieve explicitly |
| forcedotcom/cli 1205 | Open at time of research | Mixing a wildcard with named entities broke standard object retrieval. Affects profile manifests |
| forcedotcom/cli 1346 | Closed 2022-01-06 | `hasActivationRequired` not valid in version 51.0, caused by `sourceApiVersion` skew from the connection version. The general hazard of version skew is live |
| forcedotcom/cli discussion 1785 | **Abandoned January 2023** | Salesforce started building profile completion into the CLI and stopped, citing the platform's direction toward permission sets. There will be no first-party fix for profiles |

## Deploy-time failure modes

Loud failures, which are the good kind. Each stops the deploy rather than
corrupting silently:

- `editable` true with `readable` false. A field must be readable to be editable.
- `editable` true on a formula, roll-up summary, or autonumber field. Note a
  Salesforce known issue reports this silently no-oping instead of erroring in
  some cases, which then produces a phantom diff on every future retrieve.
- A referenced field, object, class, or page missing in the target:
  `no CustomField named <x> found`. Deploy the component first.
- An unknown user permission in the target org: `Unknown user permission:
  ManageNetworks`. The source org has a feature or licence the target lacks.
- Dependent permission ordering, for example removing Delete on Case while
  `Manage Cases` is still enabled. Deploy removals in passes.
- Same-element blocks split apart in the file. All blocks of one element must sit
  together. Canonical sorting prevents this for free.

Quiet failures, which are the dangerous kind:

- Grants absent from the file, deleted on deploy. Only the preflight catches it.
- License-gated permissions that do not apply and do not error, reported by
  practitioners. Verify a sample in the target UI after a cross-org deploy.
- A permission set group left `Outdated` or `Failed` after a deploy. Users keep
  the last successfully calculated permissions, so a successful deploy can leave
  new grants inactive. Nothing in the deploy output says so; fix with Recalculate
  on the group's page in Setup.

## Diff hygiene

The Metadata API does not guarantee stable XML element order between retrieves.
Two retrieves of an unchanged component can come back ordered differently.
Gearset documents this and declines to normalise it by default because for some
types, like picklists, order is meaningful.

Unstable order is not dangerous on its own. It is dangerous through git: a
reordered file produces a diff touching hundreds of meaningless lines, reviewers
learn to skip permission diffs, and the one real revocation sails through. A text
merge across a reordered file can also drop blocks neither side meant to remove.

Canonical sorting on every commit is what makes the preflight worth having.
Retrieving alongside a broad manifest also produces `readable=false
editable=false` blocks for every ungranted field, which inflate the file without
adding meaning; strip them.

## Tooling landscape, checked 2026-07-29

| Tool | State | Verdict |
|---|---|---|
| `force-md` (ForceCLI) | Active, released 2026-07-29 | Can sort permission sets. Our tool does this plus verification, so not needed, but a reasonable fallback |
| `sfdx-hardis` (Cloudity) | Active, 2026-07 | Useful for profile minimisation and profile tab fixing if a project keeps profiles |
| `sfdx-git-delta` | Active, 2026-07 | **Cannot do sub-file deltas on permission sets** (issues 163, 198). A delta pipeline ships the whole component, which is a full-replace statement. Preflight still required |
| `sfpowerkit` | **Archived**, last push 2023-05 | Was the go-to for profile reconcile. Do not adopt |
| PermComparator | Free-tier Heroku app, unverified | Probably dead. Heroku ended its free tier in 2022 |
| Gearset | Commercial | Does intelligent merge preserving target-only permissions, and suppresses all-false field permissions in comparisons |

No purpose-built open-source permission set linter exists. That is why the
semantic checks in `permsets.py check` had to be written.

## Options considered and rejected

**Decomposing a permission set into per-object files.** Salesforce offers
`decomposePermissionSetBeta` and `decomposePermissionSetBeta2` through
`sf project convert source-behavior`. Rejected as a default: roughly two years in
beta with no GA date, a reported bug producing invalid XML in the custom
permissions file, effectively one-way with no undo, and it replaces one reviewable
file with a folder of a dozen. Canonical sorting solves the readable-diff problem
it was meant to solve. Reconsider if it reaches GA, or on a large team where
merge conflicts on one file become the dominant pain. There is no profile
decomposition at all.

**Change sets as the safer transport.** Not safer. Salesforce documents that
permission set components in a change set do NOT include assigned apps or tab
settings, so the supposedly cautious path is itself lossy. Change sets also
cannot come from git, which removes the diff as an audit trail. They remain the
right answer for profiles.

**Tracking complete profiles in git.** Achievable, and it does give drift
detection, but it cannot give what is usually wanted from it. Because a profile
deploy is an overlay, a profile diff can show additions honestly and structurally
cannot show removals unless every revocation is hand-written as an explicit
`false`, forever, on every object and field. Getting a complete profile also
requires a manifest naming every component, regenerated from the org on every
refresh or the next retrieve silently shrinks. Recommend stripping profiles to a
baseline and putting real access in permission sets.

## Salesforce's direction

Salesforce **cancelled** the retirement of permissions on profiles on 2026-06-06
(Help article 003834041), citing customer feedback and remaining feature gaps.
Not delayed, cancelled. Profiles keep their permissions indefinitely, and the
Active Product and Feature Retirements page carried no profile or permission set
retirement as of 2026-07-28.

A large volume of 2023 to early 2026 blog content still asserts the Spring '26
removal as fact. It is wrong. Do not plan around that deadline or cite those
posts.

Salesforce still recommends a permission-set-led model, and names permission sets
and permission set groups as where its investment goes. So the direction is
unchanged even though the deadline is gone: build on permission sets because they
are where the platform is moving, not because a clock is running.

## Sources

Salesforce documentation, API version 67.0 (Summer '26):

- PermissionSet: <https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_permissionset.htm>
- Profile: <https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_profile.htm>
- MutingPermissionSet: <https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_mutingpermissionset.htm>
- PermissionSetGroup: <https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_permissionsetgroup.htm>
- Decomposed Metadata Types: <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_decomposed_md_types.htm>
- Source tracking and profiles: <https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_source_tracking_source_tracking_profiles.htm>

Salesforce Help:

- Permission sets and profile settings in change sets: <https://help.salesforce.com/s/articleView?id=platform.changesets_perm_sets_profiles.htm>
- Deploy profiles via change sets (article 000386377): <https://help.salesforce.com/s/articleView?id=000386377>
- Permission set group status and recalculation: <https://help.salesforce.com/s/articleView?id=platform.perm_set_groups_status_recalc.htm>
- Permissions in profiles retirement cancelled (article 003834041, 2026-06-06): <https://help.salesforce.com/s/articleView?id=003834041>
- Unknown user permission (article 000381731): <https://help.salesforce.com/s/articleView?id=000381731>
- Standard profiles: <https://help.salesforce.com/s/articleView?id=platform.standard_profiles.htm>
- User Access and Permissions Assistant: <https://help.salesforce.com/s/articleView?id=platform.perm_uapa.htm>

GitHub:

- <https://github.com/forcedotcom/cli/issues/2578>, 2583, 2543, 1205, 1346
- <https://github.com/forcedotcom/cli/discussions/1785>
- <https://github.com/forcedotcom/source-deploy-retrieve/tree/main/src/registry/presets>
- <https://github.com/ForceCLI/force-md>, <https://github.com/scolladon/sfdx-git-delta>

Vendor and practitioner, treat as secondary:

- Gearset on XML ordering: <https://docs.gearset.com/en/articles/2413367>
- Gearset on retrieving and deploying profiles: <https://docs.gearset.com/en/articles/8046993>
- Gorav Seth's 2017 test of the API 40.0 replace change: <https://goravseth.com/testing-permission-set-deployment-changes>
- sfdx-hardis profile guidance: <https://sfdx-hardis.cloudity.com/salesforce-ci-cd-work-on-task-profiles/>
- Salesforce Ben on the retirement reversal: <https://www.salesforceben.com/salesforce-backtracks-on-permission-retirement-in-profiles/>

## Re-check triggers

Re-run `permsets.py verify` and revisit this page when:

- a major Salesforce release lands, especially one that changes API version;
- forcedotcom/cli issue 2578 closes, which would retire a blind spot;
- the permission set decomposition betas reach GA;
- Salesforce revives a profile permissions retirement;
- a permission appears in Setup but not in a fresh retrieve, which means a new
  blind spot to add.
