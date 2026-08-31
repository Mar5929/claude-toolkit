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
| `keep-claudemd-current.md` | What `CLAUDE.md` and `AGENTS.md` are for: carry the few things an agent must know before it acts, and route it to where everything in the repository lives, context sources included. Three tests keep other lines out. Update the file when a session surfaces a new path, convention, decision, or workflow, and prune while in there. Covers folder `CLAUDE.md` files, and why `AGENTS.md` is a short pointer rather than a second copy. |
| `parallel-agent-sessions.md` | Sharing a repository with other live sessions. Look before you edit, work in your own worktree on your own branch, never stage everything, keep shared-file edits additive, claim a sequential number before using it, and land by pull request with the owner's approval after a merge-safety check. |
| `recommend-the-best-solution.md` | Build it well, and never quietly build more than was asked. Propose the well-architected, best-practice solution rather than a band-aid, and name the quick-patch tradeoff so the owner can choose. Do not expand beyond the request without checking first. The two halves meet in one move: recommending the bigger thing is right, building it unasked is gold-plating. Once the owner decides, do it their way. Absorbed the separate `stay-in-scope` rule. |
| `follow-the-output-style.md` | Anything a helper agent writes that the owner reads (commit message, pull request text, a document in the repo) follows the project's active output style. A pointer to the style file, never a second copy of the rules. Exists because an output style reaches the main conversation only. |
| `ask-before-assuming.md` | Two pauses, both before acting: when intent, naming, behavior, or scope is ambiguous, ask one specific question rather than picking the reading that lets you start sooner; and before an operation that reads or produces a lot, state the rough scope and get a go-ahead. |
| `offer-context-handoff.md` | When context is heavy and the next step is reasoning-heavy, offer a self-contained handoff prompt for a fresh session. Run the installed `remember` review before writing that prompt, and carry anything the owner does not save inside the prompt itself. This is the moment that destroys the most context, and nothing can catch a clear after it happens. The `handoff` plugin's `/handoff` command does it in order; this rule is the backup when the owner asks in their own words. |
| `project-file-lifecycle.md` | Give each kind of project information one lasting home, and do not archive current truth just because a work item closed. Only retired or replaced material moves to an archive. |
| `work-item-folders.md` | Use the local work-tracker as the task authority: Git-ignored item folders the owner groups by hand, owner-approved requirements, exact handoffs, typed relationships, Git landing proof, and preview-first conversion of older staged folders. Conditional in practice: only meaningful when the project chose local-folder tracking. |
| `ai-external-knowledge.md` | Outside documentation captured for agents to read (vendor docs, API references, framework guides) goes in `ai-external-knowledge/` at the project root, one folder per topic, each naming its source URL and capture date. It stays raw source material: the project's own conclusions live in the project's knowledge or documentation and link back to it, the project's truth wins any disagreement, and a captured document is never edited to agree with the project. Also says the folder is findable but not read, so agents reach it only when a rule, a skill, or persistent knowledge points at a topic. |

## Voice is not a rule, and the toolkit no longer ships one

How Claude writes and replies used to live here in four files:
`writing-and-language.md`, `how-to-reply.md`,
`treat-owner-as-non-technical.md`, and `define-your-terms.md`. All four were
removed in favor of a hand-written `plain-language` output style, and in issue
#245 that style was removed too. Every project now selects Claude Code's
built-in `Concise` style, written into the project's committed settings by
`project-init` Gate 5. The toolkit authors no voice file at all.

Do not add a voice rule to this folder. This folder is for how Claude *works*,
not how it *talks*. A project that wants a different voice sets `outputStyle`
in its own settings.

The one thing that does live here is `follow-the-output-style.md`, and it is a
sign, not a rule about writing. An output style reaches the main conversation
only, so a helper agent writing a commit message or a document never sees it.
That rule sends the helper agent to the active style file. With a built-in
style there is no file, and the rule's own fallback applies: write plainly and
move on. That fallback is now the only voice instruction a helper agent gets,
which is why any helper-agent definition that writes owner-facing prose has to
carry the writing rules in its own text.

## Rules removed on 2026-08-31, and why

The owner reviewed the whole default-on set and cut it roughly in half. The set
had grown to about 6,900 words, which loads into every session before anyone
types anything. A rule set that long stops being read and starts being skimmed.

Four files were removed outright. Do not add any of them back without asking
the owner.

| Removed file | What it did | Why it went |
|---|---|---|
| `spec-before-you-build.md` | Required every piece of work to be logged in the project's tracker before it was built, and required a refinement session covering six parts before anyone started. | The owner decided the ceremony cost more than it returned. The `spec-check` skill in the `session-skills` plugin still exists for checking a specification before building from it, and is now offered on its own merits rather than because a rule demanded it. |
| `track-open-topics.md` | Required a running session task list of every unresolved topic. | Claude Code's built-in task list is used when it helps. It did not need a standing rule spending words in every session to say so. |
| `honest-verification.md` | Said not to claim more than you verified, and to report failures with their output. | The owner dropped it from this repository first, then from the toolkit on 2026-08-31. Claude Code's own system prompt already tells an agent to report outcomes faithfully, so the rule was paying for an instruction the harness delivers anyway. |
| `do-the-technical-work.md` | Said to do the git, config, deploy, and file work yourself, and to hand the owner only the steps that are genuinely theirs. | Removed with `honest-verification.md` on 2026-08-31, for the same reason. The behavior it asked for is already the default an agent is given. |

Three more rules were kept but cut hard in the same change:
`keep-claudemd-current.md`, `parallel-agent-sessions.md`, and
`project-file-lifecycle.md`. Their instructions are unchanged. What went was the
explanation, the history, and the worked reasoning around them. If one of them
reads as blunt now, that is deliberate.

## Conditional: copy only when the project has the thing the rule governs

| File | Copy it when | What it does |
|---|---|---|
| `knowledge-direct-commit.md` | the project runs the toolkit knowledge system (the `second-brain` plugin's managed `knowledge/` folder) | A save that touches only `knowledge/` commits straight to the default branch instead of going through a worktree and pull request. The owner-approved exception to `parallel-agent-sessions.md`: content approval still comes from the knowledge manual's save flow, and the agent falls back to the normal flow on branch protection, a real conflict, or any file outside `knowledge/`. |
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
