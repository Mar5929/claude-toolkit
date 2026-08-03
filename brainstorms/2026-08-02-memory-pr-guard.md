# memory-pr-guard (ticket 104): Brainstorm / Discovery Notes

Date: 2026-08-02
Goal: Stress-test ticket 104 (a hook that holds `gh pr create` until the
durable-update review happens) until its acceptance criteria are sound, its
contradictions are resolved, and an implementer can build it without guessing.

## Summary / key decisions

Ticket 104 was already a long, well-argued spec, so this session tested whether
it survived contact rather than starting from nothing. It did not survive
intact. The biggest change came from Mike, not from the grill: **a pull request
never waits on the memory question.**

What was agreed, in order of how much it changes the ticket:

1. **The pull request opens immediately.** The hook holds the first attempt,
   the agent checks what is worth saving, and then the pull request opens
   whether or not Mike has answered. His answer is added to that same pull
   request later, before it is merged. The original ticket had the agent write
   memory first and open the pull request afterwards, which would have parked
   overnight work until morning.
2. **Name: the memory PR hook**, not "memory-pr-guard".
3. **The word "durable" is dropped.** "The memory check", not "the
   durable-update review".
4. **Every pull request description says what the check found**, either what was
   saved or "Nothing worth saving to memory here." This is new, and it is how
   Mike can tell at a glance whether the check was skipped.
5. **Every pull request gets checked. No cap.** The ticket's limit of three per
   session is removed.
6. **Default ON in every project**, new and existing.
7. **Split out two tickets**: the report-block rewrite in
   `second-brain-rule.md`, and replacing the word "durable" across the rest of
   the toolkit.
8. **No follow-up measurement.** Mike's call.

Two problems were found by reading the repo before asking anything, and are
recorded as corrections rather than as questions.

### Corrections found in the repo (not asked, just fixed)

1. **`writing-guard` no longer exists.** It shipped in PR #96 and was retired in
   PR #101 along with the three voice rules it enforced. The hook that ships
   today is `style-reminder`, a `UserPromptSubmit` reminder (not a blocking
   check), with a 32-check harness. Everything in ticket 104 that leans on
   `writing-guard` needs rewording:
   - "shipped next to `writing-guard`" -> shipped next to `style-reminder`
   - "mirroring `.claude/writing-guard.json`" -> mirroring
     `.claude/style-reminder.json`
   - Done-when item "`writing-guard-harness.mjs` still passes" -> that file does
     not exist; the file to keep passing is
     `plugins/hooks-library/tests/style-reminder-harness.mjs`
   - "that weighting caught two real false positives during `writing-guard`
     development" -> provenance not verifiable from the repo today; the
     surviving harness with the deliberate one-third-negative weighting is
     `style-reminder`'s.
2. **State keying precedent already exists.** `style-reminder.mjs` keys its
   per-session throttle on `payload.session_id` and stores counters under
   `tmpdir()/claude-style-reminder/<sessionId>`. `memory-pr-guard` should match
   that shape rather than invent one.

### Session process (new rule, added mid-session)

Mike committed a new rule to `CLAUDE.md` and `AGENTS.md` (commit 79e2685) while
this session was starting: no ticket may be developed until a grill-me session
aligns the owner and the agent on all six spec fields (requirements, goal,
reason, what the person using it experiences, how it behaves from the outside,
edge cases). The aligned spec is written back to the GitHub ticket. Status goes
to **Refining** when the grill starts and **Ready** plus the
`grill-me-completed` label when it ends.

Applied here: ticket 104 was sitting at status **Ready** without ever being
grilled. Set to **Refining** at the start of this session. The deliverable of
this session is therefore not just these notes, it is a rewritten ticket body.

## Implementer decisions (agent-owned, not asked)

Mike's instruction, 2026-08-02: grill him on behavior and experience only. The
agent takes the technical calls and records them here.

