# second-brain plugin

Project knowledge in shared Markdown and Git. Startup reads three short files.
One core manual holds the policy as reference; four focused procedures open it
and their own references when needed. The agent chooses useful information and
respects the permission for its destination.

Install with `/plugin install second-brain`, then request project setup through
`knowledge-setup`, project-init or project-sync. Installing source on a machine
alone does not equip a project. Setup is opt-in and preserves owner content.

## Four procedures

| Procedure | When to use it |
| --- | --- |
| [knowledge-find](skills/knowledge-find/SKILL.md) | Find relevant project evidence, resolve conflicts, or recover available history. |
| [knowledge-save](skills/knowledge-save/SKILL.md) | Select/propose/save, choose a coherent topic before the card, maintain topic records, or recover an interrupted save. |
| [knowledge-review](skills/knowledge-review/SKILL.md) | Review duplicates, contradictions, obsolete material and selection feedback. |
| [knowledge-setup](skills/knowledge-setup/SKILL.md) | Detect, install, migrate, repair and verify a complete project package. |

Old command entry points are explicit-only compatibility routes with no separate
policy: [recall](skills/recall/SKILL.md), [remember](skills/remember/SKILL.md),
[retire](skills/retire/SKILL.md), [reflect](skills/reflect/SKILL.md),
[session-search](skills/session-search/SKILL.md), and
[second-brain](skills/second-brain/SKILL.md). New integrations use the four names.
The [history reference](skills/knowledge-find/references/history.md) tells agents
where Claude Code keeps local transcripts so they can use ordinary file tools.
Other hosts' history tools remain separate scoped sources, not a new archive or
memory store.

## Records and ownership

```text
SOUL.md
brainstorms/
ai-external-knowledge/README.md               generated outside-source index
knowledge/
  knowledge-manual.md                         complete managed core policy
  toolkit-manual.md                           supplied by project-init
  project.md                                 project facts and explicit permission settings
  memory-inbox.md                             exact pending proposals/unfinished saves
  memory-self-improvement.md                  project selection feedback
  memory/
    current.md                               shared work and requested Session handoffs
    memory-index.md                          generated topic index
    memory-entries/
      terminology-glossary.md                term table, excluded from topic index
      <topic>.md                             coherent topic or approved subtopic folder
  prds/
    prd-index.md                             generated requirements index
    <area>.md                                required behavior and approval
```

The managed source is
`skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md`.
Templates and migration live with knowledge-setup. Memory has topic-level evidence
and permission; automatic saving remains explicitly opt-in and memory-only.
A finalized PRD means approved requirements, not delivery. The tracker owns work
status, designs own technical choices, and captured sources retain their origin.

## External memory mode

A project can keep memory in a memory service (mem0 or Hindsight) instead of
`knowledge/`. `.toolkit-memory.json` at the project root sets the mode; no file
means `files` mode, the layout above. In `external` mode:

- Working memory, lasting memory, pending saves, and selection feedback are
  records in the service, reached through its MCP server.
- `PROJECT.md`, `docs/knowledge-manual.md`, `docs/toolkit-manual.md`, and
  `prds/` stay in Git. There is no `knowledge/` folder.
- The same four procedures, selection rules, and approval cards apply. Only
  `knowledge-save` writes records, and a save counts only when the read back
  matches the approved text exactly.
- The service's own Claude Code and Codex plugins are never installed, because
  they save automatically.
- Moving an existing project between modes is not supported.

The [memory providers](skills/knowledge-setup/references/memory-providers/README.md)
reference holds the contract and one adapter per service
([mem0](skills/knowledge-setup/references/memory-providers/mem0.md),
[Hindsight](skills/knowledge-setup/references/memory-providers/hindsight.md)).

An enabled System Guide uses `.system-guide.json` and its own configured path,
writer and index. This plugin preserves that component and reports only its off
state. Memory/PRDs are never fallback stores for a missing or disabled Guide.
Inspect native host memory conflicts without silently changing settings or data.

## Runtime and checks

Canonical hooks copied into `.claude/hooks/`:

