# Keep Each Project File in One Lasting Home

Before creating, moving, or copying project information, decide which file is
its authority. Search the project first. Update an existing authority when one
exists. Other places link to it instead of repeating its meaning.

The project's root instructions name its work tracker and important folders.
Use those declared paths. If the right home is unclear, ask the owner before
creating another category or moving the file.

## The project lifecycle

| Information | Authoritative home | What happens when the work item closes |
| --- | --- | --- |
| Requirements, status, blockers, open questions, handoffs, and links | The declared work tracker | Close or archive the work item. Do not make it the permanent home for project architecture or behavior. |
| Active detailed architecture and design | `<delivery-root>/architecture/<area>/` | Keep it current in place. Completion is not a reason to archive it. |
| Approved product or system behavior | The project's declared specification home, normally `knowledge/specs/` when the toolkit knowledge system is installed | Keep it current through that specification system's approval and retirement process. |
| Lasting decisions and their reasons | The project's declared persistent-knowledge home, normally `knowledge/memory/` when the toolkit knowledge system is installed | Keep the decision there and link to it. Do not copy it into every related work item. |
| Code, metadata, and configuration | The project's source folders | Keep them with the implementation and its normal version history. |
| Presentations and high-level summaries | `<delivery-root>/deliverables/` | Keep the final presentation layer. This is not a working-file folder. |
| Retired or replaced working material | `<delivery-root>/archive/` | Keep it only when its history still matters. Current architecture, specifications, and implementation do not move here just because a work item ended. |

## The delivery root

For a new project that produces client or delivery artifacts, the default root
is `delivery/`. An existing project may declare another root, such as
`engagement/`. Keep using that root. Do not rename it, move its files, or create
a parallel `delivery/` tree automatically.

If a project does not produce delivery artifacts, do not create `delivery/`
only because this rule exists. Use the architecture or documentation home named
by the project. If none is named, ask the owner before creating one.

Create a delivery folder only when the project needs it:

| Folder | What belongs there |
| --- | --- |
| `architecture/` | Current detailed designs, diagrams, models, and architecture workbooks, grouped by area |
| `project-overview/` | Raw project briefs and supplied framing. Curated current framing belongs in the project's declared knowledge home |
| `communications/` | Emails, messages, and other client or team communications |
| `meeting-notes/` | Records of calls and working sessions |
| `references/` | Client-provided source material, exports, and other read-only project inputs |
| `deployment/` | Cutover plans, release records, and deployment evidence |
| `data/` | Mapping files, transformation rules, load files, and approved backups handled under the project's data-safety rules |
| `deliverables/` | PowerPoints, executive summaries, and high-level project overviews only |
| `archive/` | Retired or replaced working material kept for history |

Public vendor documentation captured for agents is not a client delivery file.
Follow the project's outside-documentation rule for that material.

## When knowledge is not installed

Do not create `knowledge/` or a substitute knowledge base silently. Use the
specification, decision, or documentation home declared by the project. If the
project has no declared home, ask the owner to choose one before saving lasting
project truth.

## Finish the work without losing the truth

When a work item is completed:

1. Make sure the work item links to the current architecture, specifications,
   decisions, and implementation.
2. Close or archive the work item in the tracker.
3. Leave current architecture, specifications, decisions, and implementation in
   their authoritative homes.
4. Move only retired or replaced working material to the delivery archive.

Folder README files may help people understand a folder. They do not replace
this rule and are never the authority for the project file lifecycle.
