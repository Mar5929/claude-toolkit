Always execute work with the context in mind that the user will likely continue work across multiple AI coding sessions where the session context is cleared and picked up again. You must assist the user in helping establish that continuity across sessions while not adding context that might pollute future agents and skew them. Information must be curated and intentional.

# AGENTS.md: working in claude-toolkit

Mike's single source of truth for the reusable pieces he wants in every project,
packaged as a Claude Code plugin marketplace. `README.md` has the full picture.

Read `.claude/rules` first. Every file in that folder is a rule for how you work
here, and they are in force for the whole session.

## Toolkit orientation

Read [knowledge/toolkit-manual.md](knowledge/toolkit-manual.md) completely before
work, including after resume, clear, or compaction. Startup supplies a short
read route, not the manual's content. If a file read is truncated, continue in
chunks until complete. Report missing guidance rather than claiming readiness;
after reading, briefly acknowledge receipt and intent to follow the workflows.
This root route also applies when hooks are unavailable. Component instructions
remain with their owners; optional components are not enabled by this manual.

## Project knowledge

Read `SOUL.md`, `knowledge/project.md`, `knowledge/knowledge-manual.md`,
`knowledge/memory/current.md`, `knowledge/memory/memory-index.md`, and
`knowledge/prds/prd-index.md` completely in that order after Toolkit orientation.
Continue truncated reads in chunks. Check relevant `knowledge/memory-inbox.md`
entries for pending work. The manual maps the glossary, external index and four
focused skills. Restore required guidance after resume, clear or compaction;
this root route applies when hooks are unavailable. Report missing or conflicting
required guidance before claiming readiness. The managed Knowledge manual owns
knowledge policy; indexes are maps, not source evidence.

## Codemap

| Path | What is there, and when to open it |
| --- | --- |
| `plugins/` | The eight plugins this repo ships, plus `project-init/library/`, the material other projects receive, and `project-init/machine/`, the material every computer receives. Open before changing anything the toolkit ships. Detail: `plugins/AGENTS.md`. |
| `docs/toolkit-map.md` | The cross-cutting catalog: what every plugin and skill is, how they relate, and what looks redundant but is not. Open it to answer "does this already exist somewhere?". Detail: `docs/AGENTS.md`. |
| `docs/designs/` | The build plan for one work item: how each approved requirement is met, which files change, how it is tested, in what order. One file per issue, written at stage `04` and deleted at stage `14`. Open it when building or reviewing that item. Detail: `docs/designs/README.md`. |
| `.claude-plugin/marketplace.json` | Registers every plugin for Claude Code. `.agents/plugins/marketplace.json` does the same for Codex. Update both when adding or renaming a plugin. |
| `knowledge/` | What this project decided and why: PRDs, memory, current state; root `brainstorms/` holds unchecked exploration. A PRD is one living document per feature area, holding its requirements first and its settled behavior after the build. The routing table in `knowledge/knowledge-manual.md` says which goes where. |
| `.claude/rules/knowledge-direct-commit.md` | Publication route for authorized documentation updates in `knowledge/`, `docs/`, and README files; defines eligibility, checks, and the implementation boundary. |
| `tests/` | Four Node checks, run by hand before every pull request. Detail: `tests/AGENTS.md`. |
| `.claude/` | What this repo runs on itself: the rule copies, installed hooks and tools, settings, and the setup record in `toolkit-sync.md`. |
| `ai-external-knowledge/claude-code/` | The official Claude Code documentation, captured as Markdown. Open the page that covers a hook, skill, plugin, agent, command, output style, or setting before building or changing one. `.claude/rules/claude-code-docs-first.md` says when. Index and refresh steps: `ai-external-knowledge/claude-code/README.md`. |
| `ai-external-knowledge/codex/` | The captured Codex AGENTS.md page. Open it before changing anything about how Codex reads instruction files. |
| `archive/` | Retired material kept for history. Never a source of current truth. |

This repo runs the toolkit on itself, so most files under `.claude/` are copies
of files it also ships. Change the shipped original, not the copy.

## Tools

| Tool | Use it for | Detail |
| --- | --- | --- |
| `node tests/link-check.mjs`, `tests/orphan-check.mjs`, `tests/installed-copy-check.mjs`, `tests/knowledge-startup-check.mjs` | The four checks. Run all four before every pull request. | `tests/AGENTS.md` |
| `claude plugin validate .` | Must pass, because `main` is what every machine installs from. | `plugins/AGENTS.md` |
| `node .claude/tools/build-knowledge-index.mjs` | Rebuilding the three generated knowledge indexes. Run it again after bringing a branch current: Git merges generated files with no reported conflict and still leaves them wrong. | `knowledge/knowledge-manual.md` |
| `gh` (GitHub CLI) | Reading and writing issues on the board named below. | |
| `/project-sync` and `/machine-sync` | Rolling a merged change into a project, or onto a computer. Pushing to GitHub propagates nothing on its own. | `plugins/project-init/README.md` |

## Quick saves

| Path | How updates land | Instructions |
| --- | --- | --- |
| Project documentation in `knowledge/`, `docs/`, and README files | Authorized documentation-only updates use the direct publication route. | `.claude/rules/knowledge-direct-commit.md` |
| `knowledge/` | Follow the knowledge manual for content approval, then the documentation publication route. | `knowledge/knowledge-manual.md` and `.claude/rules/knowledge-direct-commit.md` |

## Where work is tracked

The `Claude-Toolkit-Project` board on GitHub, connected to this repository.

- The issue body is where the work currently stands: the goal, why it matters,
  what has to be true for it to count as finished, and everything settled
  since. A new session reads the body and knows the state without reading the
  comments.
- PRD and design refinement stays in those documents: update their actual text
  and bottom Notes, then link them from the issue. Other decisions and tasks
  stay in the work item. Record overall approval state there without copying
  document discussion or its detailed remaining work.
- Comments hold the other working record and concise overall progress.
  Document-specific discussion and resume points stay in that document's Notes.
  Use links instead of repeating the same detail in both places.
- An issue carries one stage label from the fourteen in
  `.claude/rules/work-item-stages.md`, and one comment titled "Progress log"
  that is edited in place. Build and data-load work require recorded requirements
  approval. `03-requirements-approved` marks that gate when reached; later stages
  show current position and do not revoke the approval. Check the recorded
  approval when resuming; a stage label alone does not establish it. The old
  `refined` label meant the approval stage and is retired.
- Worktrees are siblings of the primary checkout, named
  `claude-toolkit-<issue number>`, on a branch named `issue-<number>-<slug>`.
