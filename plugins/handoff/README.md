# handoff

Save what a session learned, then write a prompt a fresh session can start from.

**Setup: install and go.** One skill, no configuration, no hooks, nothing copied
into the project.

## What it does

`/handoff` runs three steps, in this order:

1. **The memory check.** What did this session produce that is worth keeping?
2. **The table.** What it proposes to save, as one row per item, waiting for the
   owner to approve, cut, or edit.
3. **The prompt.** One block the owner can copy in one click, carrying the task,
   what to read first, the decisions nobody has written down yet, the open
   questions, and one concrete first action.

Anything the owner does not approve for memory is carried inside the prompt
instead, so it is never silently dropped.

The order is the whole point. Write the prompt first and the memory step gets
skipped, because once the prompt is on screen the session is over in the owner's
head.

## Why it exists

The sessions that produce the most valuable understanding are the ones most
likely to lose it. A long exploration or planning session fills the context
window, so the work is handed to a fresh agent through a prompt, and whatever
did not make it into that prompt is gone the moment the old session ends. It
never reaches memory, so the memory PR hook never sees it either.

## Why it is a command and not a hook

Nothing can catch the moment context is cleared. Claude Code's session-end event
fires on a clear, but it is side-effects only: it cannot stop the clear and it
cannot say anything to the agent. By the time it runs, the context is already
going. The pre-compaction event can stop a compaction but also cannot speak to
the agent.

So the trigger has to be something the owner does on purpose. A slash command
loads its own instructions at the moment it is typed, which puts the memory
check in front of the agent without any hook at all. That is the difference from
`memory-pr-hook` in the `hooks-library` plugin: `gh pr create` is a bare
terminal command carrying no instructions, so it needs a hook to interrupt it.

## What it is not

- **Not a session summary.** `session-summary` answers "which of my requests are
  where, and what still needs me". This answers "how does somebody else pick
  this up". They do not overlap; run both if you want both.
- **Not a memory system.** It contains no memory types, no destinations, and no
  rule about what is worth keeping. All of that belongs to the project's own
  rules, which is why it works unchanged in a project that has no memory system:
  the memory step is skipped and everything worth keeping goes into the prompt.
- **Not a writer of memory.** It proposes; the owner approves; the memory
  librarian writes. Asking a yes-or-no question is not approval, because the
  owner cannot approve words they have not read.

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

`project-init` offers it during setup and `project-sync` audits for it, so a
toolkit project gets it without asking. It needs no output style, no memory
system, and no hooks.
