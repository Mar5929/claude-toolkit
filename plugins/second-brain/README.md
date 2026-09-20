# second-brain plugin

Project knowledge in shared Markdown and Git. One core manual is read completely
at startup; four focused procedures supply operation details when needed. The
agent chooses useful information and respects the permission for its destination.

Install with `/plugin install second-brain`, then request project setup through
`knowledge-setup`, project-init or project-sync. Installing source on a machine
alone does not equip a project. Setup is opt-in and preserves owner content.

## Four procedures

| Procedure | When to use it |
| --- | --- |
| [knowledge-find](skills/knowledge-find/SKILL.md) | Find relevant project evidence, resolve conflicts, or recover available history. |
| [knowledge-save](skills/knowledge-save/SKILL.md) | Select/propose/save, maintain topic records, or recover an interrupted save. |
| [knowledge-review](skills/knowledge-review/SKILL.md) | Review duplicates, contradictions, obsolete material and selection feedback. |
| [knowledge-setup](skills/knowledge-setup/SKILL.md) | Detect, install, migrate, repair and verify a complete project package. |

Old command entry points are explicit-only compatibility routes with no separate
policy: [recall](skills/recall/SKILL.md), [remember](skills/remember/SKILL.md),
[retire](skills/retire/SKILL.md), [reflect](skills/reflect/SKILL.md),
[session-search](skills/session-search/SKILL.md), and
[second-brain](skills/second-brain/SKILL.md). New integrations use the four names.
The read-only history adapter is
`skills/knowledge-find/scripts/search-sessions.mjs`; available host history tools
remain separate scoped sources, not a new archive or memory store.

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

An enabled System Guide uses `.system-guide.json` and its own configured path,
writer and index. This plugin preserves that component and reports only its off
state. Memory/PRDs are never fallback stores for a missing or disabled Guide.
Inspect native host memory conflicts without silently changing settings or data.

## Runtime and checks

Canonical hooks copied into `.claude/hooks/`:

- `hooks/knowledge-session-start.mjs`: bounded complete-read route, using the
  Toolkit loader delivered by project-init. Order: SOUL, project, Knowledge
  manual, current work and map; relevant inbox entries are checked on recovery.
- `hooks/knowledge-manual.mjs`: shared read-only manual discovery and conflict checks.
- `hooks/memory-reminder.mjs`: shared prompt criteria and explicit intent request.
- `hooks/knowledge-completion.mjs`: temporary project/session/agent review
  generation, explicit outcome and at most one corrective Stop continuation.
- `hooks/save-reminder.mjs`, `hooks/work-item-close.mjs`,
  `hooks/command-parsing.mjs`: reminders on recognized PR/close commands. A
  matching action needs its own declared review outcome; one exact retry consumes
  that receipt. The receipt is not proof of judgment or universal tool coverage.

Tools copied into `.claude/tools/`:

- `tools/build-knowledge-index.mjs`: three deterministic grouped link indexes.
- `tools/check-knowledge.mjs`: read-only layout, fields, links, limits, managed
  manual and common-secret checks. Valid metadata proves neither truth nor consent.
- `tools/frontmatter.mjs`: the shared metadata parser.
- `tools/inspect-knowledge-save.mjs`: read-only current local/remote evidence for
  an existing pending UUID. It never applies a destination change or approves it.

Run the index builder then the checker after authorized knowledge changes.
Save execution reads back actual meaning and verifies publication on the actual
default branch before reporting completion. The single inbox preserves exact
scope and authority before helper dispatch. Retry checks existing effect and
current remote first; published content and pending cleanup are separate facts.

Temporary completion files hold only generation/outcome/retry facts outside the
repository. They contain no knowledge, transcripts, permission or pending saves.
Receipts record declarations, not understanding. Missing hooks, trust settings,
unsupported tools or unavailable host evidence limit claims; they never silently
waive a requirement. Foreground save fallback uses unchanged authorization when
parallel helpers are unavailable.

## Verification and maintenance

`tests/save-recovery.test.mjs` exercises real disposable local Git repositories;
`tests/checkpoints.test.mjs` covers bounded continuation and stale/helper receipts.
`tests/action-checkpoints.test.mjs` covers action identities, one-use receipts,
concurrent retries, compound close/merge commands and hook entry points.
`tests/new-install.test.mjs` assembles an empty project and runs the copied
startup, prompt, completion and review commands from a nested working directory.
These deterministic checks do not replace fresh-agent meaning/host tests.
Repository tests also check links, discovery, installed copies and startup.
Current delivery evidence is in the #269 work record and its linked implementation
evidence. Report CLI, desktop, actual agent behavior and unavailable targets
separately. Do not call a half-installed project equipped.

Update both plugin manifests, marketplace metadata, catalogs, managed manual,
installed copies and setup routes together. Legacy detection is compatibility,
not automatic conversion authority. Preserve knowledge and pending permissions
through migration/rollback. Optional Obsidian settings remain ordinary portable
Markdown links; no database, extraction service or parallel memory store is used.