1. **Pasted text blocks (heredocs).** The ticket contradicts itself: it says
   ignore everything after the first `<<` (so documentation mentioning
   `gh pr create` does not trip the hook), but it also requires holding
   `git push ... && gh pr create`. The common real pattern is
   `git commit -m "$(cat <<EOF ... EOF)" && gh pr create`, where the pasted
   block comes first, so the stated rule would discard the real command and the
   hook would never fire on the case it exists for.
   **Decision: strip only the pasted block itself** (from its start marker to
   its terminator), then scan what remains. Both cases end up correct. Costs a
   little more code and a few more tests. The ticket's "must NOT hold" row for
   heredocs is reworded to "a `gh pr create` written *inside* a pasted block is
   ignored; one written outside it is still held."
2. **Sibling hook and config shape.** `writing-guard` is retired; mirror
   `style-reminder` instead, including per-session state keyed on
   `payload.session_id` under `tmpdir()`.

## Q&A log

### Q1: scope split (the `second-brain-rule.md` change)

- Asked: Ticket 104 bundles the new hook and a rewrite of the completion-review
  report block in `second-brain-rule.md` (dropping its fixed four-field
  template). Ship together or separately?
- Captured: **Split into two tickets.** The four-field rewrite becomes its own
  ticket and can land on its own, before any hook exists. Ticket 104 keeps only
  the hook.
  - Consequences for 104: drop the "Related change" section, drop
    `plugins/second-brain/skills/second-brain/references/second-brain-rule.md`
    from the file list, and drop the `second-brain` 1.5.0 -> 1.6.0 version bump.
    The marketplace `metadata.version` bump stays but covers fewer plugins.
  - The new ticket must be written and put on the board (it needs its own
    grill-me pass before development, per the new rule).
- Flags: New ticket for the four-field rewrite not yet created -> Mike/agent at
  end of session.

### Q2: the moment the pull request is held, from Mike's side

- Asked: The agent is stopped on its way to opening the pull request. What
  should Mike see next: only speak when there is something to save, always show
  a list and wait, or show and proceed without waiting?
- Captured: **Only interrupt when there is a real decision.** The agent runs the
  review quietly. If nothing is worth saving, it says so in one plain line and
  the pull request opens in the same turn, with no waiting. If something is
  worth saving, it stops and shows the list, and waits for Mike.
  - Mike's exact objection: "the word durable is kind of weird to me. Just say
    it plainly and clearly. Instead of nothing durable here, that's a weird way
    to say I didn't find anything or there's nothing to save to memory."
  - So the no-op line must be plain English. Wording settled in Q3.
- Flags: The word "durable" is used throughout the toolkit
  (`wrap-up-ritual.md`, `second-brain-rule.md`, "durable-update review"). If
  Mike dislikes it here he probably dislikes it everywhere -> raise as a
  separate ticket at the end of this session.

### Q3: what the agent says when nothing is worth saving

- Asked: Which phrasing for the one-line no-op message?
- Captured: **"Nothing worth saving to memory here."** Plain English, no
  "durable", no jargon. Said once, then the pull request opens in the same turn
  with no waiting.
- Flags: None

### Q4: when Mike is not there to answer

- Asked: A background agent finishes overnight, has something worth saving, and
  nobody answers the checkpoint list. What happens?
- Captured: **The agent saves it into the same pull request and lists it plainly
  in the pull request description. Mike approves at merge.** Work is never
  blocked overnight, and nothing reaches `main` without his approval, because
  the merge is the gate.
  - Implication: the pull request description must say, in plain words, what was
    saved to memory and where. Not just a diff to dig through.
- Flags: None

### Q5: how the agent decides whether to wait or to go ahead

- Asked: Waiting for Mike and going ahead without him cannot both be the
  default. Which is it, and how does the agent tell the two situations apart?
