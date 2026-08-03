# Work-item tracking choice: Brainstorm / Discovery Notes

Date: 2026-08-03
Goal: Settle the specification for GitHub issue #107, so a project standing up
with the toolkit is asked how it tracks work items, can name any tracker
(including ones the toolkit has no process for), and carries the ticket-spec
discipline into whatever it named.

Ticket: https://github.com/Mar5929/claude-toolkit/issues/107 (status: Refining)

## Summary / key decisions

**Starting state, verified in the repo on 2026-08-03:**

- `project-init` Gate 1 offers the `work-tracker` plugin, which stores work
  items as files in git (`work-items/01-backlog/` through `04-archived/`), and
  then asks as a side question whether the owner also wants a GitHub Project as
  a **mirror** of those files. Git is authoritative; GitHub reflects it.
- The ticket-spec discipline (the six-part spec, the grill-me gate, the
  `Refining` status, the `grill-me-completed` label) exists in exactly one
  place: claude-toolkit's own `CLAUDE.md` and `AGENTS.md`. It is in no plugin,
  so no other project receives it.
- claude-toolkit itself has **no** `work-items/` folder. It runs
  GitHub-board-as-the-only-tracker, a mode `work-tracker` does not support.
- The `Claude-Toolkit-Project` board already has a `Refining` status
  (Backlog, Refining, Ready, In progress, In review, Done) and the
  `grill-me-completed` label already exists in the repo.

**Owner reframe of #107, captured 2026-08-03 (this is broader than the
ticket as written):**

The toolkit should ask, in the owner's words, "Where are you when you're
working on stuff? How are you tracking your work items?" It should offer
options, but the owner must be able to answer with a tracker the toolkit does
not ship a process for, such as Jira, and the toolkit should pivot to use it.
When the owner names something the toolkit *does* have a process for, such as a
GitHub Project, the toolkit should say "we already have a process for that, do
you want to use it?"

This supersedes #107's fixed list of four choices (local only / local plus
GitHub / GitHub only / none). The question becomes open-ended with known
answers offered, not a closed menu.

**Deferred:** the owner explicitly declined to pick between "work-tracker gains
a GitHub-authoritative mode" and "claude-toolkit migrates to git-authoritative"
before this session. That fork is downstream of the questions below and will be
reached in dependency order.

**Prior recommendation carried into this session (from the pre-session
analysis, not yet ratified):** do not create a new plugin for the GitHub board
process. The pasted rules split into three parts with three existing homes:
the ticket discipline (a `general-rules/` file), the grill-me gate (the
`grill-me` plugin plus the tracker), and the GitHub mechanics (`work-tracker`'s
existing GitHub adapter, which already owns all the `gh` plumbing).

**Known collisions to resolve before any building:**

1. `general-rules/work-item-folders.md` ships the instruction to keep `SPEC.md`
   requirements loose, "not frozen acceptance checkboxes," because rigid
   criteria go stale. The six-part spec opens with "what has to be true for
   this to count as finished." Opposite instructions in the same rules folder.
2. `Refining` is a seventh status. `work-tracker` ships exactly six and its
   GitHub adapter configures a new board's Status field with those six,
   stopping when an existing board's options differ. Adding one touches the
   adapter, the status-to-stage-folder table, `validate`, and the tests.
3. `grill-me`'s README states it does not replace a work item's `SPEC.md`.
   Making it author ticket specs redefines what it owns.

## Q&A log

### Q0: What is being decided (owner framing, unprompted)

- Asked: n/a. Owner reframed the ticket before the first question.
- Captured: See "Owner reframe" above. Verbatim intent: the toolkit asks how
  work items are tracked; offers options; accepts an arbitrary answer such as
  Jira and pivots to use it; recognizes answers it already has a process for
  and offers that process.
- Flags: The reframe widens #107 beyond its written requirements. The ticket
  body will need rewriting at the end of this session. -> this session

### Q1: How far does the toolkit go for a tracker it does not ship?

- Asked: When a project tracks work somewhere the toolkit has no built-in
  process for (Jira, Linear, Notion, a spreadsheet), how far should the toolkit
  go? Offered: (a) record it and write the ticket rules but ship no code,
  (b) build a real working connection per tracker, (c) only support what we
  ship.
