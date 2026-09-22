# Protocol enforcement with function hooks

Design for [issue #396](https://github.com/Mar5929/claude-toolkit/issues/396).
The issue body owns scope, status and approvals. This file says how the
approved requirements are built. Decisions marked "approved" cite Mike and a
date in the issue body. Everything else is proposed.

Revised 2026-09-22 (task T8) to fact checks only. The earlier plan, its four
helper parts, and the prototype source are in Git history at commit `fc43f65`.
They used a small model to judge replies and commands, so they no longer fit.

## Summary

- Agents skip required steps while they work. Reminders do not fix this.
- A new plugin, `protocol-guard`, uses Claude Code function hooks to check
  facts Claude Code reports: which skill was opened, which file was read or
  written, which command or tool ran.
- No model judges anything. A step that can only be seen by its meaning is
  not forced.
- On a failed check, the tool call is refused or the reply is held, and the
  main agent redoes the step itself.
- Before any hook work, the startup cut removes most always-loaded text and
  rewrites rules, manuals and skills in simplified technical English.
- Today's command hooks stay as the backup. Codex gets instructions only.

## Approved decisions this design follows

All from the #396 body, Mike, 2026-09-22:

- Requirements 1 to 13.
- Function hooks with fact checks only. No small model (requirement 5).
- The reply check and the output style belong to #391.
- Startup reads only `SOUL.md`, `knowledge/project.md` and
  `knowledge/memory/current.md`. The manuals are reference. Skills carry
  their steps. This replaces protocol K1 of the earlier plan.
- The startup cut is built first, before the function-hook phases. It
  includes the shipped Salesforce rules.
- #396 owns the one rewrite of rules, manuals and skills (T11).
- The T9 file plan and the T10 Salesforce plan, with all recommendations.
- Salesforce: sandbox data writes and `sf apex run` are allowed with the
  owner's yes in the same chat; production stays never. The skills
  `sf-component-tracker`, `sf-deploy-check` and `sf-data-change` ship in a
  library folder that `project-init` and `project-sync` install. Manual
  deploy steps go in `manual-steps.md` in the work item's manifest folder.
- Codex setup: each project skill is installed twice, with portable
  frontmatter, a copy-match test, no symlinks, no mirrored rules, and one
  AGENTS.md line per `paths:` rule.

## How each requirement is met

| # | Requirement | How |
| --- | --- | --- |
| 1 | Required steps are forced | Fact checks in `protocol-guard` (steps 5 and 6) |
| 2 | Only required steps are forced | A short protocol list. Judgment steps stay unforced |
| 3 | Checks look at what happened | Every check reads tool calls, skill loads and file paths |
| 4 | No code replaces reasoning | No keyword, regular-expression or semantic matching of language |
| 5 | No small model | No model call in the engine |
| 6 | Checks do not go stale | Protocols are data that name their owner. A test fails when an owner is missing |
| 7 | Less always-loaded text | Startup cut: about 19,100 words to about 4,300 in DragonFly |
| 8 | Working memory stays current | Protocol CW |
| 9 | Memory saves use `knowledge-save` | Protocol K4, including the pending-memory file |
| 10 | Command hooks stay; Codex gets instructions | Backup field; no Codex marketplace entry |
| 11 | DragonFly later | Roadmap step 7 |
| 12 | Architecture scope | Style work stays in #391 |
| 13 | Startup files cut and rewritten | Roadmap step 4 |

## Fact checks

### What counts as a fact

- A skill loaded: its name, from the Skill tool, `/name`, or a Read of its
  `SKILL.md`.
- A file read: path, and which lines out of the total.
- A file written: path, from Write, Edit, MultiEdit or NotebookEdit.
- A tool called: tool name and its arguments, such as a GitHub tool with
  state `closed`.
- A shell command: its program, subcommand and file arguments, such as
  `gh issue close` or a path under `knowledge/memory/`. Proposed, see open
  decision 7.
- The turn is ending, and which agent made a call.

### Protocols forced

IDs follow the earlier plan. All are proposed in detail; the direction is
approved.

| ID | Protocol | Trigger | Check | On failure | Step |
| --- | --- | --- | --- | --- | --- |
| K4 | Knowledge files change only with `knowledge-save` open | Write to `knowledge/memory-inbox.md`, `knowledge/memory/**`, `knowledge/prds/**`, `knowledge/memory-self-improvement.md`; a shell command naming those paths | Skill opened this turn for the inbox; since the last reset for other files (open decision 5) | Call refused | 5 |
| CW | Working memory follows the current focus | A turn ends after a work item was created, closed, or changed stage (`gh`, GitHub tools, `work`) | `knowledge/memory/current.md` written this turn | Reply held; `knowledge-save` opened for the agent | 5 |
| K5 | Generated indexes are not edited by hand | Write to `memory-index.md`, `prd-index.md`, `ai-external-knowledge/README.md` | The path | Call refused; run the index builder | 5 |
| K6 | Indexes rebuilt and checker run after a knowledge write | A turn ends after a K4 write | `build-knowledge-index.mjs` and `check-knowledge.mjs` ran after the last K4 write | Reply held | 5 |
| K7 | Save review before a pull request, closing an item, or a merge | `gh pr create`, `gh issue close`, `gh pr merge`, `work finish`, the matching GitHub tools | `knowledge-save` opened this turn | Call refused | 6 |
| P2 | Closing an item goes through the `work` skill | Same close commands and tools | `work` opened this turn. The skill asks for Mike's approval | Call refused | 6 |
| P3 | A merge goes through `merge-and-clean-up` | `gh pr merge`, GitHub merge and auto-merge tools | Skill opened this session | Call refused | 6 |

The DragonFly failure is caught by K4: a save card must be written to the
pending-memory file (`knowledge/memory-inbox.md`) first, and that write is
refused until `knowledge-save` is open.

Later candidates, each only with Mike's yes after a real failure:

- **K1 startup reads.** The first Write, Edit, Bash or Agent call after a
  reset is refused until `SOUL.md`, `knowledge/project.md` and
  `knowledge/memory/current.md` were read in full. No other file is checked.
- **P4.** In this repo, editing a hook, skill, manifest or settings file needs
  a page under `ai-external-knowledge/claude-code/` read this session.
- **P6.** `/clear` after substantial work with no handoff is answered once.
  Untested whether `/clear` reaches the hook.
- **P8.** A documentation write in the default-branch checkout is pushed before
  the turn ends.

### Protocols dropped

Most needed a model to recognize meaning.

- **K3, save card in the reply.** Seeing a card needs a model. K4 on the
  inbox write covers it.
- **K2, P7, full reads of the manuals and indexes.** Replaced by the approved
  three-file startup read.
- **P1, recording Mike's decisions.** Seeing a decision in Mike's message
  needs a model. See open decision 8.
- **P2 approval part.** Seeing Mike's approval needs a model. P2 now forces
  the `work` skill, which asks.
- **P5, handoff order.** Seeing a finished handoff prompt needs a model.
- **P9, outbound text.** Seeing outbound text needs a model.
- **S1, reply style.** Moved to #391.

### Not forced

What counts as memory, where it goes, what to look up, and how to word it.
The quiet end-of-turn review. The agent-led delivery offer. Requirements and
design conversations. Salesforce convention rules. Helper agents' replies.

## The engine

- **Plugin.** `plugins/protocol-guard/`: `.claude-plugin/plugin.json`,
  `hooks/hooks.json`, `hooks/engine.ts`, `protocols.default.json`, `tests/`,
  `tsconfig.json`, `README.md`. No skills. No always-loaded text.
- **Protocol list.** JSON. Each entry has `name`, `why`, `owner` (skill or
  file), optional `appliesIf`, `on` (trigger), `require` (facts), `tell`.
  A project's changes go in `.claude/protocols.json`: `off` and `protocols`.
  A new trigger or fact word is an engine code change.
- **Events.** `session.start` loads the list. `turn.start` clears the turn
  record. `skill.prompt` and `tool.call` on Skill and Read record what was
  opened or read. `tool.call` on write tools, Bash and named tools refuses a
  call. `turn.step` holds the final reply when a turn-end fact fails.
  `turn.complete` shows the one-line notice. `session.compact` resets.
- **Redo.** A refusal returns the protocol's `tell`. A held reply is dropped
  before display, a Skill call for the owner is inserted, and a note says what
  failed. The main agent writes the reply again.
- **Limits.** One hold per protocol per turn, then the reply is shown with a
  notice (open decision 3). Tool checks fail closed. After two engine errors
  in one turn, calls pass for the rest of that turn. The reply hold fails
  open: on any error the reply is shown unchanged.
- **State.** Kept in module memory by session. Not `$.store`, which one file
  shares across every session on the computer.
- **Backup.** The engine adds `toolkit_protocol_engine` (version, active
  protocols) to the input of the classic `UserPromptSubmit` and `Stop` hooks.
  An old command hook skips only the part an active protocol replaces. With
  the variable off, the field is absent and every old hook runs as today.
- **Turning it on.** `project-sync` writes
  `"env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" }` and
  `"enabledPlugins": { "protocol-guard@claude-toolkit": true }` into the
  project's `.claude/settings.json`. `machine-sync` does not set the variable,
  because in user settings it turns on function hooks for every plugin.
- **API drift.** `tests/protocol-guard-check.mjs` regenerates the declarations
  with `/plugin-types`, type-checks the engine, runs `claude plugin validate`
  and `claude plugin test`, and checks that each named owner exists. It skips
  when `claude` is missing.

Tested in T5 and the earlier prototype, on Claude Code 2.1.280, print mode:
project `env` turns function hooks on (also in an interactive trusted
folder); a write was refused until a skill was opened; a reply was held and
redone; the classic-hook field reached command hooks; the fail-open reply hold
and the fail-closed tool check with its error limit; the `turn.complete`
notice; the four drift-test steps.

## Roadmap step 4: the startup cut

Starts after #391's PR #398 merges. It starts from #398's hook text, not
today's. One pull request, or one per table below if review needs it.

### Rules for the cut

- Every file listed is a shipped original. Installed copies follow through
  the normal sync.
- Each "after" text is a draft. The implementing agent finishes it in
  simplified technical English: short sentences, one instruction per line.
- A rule with `paths:` loads when the agent reads a matching file, not when it
  writes one (`ai-external-knowledge/claude-code/memory.md`, "Path-specific
  rules"). So a trigger that must fire when the agent creates something stays
  always-loaded, as one line that names its skill. `knowledge-save` carries
  the trigger for new knowledge files.
- Codex has no `paths:` scoping. AGENTS.md gets one line per `paths:` rule:
  the path pattern and the rule file.
- Full draft text: [T9 comment](https://github.com/Mar5929/claude-toolkit/issues/396#issuecomment-5784658005),
  [T10 summary](https://github.com/Mar5929/claude-toolkit/issues/396#issuecomment-5784753026),
  [T10 full drafts](https://github.com/Mar5929/claude-toolkit/issues/396#issuecomment-5784760700),
  [T12 Codex research](https://github.com/Mar5929/claude-toolkit/issues/396#issuecomment-5784993291).

### General files (T9, approved)

| File | Now | After |
| --- | --- | --- |
| `plugins/project-init/library/hooks/toolkit-session-start.mjs` | 123 words at start, 22 per message; full manual read and acknowledgment | About 80 words at start only; per-message registration removed; manual is reference |
| `plugins/second-brain/hooks/knowledge-session-start.mjs` | Six files read in full, about 5,900 words; confirmation | Three files: `SOUL.md`, `knowledge/project.md`, `knowledge/memory/current.md`; check the inbox for unfinished saves |
| `plugins/project-init/skills/project-init/references/thin-agents-md.md` | AGENTS.md about 1,060 words; two read-and-acknowledge sections | About 400 words; one "Startup" section; one line per `paths:` rule |
| `plugins/project-init/library/templates/toolkit-manual.md` | 2,338 words, read at start | About 1,200 words, reference; 80-word "Summary" the hook prints; steps point to their skills |
| `plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md` | 2,950 words, read at start | About 1,200 words of policy; section 4 to `knowledge-find`; 6, 8, 9 to `knowledge-save`; 2 and 10 removed; `MANUAL_SHA256` changes |
| `plugins/project-init/library/rules/general/work-item-stages.md` | 2,337 words, always loaded | About 110 words; the rest to `plugins/work-tracker/skills/work/references/lifecycle.md` |
| `.../rules/general/knowledge-direct-commit.md` | 639 words, always loaded | About 90 words, `paths:` `knowledge/**`, `docs/**`, `**/README.md`; five steps to a skill in the `git-workflows` plugin |
| `.../rules/general/parallel-agent-sessions.md` | 454 words | About 150 words, one command per line |
| `.../rules/general/offer-context-handoff.md` | 295 words | About 40 words; points to `handoff` |
| `.claude/rules/README.md` (written by `project-init` SKILL.md line 464) | Loads as a rule | Moves to `.claude/RULES.md` |
| `plugins/second-brain/hooks/memory-reminder.mjs` | 272 words per message (before #398) | About 35 words: save settled decisions; open `knowledge-save` before any save |
| `knowledge-save` SKILL.md | "Already read at startup" | New description; loads `references/selection-and-cards.md` and manual section 5 itself |
| `knowledge-find` SKILL.md | Startup line | New description; startup line removed |
| `work` SKILL.md | No lifecycle reference | New description; gains `references/lifecycle.md` |
| `knowledge-review`, `handoff`, `work-item-lifecycle` | "Restore the core manual" | Name the one reference file each needs |
| `tests/startup-budget-check.mjs` | None | New: counts always-loaded words; fails above budget |
| `tests/knowledge-startup-check.mjs` | Six-file list | Three-file list, no "completely", new reminder text |
| `tests/toolkit-startup.test.mjs` | Checks the required reads and per-message hook | Those two checks removed |
| `tests/installed-copy-check.mjs`, `tests/orphan-check.mjs` | Old hash and README path | New manual hash, `RULES.md` move, new reference files |

Also updated: the general and Salesforce rules READMEs, `project-init` and
`project-sync` SKILL.md, `knowledge-setup/references/delivery.md`,
`docs/toolkit-map.md`, both manuals. Not changed: `humanize-outbound-text.md`,
`save-reminder.mjs`, `work-item-close.mjs`, `spec-check-reminder.mjs`,
`knowledge-completion.mjs`. `plain-english-artifacts.md` and
`style-handshake.mjs` belong to #391.

### Salesforce files (T10, approved)

Paths are under `plugins/project-init/library/rules/salesforce/`.
Always-loaded words go from 5,682 to about 800.

| File | Now | After |
| --- | --- | --- |
| `salesforce-safety-guardrails.md` | 1,029, always | About 341, always. Sandbox data writes and `sf apex run` allowed with the owner's yes in the same chat; production never. Enforcement paragraph matches `guard-protected-orgs.js` |
| `component-tracker.md` | 1,909, always | About 59, always; opens `sf-component-tracker` |
| `deploy-hitchhiker-check.md` | 908, always | About 95, always; opens `sf-deploy-check`; stops on a confirmed hitch-hiker |
| `data-change-handoff.md` | 637, always | About 129, always; no production writes by an agent; opens `sf-data-change` |
| `salesforce-change-clarify.md` | 194, always | About 103, always |
| `delivery-and-knowledge-boundary.md` | 150, always | About 75, always; the line the test checks stays exact |
| `permissions-source-control.md` | 1,186, path-scoped | About 289, same paths |
| `dependency-graph.md` | 765, path-scoped | About 168, same paths |
| `production-data.md` | 855, always | About 58, `paths:` `delivery/data/**`, `engagement/data/**` |
| `deployment-runbook.md` | 627, path-scoped | About 46; manual steps go in `manual-steps.md` in the work item's manifest folder |
| `README.md` (index, not loaded) | 1,116 | About 450 |
| `plugins/project-init/library/skills/salesforce/` (proposed path) | None | New `sf-component-tracker`, `sf-deploy-check`, `sf-data-change` |
| `plugins/project-init/skills/project-init/references/salesforce-project-scaffold.md` | Creates `delivery/data/backups/` | Creates `production-backups/` and `data-loads/` (T10 conflict C5) |

### Codex setup files (approved)

| File | Now | After |
| --- | --- | --- |
| `project-init` and `project-sync` SKILL.md | No project skills installed | Install each library skill to `.claude/skills/<name>/` and `.agents/skills/<name>/` |
| Library `SKILL.md` frontmatter | Not yet written | `name` and `description` only |
| Copy-match test (proposed: in `project-sync`'s audit, and a toolkit test on the library) | None | Fails when the two copies differ |
| `thin-agents-md.md` | Codex reads `.claude/rules` through one pointer | Pointer kept; one line per `paths:` rule |

No symlinks: Git on Windows checks them out as plain files. Rules are not
mirrored for Codex.

### Tests and done when

- The four checks, the new startup budget check, and `claude plugin validate .`
  pass.
- DragonFly startup load is about 4,300 words without the Salesforce rules.
- Each removed how-to is still in its owning skill.
- Still to test with a real `codex exec` run (T12): Codex picks a repo skill
  without being named; Claude-only frontmatter does not stop loading; Codex
  cloud loads repo and plugin skills; Codex follows a "when editing X, read
  rule Y" line.

## Roadmap step 5: hook phase 1 (K4, CW, K5, K6)

| File | Now | After |
| --- | --- | --- |
| `plugins/protocol-guard/` | None | New plugin, version `0.1.0` |
| `.claude-plugin/marketplace.json` | No entry | New entry; version bump |
| `plugins/AGENTS.md` | Both marketplaces updated per plugin | Records the Codex exception for `protocol-guard` |
| `tests/protocol-guard-check.mjs`, `tests/AGENTS.md` | None | New check and its row |
| `project-sync`, `project-init`, `setup-flow.md` | No function hooks | Write the `env` and `enabledPlugins` keys |
| `.claude/settings.json` (this repo) | No function hooks | Same keys |
| `knowledge-completion.mjs` | Blocks once for a recorded outcome | Skips its check while K4 and K6 are active |
| `memory-reminder.mjs` | Turn-review line | Skips the working-memory line while CW is active |
| `toolkit-operating-system.md` handshake principle, `knowledge-system.md` handshake principle, R3, R25 | "Check the acknowledgment" | "Check that the step happened, from facts Claude Code reports" |
| `README.md`, `docs/toolkit-map.md`, both manuals | No plugin | Name the plugin and when it checks |

Tests: offline plugin tests per protocol; print-mode runs; a helper that saves
after the main agent opened the skill; `/clear` and compaction resets; the
variable off. CW case: an issue created with no update to `current.md` is sent
back; a turn with no work-item change passes.

Done when: an inbox write without `knowledge-save` is refused; a work-item
change reaches `current.md` in the same turn; with the variable off nothing
changes.

## Roadmap step 6: hook phase 2 (K7, P2, P3)

| File | Now | After |
| --- | --- | --- |
| `protocols.default.json` | Phase 1 entries | Adds K7, P2, P3 |
| `engine.ts` | Files only | Named tools and close, merge, and pull-request commands |
| `command-parsing.mjs` | `CLOSES_WORK_ITEM` lists `gh issue close`, `gh pr merge` | Adds `work finish` |
| `work-item-close.mjs`, `save-reminder.mjs` | Hold once | Skip the parts K7 replaces; keep the knowledge-only branch message |
| `knowledge-system.md` R9, `work-item-upkeep.md` | Hold, then plain retry (D4) | Refused until the skill is open (open decision 10) |

Done when: each action by `gh`, by GitHub tool, and by `work finish` is refused
until its skill is open, and the old hooks skip those parts only while the engine
runs.

## Roadmap step 7: DragonFly's own rules

Separate and later (requirement 11). Project sync of DragonFly, then its own
conflicting rules. Lines marked as Mike's own words change only with his
approval. Test: a fresh DragonFly chat that repeats the 2026-09-22 situation,
on Windows and in the desktop app (roadmap step 8).

## Decisions answered by Mike

Mike accepted every recommendation below on 2026-09-22 ("yes to all").

1. **Plugin name.** Recommended: `protocol-guard`.
2. **Codex and the plugin.** Recommended: leave it out of
   `.agents/plugins/marketplace.json`, because Codex cannot run function hooks.
   Record the exception in `plugins/AGENTS.md`.
3. **One hold per step.** Recommended: one hold per protocol per turn, then
   the reply is shown with Claude Code's one-line notice. Tool refusals repeat.
4. **The agent does not mention checks.** Recommended: every engine note ends
   "Do not mention this check in your reply." Mike sees only the notice when a
   check still fails after its hold, and one line when function hooks are on
   but the engine is not running.
5. **When an opened skill counts.** Recommended: this turn for inbox writes and
   for K7, P2; since the last reset (start, `/clear`, compaction) for other
   knowledge files; this session for P3.
6. **When the agent cannot publish.** A cloud session may push only its own
   branch. Recommended: CW passes when `current.md` is written locally and the
   pending publication is recorded in the work item or handoff. The agent
   says once per session that the update is not on the default branch.
7. **Reading shell commands.** Recommended: yes. The engine reads a command's
   program, subcommand and path arguments, as today's command hooks do. It
   never reads the agent's words. Without this, K4 and K7 miss shell commands.
8. **P1, recording Mike's decisions.** No fact version exists. Recommended:
   not forced. The always-loaded capture line and CW cover it. Step 6 then
   covers approvals only.
9. **Save reporting.** Recommended: routine successful saves stay quiet; the
   agent speaks only when a save failed or is pending. Changes Knowledge System
   R3 and R4, Toolkit Operating System R20, and the rewritten rules.
10. **K7 refusal instead of hold-once.** Recommended: yes, with function hooks
    on. D4's hold-once stays as the backup.
11. **P6, catching `/clear`.** Recommended: test first; ship only if it works
    and Mike wants it.
12. **Permission rules.** Recommended: ship `deny` rules (stage everything,
    force push, Salesforce deletes) and `ask` rules (hard reset, `git clean`,
    sandbox deploys, data writes, `sf apex run`) in project settings. The
    approved same-chat yes stays the rule. `ask` does not prompt in
    `bypassPermissions` mode.
13. **DragonFly exact words for saves (step 7).** Recommended: follow
    `knowledge-save` (a faithful account), not exact words in five places.

## Risks and unknowns

- **No captured docs.** `ai-external-knowledge/claude-code/` has no function
  hook page. The source is the 2.1.280 declarations from `/plugin-types` (T5).
  The API is early access and may change in any release.
- **Command reading.** A function-hook module has no Node, so it may not
  import `command-parsing.mjs`. A test must compare both readers on one
  command list. A command that builds a path indirectly passes K4.
- **Limits of facts.** Opening a skill does not prove the agent followed it.
  A card shown without an inbox write is not caught. The quiet review leaves
  no trace when it finds nothing.
- **Not tested:** Windows, the desktop app, a first session in an untrusted
  folder, background-task turns, `/clear` through `command.run`, a real
  `knowledge-save` helper inheriting the opened skill.
- **Project `env`.** A later release could stop project settings from setting
  the variable. The drift test and the "engine not running" line show it.
- **Plugin reload** clears module memory, so a skill may need opening again.

## Notes

### Decisions and approval state

- Approved (Mike, 2026-09-22, issue body): requirements 1 to 13; fact checks
  only; startup reads of three files; cut first; one rewrite in #396; T9 and
  T10 with all recommendations; Salesforce C1, skills library, `manual-steps.md`;
  Codex two-copy setup.
- Withdrawn by the fact-check decision: the earlier plan's decisions 1 and 5
  (model principle and cost), and 17 (P9).
- Answered by approvals: earlier decisions 12 (startup reads), 13 (short
  reminder, T9 item 11), 20 (`git-workflows` skill, T9 item 7).
- Moved to #391: earlier decisions 8, 9, 11 and 21 (reader, pick, handshake,
  reply length).
- Approved (Mike, 2026-09-22, "yes to all"): decisions 1 to 13 in
  "Decisions answered by Mike", each as recommended.
- Proposed, not approved: the design as a whole (the protocol details, the
  engine, and the step 5 and 6 file plans) until Mike approves it.

### Open questions

- T12 `codex exec` checks, listed under step 4.
- How a first session in an untrusted folder loads the module.
- `humanize-outbound-text.md` still covers GitHub issues but exempts work
  items, and its `unslop` fallback runs only when asked. T9 leaves the file
  unchanged; this conflict is not resolved.

### Remaining document tasks

- T10 conflicts C5, C7 and C8. Fixes shown to Mike on 2026-09-22 as part of
  the T10 plan he approved:
  - C5: the scaffold creates `delivery/data/production-backups/` and
    `delivery/data/data-loads/`, matching `production-data.md`.
  - C7: remove the reference to the retired "ask before assuming" rule from
    `salesforce-change-clarify.md`, the "per the project's output style"
    reference from `data-change-handoff.md`, and the duplicate
    `permissions-source-control.md` entry in `component-tracker.md`.
  - C8: `dependency-graph.md` lines that edit project knowledge notes say
    "open `knowledge-save`" when those notes are in `knowledge/`.
- Mike approves the design as a whole.

### Resume point

Decisions 1 to 13 answered. Next: Mike approves the design. The build of step
4 waits for PR #398.
