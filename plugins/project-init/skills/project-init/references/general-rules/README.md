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
| `secrets-never-committed.md` | API keys and credentials live outside the repo. Never commit them; respect `.gitignore`; raise it if a secret would have to be committed. |
| `honest-verification.md` | Do not claim more than you verified. If it was not run or tested, say so and leave the steps. Report failures with output. |
| `parallel-agent-sessions.md` | Sharing a repo with other live sessions, in one rule: where you work and how you behave. Look before you edit (`git worktree list`, `git status`, `git log`); work in your own worktree on your own branch and never in the shared primary checkout; never `git add -A`; shared index files are append-only; claim a sequential identifier by pushing it first, because parallel agents WILL collide on numbers; never touch another session's branch or commit its uncommitted work; land by PR, merge only on owner approval and only after a collision check. Written after one session caused a work-item number collision, had its staged files swept into another session's commit twice, and reordered a shared backlog. Absorbed the separate `worktree-isolation` rule. |
| `writing-and-language.md` | Plain language everywhere: no em dashes, no section signs, no AI filler, calibrated to the owner. |
| `how-to-reply.md` | The whole shape of a reply, in one rule. Stay quiet while working (one short line per real state change, silence otherwise); put the entire explanation in one reply at the end, written as though the owner read nothing before it; lead with the answer and cut preamble and closing summaries; spend only the words the point needs, but never cut a fact; bullets by default for reporting; never ask a question in prose, because plain chat text does not block, so real decisions go through the blocking question box; and put the owner's next action last, or say "nothing needed from you". A repeated ask for fewer words is a hard constraint, not a preference. Replaces the four separate rules that used to split this (`lead-with-the-answer`, `close-with-the-ask`, `quiet-while-working`, `answer-last-question-box`). |
| `recommend-the-best-solution.md` | Build it well, and never quietly build more than was asked. Propose the well-architected, best-practice solution rather than a band-aid, and name the quick-patch tradeoff so the owner can choose. Do not expand beyond the request without checking first. The two halves meet in one move: recommending the bigger thing is right, building it unasked is gold-plating. Once the owner decides, do it their way. Absorbed the separate `stay-in-scope` rule. |
| `define-your-terms.md` | Name the exact thing and define it on first use. No invented shorthand; no bare "option B" / "risk 1". |
| `ask-before-assuming.md` | Two pauses, both before acting: when intent, naming, behavior, or scope is ambiguous, ask one specific question rather than picking the reading that lets you start sooner; and before an operation that reads or produces a lot, state the rough scope and get a go-ahead. |
| `offer-context-handoff.md` | When context is heavy and the next step is reasoning-heavy, offer a self-contained handoff prompt for a fresh session. |
| `steer-to-the-goal.md` | Find the real goal behind the request (people describe fixes, not problems), name it early, hold it all session, own the steering, and end every turn with the next step. Push back directly when a request is risky, over-built, or aimed at the wrong target, then do it the owner's way once they have decided. Durable direction goes to v3 planning when installed; live next actions remain in work-tracker. Absorbed the separate `solve-the-goal-push-back` rule. |
| `do-the-technical-work.md` | Do the git/config/deploy/file work yourself. Only hand the owner steps that are genuinely only-they, and make those copy-paste simple. Recommend, do not dump raw choices. |
| `work-item-folders.md` | Use the Git-native work-tracker as the task authority: one folder per item, exact handoffs, typed relationships, Git landing proof, generated views, and safe adoption of older manual folders. |
| `show-phase-progress.md` | When work splits into phases, print a one-line progress bar at every transition and when the last phase finishes. |
| `treat-owner-as-non-technical.md` | Assume no technical background: numbered steps, exact commands, say what success looks like, never hand back raw errors. Also covers REPORTING: explain what you did in plain words, not just what to do. Turn off only for a technical owner. |

## Conditional: copy only when the project has the thing the rule governs

| File | Copy it when | What it does |
|---|---|---|
| `dependency-graph.md` | the project installed the graphify code graph (see `../graphify-dependency-graph.md`) | Answer "what calls this?" and "what breaks if I change it?" from the graph, citing file and line, instead of from a text search or memory. Owns the freshness duty too: keep the automatic rebuild hooks installed, once per clone, because git hooks are never committed and a fresh clone silently has none. Also covers keeping the build offline, never committing it, and naming the graph's blind spot (runtime dispatch and configuration wiring) before saying "nothing uses this". |

A Salesforce project gets `../salesforce-rules/dependency-graph.md` instead: the
same job for the bundled metadata graph. The two are alternatives, never both,
and either one lands in the project as `.claude/rules/dependency-graph.md`.

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

A rule that only makes sense alongside a tool is conditional, and it never ships
alone: name the tool it depends on in its row, and make sure `project-init` and
`project-sync` install the two together. A rule whose tool is missing is advice
nobody can follow; a tool whose rule is missing gets ignored by every session.
