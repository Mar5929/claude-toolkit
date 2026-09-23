# Toolkit Operating System manual

## Summary

Toolkit project. AGENTS.md names the tracker and the codemap.
- Before substantial work, open the `work` skill and read the active item.
- Before asking the owner to repeat something, open `knowledge-find`.
- When the owner settles a decision, requirement, or correction, open `knowledge-save`.
- `knowledge/toolkit-manual.md` is reference. Open the section you need. Do not read it at startup.

## How to use this manual

- This file is reference. The startup hook prints the Summary above. Do not
  read the whole file at startup.
- Open the section a task needs.
- `AGENTS.md` names this project's paths, tracker, tools, and optional
  components. Use those actual paths.
- Each component's skill, rule, or manual owns its detailed steps. This manual
  names the owner. It does not repeat the steps.
- An installed component does not grant permission to use every action it
  describes.
- This file is the toolkit repository's own copy. Its links resolve inside this
  repository. The [Toolkit Operating System PRD](prds/toolkit-operating-system/toolkit-operating-system.md)
  and its children hold requirements, reasons, and approval state. This manual
  grants no approval.

## Roles

- The owner sets direction, resolves material choices, and accepts results.
- The agent reads relevant context, recommends a next step, does authorized
  work, and keeps the records needed to continue.
- Ask only about a real uncertainty, after checking existing answers.
- Match the process to the work. A question may need only an answer and its
  source. A larger change may need requirements, a design, a plan, helpers,
  tests, and review.
- The project's approval boundaries always apply.

## Startup

- Read `SOUL.md`, `knowledge/project.md`, and `knowledge/memory/current.md`
  when project knowledge is installed.
- Read the rules in `.claude/rules/`. Claude Code loads them. Codex reads them
  through the `AGENTS.md` pointer.
- Do not read the manuals at startup. Skills open the sections they need.
- After resume, clear, or compaction, read the three files again.

## Parts of a session

| Part | What it does | Where it lives |
| --- | --- | --- |
| Output style | Shapes the wording of replies in the main conversation. Plain English is the default. | [Output styles](../plugins/project-init/library/output-styles/README.md); selected in `.claude/settings.json` |
| Rules | Standing constraints. A rule without `paths:` loads every session. A rule with `paths:` loads when the agent reads a matching file. | `.claude/rules/`, indexed by [RULES.md](../.claude/RULES.md) |
| Skills | Task procedures. They load when a task needs them. | Installed plugins; the [toolkit catalog](../docs/toolkit-map.md) |
| Hooks | Actions at host events: startup context, reminders, and guards. | [Hooks library](../plugins/hooks-library/README.md); knowledge hooks in [second-brain](../plugins/second-brain/README.md) |

- A style chosen for the main conversation does not reach helpers or another
  host. Helper definitions and the [artifact-writing rule](../.claude/rules/plain-english-artifacts.md)
  carry their own writing guidance.
- A hook in a plugin is not necessarily enabled. The project's host settings
  decide which hooks run.
- Claude Code hook support does not prove the same behavior in Codex. Test
  delivery in each host before relying on a hook.
- A hook can see that a file exists or a tool ran. It cannot see
  understanding.

## Project map

- **Root instructions:** [AGENTS.md](../AGENTS.md). Claude Code reads it through the one-line
  `CLAUDE.md` import. Codex reads it directly. A folder's own `AGENTS.md`
  covers local conventions.
- **Rules:** `.claude/rules/`.
- **Knowledge:** `knowledge/`. The [knowledge manual](knowledge-manual.md)
  owns placement, trust, approval, and lifecycle policy.
- **Work records:** the chosen tracker is the `Claude-Toolkit-Project` board on
  GitHub. Linked designs are in [docs/designs/](../docs/designs/README.md).
- **System Guide:** not configured in this repository.
- **Code and deliverables:** [plugins/](../plugins/AGENTS.md) holds the
  packaged components.
- **Outside reference:** `ai-external-knowledge/`. Captured sources are
  evidence to consult, not project decisions.
