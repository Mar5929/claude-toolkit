# Claude Response Styles (ticket 102): Brainstorm / Discovery Notes

Date: 2026-08-02
Goal: Pin down what is actually left to do on GitHub issue 102 (plain-language
response style) now that #101 has landed, and decide how we will know it worked.

## Summary / key decisions

Pre-interview findings (from the repo and the machine, before Q1):

1. **#101 already shipped most of ticket 102.** The output style exists at
   `plugins/project-init/skills/project-init/references/output-styles/plain-language.md`
   and covers: non-technical owner, avoid jargon, plain language, no em dashes,
   no section signs, no filler, quiet while working, end with the owner's
   actions.
2. **One line in the shipped style contradicts the ticket.** The style says
   "Prefer lists and bullet points over dense paragraphs." Ticket 102 problem 4
   says the rule is "match format to content", and its non-goals say "No hard
   'always use lists' rule." The toolkit's own `CLAUDE.md` repeats the same
   phrasing ("replies built from lists").
3. **"Lead with the answer" is missing entirely** from the style, which the
   ticket names as part of problem 4.
4. **"Private vocabulary" (the ticket's #1 priority) is only half covered**, and
   in the wrong place. `general-rules/define-your-terms.md` says do not invent
   shorthand, but the output-styles README explicitly says voice does not belong
   in `general-rules/`.
5. **Nothing from #101 is actually running anywhere.** No
   `~/.claude/output-styles/` folder exists, no `outputStyle` key in
   `~/.claude/settings.json`, none of the three toolkit projects (Anchor,
   Dragonfly, Diligence Ready) has `.claude/output-styles/`, and the
   `style-reminder` hook (`plugins/hooks-library/hooks/style-reminder.mjs`)
   is not wired into any settings file.
6. **Machine-level rules overlap and dangle.** `~/.claude/rules/language-rules.md`
   duplicates the em dash / section sign / no filler / non-technical rules that
   the style now owns. `~/.claude/rules/quiet-while-working.md` refers to
   "the lead-with-the-answer and no-more-words-than-needed rules" by name, and
   no such rules exist anywhere on this machine or in the toolkit.

### Agreed spec, as of session close (2026-08-02)

**The problem in one line.** Claude talks in a way Mike has to decode: names he
never used, metaphors instead of plain questions, the answer buried, and a shape
that does not match the content.

**The five writing rules.** Four come from the ticket; the fifth was found
during the interview.

1. **No invented names.** Do not name a thing with a label Claude made up
   ("lint hits", "digests", "the work-marker hook"). Real names of real things
   are fine, with plain words attached the first time. This also covers
   compressing one of Mike's own document headings into a nickname.
2. **No figures of speech.** Say the literal thing. Not "where do you want the
   dial", but "how strict do you want this to be".
3. **Plain, common words.** If an everyday word works, use it.
4. **Lead with the answer**, then the support.
5. **Match format to content.** A list when the items are genuinely parallel,
   sentences when they are not. Never a blanket "always use lists". The one
   place a list is always right: the actions Mike has to take, at the end.

Plus the two hard bans that a script can see: **no em dashes, no section signs.**

**Plain does not mean vague.** All five rules take words away, so the thing they
can break is the facts. Simplify the wording, never the content. Keep every
specific: the numbers, the file names, what actually happened. This comes
straight from the ticket's own line, "plain wording should carry more real
information, not less." The question that tried to pin it down (Q9) was asked
badly and Mike stopped it, so it is recorded here as his stated intent, not as a
decision he made in this session.

**The shape of the style file:** goal, then a worked example, then the hard
rules as a short checklist.

**The eight deliverables.**

1. Rewrite `plain-language.md` in the goal / example / rules shape, with the
   five rules above.
2. Copy it to `~/.claude/output-styles/` and set `outputStyle` in
   `~/.claude/settings.json`.
3. Get it into Anchor, Dragonfly, and Diligence Ready by running
   `/project-sync` in each.
4. Wire up the `style-reminder` hook so the style is re-stated on every message.
5. Fix the toolkit `CLAUDE.md` line that says "replies built from lists".
6. Bring back a check that reads the finished reply and blocks on em dashes and
   section signs. Only those two; everything else stays with the style.
7. Add a rule in `general-rules/` that anything a helper agent writes for Mike
   to read (commit message, pull request text, a document) follows the active
   output style. A pointer, not a second copy.
8. Put the writing rules directly into
   `plugins/second-brain/agents/memory-librarian.md`, and add a standing line to
   the toolkit `CLAUDE.md` that every agent this toolkit ships carries the same
   writing rules as the output style.

**Cleanup that goes with it.** Delete `~/.claude/rules/language-rules.md`. Trim
`~/.claude/rules/quiet-while-working.md` to the parts about when to speak, and
fix its two references to rules that do not exist. Move
`general-rules/define-your-terms.md` into the style.

**How we will know it worked.** The em dash and section sign check either fires
or it does not, so those two are measured. The other five are Mike's judgment,
tested by the ticket's own question: ask "where are we at?" and see whether the
answer is plain, answer-first, and free of words he has to look up.

### Decisions

- **D1. Ticket 102 is an audit plus a fresh grill.** Do not treat what #101
  shipped as correct. Audit the built style against the ticket's goals and spec
  point by point, and re-interview from scratch so the build ends up aligned
  with what Mike actually meant.

- **D2. This session follows the new grill-me gate** that Mike committed to
  `CLAUDE.md` and `AGENTS.md` in `79e2685` (2026-08-02, mid-session). The gate:
  no development starts until a grill-me session has fully aligned the user and
  the agent on every spec item; the specs get written onto the GitHub ticket
  itself; the work item goes to **Refining** when the session starts and to
  **Ready** with the `grill-me-completed` label when it ends. Issue 102 was set
  to Refining at that point (verified).

## Q&A log

### Q1: What is ticket 102 now, given #101 already shipped the style file?

- Asked: Given #101 shipped `plain-language.md` but it is not switched on
  anywhere, is 102 now "fix the wording", "turn it on", both, or something
  wider?
- Captured: Neither of the narrow options. Mike's answer, in his words: "we need
  to audit what was built against the goals and spec of #102 and start a fresh
  grill-me session from scratch to make sure the build is aligned with the
  spec." So the session's job is a point-by-point audit of the shipped style
  against the ticket, with his intent re-established from first principles
  rather than inferred from the shipped text.
- Flags: None.

### Q2: What shape should the style file take?

- Asked: The ticket asked for "a goal the model works toward, not a pile of
  hard-coded rules" and for positive targets to pattern-match over negative
  "don't" rules. #101 shipped eight bullets, five of them negative, with no goal
  statement and no example. Keep the bullet list, switch to goal-plus-example,
  or do both?
- Captured: **Both.** The file gets three parts, in this order:
  1. **GOAL.** A short statement of what the reply is for, on the model of
     "Write so the owner gets the point in one pass."
  2. **EXAMPLE.** At least one before/after pair the model can copy, on the
     model of Bad: "...work-marker hook, lint hits..." / Good: "Done. The
     failing check passes."
  3. **HARD RULES.** A short checklist: no em dashes, no section signs, lead
     with the answer, match format to content, quiet while working, end with the
     owner's actions.
  Accepted cost: the file gets longer, against the output-styles README's
  warning that every line in a style competes with every other line.
- Flags: How long is too long? The length budget for the finished file is not
  settled. -> Mike, later in this session.

### Q3: Where is the real line on "private vocabulary" (the ticket's #1 problem)?

- Asked: The ticket's rule is "never refer to something by a label I haven't
  already used." Taken literally that is unfollowable, because new things have
  to be named constantly (this session alone used "worktree", "the
  style-reminder hook", "the output style", "the grill-me gate", and Mike had
  used only two of the four). Is the line (a) invented names only, (b) any new
  term needs a plain definition, or (c) never name things at all?
- Captured: **(a) Ban invented names, not real ones.** The problem is names
  Claude made up for things: "lint hits", "digests", "the work-marker hook".
  The real name of a real thing (a file, a command, a GitHub label, a tool) is
  allowed, said with plain words attached on first use.
  - Banned, in his selected wording: "the lint hits are resolved", "I ran the
    digest", "the work-marker hook fired".
  - Allowed, in his selected wording: "the style-reminder hook, a small script
    that re-states the rules", "your worktree, a private copy of the repo".
  - Why this line: it is the testable one. The model can ask itself "is this a
    name I coined, or the thing's actual name?"
- Flags: None.

### Q4: "Prefer lists" (three of Mike's files) vs "match format to content" (the ticket)

- Asked: The shipped style says "Prefer lists and bullet points over dense
  paragraphs", the toolkit `CLAUDE.md` says "replies built from lists", and
  `~/.claude/rules/quiet-while-working.md` calls for a numbered action list. The
  ticket says the rule is "match format to content" and names "always use
  lists" as a non-goal. Which wins?
- Captured: **The ticket wins. Match format to content.** A list when the items
  are genuinely parallel, sentences when they are not.
  - Parallel, so a list: "Three things are missing: the style file, the hook
    wiring, the settings key."
  - Not parallel, so sentences: "It shipped but was never turned on, which is
    probably why it didn't stick."
  - The one place a list is always right: the actions Mike has to take, at the
    end of a reply.
  - Consequence: the "Prefer lists and bullet points" line in
    `plain-language.md` is wrong and must be replaced, and the toolkit
    `CLAUDE.md` phrase "replies built from lists" must change with it.
- Flags: `~/.claude/rules/quiet-while-working.md` is a machine-level file
  outside this repo. Whether this ticket also edits Mike's machine-level rules
  is not yet settled. -> Mike, later in this session.

### Q5: Does 102 include actually turning the style on, or is rollout a separate ticket?

- Asked: Verified that nothing from #101 runs anywhere. No
  `~/.claude/output-styles/` folder, no `outputStyle` key in
  `~/.claude/settings.json`, no `.claude/output-styles/` in Anchor, Dragonfly,
  or Diligence Ready, and `style-reminder.mjs` is not wired into any settings
  file. Does 102 cover rollout, or does a second ticket?
- Captured: **102 covers install everywhere.** Its scope is now five
  deliverables, in his selected wording:
  1. Rewritten `plain-language.md`.
  2. Copied to `~/.claude/output-styles/`, with `outputStyle` set in settings.
  3. Copied into Anchor, Dragonfly, and Diligence Ready via `/project-sync`.
  4. The `style-reminder` hook wired up.
  5. The toolkit `CLAUDE.md` line fixed.
  Reasoning accepted: without rollout, 102 closes the same way #101 did, with a
  good file nobody reads.
- Flags: Deliverable 3 needs a session inside each of the three projects, which
  this session cannot do from the toolkit repo. How that gets sequenced is not
  settled. -> Mike, later in this session.

### Q6: What happens to the duplicate voice rules in the other two locations?

- Asked: The same voice instructions now sit in three places. The style file;
  `~/.claude/rules/language-rules.md` (no em dashes, no section signs, no
  filler, treat the owner as non-technical); and
  `~/.claude/rules/quiet-while-working.md` (stay quiet while working, plus two
  references by name to a "lead-with-the-answer" rule and a
  "no-more-words-than-needed" rule that exist nowhere on this Mac or in the
  toolkit). Separately, `general-rules/define-your-terms.md` overlaps with the
  private-vocabulary rule and sits in the folder the output-styles README says
  is not for voice. Trim, keep as a backstop, or leave for another ticket?
- Captured: **The style owns voice. Trim the rest.** Specifically:
  - **Delete** `~/.claude/rules/language-rules.md`, fully covered by the style.
  - **Trim** `~/.claude/rules/quiet-while-working.md`: keep the parts about
    *when* to speak, drop the parts about *how* to write, and fix its two
    references to rules that do not exist.
  - **Move** `define-your-terms.md` into the style and out of `general-rules/`.
  - This confirms 102 does reach outside the toolkit repo and edits Mike's
    machine-level rules directly, which resolves the flag raised in Q4.
- Flags: The machine-level files at `~/.claude/rules/` are not in any git repo,
  so those edits cannot ship in the pull request and have to be made directly.
  -> Mike, to confirm at close.

### Q7: Does a check on finished replies come back as part of 102?

- Asked: All four acceptance criteria are judgment calls, and nothing reads a
  finished reply today. The `style-reminder` hook says of itself, "This is a
  reminder, not a check. It reads nothing the agent wrote and blocks nothing."
  The `writing-guard` hook that did read finished replies and block on em dashes
  was deleted in #101. The `hooks-library` README measured one em dash every 1.8
  messages in a project that carried the rule, and pre-committed: "If em dashes
  climb back toward the rate in the table, the answer is to bring a check back,
  not to write the rule down again."
- Captured: **Bring back a check, for the hard bans only.** In his selected
  wording:
  - **Checked, and blocks the reply:** em dash, section sign.
  - **Not checked, style only:** plain word choice, invented labels,
    answer-first, list vs sentences.
  - Rationale: check what a script can see, trust the style for the rest.
  - This adds a sixth deliverable to 102, on top of the five from Q5: a restored
    check hook for the two mechanical bans.
- Flags: Whether this is a revived `writing-guard` or a new hook, and whether it
  blocks or just warns, is an implementation choice not settled here. -> the
  build session.

### Q8: Should 102 close the helper-agent gap?

- Asked (after Mike asked whether this was a report or a proposal: it is a
  proposal): the output-styles README accepted knowingly in #101 that "Subagents
  get nothing. An output style applies to the main conversation only." Their
  reports back are never shown to Mike, so that part does not matter. What does
  reach him is what a helper agent *writes*: commit messages, pull request text,
  documents. Ticket 102 never mentions helper agents. Add it to 102 or not?
- Captured: **Yes, for written output.** Add a short rule in `general-rules/`
  that helper agents do see, covering only what they produce that Mike reads:
  commit messages, pull request text, documents. His selected wording for the
  rule's intent: "Anything you write that the owner reads (commit message, PR
  text, a document) follows the project's output style. Read
  `.claude/output-styles/<active>.md` before writing it." It points at the style
  rather than restating it, so there is still one source of truth. Not widened
  to every document in the repo, which would put voice back into
  `general-rules/` against the README's argument.
  - This is the seventh deliverable in 102.
