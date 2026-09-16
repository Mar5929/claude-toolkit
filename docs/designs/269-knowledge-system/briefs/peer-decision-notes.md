# Peer design lead: decisions and reasoning (input for an Opus drafter)

Written 2026-09-16. These are my decisions only. An Opus agent should redraft
`peer-requirements-critique.md` and `peer-design-sketch.md` from these notes,
checking every cited line against the sources listed in each file's header.
The two existing drafts in this folder may be used as a starting point but every
fact in them must be re-verified by the drafter.

## Facts that changed the ground (verified by me on 2026-09-16)

1. Function hooks are not shipped. Live hooks page (2.1.273, 2026-09-15) lists
   five handler types. GitHub anthropics/claude-code#91870: behind
   `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`, "weeks". Decision: design on
   documented command hooks; name one upgrade point (the session-state file
   and the three PreToolUse/PostToolUse scripts).
2. Codex has hooks. Source tree `codex-rs/hooks/src/events/`: session_start,
   user_prompt_submit, pre_tool_use, post_tool_use, permission_request,
   compact, stop, session_end, interrupt. Decision: reverse the 2026-09-03
   "Codex is ungated" decision; register the same scripts in
   `.codex/hooks.json`; report the write guard and post-write checker as
   probable Codex gaps. Every Codex fact is a build-time check because the
   official site is blocked from this machine.

## Requirements that are out of place, over-controlling, or unclear

- R2 line 481 (confirm the file contents were read) and R3 line 524 / R9 line
  674 (quiet review at the end of every turn with real work) ask for things no
  harness can observe. Decision: hook-delivered startup files count as read;
  the per-turn review stays guidance; enforce only the four visible moments
  plus a Stop threshold nudge (Mike's 2026-09-03 amendment).
- R9 line 681 and R13 line 854 imply a commit and push per settled decision and
  per current.md change. Decision: one push per reply may cover several
  decisions; current.md pushes at save moments and handoff; "saved locally,
  not yet pushed" is said between them (R3 line 520 already allows it).
- R10 line 717 approval-off: no home, and R14 lines 940 to 941 leave
  `approved_by` with no honest value. Decision: `knowledge/project.md`
  frontmatter `memory_approval: off`; `approved_by` = owner name plus
  "standing approval, step off"; `approval_date` = write date.
- R18 and the layout (lines 142 to 173) invent System Guide paths the SG PRD
  (requirement 6, `knowledge/system/`) does not have; glossary path differs
  (SG PRD `knowledge/glossary.md`). Decision: this PRD refers only to the
  guide's entry page named in `.system-guide.json`; Mike picks one glossary
  path.
- R17 hands procedures to a "skill-authoring process" that does not exist in
  the toolkit. Decision: name it as a dependency, not a knowledge-system part.
- R28 line 1640 does not say when a shown card is written to the inbox.
  Decision: write the entry locally in the reply that shows the card; push at
  the next push or handoff.
- R21 line 1460 makes `ai-external-knowledge/README.md` generated; today it is
  hand-written. Decision: one builder generates all three indexes; migration
  rewrites that file.
- OS PRD open-conflicts rows for simple requests, draft refinement, roadmap,
  and concurrent current.md are settled by R5, R10, R16, R13. Decision: update
  the OS PRD under R16 automatic upkeep after approval.
- The 2026-09-02 "proposal formatter" (item 4) reads the agent's reply, which
  R3 line 535 and R29 say is not required. Decision: drop it. The 2026-09-02
  "real gate" (item 3) answers a recorded failure (a session claimed a review
  that never ran), so R29's "only after a failure that happened" is met.
  Decision: keep it, in the cheapest form (a marker written by a PostToolUse
  hook on the Skill tool).

## The minimum design (my decision)

- Data: Markdown per the PRD layout minus System Guide paths; approval-off
  flag in `project.md` frontmatter; feedback file
  `knowledge/memory-selection-feedback.md` capped at 4,000 characters.
- Guidance: SessionStart hook prints SOUL.md, project.md, a manual rewritten
  as a map under 4,000 characters, current.md, inbox state lines, index
  pointers, plugin version; 9,000-character budget; runs on
  startup|resume|clear|compact|fork. One 25-line rule file
  `.claude/rules/knowledge-system.md`, mirrored in AGENTS.md. No
  UserPromptSubmit hook.
- Skills: four. knowledge-find (recall + session-search), knowledge-save
  (remember + retire + write half of reflect; references for card, memory,
  PRD, glossary row, inbox entry, lifecycle), knowledge-review,
  knowledge-setup. R20 card replaces the five-bullet template.
- Guards (all fail-open command hooks in the plugin's hooks.json):
  PreToolUse gate on `gh pr create`, `gh issue close`, `work finish`,
  released when the save skill ran after the branch's last commit;
  PostToolUse on Skill writes the marker; PreToolUse write guard on
  Edit/Write under memory-entries/ and prds/ until the save skill ran;
  PostToolUse checker plus index rebuild after every write under knowledge/;
  Stop nudge once per threshold of changed files and once for an
  "approved, save unfinished" inbox entry; PreCompact manual hold once.
- State: `${CLAUDE_PLUGIN_DATA}/sessions/<session_id>.json` (Codex:
  `~/.claude-toolkit/knowledge-sessions/`). Never in the repository.
- Delivery: plugin-native hooks and tools, no project copies; Codex via
  `.codex/hooks.json`, AGENTS.md, and `.agents/skills/`; setup proves delivery
  with `claude --init-only --debug-file` and a two-turn `claude -p` run.

## Options I present with a recommendation

1. Startup reads: inject whole files (recommend) versus directive plus Read
   calls checked by a hook.
2. Command gate: marker-released hold (recommend) versus hold-once.
3. Write guard: PreToolUse guard (recommend) versus none.
4. Standing obligations: rule file plus short manual (recommend) versus manual
   only.
5. Inbox timing: write in the same reply (recommend) versus write when the
   owner does not answer.

## What I would have the drafter verify first

- Every PRD line number cited; the walkthrough quotes against
  `scratchpad/walkthrough.txt`; the hooks.md quotes; the checker constants
  (`check-knowledge.mjs` lines 29 to 46); the Codex event names against the
  source tree; the changelog version.