- Captured: Owner rejected the framing. Verbatim: "Huh? the toolkit should just
  offer pre-built systems that we have. if I don't want to use one that is
  fine..."
  Reading: the toolkit offers the systems it already has. It does not build
  integrations for other trackers, and it does not treat "I use something else"
  as a problem to solve. Option (b) is dead. The question was over-built.
- Flags: This sits against the owner's earlier phrasing, "the user could also
  say, oh I'm using Jira, and we could pivot to use Jira." Most likely that
  meant "do not force your tracker on me," not "integrate with Jira." Resolved
  in Q2. -> owner

### Q2: If the owner declines the toolkit's options, does the toolkit still write ticket rules?

- Asked: You tell a project "I use Jira" and decline the toolkit's own options.
  Does the toolkit still write the ticket rules into that project, or stay out?
- Captured: **Stay out of it.** When the owner declines, the toolkit writes
  nothing about tracking into that project and asks nothing further. Ticket
  quality in that project is the owner's own business.
- Flags: None. This resolves the Q1 flag: "pivot to Jira" meant "do not force
  your tracker on me," not "integrate with Jira."

**Decision (Q1 + Q2):** the toolkit offers only the systems it already ships.
Declining is a complete, supported answer that produces no toolkit output.
#107's requirement 2 (a fixed menu of four choices including "no tracker") and
requirement 3 (rules travel to the chosen tracker) both narrow: the menu is
"the systems we have, or nothing," and the rules travel only with a system the
toolkit ships.

### Q3: What goes on the menu of pre-built systems?

- Asked: Today the toolkit ships one system (work items as files in the repo,
  GitHub board optional mirror). This repo runs board-only with no files. What
  should the menu offer? Offered: both shapes, files-only, or board-only.
- Captured: **Both.** The menu becomes three choices:
  1. work items as files in the repo (`work-tracker` as it exists today);
  2. files plus a GitHub board that mirrors them (today's optional adapter);
  3. a GitHub board on its own, with no work-items folder.
  Choice 3 does not exist today and is the mode claude-toolkit itself runs.
- Flags: None on the decision. Consequence recorded: choice 3 is real new work
  inside `work-tracker`, not a documentation change. Its GitHub adapter assumes
  local files are authoritative and syncs outward from them; a board-only mode
  needs the board to be the record. Scope of that change is unread so far
  (`plugins/work-tracker/skills/work/scripts/lib/github.mjs`). -> this session

**Decision:** this settles the deferred "Option A vs Option B" fork from before
the session. Option A wins: `work-tracker` gains a GitHub-authoritative mode.
claude-toolkit does not migrate to git-authoritative tracking.

### Q4: Do the ticket rules apply to all three menu choices?

- Asked: Do the six-part spec and the no-building-before-grill-me gate apply to
  all three menu choices, or only when a GitHub board is involved?
- Captured: **Only when a board is involved.** Files-based projects keep the
  looser `SPEC.md` style that `work-item-folders.md` already ships.
- Flags: Superseded in scope by Q5 below. The answer's spirit survives (the
  rules attach to an external tracker, not to files in the repo), but "a GitHub
  board" turns out to be too narrow a name for the case.

### Q5: Owner restates the root problem (unprompted, supersedes Q1 to Q4 framing)

- Asked: n/a. Owner interrupted to correct the target.
- Captured, verbatim: "the only real thing that it needs to solve for is when
  I'm using an external system, whether that be GitHub Projects or Linear or
  Jira. It just has to make sure that work items are tracked there so that I can
  just kind of understand where we're at, and then just make sure that we don't
  start working on stuff until there's been a refinement session. That's
  basically the root of what I'm asking." Also: "whenever the root thing that
  the toolkit needs to solve for occurs, it can list that GitHub project
  template as an example... 'Hey, you already have this template. Do you want to
  use this process?'"

  Reading: the problem is not a menu of trackers. It is two guarantees that must
  hold in any project whose work lives in an external system the owner can open
  and look at:
  1. every piece of work is logged there before it is built, so the owner can
     see where things stand; and
  2. nothing is built until a refinement session has filled in the spec.

  The GitHub Projects setup this repo runs (statuses Backlog, Refining, Ready,
  In progress, In review, Done; the `grill-me-completed` label; the six-part
  spec) is a **worked example the toolkit offers** when the named system happens
  to be GitHub Projects, not the thing being specified.

