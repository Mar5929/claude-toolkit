# Setup flow: gate-by-gate checklist

Track progress against this during a `project-init` run. Every gate is optional;
mark it done, skipped, or deferred. Keep a live version of this visible to the user
so they always know where they are.

```
[ ] Gate 0 - Orient: read the working dir; identify stack & project state
[ ] Gate 1 - Scaffolding, folder structure, and where work items are tracked
[ ] Gate 2 - Hooks (guards & automation)
[ ] Gate 3 - Project knowledge        (one Markdown vault, packaged tools)
[ ] Gate 4 - Mechanical knowledge aids (optional impact analysis)
[ ] Gate 5 - Optional SOUL.md + root instructions + rules
[ ] Gate 6 - Optional toolkit skills  (offer the session-skills plugin: all eight)
[ ] Wrap-up - summarize, note follow-ups, port-back reminder
```

## Per-gate prompts (keep them short; one gate at a time)

**Gate 0: Orient**

- Is this greenfield or does it already have code?
- What's the stack (language, framework, app/library/service, mono/single)?
- If the project already exists and mainly needs to catch up with the toolkit,
  switch to the `project-sync` skill instead.

**Gate 1: Scaffolding**

- Recommend a conventional layout for the stack; explain the why briefly.
- Confirm before creating dirs/files. Cover: source, tests, config, `.gitignore`,
  README, license, editor/formatter, CI stub.
- Write each major folder's own short `CLAUDE.md` at the same time as the
  folder, even when it starts empty. `folder-claudemd.md` says what goes in one,
  which folders get one, and which are skipped (any folder with a `README.md`
  index, everything under `.claude/`, and the complete `knowledge/` tree).
  Record every skip. Never a nested `AGENTS.md`.
- Every stack, as its own question: "Where do you track work items for this
  project?" Offer a GitHub Projects board, Linear, Jira, local folders on this
  computer, the BMAD method, or somewhere else / nothing yet.
  `work-tracking-choice.md` has the wording, what each answer does, and the
  GitHub board setup steps. Read it first.
- For answers other than "somewhere else, or nothing yet", Gate 5 gives
  `CLAUDE.md` a "Where work is tracked" section naming the tracker.
- A GitHub Projects board and local folders are the two tracker choices the
  toolkit can set up. GitHub setup creates nothing without explicit approval:
  no board, no statuses, no labels, no issues. Local setup writes only after the
  owner chooses it. The toolkit creates and changes nothing inside Linear, Jira,
  or any other external tracker.
- For the BMAD method, the toolkit only runs BMAD's own installer
  (`npx bmad-method install`), with approval, and stops there. BMAD holds the
  work, so it never pairs with `work-tracker` or a hand-built board, and its own
  planning workflows are the refinement session.
- For "local folders on this computer": install the `work-tracker` plugin and
  run `init`, per `work-items-structure.md`. It creates item folders under
  Git-ignored `.work-items/`, uses YAML records, and requires owner-approved
  `REQUIREMENTS.md` before work starts. Pairs with the `work-item-folders.md`
  rule copied in Gate 5. If an older staged tracker exists, preview and approve
  `work migrate` before copying it. Local mode has no GitHub mirror.
- Every stack: offer `ai-external-knowledge/` at the project root, for outside
  documentation captured as Markdown, one folder per topic. Empty with a short
  `README.md` is fine. Gate 5 copies the `ai-external-knowledge.md` rule with it.
- Every stack: offer `docs/designs/` and `docs/PRDs/` at the project root.
  `docs/designs/` holds the build plan for one work item, written once its
  requirements are approved and deleted once the specification is current.
  `docs/PRDs/` holds requirements for a product or feature area bigger than one
  work item, and is kept for as long as that area lasts. Create both empty, each
  with a short `README.md` saying what it holds and how long a file in it lives.
  No rule file governs either, and nothing checks that a design was deleted.
- Salesforce / SFDX: offer the standard scaffold in
  `salesforce-project-scaffold.md` (SFDX source plus a `delivery/` tree). Local
  work tracking still uses root `.work-items/`; older `delivery/work-items/` or
  `engagement/work-items/` trees use the preview-first conversion flow.
- Salesforce / SFDX: do not create `delivery/knowledge-base/` in Gate 1. If
  Gate 3 installs project knowledge, `knowledge/` is the one curated home. If
  the owner declines it, offer a delivery knowledge base separately only when
  the project needs one.
- Salesforce / SFDX: after `.claude/rules/` is scaffolded, offer the reusable
  Salesforce rules from `library/rules/salesforce/` (see its `README.md`); copy the ones
  the owner wants into the project's `.claude/rules/`.
