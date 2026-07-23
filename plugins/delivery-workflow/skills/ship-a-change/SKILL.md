---
name: ship-a-change
description: >-
  End-to-end workflow for delivering a non-trivial code change well: orient and
  recall before touching a subsystem, isolate in your own worktree, pin the
  load-bearing invariant before designing, build to the house standard, verify
  honestly on the real platform, reconcile with parallel sessions before
  finishing, and wrap up completely (status docs, memory, work ticket, PR). It
  is self-improving: it reads a Lessons ledger at the start of each run and adds
  one curated lesson at the end, so the workflow gets a little better every time.
  Use this when you are about to implement, build, fix, refactor, or ship a
  feature or bugfix that will land as a pull request. Do NOT use it for pure
  questions, small lookups, or read-only investigation that changes no code.
---

# Ship a change (a workflow that learns)

This is the playbook for taking a change from "the owner asked for it" to
"merged and cleaned up," without cutting the corners that come back to bite. It
assumes you may not be the only session in the repo, and that the **owner
merges** unless they said otherwise this session.

The skill has a memory of its own: the **Lessons** section at the bottom. Every
run reads it and adds to it, so mistakes are made once, not repeatedly. That is
what "self-improving" means here. It is not magic, it is a deliberate step at
the end that you must not skip.

## 0. Read the Lessons first

Before anything else, read the **Lessons ledger** at the bottom of this file.
Those are corrections earned in past runs, one line each. Treat them as
standing constraints for this run, not trivia.

## 1. Orient before you touch anything

- Read the project's `CLAUDE.md` and its live status doc (whatever the project
  uses as "where we are now"). They hold the hard rules and the current state.
- **Recall memory on the named subsystem you are about to change**, if the
  project has a memory system. The store routinely holds a decision about the
  exact thing you are about to touch, written days or hours earlier, that a
  session-start digest will not surface once the work drifts into a subsystem.
  One pointer-first recall is cheap; skipping it is how "memory knew and nobody
  asked" happens.
- Work out the owner's real goal, not just the literal words. If the request is
  a symptom or a half-formed idea, find the problem underneath and confirm it in
  one line before building.

## 2. Isolate before the first edit

- Create and enter your **own git worktree on a new branch** before changing any
  file. Never edit, `reset`, `rebase`, or switch branches in the shared primary
  checkout; another session may be mid-task there.
- One session = one worktree = one branch. If the primary checkout is dirty or
  on an unexpected branch, do not "fix" it. Say so and keep to your own silo.

## 3. Pin the invariant, then design

- Get a second opinion **before** you commit to an approach, not after you have
  written it. If an advisor or reviewer is available, use it here; otherwise
  reason it through explicitly.
- Name the **one load-bearing invariant** of the system you are touching, and
  make preserving it the center of the design. The tempting shortcut is usually
  the one that quietly moves or weakens that invariant. Recommend the
  well-built solution and name the quick-patch tradeoff; once the owner decides,
  build it their way.
- Stay in scope. Do not gold-plate or reverse a settled decision without asking.

## 4. Build to the house standard

- Match the surrounding code: its patterns, naming, and comment density.
- Follow the owner's writing rules in everything you produce, code comments and
  UI copy included: plain language, no em dashes, no filler, define terms on
  first use.
- Keep owner-facing text honest. Surface the real tradeoff of a change plainly
  rather than burying it.

## 5. Verify honestly, and say what you checked

- Build and run the **full** test suite. For a user-visible change, also do a
  hands-on pass on the real platform (run it, click it, screenshot it).
- Write tests that pin the **invariant**, not just the happy path.
- Never claim "green" from a partial run or from reasoning. If you did not run
  it, say so and leave the exact steps. Report failures with their output.

## 6. Reconcile with parallel work before you finish

- Fetch and merge the default branch into your branch before you wrap up.
- If another session shipped the same fix or a better shared abstraction while
  you worked, **adopt theirs and delete your duplicate** rather than carrying
  two versions of the same idea. Re-run the full suite after merging.
- Resolve conflicts in favor of the cleaner shared design, and update any docs
  or tests that named your now-removed version.

## 7. Wrap up completely

- Update the status/handoff doc and any decision/design doc a decision changed.
  Keep edits to shared docs small and additive so parallel PRs merge cleanly.
- Route each durable fact to its **one** home: a decision + why or a constraint
  to project memory; why a piece of code exists to the knowledge layer; a
  personal workflow habit to auto-memory. Rules command, memory informs.
- Move the work-tracking ticket yourself if the project has a board (In review
  when the PR opens, Done after it lands).
- Commit in your worktree, push your branch, open a PR. **The owner merges**
  unless they explicitly said to merge this session. If they did, run the
  merge-safety check first (compare the primary checkout's status against the
  files the merge changes; if any file is in both, stop and name it), then
  merge, delete the branch, fast-forward the primary checkout, and remove your
  worktree.

## 8. Reflect and record (this is what makes the skill improve)

Before you close out, add **one** entry to the Lessons ledger below. Ask: what
worked that I want to repeat, what bit me, what would I tell the next run to do
differently? Write the durable, transferable lesson, not the play-by-play.

Skip this only when the run genuinely taught nothing new (a trivial or purely
mechanical change). A run that hit a surprise, a rework, or a correction almost
always has a lesson worth one line.

## Lessons (the part that grows)

Accumulated corrections from past runs. **Read these at step 0; add to them at
step 8.**

Keep the ledger high-signal, not a diary:

- One line per lesson: the rule first, then a short `(why / example)` in
  parentheses. Two lines at most.
- **Cap it at ~15 entries.** When you add one, merge any near-duplicate, and
  drop anything that has since become a project rule, or that proved a one-off.
- A lesson earns its place by being reusable across changes, not by being
  memorable. Prefer the general principle over the specific incident; use the
  incident as the example.

Seed lessons (from the runs that started this skill):

- **Preserve the enforcement gate; let the UI waive it.** When you add an owner
  opt-out to a gated behavior, keep the gate where the *app* enforces it and
  have the UI act on the owner's behalf, so the model can never talk its way
  past it. (Moving the gate into the model's reach is the tempting wrong turn.)
- **Fetch the default branch before you finish.** A parallel session may have
  landed the same fix with a cleaner shared type; adopt it and delete your
  duplicate instead of shipping two.
- **A failure must never read as success to the next reader.** When a result is
  fed back to a model or shown to the owner, keep success and failure distinct
  (typed, or a clear marker), or a failed step gets reported as done.
- **Volatile prompt text goes in the per-request block, never the cached
  prefix.** Anything that changes per request must stay out of the cached part
  of a prompt, or prompt caching silently stops paying off.
- **Scrub em dashes from every new string**, including code comments and UI
  copy, not just prose. (It is an owner writing rule; linters and reviewers do
  not always catch it.)
- **Verify on the real platform and say what you checked.** Build plus the full
  suite plus a hands-on pass; do not claim green from a partial run.
