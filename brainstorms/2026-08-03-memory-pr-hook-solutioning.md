# Memory PR hook, solutioning session: Brainstorm / Discovery Notes

Date: 2026-08-03
Goal: Decide exactly what gets built for issue #104 (the memory PR hook), with
issue #130 (a second trigger when context is cleared after a planning session)
kept in view so today's design does not block it.

Working branch: `brainstorm/104-memory-pr-hook`, worktree
`.worktrees/grill-104`.

## Summary / key decisions

**The goal, in the owner's words on 2026-08-03: all three of these are one job,
not three tickets.**

1. The memory check happens at every moment where something worth keeping would
   otherwise be lost.
2. Nothing is lost when context is cleared or a session hands off to a new one.
3. Nothing reaches a memory file unless the owner was shown the exact words and
   said yes.

Fixing one without the others leaves the system unreliable, so the design has to
cover all three. The hook described in issue #104 is one way to plug one of the
leaks. It is not the goal, and where a better method exists for a given leak,
use that instead.

The owner rejected an opening question about ticket scope and said: understand
what I am trying to achieve before solutioning. Scope comes later in this
session, after the design is settled.

### What this session decided

1. **The hook itself is not re-opened.** The 2026-08-02 refinement session
   settled it and the 2026-08-03 wording session amended it. Both stand.
2. **Approval before the librarian, in a table.** The main agent proposes what
   to save as a table the owner can scan, he edits, declines, or approves, and
   only then is the memory librarian invoked. A yes-or-no question is not
   approval. This is already the written rule; what changes is the shape of the
   list and one sentence making the yes-or-no point unmissable.
3. **A new `/handoff` command in its own plugin**, whose instructions start with
   the memory check. Anything the owner chooses not to save now is carried into
   the handoff prompt itself, so a fresh session gets it.
4. **No second hook.** A slash command loads its own instructions when it is
   typed, so it does not need one. A bare terminal command like `gh pr create`
   does, which is the whole reason the memory PR hook exists.
5. **Three rules get flipped.** `offer-context-handoff.md`,
   `wrap-up-ritual.md`, and `second-brain-rule.md` all currently say not to run
   the memory review when a session hands off unfinished work. That is the exact
   leak issue #130 is about.
6. **Tickets carry only the six spec parts.** No file lists, no version numbers,
   no implementation detail. Issue #104's body is rewritten to match.

### How the work splits across the two tickets

- **Issue #104** keeps the memory PR hook and the approval flow: the hook, the
  table shape, the sentence that a yes-or-no is not approval, and the
  requirement 12 wording sweep for the pull request timing.
- **Issue #130** takes the `/handoff` command, its plugin, and flipping the
  three rules that forbid a memory review on a handoff.
- Both were refined today and both go to **Ready**. They can be built in one
  pass, but they are two separate pieces of work with two separate goals.

### What is already settled (from the 2026-08-02 session, written into issue #104)

These were decided by the owner on 2026-08-02 and 2026-08-03 and are not being
re-opened unless the owner says so:

- The hook is named the memory PR hook, fires on opening a pull request only
  (never on merge), and is a `PreToolUse` hook on the `Bash` tool.
- The pull request never waits for the owner's answer. It opens with the code in
  it, the proposal list goes in the pull request description and in chat, and
  the approved memory is added to the same branch afterwards.
- The hook holds a branch once per chat session, has no cap on how many pull
  requests it checks in a session, and fails open if anything goes wrong.
- The hook contains no memory types, no check for whether any system is
  installed, no word list for what is worth saving, and none of the wording of
  the check itself.
- The proposal list keeps the four fields `second-brain-rule.md` already
  requires: where it goes, what it says, why it helps future work, and whether
  it is risky or large.
- Default ON in every project.
- Requirement 12: the old timing sentence gets rewritten everywhere it appears,
  with no new code written to enforce that.

### What is new since that session, and is what today is about

From the owner's comments on issue #104 (2026-08-03):

