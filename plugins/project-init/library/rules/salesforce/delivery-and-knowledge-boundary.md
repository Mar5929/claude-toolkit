# Salesforce Delivery Root

This rule owns one thing: which folder holds a Salesforce project's client-work artifacts.

- New projects use `delivery/`.
- A project that already uses `engagement/` keeps it. Do not rename it, move its files, or create a parallel `delivery/` tree.
- Where a rule or skill names a `delivery/` path, use `engagement/` in such a project.
- With the toolkit knowledge system installed, curated knowledge goes in `knowledge/`. Never create `delivery/knowledge-base/`.
