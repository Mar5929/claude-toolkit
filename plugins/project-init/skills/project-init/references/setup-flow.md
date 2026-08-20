# Setup flow: gate-by-gate checklist

Track progress against this during a `project-init` run. Every gate is optional;
mark it done, skipped, or deferred. Keep a live version of this visible to the user
so they always know where they are.

```
[ ] Gate 0 - Orient: read the working dir; identify stack & project state
[ ] Gate 1 - Scaffolding, folder structure, and where work items are tracked
[ ] Gate 2 - Hooks (guards & automation)
[ ] Gate 3 - Project knowledge        (memory system v2, packaged tools)
[ ] Gate 4 - Mechanical knowledge aids (optional impact analysis)
[ ] Gate 5 - Root instructions + rules (thin CLAUDE.md and AGENTS.md)
[ ] Gate 6 - Optional toolkit skills  (offer the session-skills plugin: all five)
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
  project?" Offer a GitHub Projects board, Linear, Jira, files in this
  repository, the BMAD method, or somewhere else / nothing yet.
  `work-tracking-choice.md` has the wording, what each answer does, and the
  GitHub board setup steps. Read it first.
- For answers other than "somewhere else, or nothing yet", Gate 5 copies the
  `spec-before-you-build.md` rule and adds a one-line pointer to `CLAUDE.md` and
  `AGENTS.md` naming the tracker.
- A GitHub Projects board is the only answer the toolkit builds itself. It
  creates nothing without explicit approval: no board, no statuses, no labels, no
  issues. It creates and changes nothing inside Linear, Jira, or any other
  external tracker.
- For the BMAD method, the toolkit only runs BMAD's own installer
  (`npx bmad-method install`), with approval, and stops there. BMAD holds the
  work, so it never pairs with `work-tracker` or a hand-built board, and its own
  planning workflows are the refinement session.
- For "files in this repository": install the `work-tracker` plugin and run
  `init`, per `work-items-structure.md`. It preserves the stage folders
  `01-backlog/` through `04-archived/`, adds structured records and validation,
  and safely adopts existing folders. Pairs with the `work-item-folders.md` rule
  copied in Gate 5. The optional GitHub Project mirror of those files is the
  plugin's own command and needs explicit approval too.
- Salesforce / SFDX: offer the standard scaffold in
  `salesforce-project-scaffold.md` (SFDX source plus a `delivery/` tree; its
  `delivery/work-items/` uses the same work-items structure). Existing
  `engagement/` projects keep that path and are never renamed automatically.
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
     (`knowledge/memory/operations/salesforce-permissions.md` under the project-knowledge
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
- Every project: offer both general hooks from `hooks-library`
  (`/hooks-library`). Both are default ON.
  `style-reminder` re-states the project's output style every time the owner
  sends a message, so the voice instructions do not go stale in a long session.
  `writing-guard` reads the finished reply and blocks on an em dash or a section
  sign, so a slip is caught rather than shipped. Those two pair with Gate 5;
  skip them if the owner skips the style.
  The project knowledge package owns its boot-brief startup hook, its pre-write
  guard, and its pull-request save reminder. Gate 3 installs all three. Do not
  restore the retired `memory-pr-hook` plus `wrap-up-ritual.md` route.
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
- Offer `second-brain`, the version 2 memory system, to every project whatever
  its domain. One core, no domain-specific folders.
- Explain the authority split: `knowledge/project.md` is identity and the whole
  settings surface; `knowledge/current.md` is where the work stands;
  `knowledge/map.md` says where each role already lives; `knowledge/specs/` is
  approved behavior; `knowledge/memory/` holds four types and only four, which
  are `facts/`, `decisions/`, `events/`, and `patterns/`; the mapped reference
  area holds outside documentation and research; the work tracker owns live
  status; Git owns exact history.
- Ask the owner what the project is, why it exists, what finished looks like,
  its main workstreams and boundaries, who is involved, and where active work
  is tracked. Use those answers for `knowledge/project.md`, then show the whole
  install and get approval for all of it at once.
- One adoption unit: the tree, the tools, both hooks, the settings entries, the
  gitignore entry, and both host startup routes go in together. No partial
  variant.
- Install steps, with `<plugin>` as the second-brain folder on this machine:
  1. Copy `<plugin>/skills/second-brain/references/templates-v2/knowledge/` to
     the project's `knowledge/`.
  2. Fill the `knowledge/project.md` front matter with the owner:
     `schema_version: 2`, `project_id`, `project_root`, `subroots`, `privacy`,
     `profiles`, optional `tracker`, optional `startup.budget_bytes`. Replace
     the body with their framing.
  3. Fill `knowledge/map.md`, pointing every mapped row at a folder that already
     exists. Delete rows the project has no home for.
  4. Rewrite `knowledge/current.md` from existing handoff material and set its
     `updated` date.
  5. Copy the plugin's `tools/` folder, `lib/` included, into `.claude/tools/`,
     leaving out the retired `build-knowledge-index.mjs` and
     `knowledge-health.mjs`.
  6. Copy `boot-brief-session-start.mjs`, `memory-write-guard.mjs`, and
     `save-reminder.mjs` into `.claude/hooks/`, sibling to `.claude/tools/`.
  7. Merge `templates-v2/claude-settings-snippet.json` into
     `.claude/settings.json`, never replacing it. It sets
     `CLAUDE_CODE_DISABLE_AUTO_MEMORY` to `1`, enables
     `second-brain@claude-toolkit`, and registers the write guard. Add the
     `SessionStart` registration for the boot brief and the `Bash` `PreToolUse`
     registration for the save reminder. Write `${CLAUDE_PROJECT_DIR}` in braced
     form in every hook command.
  8. Append `templates-v2/gitignore-snippet.txt` to `.gitignore`, which ignores
     `.memory/` local state.
  9. Write the Codex startup-route block into root `AGENTS.md` from the
     second-brain skill. Claude Code gets the same meaning from the
     `SessionStart` hook, and both routes must keep saying the same five things.
  10. Run `node .claude/tools/memory.mjs validate` and the boot brief once
      before calling the gate done. A gold-set warning on a fresh project is
      expected.
- Map existing homes for rules, skills, tracker, delivery, source records, and
  references in place. Never move, copy, or rename project material to fit the
  map.
- Create optional identity, reference, brainstorm, profile, and local-state
  areas only when they are used. Absence breaks nothing.
- Outside documentation, web crawls, and research notes stay in the mapped
  reference area with source, retrieval date, version, and verification status.
  They become memory only through owner approval. Approved behavior goes to a
  specification, a reusable process to a skill, neither duplicated into memory.
- Domain profiles add fields, routes, validation, and privacy warnings. They
  never weaken approval, provenance, authority, scope, or privacy. An empty
  `profiles` list is normal.
- Say that the system is removable: removal unregisters the hooks and removes
  the copied runtime, leaving `knowledge/` content and every other plugin
  working.
- Offer an initial owner-approved persistent-information pass after setup, using
  short What, Where, Why, Assumptions, and Unverified bullets.
- Do not install a database, memory MCP server, embeddings, transcript capture,
  or background curation.
- Do not install retired version 1 pieces: `knowledge/index.md` and its builder,
  `knowledge/memory/tags.md`, the seven old memory folders,
  `knowledge-session-start.mjs`, the health tool, or the `memory-pr-hook` plus
  `wrap-up-ritual.md` route.
- Create no per-folder indexes or folder `CLAUDE.md` files inside `knowledge/`.

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

**Gate 5: CLAUDE.md and the rules folder**
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
- Keep the codemap to one line per folder, pointing at that folder's own
  `CLAUDE.md` for the detail. Four things stay in the root file whatever else
  moves: how to talk to the owner, the pointers to the most dangerous rules, the
  project-knowledge startup route, and the codemap lines. See "What must stay in the root
  file" in `thin-claudemd.md`.
- `AGENTS.md` keeps the folder detail in full. Codex never reads a folder
  `CLAUDE.md`, so the two root files are meant to differ in length.
- Install the plain-language output style (default ON): copy
  `library/output-styles/plain-language.md` to `.claude/output-styles/` and set
  `"outputStyle": "plain-language"` in the committed `.claude/settings.json`.
  This is the only home for how Claude talks; there are no voice rules in
  `.claude/rules/` any more. Pair it with the two Gate 2 style hooks:
  `style-reminder` re-states it on every message, `writing-guard` checks the
  finished reply. Offer
  the machine-wide copy at `~/.claude/output-styles/` as well if the owner wants
  this voice in every project. Say that it starts on the owner's next session,
  and that a helper agent never sees an output style, which is what
  `follow-the-output-style.md` in the rules folder is for. See
  `library/output-styles/README.md`.
- When project knowledge is installed, keep the route small. Claude's
  `SessionStart` hook runs the boot brief, which carries identity, purpose,
  current state, handoff, pins, and the map. `AGENTS.md` carries the Codex
  startup-route block written in Gate 3, which runs the same boot brief first.
  Neither root file copies the full memory specification.
- Give `AGENTS.md` the same project description and structural pointers as
  `CLAUDE.md`, plus the direct startup instruction and any Codex-specific
  repository instructions. See "What AGENTS.md contains" in
  `thin-claudemd.md`.

**Gate 6: Optional standalone toolkit skills**
- Offer `session-skills` as ONE plugin holding five conversation skills:
  `explain-simply`, `grill-me`, `handoff`, `session-summary`, `track-tasks`.
  They install and version together, so this is a single yes or no.
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
  work tracker or a handoff prompt. It pairs with the `track-open-topics.md`
  rule from Gate 5, which names no skill, so the rule alone is a valid install.
- Record installed, skipped, or deferred so `project-sync` does not repeat a
  considered "no".

**Wrap-up**
- Summarize done vs. skipped, including which folders got their own `CLAUDE.md`
  and which were skipped and why.
- List follow-ups from skipped/deferred gates.
- Port-back reminder: improvements to reusable systems get PR'd back to
  `claude-toolkit`.
