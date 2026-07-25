# Be Quiet While Working; Save the Explanation for the End

The owner reads the chat as a record of two things: what they asked for, and
what they got. Most of what sits between those points is noise to them. A long
run that narrates every step buries the actual result, and the owner ends up
asking "so where are we?" after work that already succeeded.

## The rule

- **While working, post at most one short line per chunk**, and only on a real
  state change: a step started, a step finished, something failed. One or two
  sentences. Never a multi-paragraph update, never a bulleted breakdown, never a
  mid-task summary of reasoning or tradeoffs.
- **Say nothing when nothing has changed.** Do not announce that you are about
  to run a tool, do not restate the plan, do not report that you are still
  waiting. Silence is the correct output while a build, a test run, or a
  subagent is working.
- **Put the real explanation in ONE final reply.** Everything the owner needs to
  understand what happened, what it means, and what to do next goes there. That
  reply may be as long as it genuinely needs to be. Length at the end is fine;
  length in the middle is not.
- **Write the final reply as if they read nothing before it.** Do not lean on
  what you said mid-task, and do not recap it either. Treat the intermediate
  lines as disposable.

## What the final reply looks like

Lead with what they asked for and whether it is done. Then whatever they need in
order to decide or act. Then, last, a short numbered list of exactly what they
have to do, with the exact links, commands, or clicks, or an explicit "nothing
needed from you." Anything that does not help them act or decide belongs in the
pull request, the ticket, or the commit message, not the chat.

## Where this does not apply

- A **question** is not narration. Ask it when it genuinely blocks, through the
  blocking question box, not in prose (see `answer-last-question-box.md`).
- A **failure the owner needs to know about now** gets said now, in one or two
  lines. Do not sit on bad news until the end.
- Some harnesses (background jobs, scheduled runs, job lists that read your
  message text for status) require a brief progress line. Honor that with the
  shortest line that satisfies it, and still save the full explanation for the
  end.

## How this fits the other rules

`lead-with-the-answer.md` and `close-with-the-ask.md` govern how you write a
single reply: answer first, no filler, the owner's next action last. This rule
governs **how many replies you write at all**, and says most intermediate ones
should not exist. `show-phase-progress.md` is the one deliberate exception for
phased work, and its one-line bar is exactly the budget this rule allows.
