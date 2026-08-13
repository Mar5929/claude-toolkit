# track-tasks

Every topic still open in this session, in one list you can call up any time.

**Setup: install and go.** Install once per machine. It uses Claude Code's own
task list and writes no files, so there is nothing to set up in a project.

## What it does

A long session drifts. You raise a question, the conversation moves to something
else, and four topics later nobody remembers the first one is still unanswered.

This keeps a running list of all of them:

```
| # | Topic                                          | Status      |
|---|------------------------------------------------|-------------|
| 1 | Decide how to keep the knowledge index small   | In progress |
| 2 | Check what depends on the old graph file       | Not started |
| 3 | Whether to install the edge list in the project| Blocked by 2|
| 4 | Second opinion on an agent's own answer         | Parked      |
```

Say "where are we" or run `/track-tasks` and you get it back.

## What it tracks that is easy to lose

- **Topics you parked.** Parked stays on the list. Parked is not finished, and
  nothing is removed without you saying so.
- **Questions asked of you that you have not answered.**
- **Work blocked behind something else**, with the blocking item named.
- **Work waiting on a background agent.** Background work finishing is not the
  same as the topic being resolved.

## What each entry carries

Enough that a different person could pick it up cold: what has to be decided or
done, plus the numbers, names, and file paths already established. An entry
reading "fix the index" is worthless a day later.

## Where the honesty is

An item is marked finished only when it actually is. Not when the work is nearly
done, not when a check is still failing, not when the last step was skipped.

And the limit is said out loud rather than discovered later: **the list belongs
to this session and does not survive the session ending or the context being
cleared.** Anything that has to outlive the conversation is named, along with
where it should go instead: a ticket in the project's work tracker, or a handoff
prompt for a fresh session.

## Why it exists

Claude Code has had a built-in task list all along, and nothing in the toolkit
mentioned it. So whether a session tracked its open topics depended on Claude
deciding to on its own, which it usually did not.

The owner asked for this on 2026-08-13, in a session carrying five unrelated
open topics with no list until he asked for one. Noticing the drift and asking
what happened to the other four things is exactly the work this takes off him.

## The rule is the part that makes it automatic

The skill gives you a command. The rule is what makes a session keep the list
without being asked.

`track-open-topics.md` ships in the general rules library and is copied into a
project's `.claude/rules/` during setup, where Claude Code loads it at the start
of every session. It deliberately names no skill, so removing this plugin never
leaves a rule pointing at something that is not there.

Install the rule through `project-init` on a new project, or `project-sync` on an
existing one.

## Install and use

```
/plugin install track-tasks
```

Then say "what is still open", "where are we", "add that to the list", "park
that one", or run `/track-tasks`.

## The name

`/tasks` is already a built-in Claude Code command, and it does something else:
it lists the current session's background work, including subagents that have
finished. Hence `/track-tasks`.

## What it is not

Not a work tracker. A topic that turns into real work gets a ticket, and the
project's own spec rule decides what that ticket has to say before anyone
builds. This list is only for what is open right now, in this chat.

Pairs with `session-summary`, which recaps what you asked for and where each
request stands, and with `handoff`, which carries what is unfinished into a
fresh session.
