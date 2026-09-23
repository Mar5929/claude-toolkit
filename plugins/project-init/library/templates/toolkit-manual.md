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
- Check `knowledge/memory-inbox.md` for unfinished saves when it exists.
- Do not read the manuals at startup. Skills open the sections they need.
- After resume, clear, or compaction, read the three files again.

## Parts of a session

| Part | What it does | Where it lives |
| --- | --- | --- |
| Output style | Shapes the wording of replies in the main conversation. Plain English is the default. | Selected in `.claude/settings.json`; file in `.claude/output-styles/` |
| Rules | Standing constraints. A rule without `paths:` loads every session. A rule with `paths:` loads when the agent reads a matching file. | `.claude/rules/` |
| Skills | Task procedures. They load when a task needs them. | Installed plugins and project skills |
| Hooks | Actions at host events: startup context, reminders, and guards. | Host settings; each hook's owning component |
| Required workflow checks | Claude Code only. Refuse a tool call, or hold a final reply once, when a required step did not happen. | The `protocol-guard` plugin; turned on in `.claude/settings.json` |

- A style chosen for the main conversation does not reach helpers or another
  host. Helper definitions and the artifact-writing rule carry their own
  writing guidance.
- A hook in a plugin is not necessarily enabled. The project's host settings
  decide which hooks run.
- Claude Code hook support does not prove the same behavior in Codex. Test
  delivery in each host before relying on a hook.
- A hook can see that a file exists or a tool ran. It cannot see
  understanding.
- The required workflow checks decide from facts Claude Code reports: which
  skill was opened, which file was written, which command succeeded. They
  prove a step happened, not that it was done well or approved. They run only
  with `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` in project settings; the older
  command hooks skip only the parts they replace. The knowledge manual lists
  the knowledge steps they check.

## Project map

- **Root instructions:** `AGENTS.md`. Claude Code reads it through the one-line
  `CLAUDE.md` import. Codex reads it directly. A folder's own `AGENTS.md`
  covers local conventions.
- **Rules:** `.claude/rules/`.
- **Knowledge, when installed:** `knowledge/`. `knowledge/knowledge-manual.md`
  owns placement, trust, approval, and lifecycle policy.
- **Work records:** the chosen tracker named in `AGENTS.md`. Linked designs sit where
  the project keeps them.
- **System Guide, when enabled:** its configured guide path.
- **Code and deliverables:** the codemap in `AGENTS.md`.
- **Outside reference:** captured sources named in the codemap. They are
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

- Owners: the `project-init` and `project-sync` skills.
- Setup and sync install selected components, root instructions, rules,
  project skills, and this manual. Each project skill is copied twice:
  `.claude/skills/<name>/` for Claude Code and `.agents/skills/<name>/` for
  Codex. The copies stay byte-identical.
- A published toolkit release only makes an update available. Each project
  still needs `/project-sync`.
- Authorized documentation uses the documentation publication route. Rules,
  skills, prompts, hooks, settings, and code use the implementation workflow,
  even in Markdown.
- The reusable source for this file is
  `plugins/project-init/library/templates/toolkit-manual.md` in the
  project-init plugin. Sync shows meaningful differences, applies authorized
  updates, and keeps approved local meaning.

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
| Required workflow checks | `protocol-guard`; each check names its owner skill |
| Work tracking | Tracker named in `AGENTS.md`; the `work` skill |
| Guided delivery | `work-guide`, `requirements-helper`, `solution-design` |
| Project knowledge, when installed | `knowledge/knowledge-manual.md`; `knowledge-find`, `knowledge-save`, `knowledge-review` |
| System Guide, when enabled | `system-guide` skill and its guide path |
| Handoff | `handoff` |
| Documentation publication | `knowledge-direct-commit.md` rule; `publish-docs` skill |
