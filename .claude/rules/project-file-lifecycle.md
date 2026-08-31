# Keep Each Project File in One Lasting Home

Every kind of project information has one home that owns it. Before you create,
move, or copy anything, search the project for that home. Update it when it
already exists. Everywhere else links to it instead of repeating it.

The project's root instructions name its tracker and its important folders. Use
those paths. When the right home is unclear, ask the owner before inventing a
new one.

## Where each kind of information lives

| Information | Its home |
| --- | --- |
| Requirements, status, blockers, open questions, handoffs | The project's work tracker, where it has one. Never the lasting home for architecture or behavior. |
| Active architecture and design | `<delivery-root>/architecture/<area>/`, or the architecture folder the project names. Completion is not a reason to archive it. |
| Approved product or system behavior | The project's specification home. |
| Lasting decisions and the reasons for them | The project's persistent knowledge home. Link to a decision, do not copy it. |
| Presentations and high-level summaries | `<delivery-root>/deliverables/`. PowerPoints, executive summaries, and high-level project overviews only. |
| Retired or replaced material | The project's archive. |

## Finishing work does not archive current truth

Closing a piece of work does not move current architecture, specifications, or
implementation into an archive. They stay in their homes. Only retired or
replaced material moves to the archive.

## Two more things

- A project that produces delivery files keeps them under one delivery root,
  `delivery/` by default. An existing root stays as it is: do not rename it and
  do not start a second one.
- Never create a knowledge folder on your own. Ask the owner which home to use.
