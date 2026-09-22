# Part B: which protocols in the rest of the toolkit to force

Scope: everything except the Knowledge System (Part A) and the output style (Part C). Written 2026-09-22 by a read-only Opus helper. These are proposals, not decisions. "Confirmed" means read in a file or the function-hook declarations; "unknown" means not tested.

Terms used below:

- **Function hook**: a TypeScript function in a plugin that wraps a Claude Code event (T5 on #396).
- **Engine fact**: something Claude Code reports, such as which skill loaded, which tool ran, the file path or command it was given, or whether a turn is ending.
- **Model judgment**: a small model (for example Haiku) reads the owning rule's current text plus the relevant messages and picks a label. It never rewrites the reply.
- **Permission rule**: an `allow`, `ask`, or `deny` entry in a settings file. Claude Code enforces it with no code, with or without function hooks. `deny` works in every mode; `ask` shows Mike a permission prompt (confirmed in the captured `permissions.md` and `permission-modes.md`, 2026-09-22; `ask` does not prompt in `bypassPermissions` mode).

## 1. Protocols to force with function hooks

Every line is a candidate data line in the protocol list. "Hold the reply" means the `turn.step` hook drops the draft before Mike sees it and tells the main agent what to do; the agent redoes the step itself. All run on the main agent only unless noted. Codex gets none of these, only the written instruction.

| # | Protocol | Trigger | Owner (its current text is what the check reads) | Check | Event | On failure |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Save Mike's decisions in their home before moving on | Mike's message gives a decision, requirement, correction, answer, or approval, in a project with a tracker | `work-item-stages.md`, section "Capture during the conversation"; the `work` skill for local items | Model judgment on Mike's message against that section. Engine fact: a write to the tracker or the linked document in the same turn (the `work.mjs` command, `gh issue edit/comment`, `mcp__github__issue_write` or comment tools, Edit/Write on `knowledge/prds/**`, `docs/designs/**`, `.work-items/**`) | `prompt.submit` (judge, store label), `tool.call` (record writes), `turn.step` at turn end | Hold the reply. Tell the agent: save the decision in its home and read it back, or say plainly in the reply that it is not saved and why |
| P2 | Mike approves before a work item is marked Done | Closing an item: `gh issue close`, `mcp__github__issue_write` with state closed, `work finish` | `work-item-stages.md`, "Finish or cancel honestly"; `work` skill, "Finish honestly" | Model judgment on the recent messages against that section: did Mike approve this result (a clear earlier approval counts)? | `tool.call` (with `.catch` returning deny, so it fails closed) | Refuse the call. Tell the agent to show Mike the result, gaps, and evidence and ask |
| P3 | A merge goes through the merge skill | `gh pr merge`, `mcp__github__merge_pull_request`, `mcp__github__enable_pr_auto_merge` | `parallel-agent-sessions.md`, "Landing work"; `merge-and-clean-up` skill (it owns the approval and safety preflight, and reads project rules such as this repo's standing merge instruction D9) | Engine fact: `merge-and-clean-up` was loaded this session | `skill.prompt`, `tool.call` | Refuse the call. Tell the agent to open `merge-and-clean-up` |
| P4 | Read the Claude Code page before building a Claude Code thing (this repo only) | Write or Edit on a hook, `SKILL.md`, plugin or marketplace manifest, agent, command, output style, `hooks.json`, or settings file (path list is data) | `.claude/rules/claude-code-docs-first.md` | Engine fact: some file under `ai-external-knowledge/claude-code/` was read this session. Which page is right stays the agent's judgment | `tool.call` (Read records; Write/Edit checks) | Refuse the edit. Tell the agent to read the covering page; the index is `ai-external-knowledge/claude-code/README.md` |
| P5 | Handoff runs its steps in order | The `handoff` skill is loaded (not `/handoff check`), and a reply contains the finished handoff prompt | `handoff` skill, steps 1 to 7 | Engine facts since the skill loaded: `knowledge-save` (or legacy `remember`) loaded when `knowledge/knowledge-manual.md` exists; a `handoff-verifier` agent was started. Model judgment: does this reply contain the finished prompt? | `skill.prompt`, `agent.spawn`, `turn.step` | Hold the reply. Load `knowledge-save` with an injected Skill call (tested in T5 run I), or tell the agent to run the verifier. The skill already says a failed verifier does not block, so only "not started" fails |
| P6 | Offer a handoff before Mike clears a loaded session | Mike types `/clear` after substantial work (engine fact, for example a tool-call count or `session.measure`), and `handoff` was not loaded this session | `offer-context-handoff.md`; `handoff` skill | Engine facts only | `command.run` with command `clear` | Answer in place of `/clear`: "Not cleared. Type /handoff to save first, or /clear again to clear anyway." A second `/clear` passes. **Unknown:** whether the built-in `/clear` passes through `command.run`. The declaration says it fires for "`/name args` typed" and uses `compact` as an example. Needs a test, and Mike's OK, because it adds a step to his own action |
| P7 | The toolkit manual is read in full at start and after compaction | First tool call or reply of a session; again after `session.compact` or `/clear` | `toolkit-session-start.mjs` route; Toolkit Operating System R6 | Engine fact: Read calls on `knowledge/toolkit-manual.md` covering every line since the last start or compaction | `session.start`, `session.compact`, `tool.call` (Read), `turn.step` | Refuse the first other tool call, or hold the first reply and inject the Read. This replaces the request to "briefly acknowledge receipt". Merge with Part A's startup reads into one protocol line |
| P8 | An authorized documentation save is published, not left local | A turn ends after Write/Edit on a documentation path (`knowledge/`, `docs/`, README) in the default-branch checkout, with no later `git push` in the session | `knowledge-direct-commit.md` | Engine facts: file paths, whether the checkout is a worktree (the `.git` file), Bash calls. The save's authority stays the agent's judgment | `tool.call`, `turn.step` | Hold the reply. Tell the agent to finish the publication route, or say plainly that it is not published and why. Coordinate with Part A, which owns `knowledge/` saves. Lower confidence than P1 to P5 |
| P9 | Outbound text is humanized | A call that sends text to someone other than Mike: email, chat, client documents, GitHub or Linear text (tool list is data) | `humanize-outbound-text.md` | Engine fact: `humanizer` loaded this turn. Model judgment: is this text outbound under the rule's current text? | `tool.call` | Refuse the send. **Do not force until two conflicts are fixed** (section 5, items 4 and 5) |

Optional, low value per check: before `git commit`, an engine-fact check that `git diff --cached` (or `--staged`) ran after the last `git add` ("Stage only your work" asks for a full staged-diff read). Also optional: a System Guide version of the Part A save check (writes under the configured `guidePath` need the `system-guide` skill loaded), only in projects with a configured guide. This repository has none.

## 2. Protocols to force with permission rules, not function hooks

These need no code and work when function hooks are off. They ship through the project settings that `project-init` and `project-sync` already manage.

| Protocol | Owner | Rule |
| --- | --- | --- |
| Stage only named paths | `parallel-agent-sessions.md` "Stage only your work"; `knowledge-direct-commit.md` step 4 | `deny`: `Bash(git add -A *)`, `Bash(git add --all *)`, `Bash(git add .)`, `Bash(git add . *)`, `Bash(git commit -a *)`, `Bash(git commit -am *)`, `Bash(git commit --all *)` |
| Never force-push | `knowledge-direct-commit.md` "Recover without losing work" | `deny`: `Bash(git push --force *)`, `Bash(git push -f *)`, `Bash(git push --force-with-lease *)` |
| No reset or clean in the shared checkout without Mike | `parallel-agent-sessions.md`; `reset-to-remote` skill | `ask`: `Bash(git reset --hard *)`, `Bash(git clean *)` |
| Sandbox deploy needs Mike's yes | `salesforce-safety-guardrails.md` ("confirm each time") | `ask`: `Bash(sf project deploy start *)` and the PowerShell form. The permission prompt is the approval, so the agent stops asking in chat and stops pasting the command |
| No data writes or anonymous Apex without Mike's yes; never deletes | `salesforce-safety-guardrails.md`; `data-change-handoff.md` | `ask`: `sf data create/update/delete/import/upsert`, `sf apex run`. `deny`: `sf project delete source`, `sf org delete`, legacy `force:source:push`, `force:source:deploy`, `force:mdapi:deploy`. Production data writes: extend `guard-protected-orgs.js` to deny them, which the rule's own coverage note says it does not do today |

## 3. Already forced today; keep as is

- `guard-protected-orgs.js` (production deploy confirm) and `guard-permission-set-deploy.js` (preflight receipt): real guards, both modes. Keep.
- `no-ai-attribution-guard.mjs` plus the `attribution` setting: keep.
- Subagents on Opus: already forced by `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`. No hook needed.
- Build and data-load requirements approval in the local tracker: the `work` CLI already refuses. GitHub mode stays judgment.

## 4. Areas that need nothing forced

- **`project-init`, `project-sync`, `machine-sync`**: Mike types these commands, each loads its own instructions, and each gate waits for Mike's yes. The toolkit map already uses this reasoning for `/handoff`.
- **`git-workflows` skills**: Mike types them; their destructive steps are covered by the permission rules in section 2.
- **`requirements-helper`, `solution-design`, `work-guide`, `spec-check`**: Mike is in the conversation at every step, so a miss is visible to him. `spec-check` became optional on 2026-08-31 (`spec-before-you-build` removed); keep `spec-check-reminder` as a reminder.
- **Agent-led delivery offer** (`work` skill, `agent-led-delivery.md`): "substantial" is judgment, a miss is visible and cheap, and Mike said on 2026-09-21 for #377 "nothing new built: no code, state, hook, or detection logic" (`guided-work-management.md` Notes). Recommend not forcing it. Ask Mike if he wants otherwise.
- **Read the active item before substantial work**: #270 retired the stage reminder "without a replacement hook". P1 and P2 cover the moments that matter.
- **Salesforce convention rules** (`deploy-hitchhiker-check`, `salesforce-change-clarify`, `component-tracker`, `deployment-runbook`, `production-data`): judgment about what a deploy or change means. The permission prompt in section 2 gives Mike the moment to stop a deploy.
- **Parallel-session "Look first"** and worktree choice: judgment about implementation versus documentation. Not forced.
- **Folder instruction files, `ai-external-knowledge.md`, `dependency-graph.md`**: no must-every-time step.

## 5. Existing command hooks: replace or keep as backup

When `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` is off, every command hook below stays as it is.

| Command hook | With function hooks on |
| --- | --- |
| `second-brain/hooks/work-item-close.mjs` (holds `gh issue close` and `gh pr merge` once for a knowledge review) | Keep. Its purpose is the knowledge review (Part A). P2 and P3 add real refusals beside it; the hold alone accepts a plain retry |
| `second-brain/hooks/save-reminder.mjs` (holds `gh pr create`; warns when the diff is only `knowledge/`) | Keep; Part A decides. The knowledge-only check is a Git fact a function hook cannot compute (modules run with "no Node", so no `git` call) |
| `project-init/library/hooks/toolkit-session-start.mjs` | SessionStart pointer: keep as backup. Its acknowledgment request and the 22-word per-message "Toolkit workflow reminder": drop when P7 is on |
| `hooks-library/hooks/spec-check-reminder.mjs` | Keep as a reminder. Not forced |
| `hooks-library` Salesforce guards, `no-ai-attribution-guard.mjs` | Keep in both modes |
| `system-guide/hooks/system-guide-session-start.mjs` | Keep |
| `style-handshake.mjs` | Part C |

## 6. Always-loaded text that repeats a skill's how-to

Proposal: always-loaded files say only when to open the owner; the how-to stays in the owner.

1. `work-item-stages.md` (2,337 words, loads every session): "Offer responsibility for delivery" repeats `agent-led-delivery.md`, including the exact question. "One work-item record" repeats `record-format.md`. "Update the chosen tracker" repeats the `work` skill's commands and the GitHub steps. "Leave a usable handoff" repeats `handoff` step 1. T3 found the GitHub and "another tracker" parts are unused in a local-tracker project.
2. `knowledge/toolkit-manual.md` and its shipped template `library/templates/toolkit-manual.md` (lines 140 to 155): the delivery-offer paragraph repeats the team-arrangement and archive questions; the "Decide the change" paragraph repeats the PRD/design Notes and capture steps from `work-item-stages.md` and `work-guide`; the `WORK-ITEM.md` section list repeats `record-format.md`.
3. `knowledge-direct-commit.md` (639 words) holds the five-step publication how-to in an always-loaded rule, and the same steps appear in `parallel-agent-sessions.md`, TOS R25, and root `AGENTS.md` (T3: five places). No skill owns it. Option: move the steps into a skill (for example in `git-workflows`) and keep one "when" line in the rule.
4. `offer-context-handoff.md` restates the handoff order. With P5 and P6 it can shrink to when to offer.
5. Root `AGENTS.md` "Toolkit orientation" repeats the session-start hook's read-and-acknowledge instructions, and "Where work is tracked" repeats the GitHub mode of `work-item-stages.md`.
6. `salesforce-safety-guardrails.md` "How it is enforced" describes hook internals that `hooks-library` guides own.

## 7. Conflicts between rules

1. **Save-state reporting versus "leave out how you did the work".** `work-item-stages.md` ("Report failed writes as `not saved`..."), `knowledge-direct-commit.md` ("report what is written, checked, committed, and remotely published separately"), TOS R20, `requirements-helper` and `solution-design` ("lead with not saved") all ask for save reporting. Proposal: report only a failure or a pending save, in one line; say nothing on success, because P1 and P8 check the save.
2. **Startup acknowledgment versus "start with the answer".** `toolkit-session-start.mjs` ("briefly acknowledge receipt and intent"), root `AGENTS.md`, and TOS R6 ask for it; the style and the style handshake forbid it. P7 makes it unnecessary.
3. **Chat approval versus the permission prompt.** `salesforce-safety-guardrails.md` ("confirm each time") and `data-change-handoff.md` ("the owner says yes in that same chat") ask for a chat yes, and a guard can also prompt. Proposal: the permission prompt is the approval (section 2). DragonFly's "exact command shown in the current chat" rule is Part E; the toolkit's rules do not carry that line (checked by search).
4. **`humanize-outbound-text.md` lists "GitHub issues" and "pull request descriptions" as covered, and "work items" as exempt.** In a GitHub-tracked project, including this one, the work item is a GitHub issue and Mike reads the pull requests. Mike needs to say which wins.
5. **`humanize-outbound-text.md` falls back to `unslop`, but `unslop` says "Runs only when asked, never on its own"** and waits for Mike's approval before writing. `humanizer` is not shipped by the toolkit. A forced step cannot use `unslop` as written.
6. **The build principle versus #396.** TOS section 5 says a hook "does not judge the substance of that work" and must not "infer from its replies whether it understood or performed the work correctly". P1, P2, P5, and P9 use a model to judge. Mike's #396 direction allows this; the PRD text does not yet.
7. **"Nothing can catch `/clear`"** in `docs/toolkit-map.md` ("handoff versus the second-brain pull-request reminder") and `offer-context-handoff.md` becomes false if P6 works.
8. **`hooks-library/README.md`**: "Do not ship a fourth [per-message voice reminder] without the owner asking for it in his own words." Mike asked in #396. Part C owns the change.

## 8. Requirement wording that would need to change

- **TOS section 5, "Design principle: guide the agent through handshakes"**: allow engine-fact checks and model judgment against the owning rule's current text, still with no code that replaces the agent's reasoning and no model rewrite of the reply. The build philosophy paragraph (D0) can stay.
- **TOS R6**: replace "The agent acknowledges that it received and read the orientation" with evidence of the complete read (P7).
- **TOS R19**: say that a forced check counts as a safeguard only when tested with function hooks on, that with them off the command hooks are reminders, and that Codex gets instructions only.
- **TOS R20 and the conflicts row "Hard refusals and lightweight work"** ("do not add blanket process gates here"): state the reporting rule from section 7 item 1, and that the protocol list is judged line by line, not a blanket gate.
- **`work-item-upkeep.md`**: "The late stage-reminder hook is retired without a replacement hook" and "The existing lifecycle rule, work skill, CLI, and handoff skill carry this behavior" need to name P1 and P2.
- **`guided-work-management.md` R1 and R6**: no change if the delivery offer stays unforced. If Mike wants it forced, the #377 note "no code, state, hook, or detection logic" must change.
- **`guided-delivery.md`** "Save under existing authorization before moving past a meaningful topic": no wording change; P1 enforces it.
- **`system-guide.md` R10**: add the forced check only if a guide is configured somewhere and Mike wants it.

## 9. Unknown

- Whether built-in `/clear` passes through `command.run` (P6).
- Whether `$.store` is shared between the main agent and helper agents, which decides whether a helper's Read counts for P4 and P7.
- How often the P1 judge flags a message with no decision in it, and the cost of one small-model call per message from Mike.
- Behavior in the desktop app, on Windows, and interactively (T5 tested print mode only).