1. The ticket was reopened. Only rule text (pull request #122) and the earlier
   interview notes (pull request #114) ever shipped. No hook script exists.
   `plugins/hooks-library/hooks/` holds only `style-reminder.mjs` and
   `writing-guard.mjs`.
2. The owner wants the memory system to achieve two things:
   - the main agent proposes what to save, and the memory librarian only writes
     after the owner approves;
   - the main agent notices before context is cleared or work is handed to
     another session, and either saves now or carries the detail into the
     handoff prompt.
3. The DragonFly agent's self-diagnosis, quoted in the comments: it skipped the
   memory review before all five of its pull requests that day because the rule
   is read once at session start and the moment it applies arrives hundreds of
   tool calls later. Separately it handed the memory librarian its own words
   after a yes-or-no question, instead of showing the owner the exact text
   first. Its suggested fix: put the propose-then-approve check inside the
   memory librarian's own definition, so the librarian refuses the shortcut.
   That also covers Codex, where no hook runs at all.
4. The issue body itself needs updating after this session.

### Facts checked in the repository today

- The rules moved. Pull request #126 moved them into
  `plugins/project-init/library/rules/general/`. Every path in issue #104 that
  says `plugins/project-init/skills/project-init/references/general-rules/...`
  is now wrong and has to be corrected when the issue is rewritten.
- `plugins/project-init/library/rules/general/wrap-up-ritual.md` lines 3 and 4
  still carry the old timing sentence, "before its pull request is opened or
  merged".
- `plugins/second-brain/skills/second-brain/references/second-brain-rule.md`
  lines 81 and 82 carry the same old sentence.
- `plugins/second-brain/agents/memory-librarian.md` has no check that the owner
  was shown the exact content. It only requires a visible approved proposal for
  risky or large structural changes (lines 82 to 96). Content approval is
  assumed.
- `plugins/project-init/library/rules/general/offer-context-handoff.md` already
  exists (13 lines) and currently says the opposite of what issue #130 wants:
  "Do not trigger a second-brain durable-update review merely because the
  session is handing off unfinished work."
- `plugins/hooks-library/README.md` line 209 already names this exact hook as
  the example of the trigger job the library does not have yet.

### Hook events available in Claude Code (checked against the official docs today)

This decides what is possible for issue #130:

| Event | Can stop the action | Can put text in front of the agent |
|---|---|---|
| `PreToolUse` (what #104 uses) | Yes | Yes |
| `SessionEnd`, matcher `clear` | **No** | **No** |
| `PreCompact`, matchers `manual` and `auto` | Yes | **No** |
| `SessionStart`, matcher `clear` | No | Yes, but the old context is already gone |
| `UserPromptSubmit` | Yes | Yes |
| `UserPromptExpansion`, matcher is a command or skill name | Yes | Yes |
| `Stop` (agent finished a reply) | Yes | Yes |

The blunt consequence: **a hook cannot make the memory check happen at `/clear`.**
`SessionEnd` is side-effects only. It cannot stop the clear and cannot say
anything to the agent. Issue #130 has to be built on a different moment than the
one it describes.

## Q&A log

### Q1: What are you actually trying to achieve

- Asked: What is the real goal: stopping memory from leaking at every moment,
  making the end-of-work check reliable, making sure only owner-approved words
  get saved, or all three as one job?
- Captured: **All three, and they are one job.** Catching every moment, never
  losing detail across a handoff, and only saving approved content are the same
  goal. Fixing one without the others leaves the system unreliable.
- Flags: None

### Q2: Which moments have to be caught

- Asked: A four-option question about which moments must trigger the memory
  check (pull request opening, handoff prompt being written, `/clear`,
  auto-compaction).
- Captured: **Withdrawn before it was answered.** The owner interrupted to say
  the refinement session for issue #104 already happened and to go find it. He
  is right, and the question was re-asking settled ground.
- Flags: None

### Q3: Where the earlier refinement session is, and what it left open

- Asked: Find the completed refinement session for issue #104.
- Captured: Found. It is two files, not one.
  - `brainstorms/2026-08-02-memory-pr-guard.md`, 370 lines, 14 questions, all
    answered, no open flags. It is the source of the current issue #104 body.
  - `brainstorms/2026-08-03-memory-check-wording.md`, 93 lines, which reversed
    one answer from that session: the memory check keeps the four fields
    `second-brain-rule.md` already requires, rather than one line per item.
    Issue #112 was closed as a result.
  - Together these settle the hook completely: what it holds, what it must not
    hold, what the owner sees, when the pull request opens, no cap, default ON,
    what must never be written into the hook, and the requirement 12 wording
    sweep. **None of that is being re-opened.**
- What those two sessions do **not** cover, because the owner added it in
  comments on issue #104 later on 2026-08-03, after both sessions closed:
  1. The memory librarian writing text the owner never saw. The DragonFly agent
     asked a yes-or-no question ("fix it?"), took the yes, and handed the
     librarian paragraphs it had written itself. The suggested fix is a check
     inside `plugins/second-brain/agents/memory-librarian.md` so the librarian
     refuses that shortcut. This also covers Codex, where no hook runs.
  2. The moment context is cleared or work is handed to a new session. This is
     issue #130, and it currently contradicts two installed rules:
     `offer-context-handoff.md` says not to run a memory review merely because a
     session is handing off, and `wrap-up-ritual.md` lines 32 to 34 say the same
     thing.
  3. Stale file paths. Pull request #126 moved the rules into
     `plugins/project-init/library/rules/general/`, so several paths listed in
     issue #104 no longer exist.
  4. A hook cannot see `/clear`. `SessionEnd` fires on it but cannot stop it and
     cannot speak to the agent, so issue #130 cannot be built the way it is
     written.
- Flags: The issue #104 body needs its paths corrected and its requirements
  updated -> owner asked for this in his fourth comment on 2026-08-03.

### Q4: What this session is for

- Asked: Given the hook is already fully specified, do we grill the two new
  items then build everything, build the hook now and grill later, produce a
  written build plan only, or just fix the ticket body?
- Captured: **Grill the two new items, then build it all.** Interview only the
  two things no previous session covered (the librarian refusing text the owner
  never saw, and what happens at a clear or a handoff), rewrite the issue #104
  body with those answers plus the corrected file paths, then build the hook and
  the rest together.
- Flags: None

### Q5: How the memory librarian knows the owner actually saw the words

- Asked: Four options for hardening the memory librarian against being handed
  text the owner never read.
- Captured: **The owner rejected the framing as over-complicated.** His words:
  "The hook should just like the main agent should just before spawn before ever
  spawning the librarian, the main agent should just require my approval. Like
  and then he could say, Hey, here's what I propose we save to memory and list
  it out very clearly in a very easy to digest visual way. And then I either
  suggest edits, decline, or approve. And only when I finally approve it should
  the memory librarian actually implement it. Like it's very simple and
  straightforward. I don't understand why this is so complicated."
- The agreed behavior, in his words:
  1. The main agent proposes what to save, listed clearly and laid out so it is
     easy to read.
  2. The owner suggests edits, declines, or approves.
  3. Only after approval does the main agent invoke the memory librarian.
  4. The main agent never invokes the librarian before that.
- Checked against the repository afterwards: **this is already the written
  rule.** `second-brain-rule.md` line 63 lists "the owner approved a
  durable-update proposal" as the authority to invoke the librarian, lines 73 to
  75 say the main agent does not write memory itself, lines 114 to 128 give the
  report format, and lines 130 to 132 already allow approve all, approve some,
  edit, combine, defer, or skip. Nothing new has to be invented. The failure was
  the rule being skipped, not the rule being wrong or missing.
- The one real gap the DragonFly failure exposes: the report format says
  "Concise content", which let the agent show a short description, take a yes,
  and then write paragraphs the owner never read. The fix is to say plainly that
  a yes-or-no question is not approval, and that the owner approves the proposal
  he was shown, not a promise to write something later.
- Flags: None

### Q6: What makes the memory check happen at a clear or a handoff

- Asked: The owner already decided what should happen (save now, or carry the
  detail into the handoff prompt). Since no hook can see `/clear`, what makes it
  happen: a rule change only, a rule change plus a `/handoff` command with a
  hook on it, a rule change plus the agent warning him early, or all three?
- Captured: **Rule change plus a `/handoff` command with a hook on it.**
  1. Rewrite the two rules that say the opposite today.
     `plugins/project-init/library/rules/general/offer-context-handoff.md`
     line 11 says "Do not trigger a second-brain durable-update review merely
     because the session is handing off unfinished work."
     `plugins/project-init/library/rules/general/wrap-up-ritual.md` lines 32 to
     34 say the same. `second-brain-rule.md` line 90 says it a third time. All
     three get flipped: a handoff is one of the moments to save now or carry
     forward.
  2. Add a `/handoff` command to the toolkit, so the handoff has a moment a hook
     can actually see, the same way `gh pr create` is a moment the memory PR
     hook can see.
  3. When the owner asks for a handoff in a plain sentence instead of the
     command, the rewritten rule is the backup. Same arrangement as the memory
     PR hook and pull requests opened on the GitHub website.
- Flags: Where the `/handoff` command lives, and how it relates to the existing
  `session-summary` skill, is not yet decided.

### Q7: What the proposal list looks like

- Asked: A table, a numbered list with headlines, or the four-field plain block
  the rule has today?
- Captured: **A table, one row per item.** Columns: number, what it says, where
  it goes, why it helps. A risky or large item is flagged inside its row. The
  owner scans the whole list at once and replies with which rows to keep, edit,
  or cut. The four fields survive, they just move into columns. Approved shape:

  ```markdown
  What to save to memory (3 items)

  | # | What it says | Where it goes | Why it helps |
  |---|---|---|---|
  | 1 | A pull request never waits on the memory question. It opens, and your answer is added to it before merge. | memory/decisions/ | Stops future sessions parking finished work overnight |
  | 2 | SessionEnd cannot stop a /clear or speak to the agent. | memory/knowledge/ | Saves rediscovering why the clear moment needs a rule, not a hook |
  | 3 | RISKY: replaces the current handoff rule | memory/decisions/ | Two installed rules say the opposite today |

  Approve all, tell me which to cut, or edit any row.
  ```

  This replaces the plain four-bullet block at `second-brain-rule.md` lines 116
  to 128. It does not reverse the 2026-08-03 decision to keep all four fields,
  because all four are still there.
- Flags: None

### Q8: Does the `/handoff` command need a hook on it

- Asked: The agent pushed back on its own recommendation from Q6. A bare
  terminal command like `gh pr create` carries no instructions, which is why it
  needs a hook. A slash command loads its own instructions at the moment it is
  typed, so `/handoff` already puts the memory check in front of the agent.
  Build the hook anyway, or skip it?
- Captured: **Skip the hook. The command carries it.** `/handoff` is built as a
  skill whose instructions start with the memory check. One less moving part.
  The rewritten rule stays as the backup for when the owner asks for a handoff
  in a plain sentence instead of typing the command.
- Flags: None

### Q9: Where the `/handoff` command lives

- Asked: Its own plugin, inside `second-brain`, or folded into the existing
  `session-summary` skill?
- Captured: **Its own plugin.** Same pattern as `session-summary`, which is
  already its own plugin. Writing a handoff prompt is useful in every project,
  including ones that never install the memory system, so it must not live
  inside `second-brain`. `session-summary` stays as it is: its own file says the
  numbered list is the whole reply, and it answers a different question.
- Flags: None

### Q10: Completeness backstop

- Asked: Anything else about how this should work that we have not covered?
- Captured: **One instruction about what belongs in a work item ticket**, in the
  owner's words: "make sure the ticket details have the proper context and
  requirements and acceptance criteria. Really the only thing that should be on
  work item tickets is like the what are we doing, why are we doing it, what are
  the goals, what are the edge cases, how should the edge cases behave? Like
  those types of requirements. You shouldn't be putting in other specific things
  that don't really relate to that."
- What that means for issue #104, which today breaks this: its body carries a
  `Files to change` list, exact version bump numbers, implementer decisions
  about how to parse a pasted text block, a correction log about `writing-guard`,
  and line numbers in seven files. All of that comes out. It is implementation
  detail, and most of it is already stale because pull request #126 moved the
  rules.
- This matches the six parts already required by
  `plugins/project-init/library/rules/general/spec-before-you-build.md`:
  requirements, goal, reason, what the person using it experiences, how it
  behaves from the outside, and edge cases with the behavior for each.
- Flags: The same instruction applies to every ticket on the board, not only
  these two. Worth a separate pass over the board later -> owner.

## Open flags (pending input)

- The instruction in Q10 (tickets hold only the six spec parts, no
  implementation detail) applies to every ticket on the
  `Claude-Toolkit-Project` board, not just #104 and #130. A cleanup pass over
  the rest of the board has not been scheduled -> owner.
