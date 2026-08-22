---
name: handoff
description: >-
  Save what this session learned, then write a checked, self-contained prompt for
  a fresh session to carry on from. Use when the owner says "write a handoff",
  "hand this off", "handoff prompt", "I'm going to clear context", "start a new
  session", "this session is getting long", "carry this over", "prompt for a new
  chat", or runs /handoff. Use the check on its own, with "/handoff check", when
  the owner has a handoff prompt from somewhere else and wants it verified.
  Always run the installed remember review first, before writing the prompt, and always run
  the accuracy check before showing the prompt.
---

# Handoff

A long session is about to end. Four things have to happen, in this order, and
the order is the whole point.

1. **Run the installed `remember` review**, so anything worth keeping passes
   the project's placement test and owner approval.
2. **Wait for the save decision**, so nothing is written outside the meaning the
   owner approved.
3. **Draft a prompt a fresh session can start from**, carrying everything that
   was not saved, opening with the goal of the work.
4. **Check the draft before the owner sees it**, then show what changed and the
   finished prompt.

Do the persistent review last and it gets skipped, because once the prompt is on
screen the session is over in the owner's head. Skip the check and the prompt
carries whatever this session believed, guesses included.

## Why this exists

The sessions that produce the most valuable understanding are the ones most
likely to lose it. A long exploration or planning session fills the context
window, the work gets handed to a fresh agent, and whatever did not make it into
the handoff prompt is gone the moment the old session ends. It never reaches
project knowledge, so nothing downstream ever sees it either.

Two things then go wrong with the prompt itself.

**The goal disappears.** The first session knew what the work was for and why it
mattered. The handoff prompt carries the next step, so the fresh session does a
piece of work with no idea what it serves, and the session after that knows even
less.

**Nothing checks it.** Whatever the writing session believed goes in as fact,
including what it worked out for itself. The next session reads that as settled,
passes it on, and the facts get less accurate each time the work is handed on.

Nothing can catch the moment the owner clears context. Claude Code's session-end
event fires on a clear, but it cannot stop the clear and it cannot say anything
to the agent. By the time it runs the context is already going. That is why this
is a command the owner types rather than a hook: typing it is the moment, and a
command carries its own instructions.

## Step 1: the persistent review, before anything else

Detect the current project knowledge system by its complete layout:

- `SOUL.md`, `knowledge/README.md`, `knowledge/project.md`, and
  `knowledge/current.md`;
- `knowledge/specs/`, `knowledge/memory/`, and `knowledge/brainstorms/`; and
- the installed `remember` skill.

When all are present, invoke `remember`. That skill owns placement, the short
meaning review, approval, link repair, and index rebuild. Do not restate or
replace that policy here.

When no knowledge-system signature exists, skip to step 3. Everything worth
keeping goes into the handoff prompt instead. Say that plainly in one line.

When the layout is partial, mixed, or unknown, do not guess which system owns
the files. Say that the persistent save is blocked, carry the candidate material
into the prompt, and recommend `project-sync` in the next session.

Review what this session produced: decisions the owner made, understanding that
took work to reach, constraints that were discovered, references that turned out
to matter, and anything that would have to be worked out again from scratch by
the next session.

**If nothing is worth saving**, say so in one line and go to step 3. Do not show
an empty table, and do not invent rows to fill one.

## Step 2: wait for the `remember` result

`remember` follows the approval contract in `knowledge/README.md`. Do not copy
that contract here. Wait when it requires the owner's answer. Continue only
after it reports what was saved, declined, or blocked.

Whatever the owner cuts or defers, and anything whose save failed, goes into
step 3 instead. Nothing is queued anywhere, and nothing is dropped.

## Step 3: draft the prompt, and do not show it yet

The prompt is for an agent that knows nothing about this session. Write it as an
instruction to that agent, not as a summary of what happened here.

### It opens with the goal

The first thing in the prompt is what the whole piece of work is trying to
achieve, why it matters, and where that is written down. Not the next step. The
thing the next step serves.

