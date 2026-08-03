# Second-brain v3 folder layout

V3 installs one complete root schema. Project-specific system-area folders are
created only for real areas identified in the project.

```text
project/
  CLAUDE.md
  AGENTS.md
  .claude/
    rules/
      second-brain.md
    agents/
      memory-librarian.md
  brainstorms/
    README.md
    <date>-<topic>.md
  specs/
    README.md
    <system-area>/
      README.md
      <capability>/
        README.md
        <optional-supporting-document>.md
  memory/
    README.md
    context/
      README.md
      <system-area>/
        README.md
    planning/
      README.md
      <system-area>/
        README.md
    decisions/
      README.md
      <system-area>/
        README.md
    knowledge/
      README.md
      <system-area>/
        README.md
    references/
      README.md
      <system-area>/
        README.md
    domain/
      README.md
      <system-area>/
        README.md
    operations/
      README.md
      <system-area>/
        README.md
```

Examples of system areas are `authentication`, `billing`, `mobile-app`,
`salesforce`, `reporting`, and `project-wide`. They come from the project and
are not a universal list.

## Complete core

An adopted installation always includes:

- `.claude/rules/second-brain.md`;
- `.claude/agents/memory-librarian.md`;
- the same compact route in `CLAUDE.md` and `AGENTS.md`;
- `brainstorms/README.md`;
- `specs/README.md`;
- `memory/README.md`; and
- all seven typed memory root folders and indexes.

Do not offer partial variants that omit the canonical rule, memory librarian,
root routes, or one of the seven typed memory homes.

## Proportionate growth

Do not invent empty `billing/`, `shipping/`, `payroll/`, or other system-area
trees merely because they are common elsewhere. Create the areas the current
project actually has. Add another area later when real work establishes it.
Create that area's `README.md` in the same change as its first durable document.
An empty hypothetical area and a populated area without an index are both
invalid shapes.

Raw meetings, transcripts, communications, deliverables, and source exports
remain in the project's ordinary artifact scaffolding. V3 links to them when
useful instead of duplicating them.