- Salesforce / SFDX: if the owner wants permission sets tracked in git, install
  the whole permission set kit. It has four parts and the rule is useless without
  the rest, because the danger it guards against is invisible to Salesforce's own
  checks:
  1. `library/rules/salesforce/permissions-source-control.md` to `.claude/rules/`.
  2. `library/tools/permsets.py` to `tools/permissions/permsets.py`, plus a short
     `tools/permissions/README.md` pointing at the runbook. This is what verifies
     a file against the org and reports what a deploy would delete.
  3. `library/templates/permissions-runbook.md` as the project's own operating runbook
     (`knowledge/memory/salesforce-permissions.md` under the project-knowledge
     layout, otherwise `docs/`). Fill in its placeholders.
  4. The deploy guard hook, in Gate 2 below.

  Then follow `library/guides/salesforce-permissions-retrieval.md` to prove on this org, once,
  that a standalone retrieve is complete, and record the result in the runbook.
  `library/guides/salesforce-permissions-research.md` holds the evidence and sources behind all
  of it; point the owner there rather than re-researching. Profiles are excluded
  by default; the runbook explains why and what to do if the owner wants them.
- Salesforce / SFDX: offer the dependency graph in
  `library/guides/salesforce-dependency-graph.md`, and recommend it on an org merge or any org
  where "if I change this field, what breaks?" comes up often. It is one kit,
  same as the permission sets one:
  1. The whole `library/tools/kb/` folder into the project's `tools/kb/`. The
     orchestrator imports every file in it, so do not drop any.
  2. The gitignore entries for the graph and freshness artifacts.
  3. `library/rules/salesforce/dependency-graph.md` to `.claude/rules/`.
  4. The freshness Stop hook, in Gate 2 below.

  It reads only local `force-app/` files and never contacts an org, and it needs
  nothing installed: Python standard library only. Org names come from the
  project's own `sfdx-project.json` or `force-app/` folders, so there is nothing
  to configure. Verify with the seven `test_*.py` files (skips are expected), one
  build, and one field query before calling it done.

**Gate 2: Hooks**

- What needs guarding or automating? (deploy/env guard, secret guard,
  session-start orientation, format/lint)
- Confirm exact trigger + action per hook; tell the user how to verify it fires.
- Every project: offer the three general hooks from `hooks-library`
  (`/hooks-library`). `spec-check-reminder` asks once per session, at the first
  file edit, whether the spec-check review has run. It points at the
  `spec-check` skill from `session-skills`; skip it where that plugin is not
  installed. `work-item-stage-reminder` asks
  once per session which work item this is, what stage it is at, and whether the
  progress log is current; offer it only where Gate 1 named a tracker, since
  without one there is no stage to set.
  The project knowledge package owns its startup loader and pull-request save
  reminder. Gate 3 installs both. Do not restore the retired
  `memory-pr-hook` plus `wrap-up-ritual.md` route.
- Salesforce / SFDX: both Salesforce guards ship from `hooks-library` alongside
  every other hook. Install that plugin (`/plugin install hooks-library`) and
  follow its two guides. It is needed only while setting them up: the install
  copies the hook files into the project, so afterwards the project runs them
  on its own.
  - `salesforce-prod-guard-hook.md`: confirms before deploys or destructive ops
    hit a production org; auto-detects production; tuned by a JSON policy file.
  - `salesforce-permset-guard-hook.md`: whenever the permission set rule was
    accepted in Gate 1, also install this. It blocks any deploy shipping a
    permission set that has not been preflighted, which is the one step whose
    omission silently and irreversibly deletes grants. It depends on
    `permsets.py` being installed; without it every permission set deploy is
    blocked forever.
  - Both guards sit in the same `Bash|PowerShell` PreToolUse matcher.
- Salesforce / SFDX: whenever the dependency graph was accepted in Gate 1, wire
  its freshness Stop hook (step 4 of `library/guides/salesforce-dependency-graph.md`). It sits
  in `hooks.Stop`, not with the two PreToolUse guards, and it lives inside
  `tools/kb/` because it imports the rest of the tool.

**Gate 3: Project knowledge system**

- Offer `second-brain` as one coherent opt-in system.
- Explain that the managed `knowledge/README.md` is the one operating manual and
  the remaining skills and hooks point to it.
- Ask the owner what the project is, why it exists, what finished looks like,
  its main workstreams and boundaries, who is involved, and where active work
  is tracked. Use those answers for `knowledge/project.md`, then show the
  complete knowledge tree plus root instruction edits.
- If approved, install the second-brain plugin and follow its canonical
  greenfield setup workflow, including the exact managed manual, task-specific
  skills, checker, index builder, fail-open startup routes, and reminders.
- Give the Codex startup handler at least 5,000 tokens of additional context so
  the manual and map are not cut off.
- Add the same short startup and fallback pointer to both root agent files. Do
  not copy policy into either file.
