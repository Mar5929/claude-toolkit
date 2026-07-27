# Setup flow: gate-by-gate checklist

Track progress against this during a `project-init` run. Every gate is optional;
mark it done, skipped, or deferred. Keep a live version of this visible to the user
so they always know where they are.

```
[ ] Gate 0 - Orient: read the working dir; identify stack & project state
[ ] Gate 1 - Scaffolding, folder structure, and optional work-tracker
[ ] Gate 2 - Hooks (guards & automation)
[ ] Gate 3 - Memory system            (deferred: v1 retired, v2 not shipped)
[ ] Gate 4 - Knowledge layer          (deferred with Gate 3)
[ ] Gate 5 - CLAUDE.md + .claude/rules (copy general rules; write thin CLAUDE.md)
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
- Salesforce / SFDX: if the owner wants profiles or permission sets tracked in
  git, follow `salesforce-permissions-retrieval.md` (build the full component
  list, retrieve to a side folder, verify before committing) and copy the
  `permissions-source-control.md` rule from `salesforce-rules/`.

**Gate 2: Hooks**
- What needs guarding or automating? (deploy/env guard, secret guard,
  session-start orientation, format/lint)
- Confirm exact trigger + action per hook; tell the user how to verify it fires.
- Salesforce / SFDX: offer the ready-made production-org guard in
  `salesforce-prod-guard-hook.md` (confirms before deploys or destructive ops
  hit a production org; auto-detects production; tuned by a JSON policy file).

**Gate 3: Memory system**
- Mark deferred. V1 is retired and v2 is not shipped.
- Do not install a database, MCP connector, curators, capture, or recall.

**Gate 4: Knowledge layer**
- Mark deferred with Gate 3.
- Do not install the v1 knowledge-curator or drift hooks and do not improvise a
  partial v2 store.

**Gate 5: CLAUDE.md and the rules folder**
- Behavioral rules go into the project's `.claude/rules/` as individual files,
  not into CLAUDE.md. See `thin-claudemd.md` and `general-rules/README.md`.
- Copy the general rules from `general-rules/` into `.claude/rules/`: every
  default-ON file unless the owner drops it, plus the two conditional files
  (memory, knowledge) only if a production-ready memory or knowledge gate ran.
  While v2 is not shipped, neither conditional rule is added. Walk the list; let the
  owner accept, edit, or skip each.
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
  `.claude/rules/README.md` index. Reflect the memory/knowledge/hooks gates.

**Gate 6: Optional standalone toolkit skills**
- Offer `grill-me` for durable brainstorming and discovery interviews.
- If approved, install its plugin from the toolkit marketplace. Do not copy its
  skill instructions into the project.
- Record installed, skipped, or deferred so `project-sync` does not repeat a
  considered "no".

**Wrap-up**
- Summarize done vs. skipped.
- List follow-ups from skipped/deferred gates.
- Port-back reminder: improvements to reusable systems get PR'd back to
  `claude-toolkit`.
