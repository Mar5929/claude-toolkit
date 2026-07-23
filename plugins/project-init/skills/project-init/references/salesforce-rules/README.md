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
| `salesforce-safety-guardrails.md` | Read-only against the orgs; never deploy to production; sandbox deploys need an explicit OK; permission sets go by change set, not the CLI. The core deploy-safety policy. |
| `salesforce-change-clarify.md` | Always confirm before object-model, security/permission, integration, or data-source-priority changes, or anything that contradicts the project's requirements. |
| `deploy-hitchhiker-check.md` | Before any deploy, catch components or un-deployed edits that would ride along into the target org before their feature is ready. Ends with read-only verification against the org, never a flag based on a stale tracker. |
| `component-tracker.md` | Keep one master one-row-per-component CSV inventory of what this project authored and where it is deployed, and a matching master manifest, both under one `engagement/deployment/` folder with a per-work-item manifest folder each. Kept in sync in the same change. Optional: assumes a deployment folder. |
| `deployment-runbook.md` | Track the operational steps a deploy cannot perform (permission-set assignments, data re-stamps, scheduled jobs, post-deploy checks). Tool-agnostic. Optional. |
| `permissions-source-control.md` | Profiles and permission sets tracked in git must be complete: a naive retrieve returns silently partial files, so refresh them only through the full retrieval process (runbook: `../salesforce-permissions-retrieval.md`), verify before committing, and never CLI-deploy from them. |
| `production-data.md` | One home for every production data artifact: backups (saved before a live data change) and data-load files each live in their own dated subfolder under `engagement/data/`, with a required README and gitignored data files so record IDs / PII never commit. |

The first three are the recommended default set for a Salesforce project. The
next two (`component-tracker.md`, `deployment-runbook.md`) are heavier consulting
conventions: offer them, but they only earn their keep on engagement-style
projects that keep a deployment inventory and a cutover manifest. Offer
`permissions-source-control.md` whenever the project tracks (or wants to start
tracking) profiles or permission sets in git. Offer `production-data.md`
whenever the project will load or change production data via Data Loader / Bulk
API and wants one auditable home for its backups and load files.

## Adding a rule

Drop a new `<name>.md` here (plain language, no em dashes, no section signs,
"owner" not a personal name, no project-specific file paths or dated incidents:
keep it reusable). Add a row to the table above. New SF projects pick it up on
the next `project-init` run.
