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
| `keep-claudemd-current.md` | Update CLAUDE.md before a session ends whenever it surfaces a new path, convention, decision, or workflow. A slightly-too-full CLAUDE.md beats a stale one. |
| `wrap-up-ritual.md` | At the end of a chunk of work: update the status/handoff doc, write decisions back, commit and push. Leave a clean handoff. |
| `stay-in-scope.md` | Do not expand beyond what was asked without checking first. Recommend, do not silently gold-plate. |
| `secrets-never-committed.md` | API keys and credentials live outside the repo. Never commit them; respect `.gitignore`; raise it if a secret would have to be committed. |
| `honest-verification.md` | Do not claim more than you verified. If it was not run or tested, say so and leave the steps. Report failures with output. |
| `worktree-isolation.md` | Assume other Claude sessions share the repo. Work in your own git worktree on your own branch, never in the shared checkout, and land work by PR. Merge only on owner approval, after a collision check. |
| `writing-and-language.md` | Plain language everywhere: no em dashes, no section signs, no AI filler, calibrated to the owner. |
| `lead-with-the-answer.md` | Put the answer or action first. Cut preamble and closing summaries; keep needed detail. |
| `answer-last-question-box.md` | Plain chat text never asks a question; real decisions go through the blocking question box. Run tools first, then one reply. |
| `solve-the-goal-push-back.md` | Work the real goal, not just the words. Push back on risky or misaimed requests with a better path; then do it the owner's way. |
| `define-your-terms.md` | Name the exact thing and define it on first use. No invented shorthand; no bare "option B" / "risk 1". |
| `ask-before-assuming.md` | When unsure, ask one specific question first. State the rough scope and get a go-ahead before big read/write jobs. |
| `offer-context-handoff.md` | When context is heavy and the next step is reasoning-heavy, offer a self-contained handoff prompt for a fresh session. |
| `steer-to-the-goal.md` | Name the goal early, hold it all session, own the steering, and end every turn with the next step. Save the goal to memory when it outlasts one chat. |
| `do-the-technical-work.md` | Do the git/config/deploy/file work yourself. Only hand the owner steps that are genuinely only-they, and make those copy-paste simple. Recommend, do not dump raw choices. |
| `work-item-folders.md` | One folder per work item (`SPEC.md` + `STATUS.md`) as the durable memory. Read it first, keep it current, close it out in the same session. |
| `show-phase-progress.md` | When work splits into phases, print a one-line progress bar at every transition and when the last phase finishes. |
| `treat-owner-as-non-technical.md` | Assume no technical background: numbered steps, exact commands, say what success looks like, never hand back raw errors. Turn off only for a technical owner. |

## Conditional: copy only if the matching gate ran

| File | Include when |
|---|---|
| `memory-system-ground-rules.md` | The project set up the long-term memory system (Gate 3). All writes go through the curator; the digest is injected each session. |
| `knowledge-layer-ground-rules.md` | The project set up the knowledge layer (Gate 4). Nodes pin the files they cover and are flagged stale on drift. |

MCP tool rules (Context7, Gmail, Google Calendar, Linear, Notion, Playwright)
are conditional too, and live in `../mcp-best-practices.md`: fold in a server's
section only if the project uses that server.

## Adding a rule

Drop a new `<name>.md` here (plain language, no em dashes, no section signs,
"owner" not a personal name, no project-specific file paths or dated incidents:
keep it reusable). Add a row to the right table above (default ON or
conditional). New projects pick it up on the next `project-init` run.
