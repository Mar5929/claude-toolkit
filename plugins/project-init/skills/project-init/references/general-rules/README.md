# General project rules library

Reusable `.claude/rules/` files that the owner wants in every project,
regardless of stack. During `project-init` Gate 5 (CLAUDE.md), copy the selected
files into the new project's `.claude/rules/` folder, and write a thin CLAUDE.md
that points at that folder. Each rule is a standalone file, same model as the
`salesforce-rules/` library.

Keep the behavioral rules in these files, not inside CLAUDE.md. CLAUDE.md should
stay short: what the project is, its structural pointers (backlog, work-items,
deployment, toolkit port-back), which gates ran, and a line telling every
session to read `.claude/rules/`. See `../thin-claudemd.md` for the CLAUDE.md
structure Gate 5 writes.

## Default ON: copy into every project unless the owner opts out

| File | What it does |
|---|---|
| `capture-the-thinking.md` | Never leave the thinking only in chat. The goal, the why, the requirements, the edge cases and scenarios, the decisions, the open questions, and the constraints get written into their canonical home WHILE the work happens, not at the end. Also covers the durable facts that arrive outside any task (a role change, a tool swap, a standing preference, a correction, business language, a new canonical source), which no completion review would otherwise ask about. Carries the routing table (work item `SPEC.md`, `brainstorms/`, `specs/`, `memory/*`), the write-it-before-you-build step, and the vanished-chat test. Sits above `work-item-folders` (which owns the containers) and `wrap-up-ritual` (which owns the end-of-task review). |
| `keep-claudemd-current.md` | Update CLAUDE.md before a session ends whenever it surfaces a new path, convention, decision, or workflow. A slightly-too-full CLAUDE.md beats a stale one. Two-sided: also prune while you are in there, route detail to the design/status/memory layer, and keep the codemap one line per folder instead of a changelog. |
| `wrap-up-ritual.md` | At approved completion points, align specifications, code, and tests, propose durable memory updates, update the work-tracker handoff when relevant, and use the project's Git workflow. Unfinished handoffs do not trigger a memory review. |
| `stay-in-scope.md` | Do not expand beyond what was asked without checking first. Recommend, do not silently gold-plate. |
| `secrets-never-committed.md` | API keys and credentials live outside the repo. Never commit them; respect `.gitignore`; raise it if a secret would have to be committed. |
| `honest-verification.md` | Do not claim more than you verified. If it was not run or tested, say so and leave the steps. Report failures with output. |
| `worktree-isolation.md` | Assume other Claude sessions share the repo. Work in your own git worktree on your own branch, never in the shared checkout, and land work by PR. Merge only on owner approval, after a collision check. |
| `parallel-agent-sessions.md` | The behavioral half of sharing a repo, paired with `worktree-isolation` (which owns where you work). Look before you edit (`git worktree list`, `git status`, `git log`); never `git add -A`; shared index files are append-only; claim a sequential identifier by pushing it first, because parallel agents WILL collide on numbers; never commit another session's uncommitted work. Written after one session caused a work-item number collision, had its staged files swept into another session's commit twice, and reordered a shared backlog. |
| `writing-and-language.md` | Plain language everywhere: no em dashes, no section signs, no AI filler, calibrated to the owner. |
| `lead-with-the-answer.md` | Put the answer or action first. Cut preamble and closing summaries; keep needed detail. |
| `close-with-the-ask.md` | Spend no more words than the point needs, and put the owner's next action at the very end (or say plainly when nothing is needed). Carries the delete-it-and-see cut test, the named habits that actually make replies long, the rule that facts are never what you cut, and the shape default: bullets for anything reporting what happened, prose only when an idea does not survive being split. A repeated ask for fewer words is a hard constraint, not a preference. Builds on lead-with-the-answer and steer-to-the-goal. |
| `quiet-while-working.md` | Be quiet while working: at most one short line per chunk, silence when nothing changed, and the whole explanation saved for one final reply written as if the owner read nothing before it. Governs how many replies you write; `lead-with-the-answer` governs each one. |
| `answer-last-question-box.md` | Plain chat text never asks a question; real decisions go through the blocking question box. Run tools first, then one reply. |
| `solve-the-goal-push-back.md` | Work the real goal, not just the words. Push back on risky or misaimed requests with a better path; then do it the owner's way. |
| `recommend-the-best-solution.md` | Once the problem is clear, propose the well-architected, best-practice solution, not a band-aid. Recommend it and name the quick-patch tradeoff; once the owner decides, do it their way. |
| `define-your-terms.md` | Name the exact thing and define it on first use. No invented shorthand; no bare "option B" / "risk 1". |
| `ask-before-assuming.md` | When unsure, ask one specific question first. State the rough scope and get a go-ahead before big read/write jobs. |
| `offer-context-handoff.md` | When context is heavy and the next step is reasoning-heavy, offer a self-contained handoff prompt for a fresh session. |
| `steer-to-the-goal.md` | Name the goal early, hold it all session, own the steering, and end every turn with the next step. Durable direction goes to v3 planning when installed; live next actions remain in work-tracker. |
| `do-the-technical-work.md` | Do the git/config/deploy/file work yourself. Only hand the owner steps that are genuinely only-they, and make those copy-paste simple. Recommend, do not dump raw choices. |
| `work-item-folders.md` | Use the Git-native work-tracker as the task authority: one folder per item, exact handoffs, typed relationships, Git landing proof, generated views, and safe adoption of older manual folders. |
| `show-phase-progress.md` | When work splits into phases, print a one-line progress bar at every transition and when the last phase finishes. |
| `treat-owner-as-non-technical.md` | Assume no technical background: numbered steps, exact commands, say what success looks like, never hand back raw errors. Also covers REPORTING: explain what you did in plain words, not just what to do. Turn off only for a technical owner. |

## Second-brain rules

The canonical v3 rule comes from the `second-brain` plugin and installs as
`.claude/rules/second-brain.md`. Do not duplicate it in this library.

Retired v1 recognition examples no longer live in this active rule library.
`project-sync` identifies legacy local wiring directly, without installing or
reading a v1 rule.

MCP tool rules (Context7, Gmail, Google Calendar, Linear, Notion, Playwright)
are conditional too, and live in `../mcp-best-practices.md`: fold in a server's
section only if the project uses that server.

## Adding a rule

Drop a new `<name>.md` here (plain language, no em dashes, no section signs,
"owner" not a personal name, no project-specific file paths or dated incidents:
keep it reusable). Add a row to the right table above (default ON or
conditional). New projects pick it up on the next `project-init` run.
