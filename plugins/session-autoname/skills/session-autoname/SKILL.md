---
name: session-autoname
description: Install (or remove, or repair) the machine-level hook that keeps background Claude Code agent sessions named after what they are actually doing. Use when the user says "install session auto-naming", "set up the autonamer", "my background sessions have stale names", "rename my sessions automatically", or "/session-autoname". This is a one-time per-machine setup that copies a bundled hook into ~/.claude/hooks/ and wires a Stop hook into ~/.claude/settings.json. Do NOT use for renaming one session by hand, and do NOT use for per-project hooks.
---

# Install session auto-naming

## What this sets up, and why it exists

A long agent session drifts. It starts as "refactor the calendar view" and ends
as "coordinate three unrelated tickets", but the name in the job list still says
the first thing. This installs a hook that fixes that continuously: at the end of
every turn it asks Haiku for a short label and writes it into the session's name.

**The name is the overarching PROJECT, never the current step.** That is the
load-bearing behavior, and two things in the hook enforce it. Do not undo either
one without understanding what it costs:

- **The namer never sees the assistant's own output, only the owner's requests.**
  An earlier version fed in the last assistant reply, and the names tracked it
  turn by turn ("... verify", "... #156"). The assistant narrates the current
  step, so naming from it guarantees step-level names. The evidence it does see
  is the owner's opening request at length plus every later request clipped
  short, because the arc of what was asked for is what identifies the project,
  while the full text of the newest ask is what drags the name down to a step.
- **The current name is fed back in with an instruction to return it unchanged**
  unless the project has genuinely changed. Without this the model rewords a
  perfectly good name every turn, and a name that churns is worse in a list than
  a name that is slightly stale.

Three more facts a session installing this needs to hold onto:

1. **It only affects background agent sessions.** A background session has a
   state file at `~/.claude/jobs/<job-id>/state.json` holding its display name.
   An ordinary interactive terminal session has no such file and nothing to
   rename, so the hook no-ops there. `CLAUDE_JOB_DIR` is set only for background
   jobs, which is the gate the hook uses.

2. **That state file is not a supported interface.** It is Claude Code's own
   internal bookkeeping (verified working on CLI 2.1.220). A future release could
   rename the field or start rewriting the name from memory on every tick, and
   this would silently stop working. The hook is written to fail quietly and
   always exit zero for exactly that reason. Do not "improve" it by making
   failures loud.

3. **It overwrites a name the owner typed.** That is deliberate and chosen: an
   always-current name is worth more than a name the owner picked before knowing
   where the session would go. Say so when you install it, so it is not a
   surprise later.

## Install

1. Copy the bundled hook into the user-level hooks directory:

   ```
   mkdir -p ~/.claude/hooks
   cp "${CLAUDE_PLUGIN_ROOT}/hooks/session-autoname.mjs" ~/.claude/hooks/session-autoname.mjs
   ```

2. Wire it as a `Stop` hook in `~/.claude/settings.json`. **Merge, never
   overwrite**: that file holds the user's plugin list, permissions, and often
   secrets in `env`. Read it, add only the one hook entry, write it back. Skip
   the write if an entry with the same command already exists.

   The entry to add under `hooks.Stop`:

   ```json
   {
     "hooks": [
       {
         "type": "command",
         "command": "node \"$HOME/.claude/hooks/session-autoname.mjs\"",
         "timeout": 10
       }
     ]
   }
   ```

3. Verify it end to end rather than assuming. From inside a background session,
   feed the hook a payload by hand and check that the name actually changed:

   ```
   echo '{"hook_event_name":"Stop"}' | node ~/.claude/hooks/session-autoname.mjs
   sleep 25
   cat "$CLAUDE_JOB_DIR/.autoname.log"
   ```

   A successful run logs `renamed: <the new name>`. If the log says `unchanged`,
   the model returned the name the session already had, which is also a pass. An
   empty log means the hook decided there was nothing to name; check that
   `CLAUDE_JOB_DIR` is set.

## How it works, for whoever has to debug it

- **Trigger**: a `Stop` hook, so once per turn.
- **Cost and latency**: the hook forks a detached worker and exits immediately,
  so the roughly three to four seconds the Haiku call takes never land on the
  owner's wait. One cheap Haiku call per turn.
- **Recursion**: the Haiku call is a nested `claude -p` run launched with
  `--setting-sources ""`, so the child loads no settings and therefore no hooks.
  `CLAUDE_AUTONAME=0` in the child's environment is a second, independent guard.
  Do NOT switch this to `--bare`: that flag also skips hooks but refuses OAuth
  and keychain auth, demanding an `ANTHROPIC_API_KEY` that most machines running
  this will not have.
- **Concurrency**: a lock file in the job directory stops two turns' workers from
  racing on the same state file.
- **What it writes**: `name`, plus the `--name` value inside `respawnFlags` so a
  restarted session keeps the name instead of reverting.

## Knobs

| Variable | Effect |
|---|---|
| `CLAUDE_AUTONAME=0` | Kill switch. The hook exits immediately. |
| `CLAUDE_AUTONAME_MODEL` | Override the naming model. Defaults to Haiku 4.5. |
| `CLAUDE_AUTONAME_MIN_SECONDS` | Minimum seconds between renames. Defaults to 0, meaning every turn. |

Debug log: `<job-dir>/.autoname.log`, self-truncating to the last twenty lines.

## Uninstall

Remove the `Stop` entry from `~/.claude/settings.json` (leaving every other hook
in place) and delete `~/.claude/hooks/session-autoname.mjs`. Names already
written stay as they are; nothing reverts.
