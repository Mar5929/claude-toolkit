# Salesforce Delivery Root Compatibility

The general `project-file-lifecycle.md` rule owns where project information
belongs and what happens when a work item closes. This rule adds the Salesforce
delivery-root choice only.

## New Salesforce projects

Use `delivery/` as the default root for client-work artifacts. Use the general
lifecycle rule for its folder meanings, including `architecture/`,
`deliverables/`, and `archive/`.

When the toolkit knowledge system is installed, use its `knowledge/` folder.
Do not create `delivery/knowledge-base/` as a second curated knowledge home.

## Existing Salesforce projects

An existing Salesforce project may already use `engagement/`. Keep using it as
that project's delivery-artifact root. Do not rename it, move its files, or
create a parallel `delivery/` tree automatically.

When a rule names a `delivery/` path, substitute the existing
`engagement/` path for a project that already uses it. The ownership boundary
stays the same.
