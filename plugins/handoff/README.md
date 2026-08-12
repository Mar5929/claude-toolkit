# handoff

Save what a session learned, then write a checked prompt a fresh session can
start from.

**Setup: install and go.** One skill, one helper agent, no configuration, no
hooks, nothing copied into the project.

## What it does

`/handoff` runs these steps, in this order:

1. **The durable review.** It invokes the installed `remember` skill to decide
   what is worth keeping and where it belongs.
2. **The save decision.** `remember` shows `What I want to change`, `Why`, and
   the exact words, then waits when owner approval is required.
3. **The draft.** A prompt for a fresh session, opening with the goal of the
   work, then the task, what to read first, the decisions nobody has written
   down yet, the open questions, and one concrete first action. The owner does
   not see it yet.
4. **The check.** A helper agent that has not seen the conversation reads the
   draft against the repository and reports what is wrong, what it cannot
   confirm, and whether the goal is there at all.
5. **The short list, then the prompt.** A few one-line notes saying what was
   corrected and what could not be confirmed, then one block to copy.

Anything the owner does not approve for project knowledge is carried inside the prompt
instead, so it is never silently dropped. Anything the checker could not confirm
is labelled inside the prompt, so it is never passed on as fact.

The order is the whole point. Write the prompt first and the durable review gets
skipped, because once the prompt is on screen the session is over in the owner's
head. Show the prompt before the check and the check never happens.

## Why it exists

The sessions that produce the most valuable understanding are the ones most
likely to lose it. A long exploration or planning session fills the context
window, so the work is handed to a fresh agent through a prompt, and whatever
did not make it into that prompt is gone the moment the old session ends. It
never reaches project knowledge.

Two things then go wrong with the prompt itself, and steps 3 to 5 exist for
them.

**The goal disappears.** The first session knew what the work was for and why it
mattered. The prompt carries the next step, so the fresh session does a piece of
work with no idea what it serves, and the session after that knows even less. So
the prompt now opens with the goal, the reason, and a pointer to the file or
ticket that holds them, and a prompt without a goal is never shown to the owner.

**Nothing checked it.** Whatever the writing session believed went in as fact,
including what it had worked out for itself. The next session read that as
settled and passed it on, and the facts got less accurate each time the work
was handed on. So a second agent now reads the draft cold.

## The checker

`agents/handoff-verifier.md`. It reads, and it changes nothing.

It has not seen the conversation, which is what makes its answer worth having:
it can only believe what it can open. It checks that the goal is stated, that
the goal's pointer resolves, that every path exists, that every branch, ticket,
and number is what the draft claims, and that every file says what the draft
says it says. Everything it cannot check gets marked unchecked rather than
quietly passed on or quietly deleted.

Two limits, on purpose:

- **It never runs tests, builds, or scripts.** Those take minutes the owner does
  not have at a handoff. A claim that tests passed, with no command output
  behind it, is reported as not confirmed.
- **It never blocks the handoff.** If it fails or cannot run, the prompt is
  still written and says inside it that it was not checked.

## Checking a prompt you already have

`/handoff check` runs the checker on its own, against a handoff prompt from an
earlier session, another agent, or written by hand. No durable review, nothing
saved, nothing from the current session added. It hands back the same short list
and the corrected prompt.

## What it is not

- **Not a session summary.** `session-summary` answers "which of my requests are
  where, and what still needs me". This answers "how does somebody else pick
  this up". They do not overlap; run both if you want both.
- **Not a project knowledge system.** It contains no knowledge types, no
  destinations, and no save policy. Those belong to `remember`, which is why
  handoff still works in a project with no project knowledge system: the
  durable review is skipped and everything worth keeping goes into the prompt.
- **Not a writer of project knowledge.** It invokes `remember`, which owns the
  save filters, exact proposal, owner approval, writing, link repair, and index
  rebuild.
- **Not an editor.** `handoff-verifier` never removes a claim it dislikes and
  never rewrites a sentence that reads badly. It checks facts.

## Why it is a command and not a hook

Nothing can catch the moment context is cleared. Claude Code's session-end event
fires on a clear, but it is side-effects only: it cannot stop the clear and it
cannot say anything to the agent. By the time it runs, the context is already
going. The pre-compaction event can stop a compaction but also cannot speak to
the agent.

So the trigger has to be something the owner does on purpose. A slash command
loads its own instructions at the moment it is typed, which puts the durable
review in front of the agent without a handoff-specific hook.

## Its known limit

**A clear with no warning is not caught.** If the owner types `/clear` without
running this first, nothing fires and nothing is saved. Two things reduce that:
the `offer-context-handoff.md` rule tells the agent to raise a handoff before the
session gets that heavy, and asking for a handoff in plain words works as well as
typing the command.

## Install

```text
/plugin install handoff
/handoff
```

The plugin installs once per computer and copies nothing into a project, so
every project on that computer gets the checked handoff without any per-project
setup. `project-init` offers it during setup and `project-sync` audits for it,
so a toolkit project gets it without asking. It needs no output style, no
project knowledge system, and no hooks.
