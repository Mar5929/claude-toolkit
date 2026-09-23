# Rules this repo runs

This file indexes `.claude/rules/`. It sits outside that folder so it does not
load as a rule. Claude Code loads every `.md` file inside `.claude/rules/`: a
file with no `paths:` frontmatter at the start of every session, and a file
with `paths:` when the agent reads a matching file. Codex does not load the
folder. The line "Read `.claude/rules` first" in the root `AGENTS.md` sends a
Codex session there.

Almost all rules are copies. The originals live in
`plugins/project-init/library/rules/general/`, which every other toolkit
project receives. This repo runs them unmodified. `tests/installed-copy-check.mjs`
fails when an original and its copy stop matching. To stop following a rule
here, drop it from the folder. Do not edit the copy.

Four rules are this repo's own and are not shipped:
`claude-code-docs-first.md`, `subagents-run-on-opus.md`,
`keep-manuals-current.md`, and `standing-merge-instruction.md`. Each is listed
by name in `OWN_FILES` in `tests/installed-copy-check.mjs`. Add a repo-only
rule the same way, and only when it could not help another project.

## What each file does

| File | What it does |
|---|---|
| `parallel-agent-sessions.md` | Always loaded. Look-first commands, own worktree for implementation, no changes to the shared checkout, stage paths by name, claim numbers first, merge on approval (a standing instruction counts) with the merge-safety check. Documentation saves open `publish-docs`. |
| `knowledge-direct-commit.md` | Loads for `knowledge/**`, `docs/**`, and `**/README.md`. Authorized documentation-only changes commit straight to the default branch; behavior files use a worktree and pull request. The steps are in the `publish-docs` skill. |
| `offer-context-handoff.md` | When the session is long and the next step is complex, offer the `handoff` skill. |
| `plain-english-artifacts.md` | The words inside every diagram, chart, dashboard, visualization, slide deck, or generated document an agent makes follow the output style: about the subject only, headings that name what sits under them, the real name for every thing, plain wording. It decides the words, never the layout. Chat, code, README files, and issue text are not covered. |
| `humanize-outbound-text.md` | Any text that leaves the project for someone other than the owner (an email, a chat message, support case text, a GitHub issue, a pull request description, a client document, a file made to hand over) is run through the `humanizer` skill first, or `unslop` when that is not installed. Every fact, name, id, number, and date stays the same. Chat replies to the owner, work items, project knowledge, code, and commit messages are not covered. |
| `work-item-stages.md` | Six lines: open the `work` skill, save decisions, approval gate, team arrangement, Done needs approval, record the next step. The full policy is in the `work` skill's `references/lifecycle.md`. |
| `ai-external-knowledge.md` | Outside documentation captured for agents (vendor docs, API references, framework guides) goes in `ai-external-knowledge/` at the project root, one folder per topic, each naming its source URL and capture date. It stays raw source material, and nothing reads it unless a rule, a skill, or persistent knowledge points at a topic. |
| `claude-code-docs-first.md` | This repo's own rule, not shipped. Before building or changing a hook, skill, plugin, agent, command, output style, or setting, read the page that covers it in `ai-external-knowledge/claude-code/`. This is the pointer `ai-external-knowledge.md` asks for, aimed at the captured topics this repo has. |
| `subagents-run-on-opus.md` | This repo's own rule, not shipped. Claude Code subagents stay on Opus through two environment values. Codex selects models for helper agents and separately created tasks: an economical adequate model by default, and the most capable available model only for genuinely complex intellectual work. |
| `keep-manuals-current.md` | This repo's own rule, not shipped. Review both operating manuals for every finalized change and publish affected updates with delivery. Preserve subsystem ownership and the knowledge manual's managed source. |
| `standing-merge-instruction.md` | This repo's own rule, not shipped. Records the owner's 2026-09-21 standing instruction (decision D9): agents merge delivery-team pull requests after an independent review with no blocking findings and passing checks. A work item that reserves the merge for the owner overrides it. |

## Rules this repo deliberately does not carry

| File | Why not |
|---|---|
| `second-brain.md` | It belonged to the retired large second-brain system. The managed `knowledge/knowledge-manual.md`, short root fallback, and task-specific skills replace it. |
| `wrap-up-ritual.md` | It belonged to the retired save ritual and invoked the deleted verifier. The current policy names the natural save moments, and `.claude/hooks/save-reminder.mjs` raises the pull-request moment that is easy to miss. |
| `work-item-folders.md` | It governs the local work-tracker, one flat item folder under Git-ignored `.work-items/`. Work here is tracked on the `Claude-Toolkit-Project` board on GitHub, so there are no local work-item folders for the rule to govern. |
| `dependency-graph.md` | It is conditional on a code graph being installed. No graph is installed here, and the graphify kit was considered and declined. |
| `keep-claudemd-current.md` | The toolkit stopped shipping it on 2026-08-31. It spent words in every session on a file that `project-init` writes and `project-sync` audits. `plugins/project-init/skills/project-init/references/thin-agents-md.md` is now the only home for the instruction file structure, read at the moment the file is written. |
| `recommend-the-best-solution.md` | The owner removed it from the toolkit on 2026-09-02. |
| `follow-the-output-style.md` | The owner removed it from the toolkit on 2026-09-02. The copy this repo ran was dropped in the same change. |
| `ask-before-assuming.md` | The owner removed it from the toolkit on 2026-09-02. The copy this repo ran was dropped in the same change. |
| `project-file-lifecycle.md` | The owner removed it from the toolkit on 2026-09-02. |

`.claude/toolkit-sync.md` holds the same record, along with everything else that
was set up, skipped, or declined.

## Voice is not a rule

How Claude writes here is the `Plain English` style, selected as
`"outputStyle": "Plain English"` in `.claude/settings.json` and delivered in the
system prompt. The file is `.claude/output-styles/plain-english.md`, a copy of
what the toolkit ships in `plugins/project-init/library/output-styles/`, so a
change goes in the shipped original and `tests/installed-copy-check.mjs` keeps
the two matching. Do not add a writing rule to this folder. A different voice
means changing that one settings value or that one style file, and neither is a
rule. The one exception is `plain-english-artifacts.md`. It governs the words
inside the diagrams, charts, slides, and generated documents Claude makes, not
how Claude talks here, and it is a rule because the style never reaches a
helper agent, a Codex session, or a file.

`Plain English` is also the default for toolkit project setup and the only
style the toolkit ships. Deliberate owner selections of another style are
preserved. This repo previously ran Claude Code's built-in `Concise`, and the
older `plain-language` style before that. Those are history, recorded in
`.claude/toolkit-sync.md`, not current setup instructions.

This repo used to reinforce the style with two hooks. `writing-guard` refused a
finished reply containing an em dash or a section sign; the owner turned it off
here on 2026-08-06 because the refused reply was already on his screen, so he
read the same answer twice. `style-reminder` re-stated the style on every
message; the owner removed it later that month as per-message overhead for an
instruction the harness already re-delivers. The toolkit no longer ships either
hook, and `.claude/toolkit-sync.md` records the history.