- Flags: None.

### Q9: Two live failures Mike caught mid-interview, and the rule they point to

- Asked: an over-complicated question about protecting information density.
  Mike stopped the interview instead of answering, and his objection is more
  valuable than the answer would have been.
- Captured: **Mike's reaction, close to his words:** "This is really not that
  complex of something to solve for. Why are you asking so many weird
  questions? I don't understand what you mean. It shouldn't be that hard for
  the agent to just speak plainly."
  He then produced two real failures, which are the best evidence in this whole
  ticket because they are unprompted and he reacted to them in real time:
  1. **From another session (screenshot, ticket 109):** "Given that, where do
     you want the dial?" Mike: "I don't know what moving the dial means or what
     that's referring to." This is not jargon and not an invented name. It is a
     **figure of speech**, a metaphor standing in for a plain question. The
     plain version was available: "How strict do you want this to be?"
  2. **From this session, the agent's own text:** "Q9: your 'not dumbing down'
     non-goal." Mike: "I don't know what that means." He *had* written a
     "Non-goals" heading in his own ticket, but the reply compressed a whole
     section of his document into a two-word label and used it as though it
     were a thing he thinks about by that name. Writing a word once in a
     document does not make it a shorthand he can decode later.
- **New rule this produces, not in the original ticket: no figures of speech.**
  Say the literal thing. "Where do you want the dial", "moving the needle",
  "the crux", "belt and braces" all get replaced with the plain question or
  statement underneath them.
