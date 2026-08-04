---
name: hooks-library
description: >-
  Install, remove, or check the toolkit's hooks in a project. Use when the user
  says "install the style reminder", "install the writing guard", "install the
  memory PR hook", "make Claude follow the output style", "remind Claude how to
  write", "stop Claude using em dashes", "make Claude check what to save to
  memory", "set up the hooks", "add the hooks library", "turn off the style
  reminder", or "/hooks-library". These hooks re-deliver, check, or start a rule
  that an agent otherwise has to remember on its own.
---

# hooks-library: make the rule land, instead of restating it

This skill wires the toolkit's hooks into one project. Read `../../README.md`
first for what each hook does and why it exists.

Five hooks ship, in two groups.

**Every project.** `style-reminder` re-states the project's output style on every
message, so the voice instruction never goes stale. `writing-guard` reads the
finished reply and blocks on an em dash or a section sign, so a slip is caught
rather than shipped. `memory-pr-hook` holds the command that opens a pull
request, once per branch per session, so the memory check happens at the moment
it applies. All three are default ON. Steps 1 to 5 below install
`style-reminder`; the two sections after them install `writing-guard` and
`memory-pr-hook`. Offer all three unless the owner asks for fewer.

Each hook registers under a different event, so installing one never disturbs
another: `style-reminder` under `UserPromptSubmit`, `writing-guard` under
`Stop`, `memory-pr-hook` under `PreToolUse` with a `Bash` matcher, and the two
Salesforce guards under `PreToolUse` with a `Bash|PowerShell` matcher. Whichever
you install, merge into the existing arrays and preserve every entry already
there.

**Salesforce projects only.** `guard-protected-orgs.js` confirms before a deploy
or destructive command hits a production org. `guard-permission-set-deploy.js`
blocks a deploy shipping a permission set that has not been preflighted. Each has
its own step-by-step guide in this plugin's folder,
`salesforce-prod-guard-hook.md` and `salesforce-permset-guard-hook.md`. Follow
the guide rather than the steps below; both guards register under `PreToolUse`
with the same `Bash|PowerShell` matcher, not under `UserPromptSubmit` or `Stop`.
`project-init` Gate 2 is where they usually come up.

Everything here is opt-in and reversible. Never install a hook the owner has not
approved, and never edit `settings.json` without showing what will change.

## Step 1: work out what is already there

- Does `.claude/settings.json` exist in this project? Read its `hooks` block.
- Is a `style-reminder` entry already registered? If so, report that and stop
  unless the owner wants it changed or removed.
- Does `.claude/style-reminder.json` exist? If so, report what it overrides.
- **Is an output style actually installed and selected?** Check for
  `.claude/output-styles/` and for `outputStyle` in `.claude/settings.json` or
  `.claude/settings.local.json`. This is the important one: the hook re-states
  the active style, so with no style installed it does nothing at all. If the
  style is missing, install it first (`project-init` Gate 5, or the
  `library/output-styles/` folder in the `project-init` plugin) and say so
  rather than registering a hook that will sit silent.
- Is `node` available? The hook needs it. `node --version`.

Report what you found before changing anything.

## Step 2: explain it in the owner's terms, then confirm

Say plainly what the hook will do to their sessions:

> Your project has a writing style set. Claude is told about it once, when a
> session starts. On a long session that instruction goes stale. This puts the
> style back in front of Claude every time you send a message, so it is never
> working from something it read hours ago.

Say the cost and the limit honestly:

- It adds a small amount to every message you send.
- It is a reminder, not a check. It never reads Claude's reply and never blocks
  anything, so it lowers the odds of a slip rather than catching one.
- If the reminder is doing more work than it needs to, it can fire on every
  third message instead of every one.

## Step 3: copy the hook into the project

Copy `hooks/style-reminder.mjs` from this plugin into the project's
`.claude/hooks/`. Copy it; do not symlink and do not point the hook command at a
path inside the installed plugin, because plugin paths move when the marketplace
updates and a hook that vanishes mid-session is worse than no hook.

## Step 4: register it, merging rather than overwriting