- Start with no memories. Never inherit the toolkit repository's knowledge or
  tags.
- Commit only `knowledge/.obsidian/app.json` with `alwaysUpdateLinks: true`,
  `newLinkFormat: "relative"`, and `useMarkdownLinks: true`. Ignore all other
  `.obsidian` state and do not pin a
  core plugin list.
- Offer an initial `remember` pass after setup. It follows the manual's approval
  contract.
- Do not install a database, memory MCP server, embeddings, transcript capture,
  or background curation.
- The two knowledge indexes are generated. Create no other indexes or folder
  instruction files inside `knowledge/`; its root README is the manual.

**Gate 4: Optional mechanical knowledge aids**

- The Markdown knowledge layer already came from Gate 3 when accepted.
- Do not create a second knowledge store or install retired v1 curators and
  drift hooks.
- Treat a dependency graph as an optional analysis aid, not required memory
  infrastructure or automatic truth. Salesforce projects use
  `library/guides/salesforce-dependency-graph.md` (offered in Gate 1); every other stack uses
  `library/guides/graphify-dependency-graph.md`. A project installs at most one.
- Non-Salesforce: offer the graphify kit here if the owner wants impact
  analysis. Four parts, installed together:
  1. The `graphify` command.
  2. `graphify-out/` in `.gitignore`.
  3. `library/rules/general/dependency-graph.md` to `.claude/rules/` (Gate 5).
  4. `graphify hook install` for the auto-rebuild git hooks.

  Say the hook caveat out loud: git hooks are never committed, so each fresh
  clone needs that command run once or its graph silently stops updating.

**Gate 5: SOUL.md, CLAUDE.md, and the rules folder**

- Three fixed lines go above the title in `CLAUDE.md`: the SOUL route (only when
  `SOUL.md` exists and Gate 3 was declined), then the owner's self-check
  instruction, then the owner's continuity instruction. The last two are
  verbatim and in every project. `thin-claudemd.md` has the exact wording and
  `root-file-examples.md` shows them in place; do not reword either.
- `AGENTS.md` is one line and nothing else:
  `Read CLAUDE.md in this folder and follow it.` Codex expands no import syntax,
  so `@CLAUDE.md` would load nothing, but a plain instruction to open a file is
  followed. Anything more is a hand-maintained second copy that drifts.
- Ask whether the owner wants to create a root `SOUL.md`. Explain that it holds
  the agent's identity, communication style, defaults, and behaviors to avoid.
  If yes, work with the owner to write it. Do not install a fixed template or
  invent its content. Keep an existing file and never overwrite it. When Gate 3
  was declined, put `Read SOUL.md first and follow it throughout this session.`
  at the top of `CLAUDE.md`. When Gate 3 ran, its loader and fallback own that
  route. If the owner declines, create no file and add no reference.
- `CLAUDE.md` is a router and a map: what the project is, what is in each folder
  and when to open it, what tools the project runs on, and where work is
  tracked. Say that to the owner up front, and keep out anything that answers
  none of those. `thin-claudemd.md` has the list of what never goes in.
- Behavioral rules go into the project's `.claude/rules/` as individual files,
  not into CLAUDE.md. See `thin-claudemd.md` and `library/rules/general/README.md`.
- Copy the general rules from `library/rules/general/` into `.claude/rules/`: every
  default-ON file unless the owner drops it. Never copy retired v1 recognition
  files into a new project. The current knowledge procedure comes from its
  plugin, not from the general rule library. Walk the list; let the owner accept,
  edit, or skip each.
- Default-ON rules: multi-agent worktree protocol, language rules (no em dashes,
  no section signs, no AI filler, plain language), and working-style rules (lead
  with the answer; answer last, ask only in the question box; solve the real goal
  and push back; define terms; ask before assuming; offer a handoff in a loaded
  session; steer the session to the goal; do the technical work yourself; one
  folder per work item; show phase progress; treat the owner as non-technical).
  Only drop if the owner opts this project out.
- Salesforce projects: make sure the `library/rules/salesforce/` files chosen in Gate 1
  are in `.claude/rules/` too.
- Conditional general rules go in only when the project has the thing they
  govern: today that is `dependency-graph.md`, when the graphify graph was
  accepted in Gate 4. Salesforce projects get the `library/rules/salesforce/` file of
  that name instead. Never both.
- MCP tool rules from `library/guides/mcp-best-practices.md` are conditional: fold in a server's
  section only if the project uses that MCP server.
- Write a thin CLAUDE.md _with_ the user: what it is, codemap and structural
  pointers, a `Read .claude/rules` line, which gates ran. Add a
  `.claude/rules/README.md` index.