- **Sharpening of the private-vocabulary rule from Q3:** the ban covers labels
  Claude coined *and* compressed references back to Mike's own documents.
  Quoting a heading from his ticket is fine; turning that heading into a
  nickname for a concept is not.
- **A third point, about the interview itself:** the questions in this session
  were too many and too clever. That is the same failure the ticket is about,
  showing up in the shape of the conversation rather than in a sentence. The
  fix Mike is pointing at: the problem is simple and the answer should be too.
- Flags: None.

### Q10: Does the Q8 answer actually cover the memory librarian?

- Asked: Mike agreed to close the interview but raised the case he actually
  cares about: "did we solve for sub-agents? My main concern is the memory
  librarian agent writing memories back to the different memory files and it
  having a bunch of jargon and figures of speech in there."
- Findings before answering:
  - The toolkit ships exactly **one** helper agent:
    `plugins/second-brain/agents/memory-librarian.md`.
  - That file is 152 lines about where to put files and what to link, and
    contains **no writing instructions at all**. No plain language, no jargon
    ban, nothing about voice.
  - The Q8 answer put a pointer rule in `general-rules/`, and there is no
    guarantee a helper agent reads that folder. For this case it is a guess,
    not a fix.
  - Memory files are the worst place for the problem, because they are read
    back into future sessions, so bad wording spreads instead of being read
    once and forgotten.