Add to `.claude/settings.json` under `hooks.UserPromptSubmit`. **Merge into the
existing structure.** Other hooks may already be registered, and a
`UserPromptSubmit` array may already exist. Preserve every entry that is there.
Skip the write entirely if an entry with the same command already exists.

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/style-reminder.mjs\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

If the owner wants a throttle or a pinned style name, write
`.claude/style-reminder.json` with only the keys they changed.

## Step 5: prove it works before saying it works

Do not report success from the fact that a file was written. Run it against the
project itself:

```
echo "{\"cwd\":\"$PWD\",\"session_id\":\"install-check\"}" | node .claude/hooks/style-reminder.mjs
```

It should print the reminder, followed by the body of the project's style file.
Empty output means the hook loaded but found no style to remind about, which is
the failure to catch here: go back to step 1 and install the style first.

Then run the plugin's own harness if the toolkit clone is available:

```
node plugins/hooks-library/tests/style-reminder-harness.mjs
```

Tell the owner it takes effect in the next session, not this one.

## The second hook: writing-guard

Same shape, four differences worth saying out loud before you install it.

**Explain it honestly.** This one can block. Say so:

> The style tells Claude not to use em dashes or section signs. This reads the
> finished reply before you see it, and if one slipped through it hands the
> reply back to be rewritten. You never see the bad version. It checks those two
> characters and nothing else, because everything else needs judgement and a
> wrong block would cost you a turn.

**Copy it.** `hooks/writing-guard.mjs` into the project's `.claude/hooks/`.
Copy, do not symlink, and do not point at a path inside the installed plugin.

**Register it under `Stop`, not `UserPromptSubmit`**, merging into whatever is
already there:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/writing-guard.mjs\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**Prove it works**, in both directions. A guard that never fires and a guard that
always fires look the same from the outside until you test them:

```
printf '%s' '{"type":"assistant","message":{"content":[{"type":"text","text":"It works — mostly."}]}}' > /tmp/wg-dirty.jsonl
echo "{\"transcript_path\":\"/tmp/wg-dirty.jsonl\",\"session_id\":\"install-check-dirty\"}" | node .claude/hooks/writing-guard.mjs; echo "exit $?"

printf '%s' '{"type":"assistant","message":{"content":[{"type":"text","text":"It works. Nothing needed from you."}]}}' > /tmp/wg-clean.jsonl
echo "{\"transcript_path\":\"/tmp/wg-clean.jsonl\",\"session_id\":\"install-check-clean\"}" | node .claude/hooks/writing-guard.mjs; echo "exit $?"
```

The first must exit 2 and name the em dash. The second must exit 0 and print
nothing. Use a different `session_id` each time you re-run these, because the
hook refuses to block twice on identical text and a repeated id makes a working
guard look broken.

Then the plugin's harness, if the toolkit clone is available:

```
node plugins/hooks-library/tests/writing-guard-harness.mjs
```

## The third hook: memory-pr-hook

**Check the rule is there first.** This hook points the agent at
`wrap-up-ritual.md`. If the project has no `.claude/rules/wrap-up-ritual.md`,
offer to install it from the `project-init` plugin's
`library/rules/general/` folder before registering the hook. A hook pointing at
a missing file is a dead end. This check belongs here, in the skill, and never
inside the hook.

**Explain it honestly.** Say what the owner will and will not see:

> The rule says to check what is worth saving to memory when a piece of work
> finishes. It gets skipped almost every time, because it is read once at the
> start of a session and the moment it applies comes hours later. This holds the
> command that opens a pull request, once per branch per session, and hands
> Claude the rule at that moment. You never see a popup. Most of the time Claude
> says "Nothing worth saving to memory here." and carries straight on. When
> there is something, the pull request still opens right away and Claude shows
> you a table of what it wants to save.

Say the limits too, because both are real:

- It cannot tell whether the check actually happened, only that it was raised.
  What catches a skip is the pull request description, which has to say what the
  check found.
- It only sees commands typed in the terminal. A pull request opened on the
  GitHub website is never seen, and the written rule is the backup for those.

**Copy it.** `hooks/memory-pr-hook.mjs` into the project's `.claude/hooks/`.
Copy, do not symlink, and do not point at a path inside the installed plugin.

