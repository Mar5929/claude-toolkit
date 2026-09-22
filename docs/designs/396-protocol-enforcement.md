# Protocol enforcement with function hooks

Plan for [issue #396](https://github.com/Mar5929/claude-toolkit/issues/396),
written 2026-09-22 by Opus helpers for Mike's approval. The issue owns scope,
status, and approvals. Nothing here is approved or built. Detail stays in the
four parts:

- [Part A: Knowledge System protocols](396-protocol-enforcement/part-a-knowledge.md)
- [Part B: the rest of the toolkit](396-protocol-enforcement/part-b-toolkit.md)
- [Part C: the output style and the reply check](396-protocol-enforcement/part-c-style.md)
- [Part D: the protocol engine](396-protocol-enforcement/part-d-engine.md)
- Prototype source: [engine](396-protocol-enforcement/prototypes/engine/hooks/engine.ts)
  (Part D) and [reply check](396-protocol-enforcement/prototypes/reply-check/hooks/index.ts) (Part C)

## Summary

While an agent works on a task, standing duties drop out of its attention, so
reminders alone do not work. A check has to look at what actually happened,
not at the agent's own statement.

A new plugin, `protocol-guard`, uses Claude Code function hooks (TypeScript
functions that run inside Claude Code) to check a list of protocols. Each protocol is one data entry naming
when it applies and which skill or file owns the how-to.

The engine checks facts Claude Code reports: which skill was opened, which file
was read or written, which command ran. Where meaning is needed, a small model
answers one question against the owner's current text. On a failure, the tool
call is refused or the reply is held before Mike sees it, and the main agent
redoes the step. No model rewrites what Mike reads.

Phase 1 forces `knowledge-save` before a save card or knowledge write (this
would have caught the DragonFly card) and keeps current working memory up to
date. Phase 2 checks every final reply against the output style. Copied how-to
text and contradictions are removed. Today's command hooks stay as the
backup. Codex gets instructions only.

## Decisions for Mike

Each group names the first build phase that cannot start without those
answers. "Recommended" is the helpers' answer.

### Needed before phase 1

1. **Hook design principle.** The parent PRD says a hook "does not judge the
   substance of that work" and must not "infer from its replies whether it
   understood or performed the work correctly". A model question such as "is
   this a save card?" goes against that text. Question: change the principle
   to "a hook checks that a required step happened, using facts Claude Code
   reports; where a step can only be recognized by meaning, a model answers
   that one question against the owning skill's current text; hooks never
   judge the agent's reasoning and never rewrite its reply"? Yes: phase 1 can
   use model questions. No: only fact checks can ship, and the save card check
   (K3) cannot. Also updates the Knowledge System's "handshake principle",
   R3's limits, R25 (Codex), and Toolkit Operating System R19. Recommended:
   yes. Wording: [Part A section 4](396-protocol-enforcement/part-a-knowledge.md#4-prd-changes-to-propose-to-mike),
   changes 1 to 3 and 8; [Part B section 8](396-protocol-enforcement/part-b-toolkit.md#8-requirement-wording-that-would-need-to-change).
2. **Plugin name and Codex.** Name the plugin `protocol-guard` and leave it out
   of the Codex marketplace (`.agents/plugins/marketplace.json`), because Codex
   cannot run function hooks. The root `AGENTS.md` says to update both
   marketplaces when adding a plugin, so this is an exception to write down.
   Recommended: yes to both.
3. **A protocol against Mike's own explicit request.** In test R2, Mike's prompt
   asked for a card layout the skill forbids. The engine held the reply twice,
   then showed it with a notice. Answer A: hold once, then show the reply with a
   one-line notice (one extra model turn). Answer B: give the judge Mike's
   latest message and pass the check when he asked for something else; this
   lets the small model decide whether Mike or the skill wins. Recommended: A,
   with a limit of one hold per protocol per turn for every reply check (Part D
   default was 2; Part C found one send-back was always enough with Opus).
4. **Whether the agent tells Mike when a check held something.** In R1 and R2
   the agent told the reader "a hook blocked me". Recommended: every engine note
   to the agent ends "Do not mention this check in your reply". Mike sees only
   Claude Code's one-line notice when a protocol still fails after its retry,
   and one line when function hooks are on but the engine is not running.
5. **Cost of the model questions.** Each Bash command costs one Haiku call
   (about 0.5 to 1 second) while a shell protocol is not yet satisfied, because
   commands are judged by a model, not searched for paths. The reply check adds
   about 0.5 seconds to every final reply, and a sent-back reply adds about 9 to
   12 seconds. The current-work check (CW) adds one call at the end of each turn
   with real work. Protocol P1 (phase 4) adds one call per message from Mike. The
   alternative for Bash is searching the command text, which is text matching.
   Recommended: keep the model questions, use Haiku, and measure over real
   sessions before rollout.
6. **How long an opened skill counts for knowledge writes (K4).** "Since the
   last reset" (session start, `/clear`, or compaction) or "this turn".
   Recommended: since the last reset for file writes; this turn for save cards
   (K3), because the card layout is what went wrong.
7. **Current work when the agent cannot publish (CW).** The documentation rule
   says to publish knowledge edits directly to the default branch, but a cloud
   session may push only to its own branch. Proposed: the current-work check
   passes when `knowledge/memory/current.md` is written locally and the pending
   publication is recorded in the work item or handoff, as the documentation
   rule's recovery section asks; the agent tells Mike once per session
   that the update is not yet on the default branch. Recommended: yes.

### Needed before phase 2

8. **The reader.** The style would say "The user is smart and is not a
   developer." That replaces "junior software intern" (DragonFly's style) and
   "5 years old" (DragonFly `AGENTS.md` line 49, marked as Mike's own words, and
   `save-proposal-shape.md`). Mike approved the toolkit line in #391.
   Recommended: yes.
9. **A pick inside a question.** Part C's proposed style line says: "When you
   ask, the user must be able to decide from the reply alone: what each thing
   is, what each choice does, and which one you would pick." Mike deleted
   `recommend-the-best-solution` and said it stays deleted. Plain question: when
   the agent asks you to decide something, do you want it to say which option it
   would pick? Yes: the line keeps "and which one you would pick", and the reply
   check sends back a question without a pick. No: the words are removed, and
   the check still requires what each thing is and what each choice does. Part C
   proposed yes, citing Mike's DragonFly answer "It's whatever you recommend";
   the earlier T2 checklist left it out on purpose. No rule file comes back
   either way.
10. **Reporting saves.** Several rules ask the agent to report save state in
    the reply ("Confirm in one short line when the update is saved"). The style
    says to leave out how the work was done, and the reply check would send those
    lines back. Question: routine successful saves stay quiet, and the agent says
    only when something could not be saved or shared? Changes Knowledge System R3
    and R4, Toolkit Operating System R20, `work-item-stages.md`,
    `knowledge-direct-commit.md`, the knowledge manual section 2, and the
    `knowledge-save`, `requirements-helper` and `solution-design` skills.
    Recommended: yes.
11. **The style handshake.** Part C proposed that `style-handshake.mjs` go quiet
    while the reply check runs. On 2026-09-21 Mike decided the forced re-read
    stays on every message (Toolkit Operating System R26, decision D1, memory
    entry "Why the style handshake hook stays"). This plan keeps the handshake
    running in both modes and does not change R26. Recommended: keep it. Only
    Mike can reopen D1.

### Needed before phase 3

12. **Startup.** Replace the requests to "acknowledge" the startup reads with a
    check that the files were read in full (Toolkit Operating System R6; the
    two SessionStart hooks; root `AGENTS.md`). Also drop `memory-index.md` and
    `prd-index.md` from the full-read list, because Knowledge System R2 names
    three files and says the whole knowledge base is not loaded at start;
    `knowledge-find` opens the indexes when needed. Recommended: yes to both.
    The acknowledgment removal is needed in phase 2, because the reply check
    would send an acknowledgment back.
13. **The per-message knowledge reminder.** Knowledge System R9 and R29 say the
    reminder carries the memory criteria. Mike approved those criteria on
    2026-09-17. Proposed: the reminder carries Mike's owner direction sentence,
    "open `knowledge-save` before any proposal or save", and the two manual
    paths (about 45 words instead of 272). The criteria stay in the manual and
    the skill. Recommended: yes.
14. **The hold before a pull request, a finished item, or a merge (R9, D4).**
    Today the hold allows a plain retry. Proposed: the action is refused until
    `knowledge-save` was opened in the same turn, and `work finish` and the
    GitHub tools join the list. With function hooks off, D4's hold-once stays.
    Recommended: yes.

### Needed before phase 4

15. **Catching `/clear` (P6).** When Mike types `/clear` after substantial work
    with no handoff, the engine would answer instead: "Not cleared. Type
    /handoff to save first, or /clear again to clear anyway." It adds a step to
    Mike's own action, and it is untested whether `/clear` reaches the hook.
    Recommended: test it; ship only if it works and Mike wants it.
16. **Commands and the permission prompt.** Proposed: ship `deny` and `ask`
    permission rules through project settings (no staging everything, no force
    push, ask before `git reset --hard`, `git clean`, sandbox deploys, data
    writes and anonymous Apex; deny Salesforce deletes). The permission prompt
    shows the exact command and counts as Mike's approval, so the agent does not
    paste commands in chat unless he asks. Where no prompt appears (Codex), the
    command is shown in chat. Also changes DragonFly's "exact command shown in
    the current chat" rule (phase 6). Unknown: `ask` does not prompt in
    `bypassPermissions` mode. Recommended: yes.
17. **Outbound text (P9).** `humanize-outbound-text.md` covers GitHub issues and
    pull request descriptions but exempts work items, which are GitHub issues
    here. Its fallback, `unslop`, runs only when asked, so a forced step cannot
    use it. Question: which wins for issues, and what runs when `humanizer` is
    missing? Recommended: do not force P9 until both are answered.
18. **The agent-led delivery offer.** Recommended: not forced. "Substantial" is
    judgment, and Mike said for #377 "nothing new built: no code, state, hook,
    or detection logic".
19. **Candidates held back.** Proposed not now, added only after a real
    failure: inbox written before a destination write (R10), a false "saved"
    claim (R28), a staged-diff read before `git commit`, and a System Guide
    save check. Recommended: agree.
20. **The publication steps.** `knowledge-direct-commit.md` holds a five-step
    how-to in an always-loaded rule, repeated in five places. Option: move the
    steps into a `git-workflows` skill and keep one line saying when to open
    it. Recommended: yes, in phase 5.

### Needed before phase 6 (DragonFly)

21. **Reply length and question count.** Drop DragonFly's "Aim for 250 words
    max" and "at most one question" (Mike's words) when its style file is
    replaced by the toolkit's. The new "Ask only what needs the user" replaces
    the question limit. Recommended: drop both.
22. **Exact words for knowledge saves.** DragonFly says Mike approves the exact
    words in five places. `knowledge-save` asks for a faithful account unless
    exact words are requested. Answer A: follow the skill. Answer B: keep exact
    words as one standing request stated once. Recommended: A.

## Proposed requirements

These replace the five in the issue body. Proposed, not approved.

1. Before Mike sees the main agent's final reply, a model checks it against the
   current text of the selected style file. A reply that fails is not shown,
   and the main agent writes it again. Test: the DragonFly replies with "the
   5-item deploy" and the pasted `sf` commands are sent back; good replies pass.
2. A question that asks Mike to decide says what each thing is and what each
   choice does (and which option the agent would pick, if decision 9 is yes).
   Test: the DragonFly "5-item deploy" question is sent back.
3. Every protocol in the list is checked against what happened (a skill opened,
   a file read or written, a command run), not against the agent's statement.
   Test: a save card written without `knowledge-save` never reaches Mike; an
   inbox edit without the skill is refused.
4. Current working memory (`knowledge/memory/current.md`) is updated when the
   current focus changes. The agent's own "no change" statement is not
   accepted as evidence. Test: create a work item and record a decision in one
   turn without writing current work; the agent is sent back to update it.
5. When a check fails, the main agent redoes the step. No model writes text
   Mike reads. Test: the saved chat record holds only the main agent's text.
6. The code contains no keyword, regular-expression, or semantic matching of
   language. Checks read the owner's current text at run time. Adding or
   changing a protocol that uses existing vocabulary is a data edit. Test: code
   review; editing a skill's layout changes the next check without a code
   change.
7. Every check is bounded. Reply checks hold a reply at most once per protocol
   per turn, and a reply is never lost. Tool checks refuse on error, and let
   calls through after two errors in one turn. Test: forced errors and an
   unreachable judge.
8. Mike sees one line when a protocol still fails after its retry, and one line
   when function hooks are on but the engine is not running.
9. With `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` off, every current command hook
   works as it does today. Test: run with the variable unset.
10. Codex receives the instructions and today's command hooks, with no forced
    checks. The setup report says so.
11. Words loaded at session start and injected per message go down, not up.
    Always-loaded files say only when to open the owning skill. Test: count
    against the DragonFly baseline of about 19,100 words at start and 330 per
    message.
12. Each protocol names its owner, and a toolkit test fails when a named owner
    no longer exists or the Claude Code function-hook API changes.
13. Mike confirms the checks work in the Windows terminal and the Claude
    desktop app.

## How it works

Detail: [Part D](396-protocol-enforcement/part-d-engine.md).

### The protocol list

- **Format.** JSON, one entry per protocol, with `name`, `why`, `owner` (a
  skill or a file), optional `appliesIf` (for example "the project has
  `knowledge/knowledge-manual.md`"), `on` (the trigger), `require` (facts
  first, then model questions), `tell` (what the agent is told on failure),
  and `maxRetries`. Example entry and field list:
  [Part D section 1](396-protocol-enforcement/part-d-engine.md#1-the-protocol-list).
- **Where it lives.** The default list ships in the plugin as
  `plugins/protocol-guard/protocols.default.json`, so a new plugin version
  updates every project without a sync. A project's own changes go in
  `.claude/protocols.json`: `off` names defaults turned off, and `protocols`
  adds or replaces entries.
- **How a project edits it.** Mike asks the agent to turn a protocol off or add
  one. The agent edits `.claude/protocols.json` through the implementation
  route, because the file changes behavior. The change applies at the next
  session.
- **Vocabulary.** Triggers and requirements use a fixed set of words, such as
  `on.tool.files`, `on.reply.question`, and `owner-opened-this-turn`. A new
  word is an engine code change. The current-work check needs one new word:
  a turn ending after listed tool calls (a GitHub issue created or changed, a
  `work` command, a commit, or any file write).

### The engine

- **Events used.** `session.start` (load the list), `turn.start` (clear the
  turn record), `skill.prompt` and `tool.call` on Skill and Read (record what
  was opened or read, keep the owner's text), `tool.call` on Write, Edit,
  MultiEdit, NotebookEdit, Bash and named tools (refuse a call), `turn.step`
  on the main agent (hold and check the final reply), `turn.complete` (the
  one-line notice), `session.compact` (reset), and `classic.UserPromptSubmit`
  and `classic.Stop` (tell the old command hooks the engine is running).
- **Facts and model questions.** Code checks only facts: skill names, tool
  names, file paths, which agent made the call, and whether a turn is ending.
  Haiku answers yes or no with a reason, with the owner's current text in the
  prompt. Facts are checked first; the model is asked only when a fact fails
  or the check needs meaning. All model questions for one reply go in one
  request.
- **The main agent redoes the step.** A refused tool call returns the
  protocol's `tell`. A held reply is dropped before display. For a protocol
  owned by a skill, a Skill call for that skill is inserted, with a note that
  says what failed. For the style, the draft and the judge's reason go back
  through the plugin's own tool, and the agent writes the reply again
  ([Part C section 2](396-protocol-enforcement/part-c-style.md#2-the-reply-check)).
- **Retry limits.** One hold per protocol per turn (decision 3), then the reply
  is shown with a notice. Tool checks: two errors in a turn refuse, then calls
  pass for the rest of that turn.
- **Fail-safe rules.** Tool checks fail closed (`.catch` refuses). Reply checks
  fail open: all work sits inside the hook's own `try`, and on any error the
  held reply is shown unchanged, because a crash there ended the turn with no
  reply in testing. A bad project list falls back to the defaults. Per-turn
  state is kept in module memory by session, not `$.store`, which is one file
  shared by every session on the computer.
- **Backup.** The engine adds `toolkit_protocol_engine` (version and active
  protocols) to the input of the old `UserPromptSubmit` and `Stop` command
  hooks. A command hook skips only the part a running protocol replaces. With
  the setting off or the module failing to load, the field is absent and every
  old hook runs as today. Which parts step aside:
  [Part A section 5](396-protocol-enforcement/part-a-knowledge.md#5-backup-mapping-command-hooks)
  and [Part B section 5](396-protocol-enforcement/part-b-toolkit.md#5-existing-command-hooks-replace-or-keep-as-backup).
- **Turning it on.** `project-sync` writes
  `"env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" }` and
  `"enabledPlugins": { "protocol-guard@claude-toolkit": true }` into the
  project's `.claude/settings.json`. Tested in print mode and in an interactive
  terminal in a trusted folder. `machine-sync` does not set the variable,
  because in user settings it would turn on function hooks for every plugin.
- **Codex** gets the same instruction files and today's command hooks, and no
  forced checks.
- **Keeping up with the API.** A fifth check, `tests/protocol-guard-check.mjs`,
  regenerates the declarations with `/plugin-types`, type-checks the engine,
  runs `claude plugin validate` and `claude plugin test`, and checks the list.
  It skips when `claude` is not installed.

## What gets forced

IDs match the parts: K from Part A, P from Part B, S1 from Part C. CW was
added at Mike's request after the parts were written.

| ID | Protocol | Trigger | Owner | Check | On failure | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| K3 | A save card is shown only after `knowledge-save` and its card reference are open, in that layout, and kept in the inbox | A reply asks Mike to approve a change to project knowledge | `knowledge-save`, `references/selection-and-cards.md` | Model: is this a card? Facts this turn: skill opened, reference read, inbox written. Model: does the card follow the reference? | Reply dropped; skill opened for the agent; agent writes the card again | 1 |
| CW | Current working memory is kept up to date | A turn ends after tool calls that change the current focus: a work item created, closed, or moved to another stage (GitHub tools, `gh`, `work`), a decision recorded, a commit, or other real work | Knowledge manual section 2; the `knowledge-save` current-work template | Fact: which of those calls ran this turn, and whether `current.md` was written. Model: given what changed and the current text of `current.md`, does it need an update? | Reply held; agent opens `knowledge-save` and updates current work. If it cannot publish, it writes locally, records the pending publication, and tells Mike once (decision 7) | 1 |
| K4 | Knowledge files change only while `knowledge-save` is open | Write or Edit on memory entries, PRDs, the inbox, self-improvement, or current work; a Bash command the model says changes them | `knowledge-save` | Fact: skill opened since the last reset (in a helper: its own read of `SKILL.md`) | Call refused | 1 |
| S1 | The final reply follows the selected output style, including the decision line | The main agent's final reply in a turn | The selected style file | Model: the reply against the style file's current text and the last eight messages | Reply dropped; draft and reason handed back; agent writes it again | 2 |
| K1, K2, P7 | Startup files read in full: `SOUL.md`, `knowledge/project.md`, the two manuals, current work, the inbox | Session start, `/clear`, compaction | Knowledge manual section 2; Toolkit Operating System R6; Knowledge System R2, R3 | Fact: Read results cover every line since the last reset | First other tool call refused, or reply held; Read inserted | 3 |
| K5 | Generated indexes are never edited by hand | Write or Edit on `memory-index.md`, `prd-index.md`, `ai-external-knowledge/README.md` | Knowledge System R21 | Fact: the path | Call refused; run the index builder | 3 |
| K6 | After a knowledge change, rebuild the indexes and run the checker | A loop ends after a K4 write | `knowledge-save` step 5 | Fact: order of calls; model: which Bash calls are the builder and checker | Reply held; agent rebuilds and checks | 3 |
| K7 | Save review before a pull request, a finished item, or a merge | `gh pr create`, `gh issue close`, `gh pr merge`, `work finish`, GitHub tool calls | `knowledge-save`; Knowledge System R9 | Fact: `knowledge-save` opened this turn | Call refused | 3 |
| P2 | Mike approves before an item is marked Done | Closing an item by `gh`, GitHub tool, or `work finish` | `work-item-stages.md` "Finish or cancel honestly"; `work` skill | Model: did Mike approve this result in recent messages? | Call refused; agent shows the result and asks | 3 |
| P3 | A merge goes through `merge-and-clean-up` | `gh pr merge`, GitHub merge and auto-merge tools | `parallel-agent-sessions.md` "Landing work"; `merge-and-clean-up` | Fact: skill opened this session | Call refused | 3 |
| P1 | Mike's decisions are saved in their home before moving on | Mike's message holds a decision, requirement, correction, or approval, in a project with a tracker | `work-item-stages.md` "Capture during the conversation" | Model on Mike's message; fact: a tracker or document write in the same turn | Reply held; agent saves and reads back, or says it is not saved | 4 |
| P4 | Read the Claude Code page before building a Claude Code thing (this repo only) | Write or Edit on a hook, skill, manifest, agent, command, style, or settings file | `claude-code-docs-first.md` | Fact: a page under `ai-external-knowledge/claude-code/` read this session | Call refused | 4 |
| P5 | Handoff runs its steps in order | `handoff` open and a reply holds the finished prompt | `handoff` skill | Facts: `knowledge-save` opened, verifier started; model: is the prompt finished? | Reply held; missing step started | 4 |
| P8 | An authorized documentation save is published | A turn ends after a documentation write in the default-branch checkout with no later push | `knowledge-direct-commit.md` | Facts: paths, checkout type, Bash calls | Reply held; agent publishes or says it is not published | 4 |
| P6 | Offer a handoff before `/clear` | Mike types `/clear` after substantial work with no handoff | `offer-context-handoff.md`; `handoff` | Facts only | `/clear` answered once; a second `/clear` passes | 4, if decision 15 is yes |
| P9 | Outbound text is humanized | A call that sends text to someone other than Mike | `humanize-outbound-text.md` | Fact: `humanizer` opened; model: is this outbound? | Send refused | Not scheduled (decision 17) |

Also forced without function hooks, by permission rules in project settings:
staging and force-push limits, and prompts before resets, deploys, and data
writes (decision 16; [Part B section 2](396-protocol-enforcement/part-b-toolkit.md#2-protocols-to-force-with-permission-rules-not-function-hooks)).

Deliberately not forced: what counts as memory, where it goes, what to look
up, and how to word it; the quiet end-of-turn review (it leaves no trace when
it finds nothing); the delivery offer; requirements and design conversations
Mike takes part in; Salesforce convention rules; helper agents' replies to the
main agent.

## What gets removed or changed in instructions

- **Shortcuts that copy a skill's how-to.** Knowledge manual section 7's
  one-sentence card (the one DragonFly used) becomes "open `knowledge-save`
  before writing any proposal". Sections 4, 8 and 9 shrink to policy lines.
  `save-reminder.mjs` points to the skill, not the manual. The startup list
  loses the two indexes. In the toolkit: the repeated parts of
  `work-item-stages.md`, the toolkit manual's delivery and "decide the change"
  paragraphs, `offer-context-handoff.md`, root `AGENTS.md` orientation, and
  the hook internals in `salesforce-safety-guardrails.md`.
  [Part A section 3](396-protocol-enforcement/part-a-knowledge.md#3-shortcuts-to-remove),
  [Part B section 6](396-protocol-enforcement/part-b-toolkit.md#6-always-loaded-text-that-repeats-a-skills-how-to).
- **Contradictions.** The acknowledgment requests (knowledge reminder's last
  line, knowledge manual section 6, `toolkit-session-start.mjs`, root
  `AGENTS.md`); save-state reporting on success (decision 10); chat approval
  of an exact command against the permission prompt (decision 16); three
  descriptions of the reader (decision 8); `docs/toolkit-map.md` and
  `offer-context-handoff.md` saying nothing can catch `/clear` (if P6 ships);
  the `hooks-library` README limit on per-message voice reminders (the reply
  check adds nothing to messages that pass); the documentation rule's "publish
  directly to the default branch" against a cloud session that may push only
  its own branch (decision 7).
  [Part B section 7](396-protocol-enforcement/part-b-toolkit.md#7-conflicts-between-rules).
- **The style file.** The toolkit's 480-word `plain-english.md` becomes 552
  words: the "same sentence" rule for names, no made-up labels, translating
  helper agents' terms, the decision line, no commands or paths unless asked,
  and two lines of Mike's "say the true thing only". DragonFly's 1,745-word
  merged file is replaced by the same file in phase 6. Full text:
  [Part C section 1](396-protocol-enforcement/part-c-style.md#1-the-style-file).
- **PRD wording.** The parent PRD's handshake principle, Knowledge System's
  handshake principle, "Preferred solution philosophy" and Notes line on
  command hooks, R3, R4, R9, R25, R29; Toolkit Operating System R6, R19, R20;
  `work-item-upkeep.md`. Each needs Mike's decision (decisions 1, 10, 12, 13,
  14).
- **Reminders that stop being needed while the engine runs.** The knowledge
  reminder drops its criteria copy and its "Knowledge turn review" line;
  `knowledge-completion.mjs` (Stop) stands down once K3, K4 and K6 are active;
  the `gh pr create` and close holds give way to K7; the 22-word per-message
  toolkit workflow reminder and the startup acknowledgment go. Each stays
  unchanged as the backup when the engine is not running. The style
  handshake keeps running in both modes (decision 11).
- **The managed knowledge manual** changes in its template,
  `plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md`,
  and reaches the installed copy through that component's workflow.

## Build order

Each phase is one pull request, with the four existing checks, the new
protocol check, and `claude plugin validate .` passing. Each phase ends with
both manuals reviewed (`keep-manuals-current.md`) and version bumps per
`plugins/AGENTS.md`.

### Phase 1: the engine, the knowledge-save checks, and current work (K3, K4, CW)

- **Files.** New `plugins/protocol-guard/` (manifest, `hooks/hooks.json`,
  `hooks/engine.ts`, `protocols.default.json`, `tests/`, `tsconfig.json`,
  `README.md`); `.claude-plugin/marketplace.json`;
  `tests/protocol-guard-check.mjs` and `tests/AGENTS.md`; `project-init`
  (`project-sync`, `project-init`, `setup-flow.md`) to turn it on; this repo's
  `.claude/settings.json`; knowledge manual template sections 2 and 7;
  `memory-reminder.mjs` (its working-memory lines step aside while CW runs);
  `plugins/AGENTS.md`, `README.md`, `docs/toolkit-map.md`, both manuals;
  the PRD principle text after decision 1.
- **Tests.** Offline plugin tests for K3, K4 and CW; print-mode runs matching R1,
  R2b, R6, R7, R8; the judge on the five DragonFly replies and 20 or more
  ordinary replies from real transcripts, counting false alarms (R8 flagged a
  reply that only mentioned a save); a helper that saves after the main agent
  opened the skill; `/clear` and compaction resets; the variable off. For CW:
  this session's case (an issue created and discovery run with no update to
  `current.md`) is sent back; a turn with no change in focus passes; a cloud
  session that cannot push to the default branch writes locally, records the
  pending publication, and tells Mike once.
- **Mike tests.** Windows terminal and the desktop app: the module loads from
  project settings, Windows paths match, what shows while a reply is held,
  whether the notice appears, Esc during a judge call. A first session in a
  folder not yet trusted.
- **Done when.** A save card without `knowledge-save` never reaches Mike; a
  knowledge write without the skill is refused; a change of focus reaches
  `current.md` in the same turn; with the variable off nothing changes; Mike's
  live tests pass.

### Phase 2: the reply check (S1)

- **Files.** The engine's reply protocol for the selected style (a new
  vocabulary word for "the selected style file") and its send-back tool; the
  toolkit style file and this repo's copy; the output-styles README; the
  conflicting lines (decisions 8, 9, 10, and the acknowledgment part of 12):
  knowledge reminder, knowledge manual sections 2 and 6, `knowledge-save`,
  `requirements-helper`, `solution-design`, `work-item-stages.md`,
  `knowledge-direct-commit.md`, `toolkit-session-start.mjs`, root `AGENTS.md`,
  `hooks-library/README.md`; Knowledge System R3 and R4, Toolkit Operating
  System R20.
- **Tests.** K3 and S1 in one model request for one reply; the judge on real
  replies, counting wrong send-backs; delay per reply; one send-back limit;
  judge unavailable; Opus and a weaker main model.
- **Mike tests.** How the held reply and the send-back tool call look in the
  terminal and the desktop app; a long chat on Windows.
- **Done when.** The DragonFly failure replies are sent back and rewritten by
  the main agent; good replies pass at a rate Mike accepts; no conflicting
  line remains.

### Phase 3: startup reads, indexes, and the actions (K1, K2, P7, K5, K6, K7, P2, P3)

- **Files.** Engine vocabulary (`read-fully-since-reset`, `ran-after-write`,
  `on.tool.tools`); the default list; `knowledge-session-start.mjs`,
  `memory-reminder.mjs`, `knowledge-completion.mjs`, `save-reminder.mjs`,
  `work-item-close.mjs` (add `work finish` for the backup); knowledge manual
  sections 4, 8, 9; root `AGENTS.md` and the `thin-agents-md.md` startup
  route; Knowledge System R9 and R29; Toolkit Operating System R6;
  `work-item-upkeep.md`.
- **Tests.** Truncated reads, compaction, `/clear`; each action by `gh`, by
  GitHub tool, and by `work finish`; the command hooks with the engine field
  present and absent.
- **Done when.** Each protocol refuses or holds as listed, and the old hooks
  step aside only while the engine runs.

### Phase 4: the rest of the toolkit (P1, P4, P5, P8, permission rules; P6 if approved)

- **Files.** The default list; engine vocabulary (`on.prompt.question`,
  `on.skill`, `on.command`); the settings template `project-init` writes;
  `offer-context-handoff.md`; `docs/toolkit-map.md`.
- **Tests.** P1 false-alarm rate and cost per message; `/clear` through
  `command.run`; permission rules in each permission mode.
- **Done when.** Each protocol works as listed, and Mike accepts P1's cost.

### Phase 5: instruction trimming

- **Files.** `work-item-stages.md`, the toolkit manual and its template, root
  `AGENTS.md`, `salesforce-safety-guardrails.md`, and the publication steps if
  decision 20 is yes.
- **Tests.** The four checks; word count at start and per message against the
  baseline.
- **Done when.** Always-loaded words are below the baseline, and each removed
  how-to is still in its owning skill.

### Phase 6: DragonFly's own rules (separate step)

- **Files (DragonFly).** `.claude/output-styles/plain-english.md` replaced by
  the toolkit's; `AGENTS.md` lines 49, 55 to 60, 127 and 128; `SOUL.md`;
  `.claude/rules/salesforce-safety-guardrails.md`; `direct-commit-to-main.md`;
  `capture-the-thinking.md` and `save-proposal-shape.md` deleted;
  `delivery/deployment/AGENTS.md`. Lines marked as Mike's own words change only
  with his explicit approval (decisions 8, 16, 21, 22).
  [Part C section 4](396-protocol-enforcement/part-c-style.md#4-dragonflys-own-rules-a-separate-later-step).
- **Tests.** Project sync of DragonFly, then a fresh DragonFly chat that repeats
  the 2026-09-22 situation, on Windows and in the desktop app.
- **Done when.** Mike checks a live DragonFly chat and accepts it.

## Risks and unknowns

- **Early-access API.** Function hooks may change in any Claude Code release.
  The protocol check catches renamed events offline; print-mode tests need
  re-running after each update. A later release could stop project settings
  from setting the variable.
- **Judge accuracy.** On the DragonFly replies, the final judge set-up failed
  the three worst replies in 8 of 9 runs and passed 12 of 12 good ones. Small
  prompt changes moved results a lot. The judge checks style, not facts: in one
  run a wrong record type name passed. R8 held a reply that only mentioned a
  save.
- **Delay.** A checked reply appears all at once, about half a second after
  the agent finishes. A send-back adds about 9 to 12 seconds with Opus. A card
  hold plus a layout retry took 21 seconds in R2b.
- **Not tested:** Windows, the desktop app, a first session in a folder not
  yet trusted, turns started by background tasks, `/clear` through
  `command.run`, whether the reply check's tool survives `/clear` and
  compaction, a real `knowledge-save` helper inheriting the opened skill, and
  whether a helper's Skill call can be told apart from the main agent's.
- **Coverage limits.** A Bash command that builds a path indirectly may pass
  K4. Opening a skill does not prove the agent followed it. The quiet review
  cannot be checked when it finds nothing.
- **Current-work false alarms.** The CW model question could ask for updates
  after minor work, and each update needs `knowledge-save` open (K4). Measure
  on real sessions before rollout.
- **Weaker main models.** With Haiku as the main agent, rewrites failed again
  in 6 of 6 cases.
- **Function hooks cannot run `git`.** The knowledge-only branch message in
  `save-reminder.mjs` stays a command hook.
- **Permission prompts.** `ask` rules do not prompt in `bypassPermissions`
  mode; whether a hook's `ask` does is unknown.
- **Plugin reload** clears the engine's memory, so the agent may be asked to
  open a skill again.

## Notes

### Decisions and approval state

- **Approved direction (Mike, 2026-09-22, recorded in the issue body):** force
  the required protocols with function hooks; the agent keeps its reasoning;
  no code that replaces reasoning and no keyword or semantic matching; a small
  model answers judgment questions; the main agent redoes a failed step; each
  instruction is judged, not all forced; command hooks stay as the backup;
  Codex gets instructions only; DragonFly's rules are a separate later step;
  `recommend-the-best-solution` stays deleted; Mike approves this plan before
  anything is built.
- **Added at Mike's request (2026-09-22, relayed by the coordinating
  session):** a protocol that keeps current working memory up to date (CW),
  in phase 1. Evidence: the #396 coordinating session got the working-memory
  reminder on every message, recorded "no-change" at every end-of-turn review,
  and did not add #396 to `current.md` until Mike pointed it out. The
  protocol's details are proposed.
- **Standing decision that affects this plan:** the style handshake stays
  (Toolkit Operating System R26, D1, 2026-09-21). Part C's proposal to silence
  it is not carried into this plan.
- **Proposed, not approved:** everything else in this file and in the four
  parts, including the requirements above.

### Open questions

- Decisions 1 to 22 above, for Mike.
- Design, for the build: whether the reply check's own send-back tool can
  also serve skill-owned protocols, so the engine uses one send-back route.
- How a first session in an untrusted folder loads the module.

### Remaining document tasks

- After Mike's answers: update this file, replace the requirements in the
  issue body, and move the issue to `03-requirements-approved` only on his
  approval.
- The engine prototype's `tsconfig.json` points at a declarations folder that
  is not kept; regenerate with `/plugin-types` before reusing it.

### Resume point

Mike reviews the Decisions for Mike section.