- Captured: **Fix it in the agent's own instruction file, and stop it
  recurring.** His selected wording:
  1. `memory-librarian.md` gets: plain words, no jargon; no invented names; no
     figures of speech; no em dashes, no section signs.
  2. The toolkit `CLAUDE.md` gets a standing requirement: "Every agent this
     toolkit ships carries the same writing rules as the output style."
  Not extended to running the mechanical check over written memory files; that
  option was offered and not chosen.
  - This is the eighth deliverable in 102, and it supersedes nothing in Q8. The
    `general-rules/` pointer from Q8 still stands for commit messages and pull
    request text; this adds the reliable path for the one agent that writes
    durable files.
- Flags: None.

## Open flags (pending input)

Resolved during the session:

- Q4's flag, whether 102 edits Mike's machine-level rules, was settled by Q6:
  yes, it does.

Still open, all for the build session rather than blocking it:

- **Length of the style file.** Not settled. Recommended default: keep it under
  about 40 lines, since the `style-reminder` hook re-sends the whole file on
  every message and the output-styles README warns that every line competes with
  every other line. -> the build session, unless Mike objects.
- **Shape of the check hook.** Whether it revives the deleted `writing-guard` or
  is written fresh, and whether it blocks the reply or only warns. -> the build
  session.
- **The check hook's quoting exception may not be buildable as written.** The
  spec says the check ignores an em dash inside quoted text or a code block. A
  hook reading a finished reply can do that for fenced code blocks. Telling an
  inline quote of a file apart from Claude's own words is much harder. If it
  turns out impossible, narrow the exception to fenced blocks only and say so.
  -> the build session.
