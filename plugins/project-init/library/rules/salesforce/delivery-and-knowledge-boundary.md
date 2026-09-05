# Salesforce Delivery Root Compatibility

This rule owns one thing: which folder holds a Salesforce project's client-work
artifacts. It does not decide where project information belongs in general. The
project's own root instructions and codemap do that.

## New Salesforce projects

Use `delivery/` as the default root for client-work artifacts. Its folder
meanings, including `architecture/`, `deliverables/`, and `archive/`, come from
the project's root instructions and the scaffold that created them.

When the toolkit knowledge system is installed, use its `knowledge/` folder.
Do not create `delivery/knowledge-base/` as a second curated knowledge home.

## Existing Salesforce projects

An existing Salesforce project may already use `engagement/`. Keep using it as
that project's delivery-artifact root. Do not rename it, move its files, or
create a parallel `delivery/` tree automatically.

When a rule names a `delivery/` path, substitute the existing
`engagement/` path for a project that already uses it. The ownership boundary
stays the same.
