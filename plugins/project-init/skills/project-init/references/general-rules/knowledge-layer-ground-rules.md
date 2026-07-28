# Retired V1 Knowledge Rule

Do not add this rule to a new project. It exists only so `project-sync` can
recognize and remove or replace an older v1 rule.

The v1 knowledge layer is retired. Do not refresh, reconcile, read, or import
`know-*` nodes, SHA pins, drift reports, curator output, or outbox content as
v3 knowledge.

Current explanations must come from authoritative Git content and current code.
V3 is not shipped, so do not create an ad hoc replacement.
