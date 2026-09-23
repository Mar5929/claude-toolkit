# Salesforce project rules library

Opt-in `.claude/rules/` files for Salesforce and SFDX projects. `project-init`
offers them in Gate 1, after `.claude/rules/` exists. Confirm the set with the
owner. `project-sync` audits them the same way.

Each rule is short. The procedure it triggers lives in a skill in
`../../skills/salesforce/`. Install each accepted rule's skill with it, to both
`.claude/skills/<name>/` and `.agents/skills/<name>/` (byte-identical copies).

## Rules in this library

| File | Loads | Skill | What it does |
|---|---|---|---|
| `delivery-and-knowledge-boundary.md` | Always | None | New projects use `delivery/`; `engagement/` projects keep it. |
| `salesforce-safety-guardrails.md` | Always | None | Which `sf` commands are allowed and never allowed, and what `guard-protected-orgs.js` really checks. |
| `salesforce-change-clarify.md` | Always | None | Confirm object-model, security, integration, and data-source-priority changes first. |
| `deploy-hitchhiker-check.md` | Always | `sf-deploy-check` | Before a shared or production deploy, find components that would ship before they are ready. |
| `component-tracker.md` | Always | `sf-component-tracker` | Keep the tracker CSV, master manifest, and work-item manifests current with each metadata change. |
| `data-change-handoff.md` | Always | `sf-data-change` | No agent writes production data; hand the owner the file, steps, and undo. |
| `production-data.md` | `delivery/data/**`, `engagement/data/**` | `sf-data-change` | Where backups and load files go; never commit data files. |
| `deployment-runbook.md` | `delivery/deployment/**`, `engagement/deployment/**` | `sf-component-tracker` | Manual deploy steps go in `manual-steps.md` in the work item's manifest folder. |
| `permissions-source-control.md` | Permission set, permission set group, and profile files under `force-app/` | None | Fetch, verify, and preflight every permission set deploy. |
| `dependency-graph.md` | `force-app/**`, `tools/kb/**` | None | Answer impact questions from the edge list and keep it fresh. |

A `paths:` rule loads when the agent reads a matching file, not when it writes
one. So every trigger that must fire when the agent creates something stays
always-loaded, as a short rule that names its skill. Codex has no `paths:`
scoping: the project's `AGENTS.md` gets one line per `paths:` rule naming the
pattern and the rule file.

## Which to offer

- Default set for any Salesforce project: the first four rows.
- `component-tracker.md` and `deployment-runbook.md`: offer for delivery-heavy
  projects that keep a deployment inventory and a cutover manifest.
- `data-change-handoff.md`: offer to any project whose data an agent could be
  asked to change. `production-data.md` pairs with it when the project loads
  production data by Data Loader or Bulk API.
- `permissions-source-control.md` is not standalone. Install all four parts:
  the rule, `../../tools/permsets.py` to `tools/permissions/permsets.py`,
  `../../templates/permissions-runbook.md` as the project runbook, and
  `guard-permission-set-deploy.js` from `hooks-library` in Gate 2. Install
  table: `../../guides/salesforce-permissions-retrieval.md`. Evidence:
  `../../guides/salesforce-permissions-research.md`.
- `dependency-graph.md` is not standalone. Install the rule, `../../tools/kb/`
  to `tools/kb/`, the gitignore entries, and the freshness Stop hook in Gate 2.
  Steps: `../../guides/salesforce-dependency-graph.md`. A general rule has the
  same name for other stacks (graphify); a project gets one of the two, never both.

## Adding a rule

Keep it reusable: plain language, "owner" not a personal name, no
project-specific paths or dated incidents. Put any procedure in a skill under
`../../skills/salesforce/` with `name` and `description` frontmatter only. Add
a row above.
