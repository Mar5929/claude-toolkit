# Profile: Salesforce org

Pick this when the project is a Salesforce org build, org merge, or managed
service, where the org's DATA and METADATA are as important as the code.
Reference example: the DragonFly org merge.

At install, paste the matching block into each curator's `## Project profile`
section, replacing the `<...>` placeholders. `<APP_NAME>` is the real project
name (e.g. `DragonFly`).

## Paste into brain-curator.md `## Project profile`

- **Project:** `<APP_NAME>` (Salesforce org)
- **Data in scope:** Salesforce org DATA is wanted: record counts, fill rates,
  distinct-value counts, data-quality findings, field semantics, metadata values
  (picklists, record types, relationships), client and company names, and real
  sample records/values when they support a finding, mapping, or decision.
- **What "verified" means here:** re-query the org (a SOQL or metadata query).
  Order of trust: org query > user said > assumed.
- **Drift model(s) in use:** both. File-SHA for `force-app/` metadata files;
  time + re-query for org data/config that has no file to hash.
- **Source code path(s):** `force-app/`
- **Dominant node types:** `entity` glossary (informal term -> API name, with
  aliases), `knowledge` data-profile nodes (counts/fill rates, pinned), mapping
  `decision` nodes, plus code-why `knowledge` nodes for Apex and flows.
- **Systems of record (point, do not copy):** `<this project's actual tools, e.g.
  ClickUp, Linear, Jira>`. The brain writes pointer nodes to these, per invariant 9.

## Paste into knowledge-curator.md `## Project profile`

- **Project:** `<APP_NAME>` (Salesforce org)
- **Data in scope:** object model, field semantics (what a field really means,
  which are dead ends), the data profile (record counts, fill rates,
  distinct-value counts), data-quality findings, mapping decisions, client names,
  and sample values when they support a finding. Store counts/metadata verbatim.
- **What "verified" means here:** re-query the org (SOQL or metadata query).
  Order of trust: org query > user said > assumed.
- **Drift model(s) in use:** both. File-SHA for `force-app/` files; time +
  re-query for org data/config nodes (carry a `verified:` date + `review_after`).
- **Source code path(s):** `force-app/`
- **Dominant node types:** code-why `knowledge` nodes for Apex classes, triggers,
  and flows; data-profile `knowledge` nodes (no `covers:` block); a `know-codemap`
  entry per subsystem.
- **Structural graph companion:** yes. For an org merge, field-level impact
  analysis ("rename this field, what breaks three hops out?") is the daily job.
  The dependency graph is not part of second-brain and never was; it now ships
  with `project-init`
  (`plugins/project-init/skills/project-init/references/salesforce-dependency-graph.md`).
  This layer records why; the graph answers what-connects-to-what.

## Setup notes

- `CODE_PATH_REGEX` = `force-app/`.
- Universal exclusions still apply: never store org URLs, usernames, org IDs, or
  connection strings. Org DATA is in scope; org ACCESS details are not. The
  capture hook already redacts sf URLs, org IDs, and emails.
- This profile turns the knowledge layer ON (Salesforce projects benefit most).