- **Two edits cannot ship in the pull request.** `~/.claude/rules/` and
  `~/.claude/settings.json` are not in any git repository, so deliverables 2 and
  the cleanup have to be made directly on the Mac. -> the build session, with
  Mike watching.
- **Three project sessions.** Deliverable 3 needs a session opened inside Anchor,
  Dragonfly, and Diligence Ready. It cannot be done from the toolkit repo. ->
  Mike, after the pull request merges.

## Things considered and deliberately not done

- **Running the em dash and section sign check over written memory and
  specification files**, not only chat replies. Offered in Q10, not chosen.
- **Widening the helper-agent rule to every document in the repo.** Offered in
  Q8, not chosen, because it would put voice rules back into `general-rules/`
  against the output-styles README's argument.
- **A check on the judgment calls** (invented names, buried answers) using a
  model to read finished replies. Offered in Q7, not chosen, on the grounds that
  a script should check what a script can see and the style should carry the
  rest.

## Notes for whoever builds this

The two failures in Q9 are the most useful thing in this file. They are real,
unprompted, and Mike reacted to both in the moment. Use them as the worked
example in the style file rather than inventing one.

## Note for the next grill-me session

Two questions in this session were rejected before Mike answered them, and both
failed the same way: the question bundled a finding with an ask, so it was not
clear whether he was being told something or asked something. He said so
directly: "Are you asking me if 102 closes the gap, or are you saying should it
close the gap?" Separate the two. State the finding, stop, then ask the plain
question on its own.

The other complaint was volume. Ten questions was too many for a problem he
described as simple. Ask fewer, and make each one a decision that actually
changes what gets built.
