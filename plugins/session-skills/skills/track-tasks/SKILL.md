---
name: track-tasks
description: Build or refresh the running list of every topic still open in this chat session, using Claude Code's built-in task list, then print it. Use when the owner runs /track-tasks, or says "what is still open", "where are we", "what are we tracking", "list the open topics", "what have we not finished", "add that to the list", "park that one", or "close that one". Also use when a session has drifted across several unrelated topics and no list exists yet. Do not use for work that outlives this session: a ticket belongs in the project's work tracker, and unfinished state being carried to a fresh session belongs in a handoff prompt.
---

# Track the open topics in this session

Put every unresolved topic in this session on Claude Code's built-in task list,
then show the owner the whole list.

The built-in tools are `TaskCreate`, `TaskUpdate`, and `TaskList`. Everything
below is done with those, never with a file the owner has to open.

## Do this every time

1. **Read the current list first** with `TaskList`, so you do not create a
   second copy of something already tracked.
2. **Re-read the conversation for open topics.** Anything raised and not
   resolved, including topics the owner parked, questions you asked that they
   never answered, and work waiting on something else.
3. **Add what is missing.** One task per topic.
4. **Correct what is wrong.** A status that no longer matches reality gets
   fixed, not left.
5. **Print the list** as a table: number, topic in plain words, status.

## What each entry has to say

Write it so a different person could pick it up cold.

- **Subject**: what has to be decided or done, as an instruction.
- **Description**: the numbers, names, file paths, and decisions already
  established for that topic.

An entry reading "fix the index" is worthless a day later. An entry naming the
file, the measured size, and the choice still to be made is not.

## Status, honestly

| Status | Means |
|---|---|
| pending | Not started |
| in_progress | Being worked on now |
| completed | Actually finished, verified, nothing left |

Mark something completed only when it is genuinely done. Not when it is nearly
done, not when a check is still failing, not when a step was skipped. If it is
blocked, it stays open and says what is blocking it.

There is no built-in parked status. A parked topic keeps its current status and
says "Parked by the owner" at the front of its description, so it is visible and
is never mistaken for finished.

## Blocked topics

When one topic cannot start until another finishes, record it with
`addBlockedBy` so the list shows the order, rather than describing it in prose.

## When not to build a list

A single request, a question answered in the turn it was asked, or a short
back-and-forth. A list for one item is noise. Say so in one line and stop.

## What to tell the owner about the limits

The list belongs to this session. It does not survive the session ending or the
context being cleared.

So whenever an item has to outlive this conversation, say that plainly and name
the two places it can go: a ticket in the project's work tracker, or a handoff
prompt for a fresh session. Do not let something disappear quietly because it
was only ever on this list.

## Voice

Read the project's active output style before printing anything, and follow it.
Find it at `.claude/output-styles/<name>.md`, where `<name>` is the
`outputStyle` value in `.claude/settings.local.json`, then
`.claude/settings.json`, then `~/.claude/settings.json`. If there is no such
file, write plainly: short lines, plain words, no em dashes.
