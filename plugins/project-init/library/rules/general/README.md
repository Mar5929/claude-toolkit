# General project rules library

Reusable `.claude/rules/` files that the owner wants in every project,
regardless of stack. During `project-init` Gate 5 (CLAUDE.md), copy the selected
files into the new project's `.claude/rules/` folder, and write a thin CLAUDE.md
that points at that folder. Each rule is a standalone file, same model as the
`../salesforce/` library.

Keep the behavioral rules in these files, not inside CLAUDE.md. CLAUDE.md should
stay short: what the project is, its structural pointers (backlog, work-items,
deployment, toolkit port-back), which gates ran, and a line telling every
session to read `.claude/rules/`. See `thin-claudemd.md` in the `project-init` skill for the CLAUDE.md
structure Gate 5 writes.

## Default ON: copy into every project unless the owner opts out

| File | What it does |
| --- | --- |
| `keep-claudemd-current.md` | Update CLAUDE.md before a session ends whenever it surfaces a new path, convention, decision, or workflow. A slightly-too-full CLAUDE.md beats a stale one. Two-sided: also prune while you are in there, route detail to the design, status, or project-knowledge layer, and keep the codemap one line per folder instead of a changelog. |
| `honest-verification.md` | Do not claim more than you verified. If it was not run or tested, say so and leave the steps. Report failures with output. |
| `parallel-agent-sessions.md` | Sharing a repo with other live sessions, in one rule: where you work and how you behave. Look before you edit (`git worktree list`, `git status`, `git log`); work in your own worktree on your own branch and never in the shared primary checkout; never `git add -A`; keep shared-file edits narrow and preserve unrelated entries while allowing owner-approved project-knowledge maintenance; claim a sequential identifier by pushing it first, because parallel agents WILL collide on numbers; never touch another session's branch or commit its uncommitted work; land by PR, merge only on owner approval and only after a collision check. Written after one session caused a work-item number collision, had its staged files swept into another session's commit twice, and reordered a shared backlog. Absorbed the separate `worktree-isolation` rule. |
| `recommend-the-best-solution.md` | Build it well, and never quietly build more than was asked. Propose the well-architected, best-practice solution rather than a band-aid, and name the quick-patch tradeoff so the owner can choose. Do not expand beyond the request without checking first. The two halves meet in one move: recommending the bigger thing is right, building it unasked is gold-plating. Once the owner decides, do it their way. Absorbed the separate `stay-in-scope` rule. |
| `follow-the-output-style.md` | Anything a helper agent writes that the owner reads (commit message, pull request text, a document in the repo) follows the project's active output style. A pointer to the style file, never a second copy of the rules. Exists because an output style reaches the main conversation only. |
| `ask-before-assuming.md` | Two pauses, both before acting: when intent, naming, behavior, or scope is ambiguous, ask one specific question rather than picking the reading that lets you start sooner; and before an operation that reads or produces a lot, state the rough scope and get a go-ahead. |
| `offer-context-handoff.md` | When context is heavy and the next step is reasoning-heavy, offer a self-contained handoff prompt for a fresh session. Run the installed `remember` review before writing that prompt, and carry anything the owner does not save inside the prompt itself. This is the moment that destroys the most context, and nothing can catch a clear after it happens. The `handoff` plugin's `/handoff` command does it in order; this rule is the backup when the owner asks in their own words. |
| `do-the-technical-work.md` | Do the git/config/deploy/file work yourself. Only hand the owner steps that are genuinely only-they, and make those copy-paste simple. Recommend, do not dump raw choices. |
| `spec-before-you-build.md` | Two things hold whatever the project tracks work in: every piece of work is logged in that tracker before it is built, and nothing is built until a refinement session has filled in the six-part spec (requirements, goal, reason, what the person using it experiences, how it behaves from the outside, edge cases). Says what to do when a ticket is missing or thin, and requires keeping the spec current instead of letting a written requirement go stale. Also requires re-checking the spec for drift before building or solutioning from it, with the spec-check skill where installed or the same review by hand. Tracker-neutral: the project's root instructions name the tracker, this rule says what to do with it. Sits above `work-item-folders` (which owns one specific tracker) and applies equally to a GitHub board, Linear, or Jira. Never ships alone: it reads the tracker's name out of the project's root instructions, so it goes in only alongside the work-tracking pointer that Gate 1 and Gate 5 write. Names no skill and no tracker, so removing a plugin or changing tracker never leaves it stale. |
| `work-item-folders.md` | Use the local work-tracker as the task authority: flat Git-ignored item folders, owner-approved requirements, exact handoffs, typed relationships, Git landing proof, and preview-first conversion of older staged folders. Conditional in practice: only meaningful when the project chose local-folder tracking. |
| `ai-external-knowledge.md` | Outside documentation captured for agents to read (vendor docs, API references, framework guides) goes in `ai-external-knowledge/` at the project root, one folder per topic, each naming its source URL and capture date. It stays raw source material: the project's own conclusions live in the project's knowledge or documentation and link back to it, the project's truth wins any disagreement, and a captured document is never edited to agree with the project. Also says the folder is findable but not read, so agents reach it only when a rule, a skill, or persistent knowledge points at a topic. |
| `track-open-topics.md` | Keep a running list of every topic still open in the session on Claude Code's built-in task list, starting the moment a second topic goes unresolved. Covers the ones easiest to lose: topics the owner parked, questions they have not answered, and work blocked behind something else. Mark an item finished only when it actually is, and say plainly that the list dies with the session, so anything that has to outlive it moves to the work tracker or a handoff prompt. Names no skill, so declining the `session-skills` plugin never leaves it stale. |

