Always execute work with the context in mind that the user will likely continue work across multiple AI coding sessions where the session context is cleared and picked up again. You must assist the user in helping establish that continuity across sessions while not adding context that might pollute future agents and skew them. Information must be curated and intentional.

# AGENTS.md: working in claude-toolkit

Mike's single source of truth for the reusable pieces he wants in every project,
packaged as a Claude Code plugin marketplace. `README.md` has the full picture.

Read `.claude/rules` first. Every rule there is in force for the whole session.

## Startup

- Read `SOUL.md`, `knowledge/project.md`, and `knowledge/memory/current.md`.
- Check `knowledge/memory-inbox.md` for unfinished saves.
- Read the three files again after resume, clear, or compaction.
- Procedures live in skills. The manuals in `knowledge/` are reference: open a
  section when a task needs it.

## Path-scoped rules

Claude Code loads these when a matching file is read. Codex: open the rule
before working on a matching path.

- `knowledge/**`, `docs/**`, `**/README.md`: `.claude/rules/knowledge-direct-commit.md`
- `ai-external-knowledge/**`: `.claude/rules/ai-external-knowledge.md`

## Codemap

| Path | What is there, and when to open it |
| --- | --- |
| `plugins/` | The eight plugins this repo ships. `project-init/library/` holds what other projects receive; `project-init/machine/` holds what every computer receives. Open before changing anything shipped. Detail: `plugins/AGENTS.md`. |
| `docs/toolkit-map.md` | Catalog of every plugin and skill and how they relate. Open it to check whether something already exists. Detail: `docs/AGENTS.md`. |
| `docs/designs/` | One build plan per work item: how each approved requirement is met. Written at stage `04`, deleted at stage `14`. Detail: `docs/designs/README.md`. |
| `.claude-plugin/marketplace.json` | Registers every plugin for Claude Code. `.agents/plugins/marketplace.json` does the same for Codex. Update both when adding or renaming a plugin. |
| `knowledge/` | Decisions and reasons: PRDs, memory, current state. Root `brainstorms/` holds unchecked exploration. The routing table in `knowledge/knowledge-manual.md` says what goes where. |
| `tests/` | Node checks, run by hand before every pull request. Detail: `tests/AGENTS.md`. |
| `.claude/` | What this repo runs on itself: rule copies, hooks, tools, settings. `.claude/RULES.md` indexes the rules. `toolkit-sync.md` records the setup. |
| `ai-external-knowledge/claude-code/` | Official Claude Code documentation as Markdown. Open the page for a hook, skill, plugin, agent, command, output style, or setting before building one. Index: its `README.md`. |
| `ai-external-knowledge/codex/` | The Codex AGENTS.md page. Open it before changing how Codex reads instruction files. |
| `archive/` | Retired material. Never a source of current truth. |

Most files under `.claude/` are copies of shipped files. Change the shipped
original, not the copy.

## Tools

| Tool | Use it for | Detail |
| --- | --- | --- |
| `node tests/link-check.mjs`, `orphan-check.mjs`, `installed-copy-check.mjs`, `knowledge-startup-check.mjs`, `skill-copy-check.mjs`, `startup-budget-check.mjs` | Checks to run before every pull request. | `tests/AGENTS.md` |
| `claude plugin validate .` | Must pass: every machine installs from `main`. | `plugins/AGENTS.md` |
| `node .claude/tools/build-knowledge-index.mjs` | Rebuild the three generated knowledge indexes. Run it again after bringing a branch current: Git merges generated files without a conflict and leaves them wrong. | `knowledge/knowledge-manual.md` |
| `gh` (GitHub CLI) | Read and write issues on the board below. | |
| `/project-sync`, `/machine-sync` | Roll a merged change into a project or onto a computer. A push alone propagates nothing. | `plugins/project-init/README.md` |

## Quick saves

| Path | How updates land | Instructions |
| --- | --- | --- |
| `knowledge/`, `docs/`, README files | Authorized documentation-only updates go straight to the default branch. | `.claude/rules/knowledge-direct-commit.md` and the `publish-docs` skill |
| `knowledge/` | Content approval follows the knowledge manual, then the route above. | `knowledge/knowledge-manual.md` and the `knowledge-save` skill |

## Where work is tracked

The `Claude-Toolkit-Project` board on GitHub, connected to this repository.

- The issue body holds the current state: goal, reason, done conditions, and
  settled decisions. A new session reads the body, not the comments.
- PRD and design refinement stays in those documents: their text and bottom
  Notes. Link them from the issue.
- One comment titled "Progress log", edited in place, holds concise progress.
- One stage label from the fourteen in the `work` skill's
  `references/lifecycle.md`. The retired `refined` label meant
  `03-requirements-approved`.
- Build and data-load work need recorded requirements approval. A later stage
  label does not revoke it. A stage label alone does not prove it: check the
  recorded approval.
- Worktrees are siblings of the primary checkout, named
  `claude-toolkit-<issue number>`, on a branch named `issue-<number>-<slug>`.
