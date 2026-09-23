---
paths:
  - "force-app/**/permissionsets/**"
  - "force-app/**/permissionsetgroups/**"
  - "force-app/**/profiles/**"
---
# Permission Sets in Git

A permission set retrieve is complete since API 40.0. A permission set deploy replaces the whole component: any grant missing from the file is disabled.

- Bring a permission set into git only with `permsets.py fetch <Name> --org <sandbox>`. Never commit a file that did not verify clean.
- Before relying on retrieves in a new org or after a major release, run `permsets.py verify` on one large permission set.
- Fetch fresh before every edit.
- Before every deploy, run `permsets.py preflight <file> --org <sandbox>`. `sf project deploy validate` and `sf project deploy preview` cannot detect removed grants.
- A preflight receipt expires after 30 minutes. Re-run it before the deploy.
- To remove grants on purpose, re-run the preflight with `--accept-removals`.
- Deploy to a sandbox only, with the owner's yes in the same chat. The owner runs production.
- Never use `--ignore-conflicts` on a permission file.
- Keep `sourceApiVersion` in `sfdx-project.json` equal to the org's version. Re-fetch everything after a version bump.
- Before committing, run `permsets.py check`, then `permsets.py tidy`.
- After every fetch, re-add the grants in `RETRIEVE_BLIND_SPOTS`.
- After a deploy, check every permission set group that contains the set. If its status is not Updated, click Recalculate on the group in Setup.
- Never hand-merge a git conflict in a permission file. Take one side whole, then re-apply the other change.
- Never write an `Activity.` field permission. Use `Task.` or `Event.`.
- Profiles are excluded. Never deploy a profile from source.
- Never edit or disable `.claude/hooks/guard-permission-set-deploy.js`. If the hook matches quoted text in another command, put the text in a file.

Procedures and reasons: the project's permission set runbook (from the toolkit template `permissions-runbook.md`), and `tools/permissions/permsets.py`.
