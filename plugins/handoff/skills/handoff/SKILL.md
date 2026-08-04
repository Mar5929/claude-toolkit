---
name: handoff
description: >-
  Save what this session learned, then write a self-contained prompt for a fresh
  session to carry on from. Use when the owner says "write a handoff", "hand this
  off", "handoff prompt", "I'm going to clear context", "start a new session",
  "this session is getting long", "carry this over", "prompt for a new chat", or
  runs /handoff. Also use it when you are the one offering a handoff because the
  session has grown heavy. Always run the memory check first, before writing the
  prompt.
---

# Handoff

A long session is about to end. Two things have to happen, in this order, and the
order is the whole point.

1. **Save what is worth keeping**, with the owner's approval.
2. **Write a prompt a fresh session can start from**, carrying everything that
   was not saved.

Do them the other way round and the memory step gets skipped, because once the
handoff prompt is on screen the session is over in the owner's head.

## Why this exists

The sessions that produce the most valuable understanding are the ones most
likely to lose it. A long exploration or planning session fills the context
window, the work gets handed to a fresh agent, and whatever did not make it into
the handoff prompt is gone the moment the old session ends. It never reaches
memory, so nothing downstream ever sees it either.

Nothing can catch the moment the owner clears context. Claude Code's session-end
event fires on a clear, but it cannot stop the clear and it cannot say anything
to the agent. By the time it runs the context is already going. That is why this
is a command the owner types rather than a hook: typing it is the moment, and a
command carries its own instructions.

## Step 1: the memory check, before anything else

Run the project's memory check. What counts as worth keeping, and where each
kind of thing goes, belongs to the project's own rules and never to this file:

- If `.claude/rules/second-brain.md` exists, that rule owns it. Read it.
- If not, but `.claude/rules/wrap-up-ritual.md` exists, that rule owns it.
- If the project has neither, skip to step 3. Everything worth keeping goes into
  the handoff prompt instead. Say that plainly in one line rather than silently
  skipping a step.

Review what this session produced: decisions the owner made, understanding that
took work to reach, constraints that were discovered, references that turned out
to matter, and anything that would have to be worked out again from scratch by
the next session.

**If nothing is worth saving**, say so in one line and go to step 3. Do not show
an empty table, and do not invent rows to fill one.

## Step 2: show the table, then wait

Show what you propose to save as a table the owner can read in one pass:

```markdown
What to save to memory (3 items)

| # | What it says | Where it goes | Why it helps |
|---|---|---|---|
| 1 | A pull request never waits on the memory question. It opens, and the owner's answer is added to it before merge. | memory/decisions/ | Stops future sessions parking finished work overnight |
| 2 | The session-end event cannot stop a clear or speak to the agent. | memory/knowledge/ | Saves rediscovering why the clear moment needs a rule, not a hook |
| 3 | RISKY: replaces the current handoff rule | memory/decisions/ | Two installed rules say the opposite today |

Approve all, tell me which to cut, or edit any row.
```

Number the rows so the owner can answer with a number. Flag anything risky or
large in its own row, in words, so it cannot be approved by accident.

**Then stop and wait.** Asking a yes-or-no question is not approval: the owner
cannot approve words they have not read. Nothing is written before they answer.

When they answer, save the approved rows only, and write them as the owner
edited them rather than as you proposed them. An edit is written exactly as the
owner wrote it. Then rebuild the indexes and run the shape check.

Whatever the owner cuts, edits away, or defers goes into step 3 instead. Nothing
is queued anywhere, and nothing is dropped.

## Step 3: write the handoff prompt

One fenced block, so the owner can copy it in one click. Nothing above it but a
single line, nothing below it but the one action they have to take.

The prompt is for an agent that knows nothing about this session. Write it as an
instruction to that agent, not as a summary of what happened here.

It has to carry:

- **The task.** What the new session is being asked to do, its scope, and what
  finished looks like.
- **What to read first**, by path, in the order that makes sense. The work item
  or ticket, the plan, the files being changed.
- **Decisions made in this session that are not written down anywhere yet.**
  Call these out under their own heading. They are the part that disappears, and
  they include everything the owner cut from the table in step 2. Say what was
  decided and, where it matters, why.
- **Open questions and constraints** the owner has raised and nobody has settled.
- **What to do first.** One concrete action, not a direction.

Say plainly, inside the prompt, which of these came from the memory table and
were not saved. The next session should know it is holding the only copy.

## When the owner asks in their own words

They will not always type the command. "I'm going to clear context", "this is
getting long, write me something to paste into a new chat", "hand this off to a
fresh session" all mean the same thing. Run the same three steps.

The rules that require this at a handoff are `offer-context-handoff.md` and the
project's memory rule. This command is the convenient path, not the only one.

## Edge cases

| Situation | What to do |
|---|---|
| Nothing in the session is worth saving | One line saying so, then the handoff prompt. No table |
| The owner declines everything in the table | Carry every declined row into the handoff prompt. Write nothing to memory |
| The owner approves some rows and cuts others | Save the approved rows. Carry the cut ones into the prompt |
| The owner edits a row | Write the edited words, not the proposal |
| The project has no memory system | Skip steps 1 and 2, say so in one line, put everything worth keeping in the prompt |
| The save cannot be finished, or the shape check fails | Report the failure plainly and carry that item into the prompt as well, so it survives either way. Do not pretend it was saved |
| `/handoff` is run twice in a row | Do not re-propose what was already saved. Propose only what changed since the first run, and write the prompt again from the current state |
| The session is short and produced nothing | Say so. Write a short prompt if the owner still wants one. Do not pad it |
| The work is unfinished | Normal. That is what a handoff is for. Unfinished state goes in the prompt and the work tracker, never in memory |
| The owner wants only the prompt, no memory step | Their call. Say once that nothing will be saved, then write the prompt with everything carried inside it |
| Another session is working in the same repository | Say which worktree and branch this session was in, so the next one does not assume it owns the checkout |

## What this is not

It is not a summary of the session. `/session-summary` answers a different
question: which of the owner's requests are where. This answers "how does
somebody else pick this up". If the owner wants both, run both; they do not
overlap.

It does not decide what is worth keeping. That judgment stays with the agent,
guided by the project's own rules, and every proposal is answered by the owner.