- Captured: **Mike rejected the question and redesigned it, and his design is
  better.** His words: "Couldn't we just open the PR and then it could say, hey,
  here's the stuff that I want to save to memory, and then we could just update
  the pull request with that stuff once I answer it?"
  - A pull request is not frozen when it opens. It accepts more commits until it
    is merged. So the pull request never has to wait for the memory answer.
  - **This supersedes the original ticket's step 6 and step 7**, which had the
    agent write memory first and only then open the pull request. It also
    removes the entire wait-versus-proceed fork, and it removes the risk of
    finished work sitting unshipped overnight.
- Flags: None

### Q6: confirmation of the agreed behavior (supersedes ticket 104's "How it
works, end to end")

- Asked: Read the redesign back to Mike step by step and asked if it was right.
- Captured: **Confirmed, "yes, that's it."** The agreed behavior:
  1. The agent finishes the work and runs `gh pr create`.
  2. The guard holds it once. Holding is the guard's entire job: it makes the
     agent raise the memory question at that moment instead of forgetting it.
  3. The agent reviews what the work produced.
  4. If nothing is worth saving, it says "Nothing worth saving to memory here."
     and opens the pull request in the same turn. Mike is not interrupted.
  5. If something is worth saving, **the pull request still opens immediately**
     with the code in it, and the agent shows Mike a short list of what it wants
     to save.
  6. Whenever Mike answers, ten seconds or the next morning, the approved files
     are committed to the same branch and appear in that same pull request.
  7. Mike merges. Code and memory land together.
  - Added by the agent and accepted: the same short list is also written onto
    the pull request itself, so an overnight answer cannot fall through the
    cracks if the chat session is gone by morning. Any later session can pick
    the list up from the pull request.
- Flags: None

### Q7: how often it is allowed to interrupt

- Asked: Every pull request, capped at three per session, or once per session?
- Captured: **Every pull request, no limit.** The original ticket's cap of three
  holds per session was written when the hold was going to block Mike. It no
  longer does, so the cap only creates a silent gap late in a long session.
  - **Supersedes requirement 5** ("a hard cap of 3 holds per session"), which is
    removed.
  - Requirement 4 stands in a narrower form: a given branch is held once per
    session, so the agent's own retry immediately after the review is not held a
    second time. That is about not looping, not about limiting the number of
    pull requests checked.
  - Implementer note: keep `maxHolds` in the optional config as a safety valve
    for a runaway loop, but its default is no limit.
- Flags: None

### Q8: nothing can prove the review actually happened

- Asked: The agent could ignore the hold and immediately retry, and the pull
  request would open. Accept that, or add a way for Mike to spot it?
