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

## Rules this repo deliberately does not carry

| File | Why not |
|---|---|
| `second-brain.md` | It is the memory rule for second-brain v3, which this repo replaced in August 2026 with the system in `specs/memory-system.md`. The four always-loaded lines in `CLAUDE.md` and `AGENTS.md` and the `remember`, `recall`, and `cleanup` skills under `.claude/skills/` do that job now. Other projects still run second-brain v3, so the toolkit still ships it. |
| `wrap-up-ritual.md` | Same reason. It is the second-brain v3 save ritual, and it tells the session to invoke the `memory-verifier` agent, which this repo no longer has. `specs/memory-system.md` names the three moments a save runs, and `.claude/hooks/save-reminder.mjs` raises the one that is easy to miss. |
| `work-item-folders.md` | It governs the Git-native work-tracker, one folder per work item in the repository. Work here is tracked on the `Claude-Toolkit-Project` board on GitHub, so there are no work-item folders for the rule to govern. |
| `dependency-graph.md` | It is conditional on a code graph being installed. No graph is installed here, and the graphify kit was considered and declined. |

One section of a rule this repo does carry is dead here.
`keep-claudemd-current.md` has a section called "The memory section: keep all
three copies in step", about copying second-brain v3's routing into `CLAUDE.md`
and `AGENTS.md` from the second-brain plugin's `orientation-snippet.md`. There
are no three copies here any more, and no `host-specific` passage. Ignore that
section and the sentences around it that mention the memory verifier. Everything
else in that file still holds, including the size limit on `AGENTS.md`.

`.claude/toolkit-sync.md` holds the same record, along with everything else that
was set up, skipped, or declined.

## Voice is not a rule

How Claude writes lives in `.claude/output-styles/plain-language.md`, which is
selected in `.claude/settings.json`, re-stated every message by the
`style-reminder` hook, and checked on the finished reply by the `writing-guard`
hook. Do not add a writing rule to this folder. If Claude should say something
differently, the change goes in the output style, and in the library copy at
`plugins/project-init/library/output-styles/plain-language.md` in the same
change.
