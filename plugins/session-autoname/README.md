# session-autoname plugin

Keeps a background Claude Code agent session named after the project it is
working on, instead of whatever it was called when it started.

A long session drifts. It opens as "refactor the calendar view" and ends up
coordinating three unrelated tickets, but the job list still shows the first
thing. This plugin installs a machine-level hook that re-checks the name at the
end of every turn with a cheap Haiku call.

## It names the project, not the step

This is the design decision that makes it useful rather than annoying. A session
works through dozens of steps toward one goal. The steps change constantly; the
goal rarely does. So the name is always the **overarching project**:

| Not this (a step) | This (the project) |
|---|---|
| Verify test output for PR #156 | Anchor cleanup batch (#147, #80, #148) |
| Resolve a merge conflict | Anchor Program/Calendar refactor (#130) |
| Fix the flaky banner assertion | Stripe billing migration |

Two things enforce it. The namer is shown the arc of everything **you** asked
for across the session, with your opening request weighted heaviest, and it is
never shown the assistant's own replies, since those narrate the current step
and naming from them guarantees step-level names. And it is shown the current
name each turn with instructions to return it **unchanged** unless the project
itself has changed, so the name stops churning once it is right.

## Install

```
/plugin install session-autoname
/session-autoname
```

The first command adds the plugin. The second runs the install skill, which
copies the hook into `~/.claude/hooks/` and wires it into `~/.claude/settings.json`.
It is a one-time setup per machine, not per project.

## What it does and does not touch

- **Background agent sessions only.** Those are the sessions that have a name in
  the job list. An ordinary interactive terminal session has nothing to rename,
  so the hook quietly does nothing there.
- **It overwrites a name you typed yourself.** That is the intended tradeoff: an
  always-current name beats one you chose before you knew where the session would
  go. Set `CLAUDE_AUTONAME=0` if you want a name to stick.
- **It never blocks a turn.** The hook forks a detached worker and returns
  immediately, so the Haiku call's few seconds never land on your wait.
- **It fails silently.** It writes to a file that is Claude Code's own internal
  bookkeeping rather than a supported interface, so if a future release changes
  that format the hook stops working rather than breaking your session.

## Knobs

| Variable | Effect |
|---|---|
| `CLAUDE_AUTONAME=0` | Kill switch. |
| `CLAUDE_AUTONAME_MODEL` | Override the naming model. Defaults to Haiku 4.5. |
| `CLAUDE_AUTONAME_MIN_SECONDS` | Minimum seconds between renames. Defaults to 0, meaning every turn. |

Debug log: `<job-dir>/.autoname.log`.