- Captured: **Every pull request description must carry one line saying what the
  review found**, either what was saved to memory or "nothing worth saving
  here". A pull request missing that line is visibly skipped, and Mike sees it
  at the moment he is already reading, right before merging.
  - This is a new requirement that ticket 104 does not have. It belongs in the
    rule (`wrap-up-ritual.md`), not in the hook, and the hold message should
    remind the agent of it.
  - It also makes limit 1 in the ticket ("the hook cannot verify the review
    happened") only half true now: the hook still cannot verify it, but Mike
    can, at merge, without doing any extra work.
  - Considered and rejected by the agent: having the hook inspect the pull
    request body for that line on the retry. It would be a hardcoded template
    check, which the ticket rightly forbids, and it breaks whenever the body
    comes from a file.
- Flags: None

### Q9: how much detail Mike wants in the list

- Asked: One line per item, a short paragraph per item, or just file names?
- Captured: **One line per item: what it is and where it goes.** Example he was
  shown and approved: "Save: a pull request never waits on the memory question,
  it opens and gets updated after you answer. Goes to `memory/decisions/`. Save
  it?" If he wants the reasoning he asks for it.
- Flags: This also settles most of the split-out ticket (replacing the fixed
  four-field report block in `second-brain-rule.md`). Carry this answer into
  that ticket: one line each, what and where, detail only on request.

### Q10: does every project get it automatically

- Asked: Every project by default, prove it in the toolkit first, or offer it
  switched off?
- Captured: **Every project, default ON.** New projects get it during setup
  without being asked; Anchor, Dragonfly, and Diligence Ready pick it up the
  next time each is synced with the toolkit. This is the explicit owner decision
  that `CLAUDE.md` rule 4 requires before anything is marked default ON.
- Flags: None

### Q11: how Mike would know in a month whether it worked

- Asked: Count the pull requests that carry the memory line, re-run the
  transcript count that produced the ticket's table, or do not check?
- Captured: **Do not check.** No follow-up measurement is being built, and none
  belongs in the ticket. The ticket keeps its table as the reason for building
  the guard, and adds nothing about proving the guard worked.
- Flags: None. Noted honestly: this is the same shape as the failure that
  produced the ticket (a rule that seemed fine while being ignored). Owner
  decided knowingly.

### Q12: the pull requests the guard cannot see

- Asked: A pull request opened on the GitHub website, or by a tool other than
  the terminal, never reaches the guard. Acceptable?
- Captured: **Acceptable. The guard covers the typed terminal command only.**
  Mike added a requirement in his own words: "we should have something in the
  Claude MD to say, like, when pull requests are open, you should start the
  remember process just as a backup."
  - So the written rule is the backup for everything the guard misses. Placement
    follows the toolkit's one-canonical-home rule:
    - In projects that install rules, it belongs in `wrap-up-ritual.md`, not
      restated in `CLAUDE.md`.
    - This repo (`claude-toolkit`) has no `.claude/rules/` folder, so here the
      line goes in `CLAUDE.md` and `AGENTS.md`, which are its only home.
  - `wrap-up-ritual.md` has to be rewritten anyway: it currently says the review
    happens "before its pull request is opened or merged", and the agreed
    behavior is now "when a pull request is opened, and the memory goes into
    that same pull request before it is merged". **This makes
    `wrap-up-ritual.md` a required file change in ticket 104**, which the
    original ticket did not list.
- Flags: None

### Q13: the word "durable", and what this thing is called

- Asked: The word "durable" appears 201 times across 42 files. Replace it
  everywhere, replace it inside this ticket only, or leave it?
- Captured: Mike rejected the framing and answered something more important, in
  his words: "Why are you using these random weird words? This should just be
  like the memory PR hook. That should be what it's called."
  - **Name: the memory PR hook.** Not "memory-pr-guard", which was the name in
    the original ticket. The file becomes `memory-pr-hook.mjs` and the test file
    `memory-pr-hook-harness.mjs`. This supersedes the ticket's "Decisions
    already made by the owner: Name: memory-pr-guard".
  - **The word "durable" goes.** "The durable-update review" becomes "the memory
    check". "Durable updates" becomes "what to save to memory". Ticket 104 fixes
    the wording in the files it already touches; the remaining places go in a
    separate ticket, because rewording 42 unrelated files inside this pull
    request would make it much harder for Mike to review.
  - Standing instruction, wider than this ticket: no invented labels, no figures
    of speech, no words he has to decode. This applies to what agents write in
    the toolkit's own documents, not only to what they say in chat.
- Flags: None

### Q14: completeness backstop

- Asked: Anything about how this should work that we have not talked about, that
  would change the plan?
- Captured: **Nothing. Write it up.**
- Flags: None

## What happened after the interview

- **Ticket 104 rewritten** from these notes, retitled "The memory PR hook: check
  what to save to memory when a pull request is opened", labelled
  `grill-me-completed`, and moved to **Ready** on the board.
- **Issue #112 created**: one line per item instead of the fixed four-field
  report block in `second-brain-rule.md`.
- **Issue #113 created**: drop the word "durable" from the toolkit.
- #112 and #113 sit in **Backlog**. Neither may be built until it has had its
  own grill-me session, per the rule Mike added today.

## Open flags (pending input)

- **None.** Every question asked in this session was answered.
