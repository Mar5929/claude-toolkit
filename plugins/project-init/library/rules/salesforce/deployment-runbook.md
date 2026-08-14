## Deployment Runbook

The component tracker (`component-tracker.md`) captures *what* was built and
deployed. A deployment runbook captures *what else has to happen* around the
deploy that the deploy itself cannot perform: permission set assignments, data
re-stamps, scheduled job creation, connector configuration, field-level-security
verification, ordering-sensitive steps, and post-deploy spot checks.

### Where it lives

Keep the runbook wherever the project tracks work: a list in the task tracker
(ClickUp, Linear, Jira), a checklist doc, or a local file under
`delivery/deployment/`. Existing projects that already use
`engagement/deployment/` keep that path. Do not move or duplicate their records.
One entry per operational step. Whatever the tool, each
step needs: a short imperative title, a phase, an order, an owner, and a body
with instructions and verification.

### Step shape

| Field | Notes |
| --- | --- |
| Title | Short imperative step name. |
| Phase | `Pre-deploy`, `Deploy`, or `Post-deploy`. Groups the steps. |
| Order | Sequence within the runbook. Use 10-unit gaps (10, 20, 30) so new steps slot in without renumbering. |
| Owner | Who runs the step. |
| Status | Not started / in progress / done. |
| Body | Purpose (1-2 sentences), numbered operator instructions, a verification section (SOQL, screenshot, or UI check), and any inline scripts in fenced code blocks. |

Put inline scripts (anonymous Apex, SOQL, CLI commands) directly in the step body
so the operator can paste them; do not link out to a repo file for a script that
fits inline. Cross-reference the originating implementation task and any local
work-item folder.

### When to add a step

Add a runbook step in the **same response** in which you author the triggering
metadata, whenever that metadata needs an operational action the deploy cannot
perform. Triggers include:

- New permission set or permission set group: a step to assign it to users.
- New field fed by an external connector: a step to configure the connector mapping.
- New record type needing retroactive assignment: a step for the data update or Apex script.
- New or changed rollup: a step to capture a pre-deploy baseline and validate the post-deploy delta.
- New scheduled Apex or scheduled flow: a step to schedule it post-deploy.
- Migration that must clear a field before re-stamping: ordered Pre-deploy steps.
- Deploy that depends on a managed-package version, remote site setting, custom setting, or org-wide setting: a Pre-deploy verification step.
- One-time post-deploy backfill (Batch Apex, anonymous Apex, data load): a step with the full kickoff script inline.
- Any deploy where you would want a pre-flight snapshot for safe rollback.

### When NOT to add

Skip the runbook when the deploy is self-contained:

- Pure UI / LWC changes with no permission, data, or config follow-up.
- Apex refactors that change only internal behavior.
- Formula-field tweaks affecting only existing in-scope data.
- Label or text-only changes.

When in doubt, add the step. A step closed as "skipped" is cheaper than a missed
operational action.

### Update flow

1. Author the triggering metadata: add the tracker row(s) per `component-tracker.md`.
2. In the same response, add or update the runbook step with phase, order, and full body.
3. The owner runs the deploys and updates step status as they execute.
4. On deploy confirmation, flip the affected tracker org flags to `Yes`.

### What does NOT belong

- Routine steps that happen as a matter of course and need no ordering.
- Standalone work-item documentation (lives in the work-item folder).
- Implementation tasks (those live in the main task list, not the runbook).
- Generic deploy commands that apply to every Salesforce deploy regardless of the work (those live in a playbook or the safety-guardrails rule).