- **What we are trying to achieve**, in one or two plain sentences.
- **Why it matters**: the problem it solves, or what went wrong that started it.
- **Where it is written down**: the spec file, the work item, the ticket number,
  by path. If more than one file holds part of it, name each.

"Finish the change to `src/api.ts`" is a task, not a goal. "Cut the time the
export takes so the nightly job stops running past its window" is a goal. If a
reader cannot tell what the work is for, the goal is not there yet.

If the goal was only ever said in this conversation and is written in no file,
write it anyway and mark it as not confirmed against any file. Do not stop the
handoff to write it into the work item first, and do not refuse to produce a
prompt without one.

### Then the rest

- **The task.** What the new session is being asked to do next, its scope, and
  what finished looks like.
- **What to read first**, by path, in the order that makes sense. The work item
  or ticket, the plan, the files being changed.
- **Decisions made in this session that are not written down anywhere yet.**
  Call these out under their own heading. They are the part that disappears, and
  they include everything the owner declined or cut from the proposals in step 2. Say what was
  decided and, where it matters, why.
- **Open questions and constraints** the owner has raised and nobody has settled.
- **What to do first.** One concrete action, not a direction.

### Every fact carries where it came from

As you draft, keep a source for each factual claim. You will hand these to the
checker in step 4, and the ones that survive nothing become labels inside the
finished prompt. There are four kinds:

| Source kind | What it means |
|---|---|
| file | A path, a line, or what a file says. Checkable |
| repository | A branch, worktree, commit, pull request, ticket, or command output from this session. Checkable |
| owner | The owner said it in this conversation. Quote their actual words when you can |
| worked out | This session concluded it. Nothing recorded it |

Say plainly, inside the prompt, which facts were proposed in step 2 and were not
saved. The next session should know it is holding the only copy.

**Do not show this draft to the owner.** It goes to step 4 first.

## Step 4: check the draft

Run the `handoff-verifier` agent, in the foreground, and wait for its report.
Its file is `agents/handoff-verifier.md` in this plugin.

Give it three things: the full text of the draft, the path of the repository,
and the source you kept for each claim. It has not seen this conversation and it
must not be told to trust anything it cannot open. That is what makes its answer
worth having.

It hands back a report with a verdict on the goal, a table of claims, anything
carried over from an earlier handoff, and anything it had to skip.

Then act on it:

| Verdict | What you do |
|---|---|
| `Wrong` | Correct the prompt to what the repository actually says. Note it in the short list |
| `Unchecked` | Leave the claim in and label it inside the prompt as not confirmed. Never delete it, never hedge the wording instead of labelling it |
| `Missing` (the goal) | Add the goal before going on. A prompt is never shown to the owner without one |
| `Skipped` | Say in the short list which check could not run and why |

Run the checker once, fix what it found, and go on. Only run it a second time if
you rewrote whole sections, and then only on what changed. This step happens
while the owner is trying to leave, so it does not become a loop.

If the checker fails, errors, or cannot be run at all, say so in one line, write
the prompt anyway, and say inside the prompt that it was not checked. The check
never blocks the handoff.

## Step 5: show the short list, then the prompt

The owner sees a few one-line notes, then one fenced block they can copy in one
click. Nothing else above it, and nothing below it but the one action they have
to take.

```markdown
Checked the handoff prompt: 2 fixed, 3 not confirmed.

- Fixed: the plan is at `knowledge/specs/export-timing.md`, not `docs/export-plan.md`
- Fixed: the branch is `issue-88-export-timing`, not `export-fix`
- Not confirmed: the goal is written in no file, only in this chat
- Not confirmed: "the nightly job times out at 40 minutes", nobody recorded it
- Not confirmed: the tests were never run in this session
```

One line each. If there are more than about six, group the small ones into a
single line and keep the ones that would change what the next session does.

## Running the check on its own

`/handoff check` takes a handoff prompt the owner already has, from an earlier
session, another agent, or written by hand, and runs step 4 against it with no
persistent review and no drafting.