## Voice is not a rule any more

How Claude writes and replies used to live here in four files:
`writing-and-language.md`, `how-to-reply.md`,
`treat-owner-as-non-technical.md`, and `define-your-terms.md`. All four were
removed. That job now belongs to the `plain-language` output style in
`../../output-styles/`, which is delivered through the system prompt instead of
being read once as a rule file.

Do not add a voice rule to this folder. If Claude should say something
differently, the change goes in the output style. This folder is for how Claude
*works*, not how it *talks*.

The one thing that does live here is `follow-the-output-style.md`, and it is a
sign, not a rule about writing. An output style reaches the main conversation
only, so a helper agent writing a commit message or a document never sees it.
That rule tells the helper agent where the style file is and to go read it. It
deliberately does not repeat a single writing instruction, because a second copy
would drift from the first.

## Conditional: copy only when the project has the thing the rule governs

| File | Copy it when | What it does |
|---|---|---|
| `dependency-graph.md` | the project installed the graphify code graph (see `../../guides/graphify-dependency-graph.md`) | Answer "what calls this?" and "what breaks if I change it?" from the graph, citing file and line, instead of from a text search or memory. Owns the freshness duty too: keep the automatic rebuild hooks installed, once per clone, because git hooks are never committed and a fresh clone silently has none. Also covers keeping the build offline, never committing it, and naming the graph's blind spot (runtime dispatch and configuration wiring) before saying "nothing uses this". |

A Salesforce project gets `../salesforce/dependency-graph.md` instead: the
same job for the bundled metadata graph. The two are alternatives, never both,
and either one lands in the project as `.claude/rules/dependency-graph.md`.

## Project knowledge procedure

The current procedure comes from the `second-brain` plugin as one managed
`knowledge/README.md`, task-specific skills, tools, and fail-open hooks. Projects
that decline the system receive no knowledge rule from this library. Do not
restore or duplicate the retired large rule, verifier, or per-folder indexes.

Retired v1 recognition examples no longer live in this active rule library.
`project-sync` identifies legacy local wiring directly, without installing or
reading a v1 rule.

MCP tool rules (Context7, Gmail, Google Calendar, Linear, Notion, Playwright)
are conditional too, and live in `../../guides/mcp-best-practices.md`: fold in a server's
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
