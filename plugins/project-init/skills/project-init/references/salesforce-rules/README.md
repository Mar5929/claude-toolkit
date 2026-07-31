# Salesforce project rules library

Reusable `.claude/rules/` files for Salesforce / SFDX projects. During
`project-init`, when the owner says the project is Salesforce, offer to copy
these into the new project's `.claude/rules/` (Gate 1, right after the
`.claude/rules/` folder is scaffolded). Each is optional; confirm the set with
the owner before copying, same as every other gate.

These are Salesforce-specific and opt-in, so they live here rather than in the
`general-rules/` library (which every project gets). Both libraries are copied
as files into the project's `.claude/rules/` folder, and the project's CLAUDE.md
points at that folder so these files are read each session.

## Rules in this library

| File | What it does |
|---|---|
| `salesforce-safety-guardrails.md` | Read-only against the orgs; never deploy to production; sandbox deploys need an explicit OK. The core deploy-safety policy. |
| `salesforce-change-clarify.md` | Always confirm before object-model, security/permission, integration, or data-source-priority changes, or anything that contradicts the project's requirements. |
| `deploy-hitchhiker-check.md` | Before any deploy, catch components or un-deployed edits that would ride along into the target org before their feature is ready. Ends with read-only verification against the org, never a flag based on a stale tracker. |
| `component-tracker.md` | Keep one master one-row-per-component CSV inventory of what this project authored and where it is deployed, and a matching master manifest, both under one `engagement/deployment/` folder with a per-work-item manifest folder each. Kept in sync in the same change. Optional: assumes a deployment folder. |
| `deployment-runbook.md` | Track the operational steps a deploy cannot perform (permission-set assignments, data re-stamps, scheduled jobs, post-deploy checks). Tool-agnostic. Optional. |
| `permissions-source-control.md` | Permission sets are tracked in git and deployed from it, behind a mandatory preflight that lists what a deploy would remove. A permission set retrieve is complete on its own (API 40.0 and later); the danger is the deploy, which replaces the whole component, and which no Salesforce CLI command warns about. Ships with `../tools/permsets.py`. Profiles are excluded by default: lossy retrieve, overlay deploy, so their diff cannot show a revocation. Runbook: `../salesforce-permissions-retrieval.md`. |
| `production-data.md` | One home for every production data artifact: backups (saved before a live data change) and data-load files each live in their own dated subfolder under `engagement/data/`, with a required README and gitignored data files so record IDs / PII never commit. |
| `data-change-handoff.md` | No agent ever writes data to production; sandbox writes need the owner's yes in that same chat; reads are approved by default. Owns what the agent hands over instead: a ready-to-load CSV, a backup file, numbered load steps, what success looks like, and how to undo it. |

The first three are the recommended default set for a Salesforce project. The
next two (`component-tracker.md`, `deployment-runbook.md`) are heavier consulting
conventions: offer them, but they only earn their keep on engagement-style
projects that keep a deployment inventory and a cutover manifest. Offer
`permissions-source-control.md` whenever the project tracks (or wants to start
tracking) permission sets in git. **It is not a standalone rule.** When accepted,
install all four parts or it is advice with no enforcement: the rule,
`../tools/permsets.py` to `tools/permissions/permsets.py`,
`../templates/permissions-runbook.md` as the project runbook, and
`../hooks/guard-permission-set-deploy.js` in Gate 2. The install table is in
`../salesforce-permissions-retrieval.md`; the evidence is in
`../salesforce-permissions-research.md`. Offer `production-data.md`
whenever the project will load or change production data via Data Loader / Bulk
API and wants one auditable home for its backups and load files.

`data-change-handoff.md` and `production-data.md` are the pair for projects that
change production data: the first says the owner runs the change and what the
agent must hand them, the second says where the resulting files live. Offer
`data-change-handoff.md` to any Salesforce project whose data an agent could
otherwise be asked to change, which is nearly all of them. It does not repeat
`salesforce-safety-guardrails.md`; that file owns which commands are allowed, and
this one owns what happens instead of the forbidden write.

## Adding a rule

Drop a new `<name>.md` here (plain language, no em dashes, no section signs,
"owner" not a personal name, no project-specific file paths or dated incidents:
keep it reusable). Add a row to the table above. New SF projects pick it up on
the next `project-init` run.