- Flags: Direct contradiction with Q2 to resolve. In Q2 the owner said the
  toolkit should "stay out of it" for Jira, but that question wrongly framed
  naming Jira as *declining the toolkit*. The owner now says the external-system
  case is the whole point. Q2's answer was given to a mis-framed question and
  cannot stand as recorded. -> owner, next question

  Second open consequence: if the root is "an external system I can look at,"
  it is no longer obvious that `work-tracker`'s files-in-the-repo option belongs
  on the menu at all. A folder of Markdown files does not answer "where are we
  at" the way a board does. Not yet asked. -> owner

### Q6: The setup conversation, written out and approved

- Asked: The owner said the abstract questions were not landing ("I genuinely am
  so confused what you're asking. This is really frustrating me."). Switched
  from asking to showing: drafted the literal on-screen text of the setup
  question and each of its answers, and asked whether that was it.
- Captured: **Approved as written.** The agreed behavior:

  One question during project setup: "Where do you track work items for this
  project?" with five answers.

  1. **A GitHub Projects board.** The toolkit has a ready-made setup, the one
     claude-toolkit runs. With the owner's yes it creates a board connected to
     the repo with statuses Backlog, Refining, Ready, In progress, In review,
     Done, and adds a `grill-me-completed` label. Then it writes the two
     guarantees into the project's `CLAUDE.md` and `AGENTS.md`.
  2. **Linear.** No ready-made setup. The toolkit creates and changes nothing
     inside Linear. It writes the two guarantees into `CLAUDE.md` and
     `AGENTS.md`, worded for Linear.
  3. **Jira.** Same as Linear.
  4. **Files in this repo.** Installs the `work-tracker` plugin, exactly as
     today.
  5. **Somewhere else, or nothing yet.** Writes nothing and moves on.

  The two guarantees, identical whichever tracker is named:
  - every piece of work is logged in that tracker before it is built; and
  - nothing is built until a refinement session has filled in the spec (the six
    parts: requirements, goal, reason, what the person using it experiences, how
    it behaves from the outside, edge cases).

  The GitHub Projects board is the only answer where the toolkit also builds
  the tracker for you. Everywhere else it only writes the rules.

- Flags: One collision left, recorded on the ticket rather than decided here.
  The owner approved "the two guarantees are identical no matter what you
  pick," which includes the files-in-this-repo answer. But the shipped rule
  `general-rules/work-item-folders.md` tells agents the opposite for that case:
  keep `SPEC.md` requirements loose, "not frozen acceptance checkboxes,"
  because rigid criteria go stale and a later agent builds carefully to the
  wrong target. Both cannot govern the files answer. -> owner, before building

## Session close

Reconciled. Superseded answers, kept for history:

- **Q2 is void.** It asked whether the toolkit still writes rules when the owner
  "declines the toolkit's options" and names Jira; the answer was "stay out of
  it." The question was mis-framed: naming Jira is not declining. Q6 replaces
  it. Naming Linear or Jira gets the same two guarantees written into the
  project; only "somewhere else, or nothing yet" produces no output.
- **Q4 is superseded.** It scoped the rules to "only when a board is involved."
  Q6 widens that to any named tracker, and leaves the files-in-this-repo case as
  the single open collision above.
- **Q1 and Q3 stand.** The toolkit builds nothing for Linear or Jira (Q1), and
  a GitHub board with no work-items folder becomes a supported answer, which is
  new work inside `work-tracker` (Q3).

## Open flags (pending input)

- The six-part spec versus `work-item-folders.md`'s "keep requirements loose"
  for the files-in-this-repo answer. Must be settled before building.
  -> owner
- A GitHub board used on its own, with no work-items folder, is not something
  `work-tracker` supports today. Its GitHub adapter syncs outward from local
  files that it treats as the truth. The size of that change is still unmeasured
  (`plugins/work-tracker/skills/work/scripts/lib/github.mjs` unread).
  -> whoever builds it