- `hooks/knowledge-session-start.mjs`: lists the three startup reads in order
  (SOUL, project, current work) and the inbox check. It asks for no
  acknowledgment. The manual and indexes are opened by the skills, not at startup.
- `hooks/knowledge-manual.mjs`: shared read-only manual discovery and conflict checks.
- `hooks/memory-reminder.mjs`: short per-message reminder to save settled
  decisions through `knowledge-save`, plus the turn-review command.
- `hooks/knowledge-completion.mjs`: temporary project/session/agent review
  generation, explicit outcome and at most one corrective Stop continuation.
- `hooks/save-reminder.mjs`, `hooks/work-item-close.mjs`,
  `hooks/command-parsing.mjs`: reminders on recognized PR/close commands. A
  matching action is held once per session and named in the denial; a plain
  retry of the same command is then allowed. The hold is not proof of judgment
  or universal tool coverage.

Tools copied into `.claude/tools/`:

- `tools/build-knowledge-index.mjs`: three deterministic grouped link indexes.
- `tools/check-knowledge.mjs`: read-only layout, fields, links, limits, managed
  manual and common-secret checks. Valid metadata proves neither truth nor consent.
- `tools/frontmatter.mjs`: the shared metadata parser.
- `tools/inspect-knowledge-save.mjs`: read-only current local/remote evidence for
  an existing pending UUID. It never applies a destination change or approves it.

Installed into the clone's Git hooks folder, not copied into `.claude/tools/`:

- `tools/knowledge-pre-commit.sh`: the Git pre-commit hook. A commit that
  changes `knowledge/`, `SOUL.md` or `ai-external-knowledge/` (in `external`
  mode also `prds/`, `PROJECT.md`, `docs/knowledge-manual.md` or
  `.toolkit-memory.json`) copies the staged knowledge paths, checks links against
  the staged Git path list, and refuses a commit when the checker fails. It does
  not copy unrelated tracked project files. Install steps:
  [delivery](skills/knowledge-setup/references/delivery.md), "Commit-time check".

Run the index builder then the checker after authorized knowledge changes.
Save execution reads back actual meaning and verifies publication on the actual
default branch before reporting completion. The single inbox preserves exact
scope and authority before helper dispatch. Retry checks existing effect and
current remote first; published content and pending cleanup are separate facts.

Temporary completion files hold only generation/outcome facts, and the shared
action-hold file only the actions already held, outside the repository. They
contain no knowledge, transcripts, permission or pending saves.
Receipts record declarations, not understanding. Missing hooks, trust settings,
unsupported tools or unavailable host evidence limit claims; they never silently
waive a requirement. Foreground save fallback uses unchanged authorization when
parallel helpers are unavailable.

## Verification and maintenance

`tests/save-recovery.test.mjs` exercises real disposable local Git repositories;
`tests/checkpoints.test.mjs` covers bounded continuation and stale/helper receipts.
`tests/action-checkpoints.test.mjs` covers action identities, the once-per-session
hold and its plain retry, compound close/merge commands and hook entry points.
`tests/new-install.test.mjs` assembles an empty project and runs the copied
startup, prompt, completion and review commands from a nested working directory.
`tests/external-memory.test.mjs` covers the `external` memory mode: the config,
startup text for mem0 and Hindsight, reminders, and the copied hooks.
`tests/pre-commit.test.mjs` installs the Git pre-commit hook in fixture
repositories and a linked worktree, and checks the `--no-verify` deny rules.
These deterministic checks do not replace fresh-agent meaning/host tests.
Repository tests also check links, discovery, installed copies and startup.
Current delivery evidence is in the #269 work record and its linked implementation
evidence. Report CLI, desktop, actual agent behavior and unavailable targets
separately. Do not call a half-installed project equipped.

Update both plugin manifests, marketplace metadata, catalogs, managed manual,
installed copies and setup routes together. Legacy detection is compatibility,
not automatic conversion authority. Preserve knowledge and pending permissions
through migration/rollback. Optional Obsidian settings remain ordinary portable
Markdown links. In `files` mode no database, extraction service or parallel
memory store is used; `external` mode uses its one memory service instead of
the memory files, never beside them.