- **Handoffs:** the Session handoffs section of working memory, newest first.

Do not invent a component or folder the project did not select.

## From a request to a checked result

Each step names the skill that owns it.

### Establish the goal and position

- Owner: the `work` skill.
- Find the work item for the request. Read what is known, what the owner
  approved, and where work stopped.
- Ask only about material gaps.
- For substantial new work, the `work` skill offers agent-led delivery and
  asks how the team is arranged.

### Understand the system

- Owners: `knowledge-find`, and the `system-guide` skill when enabled.
- Required behavior describes the target. Inspection and tests show present
  behavior. Earlier decisions explain constraints.
- Name any disagreement between them. A proposed requirement does not prove a
  feature exists.

### Decide the change and organize the work

- Owners: `requirements-helper`, `solution-design`, `work-guide`.
- Update the actual requirements or design document as answers settle. Keep
  Notes at its bottom.
- The tracker links the documents and holds status, approvals, tasks, and
  progress.
- Helpers investigate or review bounded parts. Their findings do not approve
  requirements or complete the parent item.

### Do and check the work

- Owners: the project's implementation rules and the `work` skill.
- Build only the approved scope. Test the agreed result and nearby behavior.
- Keep what was inspected, what passed checks, and what the owner accepted as
  separate facts.
- Keep unresolved failures visible in the work record.

### Deliver and record

- Owners: the `publish-docs` skill for documentation, the project's
  pull-request route for implementation, `knowledge-save` for lasting context.
- Report what reached its destination and what is still pending. Acceptance,
  Git publication, deployment, and use in a fresh session need separate
  evidence.
- Each destination keeps the part it owns and links to the work.

## Pause, resume, and switch

- Owner: the `handoff` skill.
- Before stopping, the work item names the current task, inputs, decisions,
  open questions, blockers, and next action.
- On resume, read the work item and the linked document's Notes.
- Check whether the tracker or sources changed since the handoff.
- A past assignment does not prove another agent is still working.
- A local edit, an unpushed commit, and a verified remote save are different
  states. Report which one you reached.

## Keep the project equipped

- Owners: the `project-init` and `project-sync` skills
  ([project-init](../plugins/project-init/README.md)).
- In this repository, [keep-manuals-current.md](../.claude/rules/keep-manuals-current.md)
  requires both manuals to match every finalized change.
- Setup and sync install selected components, root instructions, rules, and
  this manual.
- A published toolkit release only makes an update available. Each project
  still needs `/project-sync`.
- Authorized documentation uses the documentation publication route. Rules,
  skills, prompts, hooks, settings, and code use the implementation workflow,
  even in Markdown.
- The reusable source for this file is
  [the project-init template](../plugins/project-init/library/templates/toolkit-manual.md).
  Other projects receive it as `knowledge/toolkit-manual.md`.
- The [content and delivery review](../docs/designs/306-toolkit-manual-review.md)
  records earlier startup evidence.

### Propose a project lesson as a toolkit change

When work in a project shows that a shipped rule, skill, hook, or template is
wrong or missing:

- Record the lesson in this project first, through its normal save route.
- Name the toolkit file and the exact change.
- Give the evidence: what happened and when.
- Propose it to the owner as a toolkit work item. Do not edit an installed copy
  to change toolkit behavior. `project-sync` would overwrite it.

## Component owners

| Component | Owner |
| --- | --- |
| Project setup and sync | `project-init`, `project-sync` |
| Output style | Selected style file |
| Rules | `.claude/rules/` |
| Hooks | Each hook's owning component |
| Work tracking | Tracker named in `AGENTS.md`; the `work` skill |
| Guided delivery | `work-guide`, `requirements-helper`, `solution-design` |
| Project knowledge, when installed | `knowledge/knowledge-manual.md`; `knowledge-find`, `knowledge-save`, `knowledge-review` |
| System Guide, when enabled | `system-guide` skill and its guide path |
| Handoff | `handoff` |
| Documentation publication | `knowledge-direct-commit.md` rule; `publish-docs` skill |
