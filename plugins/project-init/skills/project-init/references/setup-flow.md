# Setup flow: gate-by-gate checklist

Track progress against this during a `project-init` run. Every gate is optional;
mark it done, skipped, or deferred. Keep a live version of this visible to the user
so they always know where they are.

```
[ ] Gate 0 - Orient: read the working dir; identify stack & project state
[ ] Gate 1 - Scaffolding, folder structure, and optional work-tracker
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
- Every stack: offer the work-items structure in `work-items-structure.md`
  through the `work-tracker` plugin. If approved, install it and run `init`.
  It preserves the stage folders `01-backlog/` through `04-archived/`, adds
  structured records and validation, and safely adopts existing folders. Pairs
  with the `work-item-folders.md` rule copied in Gate 5.
- Ask separately whether the owner wants local Git tracking only or an optional
  GitHub Project mirror. Creating or changing GitHub issues, labels, fields, or
  Project items requires explicit approval.
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

**Gate 2: Hooks**
- What needs guarding or automating? (deploy/env guard, secret guard,
  session-start orientation, format/lint)
- Confirm exact trigger + action per hook; tell the user how to verify it fires.
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
- Treat Graphify as an optional analysis aid, not required memory
  infrastructure or automatic truth.

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
- MCP tool rules from `mcp-best-practices.md` are conditional: fold in a server's
  section only if the project uses that MCP server.
- Write a thin CLAUDE.md _with_ the user: what it is, codemap and structural
  pointers, a `Read .claude/rules` line, which gates ran. Add a
  `.claude/rules/README.md` index.
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
