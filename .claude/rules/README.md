# Rules this repo runs

Every `.md` file in this folder is loaded at the start of a Claude Code session
and is in force for the whole session. Codex does not load them automatically,
which is why `AGENTS.md` tells a Codex session to open this folder and read them.

These are copies. The originals live in
`plugins/project-init/library/rules/general/`, which is what every other toolkit
project receives. This repo runs them unmodified so a change is felt where it is
written. `tests/installed-copy-check.mjs` fails when an original and its copy
here stop matching. A rule this repo should stop following is dropped from this
folder rather than edited, because editing the copy would mean editing what
every other project receives.

## What each file does

| File | What it does |
|---|---|
| `keep-claudemd-current.md` | What `CLAUDE.md` and `AGENTS.md` are for: carry what an agent must know before it acts, and route it to where things live. Three tests keep other lines out. Covers folder `CLAUDE.md` files and why `AGENTS.md` is a pointer, not a copy. |
| `parallel-agent-sessions.md` | Sharing a repo with other live sessions: look before you edit, work in your own worktree and branch, never `git add -A`, land by pull request. |
| `knowledge-direct-commit.md` | A save that touches only `knowledge/` commits straight to the default branch. No worktree, no pull request. The owner-approved exception to `parallel-agent-sessions.md`; the knowledge manual still decides what may be saved. |
| `recommend-the-best-solution.md` | Propose the well-built solution and name the quick-patch tradeoff, and do not build more than was asked. |
| `follow-the-output-style.md` | A helper agent never sees an output style, so anything it writes that the owner reads goes and reads the style file first. |
| `ask-before-assuming.md` | Ask one specific question when intent or scope is ambiguous, and state the rough scope before an operation that reads or produces a lot. |
| `offer-context-handoff.md` | When context is heavy and the next step is reasoning-heavy, offer a self-contained handoff prompt, after running the memory check. |
| `project-file-lifecycle.md` | Give each kind of project information one lasting home, and do not archive current truth just because a work item closed. |
| `ai-external-knowledge.md` | Outside documentation captured for agents (vendor docs, API references, framework guides) goes in `ai-external-knowledge/` at the project root, one folder per topic, each naming its source URL and capture date. It stays raw source material, and nothing reads it unless a rule, a skill, or persistent knowledge points at a topic. |

## Rules this repo deliberately does not carry

| File | Why not |
|---|---|
| `second-brain.md` | It belonged to the retired large second-brain system. The managed `knowledge/README.md`, short root fallback, and task-specific skills replace it. |
| `wrap-up-ritual.md` | It belonged to the retired save ritual and invoked the deleted verifier. The current policy names the natural save moments, and `.claude/hooks/save-reminder.mjs` raises the pull-request moment that is easy to miss. |
| `work-item-folders.md` | It governs the local work-tracker, one flat item folder under Git-ignored `.work-items/`. Work here is tracked on the `Claude-Toolkit-Project` board on GitHub, so there are no local work-item folders for the rule to govern. |
| `dependency-graph.md` | It is conditional on a code graph being installed. No graph is installed here, and the graphify kit was considered and declined. |
| `honest-verification.md` | Dropped by the owner on 2026-08-31, in the same pass that cut the rule set roughly in half. The toolkit still ships it to other projects as default ON. |
| `do-the-technical-work.md` | Dropped by the owner on 2026-08-31, in the same pass. The toolkit still ships it to other projects as default ON. |

`keep-claudemd-current.md` owns the small exception to its normal anti-copying
rule: `CLAUDE.md` and `AGENTS.md` carry the same short project knowledge route.
The runtime policy stays in `knowledge/README.md`; the root files do not copy it.

`.claude/toolkit-sync.md` holds the same record, along with everything else that
was set up, skipped, or declined.

## Voice is not a rule

How Claude writes here is Claude Code's built-in `Concise` style, selected as
`"outputStyle": "Concise"` in `.claude/settings.json` and delivered in the
system prompt. It is a built-in, so there is no file in this repository to edit.
Do not add a writing rule to this folder. A different voice means changing that
one settings value, or writing a project-specific style file, and neither is a
rule.

This repo shipped a hand-written `plain-language` style until issue #245, which
removed it from the toolkit and switched every project to the built-in. The
history is in `.claude/toolkit-sync.md`.

This repo used to reinforce the style with two hooks. `writing-guard` refused a
finished reply containing an em dash or a section sign; the owner turned it off
here on 2026-08-06 because the refused reply was already on his screen, so he
read the same answer twice. `style-reminder` re-stated the style on every
message; the owner removed it later that month as per-message overhead for an
instruction the harness already re-delivers. The toolkit no longer ships either
hook, and `.claude/toolkit-sync.md` records the history.
