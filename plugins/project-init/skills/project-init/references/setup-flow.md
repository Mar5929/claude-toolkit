# Setup flow: gate-by-gate checklist

Track progress against this during a `project-init` run. Every gate is optional;
mark it done, skipped, or deferred. Keep a live version of this visible to the user
so they always know where they are.

```
[ ] Gate 0 - Orient: read the working dir; identify stack & project state
[ ] Gate 1 - Scaffolding, folder structure, and where work items are tracked
[ ] Gate 2 - Hooks (guards & automation)
[ ] Gate 3 - Second-brain v3          (complete Markdown memory system)
[ ] Gate 4 - Knowledge layer          (included with Gate 3, or skipped with it)
[ ] Gate 5 - Root instructions + rules (thin CLAUDE.md and AGENTS.md)
[ ] Gate 6 - Optional toolkit skills  (offer grill-me)
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
- Every stack, as its own question: "Where do you track work items for this
  project?" Offer a GitHub Projects board, Linear, Jira, files in this
  repository, or somewhere else / nothing yet. `work-tracking-choice.md` has the
  wording, what each answer does, and the GitHub board setup steps. Read it
  first.
- For answers other than "somewhere else, or nothing yet", Gate 5 copies the
  `spec-before-you-build.md` rule and adds a one-line pointer to `CLAUDE.md` and
  `AGENTS.md` naming the tracker.
- A GitHub Projects board is the only answer the toolkit sets up. It creates
  nothing without explicit approval: no board, no statuses, no labels, no
  issues. It creates and changes nothing inside Linear, Jira, or any other
  external tracker.
- For "files in this repository": install the `work-tracker` plugin and run
  `init`, per `work-items-structure.md`. It preserves the stage folders
  `01-backlog/` through `04-archived/`, adds structured records and validation,
  and safely adopts existing folders. Pairs with the `work-item-folders.md` rule
  copied in Gate 5. The optional GitHub Project mirror of those files is the
  plugin's own command and needs explicit approval too.
- Salesforce / SFDX: offer the standard scaffold in
  `salesforce-project-scaffold.md` (SFDX source plus an `engagement/` tree;
  its `engagement/work-items/` uses the same work-items structure).
- Salesforce / SFDX: after `.claude/rules/` is scaffolded, offer the reusable
  Salesforce rules from `salesforce-rules/` (see its `README.md`); copy the ones
  the owner wants into the project's `.claude/rules/`.
- Salesforce / SFDX: if the owner wants permission sets tracked in git, install
  the whole permission set kit. It has four parts and the rule is useless without
  the rest, because the danger it guards against is invisible to Salesforce's own
  checks:
  1. `salesforce-rules/permissions-source-control.md` to `.claude/rules/`.
  2. `tools/permsets.py` to `tools/permissions/permsets.py`, plus a short
     `tools/permissions/README.md` pointing at the runbook. This is what verifies
     a file against the org and reports what a deploy would delete.
  3. `templates/permissions-runbook.md` as the project's own operating runbook
     (`memory/operations/salesforce-permissions/README.md` under the second-brain
     layout, otherwise `docs/`). Fill in its placeholders.
  4. The deploy guard hook, in Gate 2 below.

  Then follow `salesforce-permissions-retrieval.md` to prove on this org, once,
  that a standalone retrieve is complete, and record the result in the runbook.
  `salesforce-permissions-research.md` holds the evidence and sources behind all
  of it; point the owner there rather than re-researching. Profiles are excluded
  by default; the runbook explains why and what to do if the owner wants them.
- Salesforce / SFDX: offer the dependency graph in
  `salesforce-dependency-graph.md`, and recommend it on an org merge or any org
  where "if I change this field, what breaks?" comes up often. It is one kit,
  same as the permission sets one:
  1. The whole `tools/kb/` folder from this skill's references into the
     project's `tools/kb/`. The orchestrator imports every file in it, so do
     not drop any.
  2. The gitignore entries for the graph and freshness artifacts.
  3. `salesforce-rules/dependency-graph.md` to `.claude/rules/`.
  4. The freshness Stop hook, in Gate 2 below.

  It reads only local `force-app/` files and never contacts an org. Verify with
  `test_catalog.py`, one build, and one field query before calling it done.

**Gate 2: Hooks**
- What needs guarding or automating? (deploy/env guard, secret guard,
  session-start orientation, format/lint)
- Confirm exact trigger + action per hook; tell the user how to verify it fires.
- Every project: offer both hooks from `hooks-library` (`/hooks-library`).
  `style-reminder` re-states the project's output style every time the owner
  sends a message, so the voice instructions do not go stale in a long session.
  `writing-guard` reads the finished reply and blocks on an em dash or a section
  sign, so a slip is caught rather than shipped. Both pair with Gate 5; skip them
  if the owner skips the style.
- Salesforce / SFDX: offer the ready-made production-org guard in
  `salesforce-prod-guard-hook.md` (confirms before deploys or destructive ops
  hit a production org; auto-detects production; tuned by a JSON policy file).
- Salesforce / SFDX: whenever the permission set rule was accepted in Gate 1,
  also install the permission set deploy guard in
  `salesforce-permset-guard-hook.md`. It blocks any deploy shipping a permission
  set that has not been preflighted, which is the one step whose omission
  silently and irreversibly deletes grants. Both guards sit in the same
  `Bash|PowerShell` PreToolUse matcher. It depends on `permsets.py` being
  installed; without it every permission set deploy is blocked forever.
- Salesforce / SFDX: whenever the dependency graph was accepted in Gate 1, wire
  its freshness Stop hook (step 4 of `salesforce-dependency-graph.md`). It sits
  in `hooks.Stop`, not with the two PreToolUse guards, and it lives inside
  `tools/kb/` because it imports the rest of the tool.

**Gate 3: Memory system**
- Offer `second-brain` as one coherent opt-in system.
- Explain brainstorm, specification, typed-memory, raw-artifact, work-tracker,
  and Git authority.
- Recommend real project system areas and show the complete core tree plus root
  instruction edits.
- If approved, install the second-brain plugin and follow its canonical
  greenfield setup workflow.
- Offer an initial owner-approved memory pass after setup.
- Do not install a database, memory MCP server, embeddings, scripts, hooks,
  transcript capture, or background curation.

**Gate 4: Knowledge layer**
- Mark included with v3 when Gate 3 ran, or skipped with Gate 3.
- Do not create a second knowledge store or install retired v1 curators and
  drift hooks.
- Treat a dependency graph as an optional analysis aid, not required memory
  infrastructure or automatic truth. Salesforce projects use
  `salesforce-dependency-graph.md` (offered in Gate 1); every other stack uses
  `graphify-dependency-graph.md`. A project installs at most one.
- Non-Salesforce: offer the graphify kit here if the owner wants impact
  analysis. Four parts, installed together:
  1. The `graphify` command.
  2. `graphify-out/` in `.gitignore`.
  3. `general-rules/dependency-graph.md` to `.claude/rules/` (Gate 5).
  4. `graphify hook install` for the auto-rebuild git hooks.

  Say the hook caveat out loud: git hooks are never committed, so each fresh
  clone needs that command run once or its graph silently stops updating.

**Gate 5: CLAUDE.md and the rules folder**
- Behavioral rules go into the project's `.claude/rules/` as individual files,
  not into CLAUDE.md. See `thin-claudemd.md` and `general-rules/README.md`.
- Copy the general rules from `general-rules/` into `.claude/rules/`: every
  default-ON file unless the owner drops it. Never copy retired v1 recognition
  files into a new project. When v3 ran, keep its canonical
  `second-brain.md` rule and index it once. Walk the list; let the owner accept,
  edit, or skip each.
- Default-ON rules: multi-agent worktree protocol, language rules (no em dashes,
  no section signs, no AI filler, plain language), and working-style rules (lead
  with the answer; answer last, ask only in the question box; solve the real goal
  and push back; define terms; ask before assuming; offer a handoff in a loaded
  session; steer the session to the goal; do the technical work yourself; one
  folder per work item; show phase progress; treat the owner as non-technical).
  Only drop if the owner opts this project out.
- Salesforce projects: make sure the `salesforce-rules/` files chosen in Gate 1
  are in `.claude/rules/` too.
- Conditional general rules go in only when the project has the thing they
  govern: today that is `dependency-graph.md`, when the graphify graph was
  accepted in Gate 4. Salesforce projects get the `salesforce-rules/` file of
  that name instead. Never both.
- MCP tool rules from `mcp-best-practices.md` are conditional: fold in a server's
  section only if the project uses that MCP server.
- Write a thin CLAUDE.md _with_ the user: what it is, codemap and structural
  pointers, a `Read .claude/rules` line, which gates ran. Add a
  `.claude/rules/README.md` index.
- Install the plain-language output style (default ON): copy
  `output-styles/plain-language.md` to `.claude/output-styles/` and set
  `"outputStyle": "plain-language"` in the committed `.claude/settings.json`.
  This is the only home for how Claude talks; there are no voice rules in
  `.claude/rules/` any more. Pair it with both Gate 2 hooks: `style-reminder`
  re-states it on every message, `writing-guard` checks the finished reply. Offer
  the machine-wide copy at `~/.claude/output-styles/` as well if the owner wants
  this voice in every project. Say that it starts on the owner's next session,
  and that a helper agent never sees an output style, which is what
  `follow-the-output-style.md` in the rules folder is for. See
  `output-styles/README.md`.
- When v3 ran, the memory schema is the one exception to thin. Copy the full
  section from the second-brain plugin's `references/orientation-snippet.md`
  **verbatim** into BOTH CLAUDE.md and AGENTS.md, at the **top** of each file,
  right after the title and the `Read .claude/rules` line and before the
  codemap. It carries the authority map plus the use-when and do-not-use-when
  for every home, because routing has to happen before an agent writes and a
  rule it has not opened cannot route. Never shorten it, never let the two files
  differ, and point both at the same canonical rule. See `thin-claudemd.md`.
- Give AGENTS.md the same content list as CLAUDE.md, not a stub: title, the
  rules line, the identical memory section in the same position, the same
  structural pointers (or a pointer to them), plus any Codex-specific
  instructions. See "What AGENTS.md contains" in `thin-claudemd.md`.

**Gate 6: Optional standalone toolkit skills**
- Offer `grill-me` for durable brainstorming and discovery interviews.
- If approved, install its plugin from the toolkit marketplace. Do not copy its
  skill instructions into the project.
- With v3 installed, it uses the flat brainstorm index and proposes approved
  specification or memory outcomes at interview completion.
- Record installed, skipped, or deferred so `project-sync` does not repeat a
  considered "no".

**Wrap-up**
- Summarize done vs. skipped.
- List follow-ups from skipped/deferred gates.
- Port-back reminder: improvements to reusable systems get PR'd back to
  `claude-toolkit`.
