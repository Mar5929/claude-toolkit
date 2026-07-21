## Salesforce CLI Safety Guardrails

Every agent on this project (main agent and any subagent) is read-only against
the Salesforce orgs, with one narrow exception for sandbox deploys. Follow these
rules and do not try to work around them. Where a guard hook is installed they
are enforced, not just trusted; where it is not, the rule still binds.

### What you may do

- Read data with SOQL: `sf data query`, `sf data query --bulk`, `sf data get record`, `sf data export bulk`, `sf data export tree`, `sf data search`.
- Read metadata: `sf project retrieve start`, `sf sobject describe`, `sf schema ...`, `sf org display`, `sf org list`.
- Run Apex TESTS: `sf apex test run`. Read logs: `sf apex get log`, `sf apex tail log`.
- Validate or preview a deploy against a sandbox: `sf project deploy validate -x <manifest> -o <sandbox>`, `sf project deploy preview ...`, `sf project deploy report ...`.
- Deploy to an allowed sandbox (confirm each time), by manifest or by a targeted source-dir / metadata list:
  ```
  sf project deploy start -x manifest/package.xml -o <sandbox>
  sf project deploy start -d force-app/main/default/classes/Foo.cls -o <sandbox>
  ```

### What you may never do

- Create, update, delete, import, or upsert data: any `sf data create / update / delete / import / upsert` (record, bulk, or tree). Data changes are the owner's to run.
- Run anonymous Apex: `sf apex run`, `sfdx force:apex:execute`. It can change data and is off-limits. (Apex tests are fine.)
- Delete metadata from an org: `sf project delete source`, `force:source:delete`.
- Delete an org or sandbox.
- Use the legacy `force:mdapi:deploy`, `force:source:push`, or `force:source:deploy` paths without a manifest. They can carry a destructiveChanges.xml metadata delete a guard cannot see; use `sf project deploy start` instead.
- Deploy or validate against PRODUCTION, ever, even if asked. The owner runs all production deploys. If asked to deploy to production, refuse and hand the owner the command to run themselves.

### Never deploy a permission set by CLI (one narrow exception)

Permission sets (and the same risk applies to profiles) move between orgs by
**change set, not by `sf project deploy` / `sf deploy`**. The danger is the
round-trip: a CLI retrieve is lossy (it strips read-only-field FLS and other
grants), and a CLI deploy then replaces the WHOLE permission set with that lossy
local file, silently dropping grants. So for any permission set that already
exists in the target org, or whose `force-app/` copy ever came from a CLI
retrieve, build a change set in the source org; it carries the complete, live
permission set, and the org is authoritative.

**Exception (CLI deploy to a sandbox is allowed):** a brand-new permission set
this project hand-authored may be CLI-deployed to a SANDBOX on its first
creation. All of these must hold: (a) net-new, hand-authored file that is the
single source of truth; (b) it has NEVER been refreshed by a CLI retrieve, and
never will be (keep editing the source by hand; a retrieve is what makes the
source lossy); (c) sandbox only, never production. Once the org copy diverges
from the source (for example, grants added in the org UI), a CLI redeploy would
wipe that drift, so the exception no longer applies and you go back to change
sets.

### How it is enforced

Install a `PreToolUse` guard hook on the `Bash` and `PowerShell` tools that
inspects the command and:

- BLOCKS any deploy or destructive command aimed at production or an unknown org, a deploy with no explicit `-o`, and the legacy mdapi/push/source:deploy paths without a manifest.
- ASKS for confirmation on a deploy to an allowed sandbox, so a sandbox deploy still needs a human "yes".
- ALLOWS reads and other safe commands silently.

The hook applies to subagents too, so spawning an agent does not get around it.

> **Coverage note.** The toolkit's Gate 2 production-org guard
> (`guard-protected-orgs.js`) covers the production-deploy and destructive-op
> part. Blocking data writes, anonymous Apex, and metadata deletes is broader
> than that hook does today: until the guard is extended to match, treat the
> "what you may never do" list as a hard rule you follow, not something the hook
> catches for you.
>
> Never let a project's own rules claim MORE enforcement than the installed hook
> actually provides. If a project cites a specific guard hook (or a filename such
> as `sf_guard.py`) as enforcing this policy, verify that hook exists and does
> what is claimed, including whether it BLOCKS or only ASKS on production. A rule
> that promises a hard block the hook does not deliver is worse than none: it
> breeds false confidence, and an agent may skip its own caution believing a net
> exists. Describe the real hook's actual behavior, not an aspiration.

### Deploys must name the sandbox

Always pass an explicit `-o <sandbox>` on a deploy or validate. A deploy with no
`-o` is blocked on purpose: the default org is not trusted, because a future
default could be production.

### Adding a sandbox to the allow-list

Keep the set of deploy-allowed sandboxes explicit (in the guard hook's policy or
this rule). To allow a new sandbox, add BOTH its username and its CLI alias
(lowercased), then re-run the hook's self-test if it has one. Never add a
production username or alias.

### If a command you need is blocked

The block message says why. Do not rewrite the command to dodge the hook. If it
is a data change or a production action, ask the owner to run it. If you think
the rule itself is wrong, raise it with the owner rather than editing the guard
to weaken it.

### Related rules

- The production-org guard hook (Gate 2), which enforces the production part of this policy.
- `deploy-hitchhiker-check.md` (before any deploy, catch components or edits that would ride along into the target org).
