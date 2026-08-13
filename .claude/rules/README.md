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
| `capture-the-thinking.md` | Never leave the thinking only in chat. The goal, the requirements, the edge cases, the decisions, and the open questions get written into their canonical home while the work happens. |
| `keep-claudemd-current.md` | Update `CLAUDE.md` before a session ends whenever it surfaces a new path, convention, decision, or workflow. Prune while you are in there. |
| `honest-verification.md` | Do not claim more than you verified. Report failures with their output. |
| `parallel-agent-sessions.md` | Sharing a repo with other live sessions: look before you edit, work in your own worktree and branch, never `git add -A`, land by pull request. |
| `recommend-the-best-solution.md` | Propose the well-built solution and name the quick-patch tradeoff, and do not build more than was asked. |
| `follow-the-output-style.md` | A helper agent never sees an output style, so anything it writes that the owner reads goes and reads the style file first. |
| `ask-before-assuming.md` | Ask one specific question when intent or scope is ambiguous, and state the rough scope before an operation that reads or produces a lot. |
| `offer-context-handoff.md` | When context is heavy and the next step is reasoning-heavy, offer a self-contained handoff prompt, after running the memory check. |
| `steer-to-the-goal.md` | Find the real goal, name it early, hold it all session, push back when a request is aimed at the wrong target, and end every turn with the next step. |
| `do-the-technical-work.md` | Do the git, config, and file work yourself. Hand over only the steps that are genuinely only-the-owner's. |
| `spec-before-you-build.md` | Every piece of work is logged in the tracker before it is built, and nothing is built until a refinement session has filled in the six-part spec. `CLAUDE.md` names the tracker. |
| `show-phase-progress.md` | When work splits into phases, print a one-line progress bar at every transition. |
| `track-open-topics.md` | Keep every still-open topic in the session on Claude Code's built-in task list, from the moment a second one appears. Parked topics, unanswered questions, and blocked work all stay visible, and the list dying with the session is said out loud. |

## Rules this repo deliberately does not carry

| File | Why not |
|---|---|
| `second-brain.md` | It belonged to the retired large second-brain system. The short route in `CLAUDE.md` and `AGENTS.md`, the policy in `knowledge/specs/memory-system.md`, and the packaged `remember`, `recall`, and `cleanup` skills replace it without loading the full policy every session. |
| `wrap-up-ritual.md` | It belonged to the retired save ritual and invoked the deleted verifier. The current policy names the natural save moments, and `.claude/hooks/save-reminder.mjs` raises the pull-request moment that is easy to miss. |
| `work-item-folders.md` | It governs the Git-native work-tracker, one folder per work item in the repository. Work here is tracked on the `Claude-Toolkit-Project` board on GitHub, so there are no work-item folders for the rule to govern. |
| `dependency-graph.md` | It is conditional on a code graph being installed. No graph is installed here, and the graphify kit was considered and declined. |

`keep-claudemd-current.md` owns the small exception to its normal anti-copying
rule: `CLAUDE.md` and `AGENTS.md` carry the same short project knowledge route.
The full policy stays in `knowledge/specs/memory-system.md`; the root files do
not copy it.

`.claude/toolkit-sync.md` holds the same record, along with everything else that
was set up, skipped, or declined.

## Voice is not a rule

How Claude writes lives in `.claude/output-styles/plain-language.md`, which is
selected in `.claude/settings.json` and re-stated every message by the
`style-reminder` hook. Do not add a writing rule to this folder. If Claude
should say something differently, the change goes in the output style, and in
the library copy at
`plugins/project-init/library/output-styles/plain-language.md` in the same
change.

The `writing-guard` hook, which refused a finished reply containing an em dash
or a section sign, is not run here any more. It worked, and the owner removed
it on 2026-08-06 because of what refusing costs him: the refused reply is
already on his screen when the hook fires, so the agent rewrites and he reads
the same answer twice. That is the whole trade. The reminder every message is
now the only thing holding the style, so follow it without being caught. The
toolkit still ships the hook, and `.claude/toolkit-sync.md` records that this
repository turned it off and why.
