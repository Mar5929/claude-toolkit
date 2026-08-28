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
| `keep-claudemd-current.md` | What `CLAUDE.md` and `AGENTS.md` are for: carry the few things an agent must know before it acts, and route it to where everything in the repository lives. The codemap names the context sources too. Three tests keep the rest out. Update the file before a session ends whenever it surfaces a new path, convention, decision, or workflow, and prune while you are in there. `AGENTS.md` is a short pointer file, not a second copy. |
| `honest-verification.md` | Do not claim more than you verified. Report failures with their output. |
| `parallel-agent-sessions.md` | Sharing a repo with other live sessions: look before you edit, work in your own worktree and branch, never `git add -A`, land by pull request. |
| `knowledge-direct-commit.md` | A save that touches only `knowledge/` commits straight to the default branch. No worktree, no pull request. The owner-approved exception to `parallel-agent-sessions.md`; the knowledge manual still decides what may be saved. |
| `recommend-the-best-solution.md` | Propose the well-built solution and name the quick-patch tradeoff, and do not build more than was asked. |
| `follow-the-output-style.md` | A helper agent never sees an output style, so anything it writes that the owner reads goes and reads the style file first. |
| `ask-before-assuming.md` | Ask one specific question when intent or scope is ambiguous, and state the rough scope before an operation that reads or produces a lot. |
| `offer-context-handoff.md` | When context is heavy and the next step is reasoning-heavy, offer a self-contained handoff prompt, after running the memory check. |
| `do-the-technical-work.md` | Do the git, config, and file work yourself. Hand over only the steps that are genuinely only-the-owner's. |
| `spec-before-you-build.md` | Every piece of work is logged in the tracker before it is built, and nothing is built until a refinement session has filled in the six-part spec. `CLAUDE.md` names the tracker. |
| `project-file-lifecycle.md` | Give project information one lasting authoritative home. Work items track the work, current architecture stays in its architecture area, deliverables hold only presentations and high-level summaries, and completing a work item does not archive current project truth. |
| `ai-external-knowledge.md` | Outside documentation captured for agents (vendor docs, API references, framework guides) goes in `ai-external-knowledge/` at the project root, one folder per topic, each naming its source URL and capture date. It stays raw source material, and nothing reads it unless a rule, a skill, or persistent knowledge points at a topic. |
| `track-open-topics.md` | Keep every still-open topic in the session on Claude Code's built-in task list, from the moment a second one appears. Parked topics, unanswered questions, and blocked work all stay visible, and the list dying with the session is said out loud. |

## Rules this repo deliberately does not carry

| File | Why not |
|---|---|
| `second-brain.md` | It belonged to the retired large second-brain system. The managed `knowledge/README.md`, short root fallback, and task-specific skills replace it. |
| `wrap-up-ritual.md` | It belonged to the retired save ritual and invoked the deleted verifier. The current policy names the natural save moments, and `.claude/hooks/save-reminder.mjs` raises the pull-request moment that is easy to miss. |
| `work-item-folders.md` | It governs the local work-tracker, one flat item folder under Git-ignored `.work-items/`. Work here is tracked on the `Claude-Toolkit-Project` board on GitHub, so there are no local work-item folders for the rule to govern. |
| `dependency-graph.md` | It is conditional on a code graph being installed. No graph is installed here, and the graphify kit was considered and declined. |

`keep-claudemd-current.md` owns the small exception to its normal anti-copying
rule: `CLAUDE.md` and `AGENTS.md` carry the same short project knowledge route.
The runtime policy stays in `knowledge/README.md`; the root files do not copy it.

`.claude/toolkit-sync.md` holds the same record, along with everything else that
was set up, skipped, or declined.

## Voice is not a rule

How Claude writes lives in `.claude/output-styles/plain-language.md`, which is
selected in `.claude/settings.json` and delivered in the system prompt. Do not
add a writing rule to this folder. If Claude should say something differently,
the change goes in the output style, and in the library copy at
`plugins/project-init/library/output-styles/plain-language.md` in the same
change.

This repo used to reinforce the style with two hooks. `writing-guard` refused a
finished reply containing an em dash or a section sign; the owner turned it off
here on 2026-08-06 because the refused reply was already on his screen, so he
read the same answer twice. `style-reminder` re-stated the style on every
message; the owner removed it later that month as per-message overhead for an
instruction the harness already re-delivers. The toolkit no longer ships either
hook, and `.claude/toolkit-sync.md` records the history.