**Register it under `PreToolUse` with a `Bash` matcher**, merging into whatever
is already there. A `PreToolUse` array may already hold the Salesforce guards
under a `Bash|PowerShell` matcher; leave those entries exactly as they are and
add a new one.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/memory-pr-hook.mjs\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**Prove it works**, in both directions:

```
echo '{"tool_name":"Bash","tool_input":{"command":"gh pr create --fill"},"session_id":"install-check-hold","cwd":"'"$PWD"'"}' | node .claude/hooks/memory-pr-hook.mjs

echo '{"tool_name":"Bash","tool_input":{"command":"gh pr list"},"session_id":"install-check-read","cwd":"'"$PWD"'"}' | node .claude/hooks/memory-pr-hook.mjs
```

The first must print JSON containing `"permissionDecision":"deny"` and name
`wrap-up-ritual.md`. The second must print nothing at all. Both exit 0; this
hook refuses through its output, not through its exit code. Use a different
`session_id` each time you re-run these, because the hook refuses to hold the
same branch twice in one session and a repeated id makes a working hook look
broken.

**On Windows, run these in Git Bash, not PowerShell.** Piping a string to a
program in PowerShell sends it as UTF-16, the hook cannot read that as JSON, and
it does what it does with any unreadable input: nothing, and exits 0. So a
working hook prints nothing and looks broken. Claude Code itself always hands
the hook plain UTF-8, so this affects only a hand-typed check. To check from
PowerShell, write the JSON to a file with
`[System.IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding($false)))`
and run `cmd /c "node .claude\hooks\memory-pr-hook.mjs < payload.json"`.

Then the plugin's harness, if the toolkit clone is available:

```
node plugins/hooks-library/tests/memory-pr-hook-harness.mjs
```

## Removing it

For `style-reminder`:

1. Delete the `UserPromptSubmit` entry whose command names `style-reminder.mjs`
   from `.claude/settings.json`, leaving every other hook entry exactly as it
   was.
2. Delete `.claude/hooks/style-reminder.mjs`.
3. Delete `.claude/style-reminder.json` if it exists.

For `writing-guard`, the same three steps against the `Stop` array,
`writing-guard.mjs`, and `.claude/writing-guard.json`.

For `memory-pr-hook`, the same three steps against the `PreToolUse` array,
`memory-pr-hook.mjs`, and `.claude/memory-pr-hook.json`. Delete only the entry
whose command names `memory-pr-hook.mjs`, leaving any Salesforce guard entry in
the same array alone. If the owner wants it off for a while rather than gone,
write `{ "enabled": false }` to `.claude/memory-pr-hook.json` instead, which
leaves the wiring in place.

For either Salesforce guard, delete its entry from the `PreToolUse` array whose
matcher is `Bash|PowerShell`, leaving the other guard's entry alone, then delete
the script from `.claude/hooks/`. Removing `guard-protected-orgs.js` also makes
`.claude/protected-orgs.json` dead; delete it too.

Removing either hook does not remove the output style. The style keeps working
from the system prompt; it is just delivered once again instead of every turn,
and nothing checks the finished reply.

## If the owner says it is noisy or costly

That is real information, so do not talk them out of it.

For `style-reminder`, reach for the throttle before the uninstall: set
`everyNPrompts` to 3 or 5 in `.claude/style-reminder.json`, which keeps the
reinforcement while cutting most of the per-message cost.

For `writing-guard`, find out which check is firing before removing anything. If
it is `filler-opener`, turn that one off; it is off by default, so someone
switched it on. If the em dash check is genuinely blocking good replies, that is
worth investigating rather than disabling, because it tests for one character.

For `memory-pr-hook`, find out what it held. It should hold each branch once per
session and nothing else. If it is holding a command that was not opening a pull
request, that is a real defect: get the exact command and add it to the harness
before changing anything. If the complaint is that the memory check itself takes
too long or asks for too much, the fix is in `wrap-up-ritual.md`, not here. The
hook holds a command and names a file; it decides nothing.

If the complaint is that the style itself is wrong, the fix is in the style
file, not here. Neither hook decides anything; one repeats what is written and
the other checks two characters.
