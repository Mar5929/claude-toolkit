---
name: knowledge-setup
description: Inspect, enable, migrate, repair or update this project's Knowledge System and verify which parts actually work. Coordinates complete project setup with project-init and project-sync while preserving existing content and choices.
---

# Set up and verify project knowledge

Inspect before changing anything. The plugin being installed on the machine
is not project opt-in or proof that its instructions run. Read the project's
root instructions, existing setup record and both manual locations. A marked
`knowledge/knowledge-manual.md` identifies toolkit guidance; folder names alone
identify neither ownership nor permission.

Use [delivery and verification](references/delivery.md) for an authorized new
setup, update or repair. Use [migration](references/migration.md) when old records,
manuals, skill names or registrations exist. Coordinate the higher Toolkit manual
through the installed project-init/project-sync procedure; reuse its loader.
Do not install a second competing startup sequence.

Classify the actual state: new, legacy, current, partial, mixed/unknown, or
System-Guide-only. Inspect `.system-guide.json`; its configured tree belongs to
that separate component. Do not enable it, convert it, or rebuild its index.
Unknown collisions or conflicting manual meaning remain untouched pending the
specific decision. An explicit setup/update request is its authorization; do not
ask the same question again. Otherwise present the concrete proposed scope
before installing. Detection itself changes no files.

Required templates, opened only as needed:

- [SOUL](references/templates/SOUL.md), [project](references/templates/knowledge/project.md),
  [core manual](references/templates/knowledge/knowledge-manual.md),
  [knowledge navigation](references/templates/knowledge/README.md).
- [Current work](references/templates/knowledge/memory/current.md),
  [inbox](references/templates/knowledge/memory-inbox.md),
  [glossary](references/templates/knowledge/memory/memory-entries/terminology-glossary.md),
  [selection feedback](references/templates/knowledge/memory-self-improvement.md).
- [Memory topic](references/templates/memory-topic.md), [PRD](references/templates/prd.md),
  [pending entry](references/templates/pending-entry.md),
  [captured topic](references/templates/captured-topic.md).

Source/checksum, copied tools/hooks, four discoverable skills, file layout and
active registrations must agree. Rebuild indexes and run the checker, then test
fresh and recovered sessions on each claimed host. Report configured version,
actual exercised surface, missing support and next action separately. Do not call
a partial installation equipped or fixtures full agent acceptance. Existing
approved records and useful pending authority survive failed setup and rollback.