- The codemap names the context sources too, not only the code: give
  `ai-external-knowledge/` a line saying what topics are captured there and when
  to open it, and the same for a specifications folder or reference data. An
  agent reaches those folders only from here.
- Give `docs/designs/` and `docs/PRDs/` their own codemap lines where Gate 1
  created them, saying what is in each and how long a file in it lives. Both are
  usually still empty here, which is when the line is easiest to skip.
- Keep the codemap to one line per folder, pointing at that folder's own
  `CLAUDE.md` for the detail. Every line says what is in the folder and when to
  open it.
- Write a tools section from what the project actually runs: MCP servers,
  generated graphs or indexes, build, test, and deploy commands. One row each,
  naming the command and the file that holds the detail.
- Select Claude Code's built-in `Concise` output style (default ON): set
  `"outputStyle": "Concise"` in the committed `.claude/settings.json`. Copy no
  style file. `Concise` is built into Claude Code. There are no voice rules in
  `.claude/rules/` either. Offer the same setting in
  `~/.claude/settings.json` if the owner wants this voice in every repository on
  the machine. Say that it starts on the owner's next session, that a helper
  agent never receives an output style, which is what
  `follow-the-output-style.md` in the rules folder is for, and that with a
  built-in style there is no file for that rule to point at, so helper agents
  fall back to writing plainly.
- Offer `plain-english` as the alternative (default OFF), from
  `library/output-styles/`. It answers as if the reader is five years old: plain
  everyday words, no jargon, no figures of speech, bullet points where they
  help. Ask once and move on. If the owner takes it, copy the file to
  `.claude/output-styles/plain-english.md` and set
  `"outputStyle": "plain-english"` in place of `Concise`, never alongside it.
  The file on disk is what `follow-the-output-style.md` sends a helper agent to
  read, so helper agents get the voice too, which is the one thing the built-in
  style cannot do.
- When project knowledge is installed, keep the route small. Both hosts register
  the loader for `SOUL.md`, `knowledge/README.md`, `knowledge/project.md`,
  `knowledge/current.md`, and the two index entry lists. `CLAUDE.md` says to
  read that map once only if the hook did not supply it, and copies no knowledge
  policy. See "The project knowledge startup route" in `thin-claudemd.md`.

**Gate 6: Optional standalone toolkit skills**

- Offer `session-skills` as ONE plugin holding eight conversation skills:
  `braindump`, `explain-simply`, `grill-me`, `handoff`, `session-summary`,
  `spec-check`, `track-tasks`, `unslop`. They install and version together, so
  this is a single yes or no.
- `explain-simply` re-says an answer as plain bullets keeping every number,
  date, path, and name.
- `grill-me` for persistent brainstorming and discovery interviews.
- If approved, install its plugin from the toolkit marketplace. Do not copy its
  skill instructions into the project.
- With project knowledge installed, it writes under `knowledge/brainstorms/`
  and invokes `remember` for approved persistent outcomes at interview completion.
- Offer `session-summary` for long sessions and handoffs: it returns a table with
  one row per request the owner made, each with a status, then a block for
  whatever still needs them, and writes nothing.
- Offer `handoff` in every project, and recommend it. `/handoff` invokes
  `remember` first, waits for any required owner decision, then drafts a prompt
  for a fresh session with everything
  not saved carried inside it. The prompt opens with the goal of the work and
  why it matters, and `handoff-verifier`, an agent that never saw the
  conversation, checks it against the repository before the owner sees it, so
  facts do not get less accurate each time work is handed on. Anything it cannot
  confirm is labelled inside the prompt rather than dropped, and `/handoff check`
  runs the same check on a prompt the owner already has. Needs no style, no
  project knowledge system, and no hooks; in a project without project knowledge
  it skips the saving step. It pairs with the `offer-context-handoff.md` rule from Gate 5, which
  covers the owner asking in their own words.
- `track-tasks` keeps every still-open topic on Claude Code's built-in task
  list, and `/track-tasks` prints it. It catches parked topics, questions the
  owner never answered, and work blocked behind something else. Say its limit:
  the list dies with the session, so anything that must outlive it moves to the
  work tracker or a handoff prompt.
- `unslop` strips the patterns that make existing writing read as
  machine-written and puts a voice back, on a named file, pasted text, or the
  last answer. It shows every tell with its fix, then the rewrite, and writes
  only on the owner's yes. Every number, date, path, name, and field name
  survives unchanged, and it reads the project's active output style first, so
  the project's voice wins on any disagreement.
- Record installed, skipped, or deferred so `project-sync` does not repeat a
  considered "no".

**Wrap-up**

- Summarize done vs. skipped, including which folders got their own `CLAUDE.md`
  and which were skipped and why.
- List follow-ups from skipped/deferred gates.
- Port-back reminder: improvements to reusable systems get PR'd back to
  `claude-toolkit`.