1. Ask for the prompt if the owner has not pasted it, and ask which repository
   it is about if that is not obvious.
2. Hand it to `handoff-verifier` exactly as given. You have no sources to attach,
   so say so: every claim arrives with no source offered.
3. Fix what came back `Wrong`, label what came back `Unchecked`, add the goal if
   it came back `Missing`.
4. Show the same short list, then the corrected prompt in one block.

Nothing is saved to project knowledge in this mode, and nothing about the current session
goes into the prompt. It is a check on somebody else's text.

## When the owner asks in their own words

They will not always type the command. "I'm going to clear context", "this is
getting long, write me something to paste into a new chat", "hand this off to a
fresh session" all mean the same thing. Run the same steps.

The rule that raises this before a loaded session is
`offer-context-handoff.md`. The `remember` skill owns the persistent review. This
command is the convenient path, not the only one.

## How to write the prompt itself

Follow the project's output style. Two things that matter here in particular:

- **Say the literal thing.** Do not describe the accuracy problem with a figure
  of speech about a message getting garbled as it passes along. Say that facts
  get less accurate each time work is handed on, or do not mention it at all.
- **Label, do not hedge.** An unconfirmed fact gets marked "not confirmed"
  beside it. Do not soften it into "possibly" or "it seems" and leave the next
  session to guess which parts are solid.

## Edge cases

| Situation | What to do |
|---|---|
| Nothing in the session is worth saving | One line saying so, then draft, check, and show the prompt. Do not invent a proposal |
| The owner declines every `remember` proposal | Carry every declined item into the handoff prompt. Write nothing to project knowledge |
| The owner approves some proposals and cuts others | Let `remember` save only the approved meaning. Carry the cut ones into the prompt |
| The owner edits a proposal | Let `remember` write only the edited meaning |
| The project has no project knowledge system | Skip steps 1 and 2, say so in one line, put everything worth keeping in the prompt |
| The save or index rebuild cannot be finished | Report the failure plainly and carry that item into the prompt as well, so it survives either way. Do not pretend it was saved |
| The goal is written in no file, only in this chat | It goes in the prompt, labelled not confirmed. Do not stop to write it into the work item first |
| The goal's pointer names a file or ticket that does not exist | The goal stays, labelled not confirmed against any file. Say so in the short list |
| The prompt was built from an earlier handoff prompt | Every fact carried over is checked from scratch. Being in a previous handoff is not a source |
| The checker fails, errors, or is unavailable | One line saying so, write the prompt anyway, and say inside it that it was not checked |
| Nothing in the prompt can be confirmed, because the project is new and nothing is written down | Label everything, write the prompt, and say so in one line |
| The prompt claims tests or a build passed | The checker never runs them. With no command output from this session behind it, the claim is labelled not confirmed |
| `/handoff` is run twice in a row | Do not re-propose what was already saved. Propose only what changed since the first run, then draft and check again from the current state |
| The session is short and produced nothing | Say so. Write a short prompt if the owner still wants one. Do not pad it |
| The work is unfinished | Normal. That is what a handoff is for. Unfinished state goes in the prompt and wherever the work item is being tracked, never in project knowledge |
| The owner wants only the prompt, no persistent review | Their call. Say once that nothing will be saved, then draft, check, and show the prompt with everything carried inside it |
| The owner wants the prompt with no check | Their call. Say once that nothing in it will have been verified, then write it |
| Another session is working in the same repository | Say which worktree and branch this session was in, so the next one does not assume it owns the checkout |

## What this is not

It is not a summary of the session. `/session-summary` answers a different
question: which of the owner's requests are where. This answers "how does
somebody else pick this up". If the owner wants both, run both; they do not
overlap.

It does not decide what is worth keeping. The installed `remember` skill owns
that policy, and the owner answers every proposal that requires approval.

The checker does not decide what belongs in the prompt either. It checks what is
there against what is in the repository, and it never removes a claim.
