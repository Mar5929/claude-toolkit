# Salesforce Org Safety

Applies to every agent and subagent. Read-only against every org, except the sandbox actions below.

## Allowed
- Read data: `sf data query`, `sf data query --bulk`, `sf data get record`, `sf data export bulk`, `sf data export tree`, `sf data search`.
- Read metadata: `sf project retrieve start`, `sf sobject describe`, `sf schema ...`, `sf org display`, `sf org list`.
- Apex tests and logs: `sf apex test run`, `sf apex get log`, `sf apex tail log`.
- Validate or preview against a sandbox: `sf project deploy validate -x <manifest> -o <sandbox>`, `sf project deploy preview`, `sf project deploy report`.
- Deploy to a sandbox, after the owner says yes for that deploy: `sf project deploy start -x manifest/package.xml -o <sandbox>` or `sf project deploy start -d <path> -o <sandbox>`.
- Sandbox data writes (`sf data create / update / delete / import / upsert`) and `sf apex run` against a sandbox, after the owner says yes for that change in the same chat.

## Never
- Never deploy or validate against production, even if asked. Hand the owner the command instead.
- Never write data or run anonymous Apex in production: `sf data create / update / delete / import / upsert` (record, bulk, or tree), `sf apex run`, `sfdx force:apex:execute`. Hand over a file per `data-change-handoff.md`.
- Never delete metadata from an org: `sf project delete source`, `force:source:delete`.
- Never delete an org or sandbox.
- Never use `force:mdapi:deploy`, `force:source:push`, or `force:source:deploy` without a manifest. Use `sf project deploy start`.
- Never deploy, validate, write data, or run Apex without an explicit `-o <sandbox>`. Never trust the default org.
- Never CLI-deploy a profile.
- Never deploy a permission set without a clean `permsets.py preflight`. `sf project deploy validate` and `preview` do not detect removed grants.
- Never add a production username or alias to `neverProtect` or to any sandbox allow-list.
- Never rewrite a blocked command to get past a guard hook. Never edit a guard to weaken it. Ask the owner.

## Enforcement
`guard-protected-orgs.js`, where installed, checks deploys, `project delete source`, `data delete`, `apex run`, and `org delete` aimed at production or an unclassified org. It asks by default; `"action": "deny"` in `.claude/protected-orgs.json` blocks. It does not check `deploy validate`, data create, update, import, or upsert, or sandbox actions. Follow this list whether or not a hook fires.
