# Setup flow: gate-by-gate checklist

Track progress against this during a `project-init` run. Every gate is optional;
mark it done, skipped, or deferred. Keep a live version of this visible to the user
so they always know where they are.

```
[ ] Gate 0 - Orient: read the working dir; identify stack & project state
[ ] Gate 1 - Scaffolding & folder structure
[ ] Gate 2 - Hooks (guards & automation)
[ ] Gate 3 - Memory system            (opt-in)
[ ] Gate 4 - Knowledge layer          (opt-in)
[ ] Gate 5 - CLAUDE.md + .claude/rules (copy general rules; write thin CLAUDE.md)
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
  (stage folders `01-backlog/`..`04-archived/`, a `BACKLOG.md` index, one
  folder per work item with `SPEC.md` + `STATUS.md`). Pairs with the
  `work-item-folders.md` rule copied in Gate 5.
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
- Does this project want durable long-term memory? (opt-in)
- If yes: install the toolkit's `second-brain` plugin and run its skill; it sets
  up the remote MCP memory server and asks a project-type question to pick a
  profile. Ground rules: the two curators own all writes; a Stop hook captures
  each turn; the curated digest is injected each session.
- Once memory is live, offer the `grill-me` skill to interview the owner and
  capture a project overview (Salesforce scaffold: save to
  `engagement/project-overview/`).

**Gate 4: Knowledge layer**
- Does this project want the knowledge layer? (opt-in)
- If yes: it ships inside the `second-brain` plugin (knowledge-curator agent,
  covers: SHA drift-pins); the Gate 3 profile sets the drift model. Skip the
  knowledge-curator to leave this layer off.

**Gate 5: CLAUDE.md and the rules folder**
- Behavioral rules go into the project's `.claude/rules/` as individual files,
  not into CLAUDE.md. See `thin-claudemd.md` and `general-rules/README.md`.
- Copy the general rules from `general-rules/` into `.claude/rules/`: every
  default-ON file unless the owner drops it, plus the two conditional files
  (memory, knowledge) only if Gate 3 or Gate 4 ran. Walk the list; let the owner
  accept, edit, or skip each.
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

**Wrap-up**
- Summarize done vs. skipped.
- List follow-ups from skipped/deferred gates.
- Port-back reminder: improvements to reusable systems get PR'd back to
  `claude-toolkit`.
