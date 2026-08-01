---
name: hooks-library
description: >-
  Install, remove, or check the toolkit's hooks in a project. Use when the user
  says "install the style reminder", "make Claude follow the output style",
  "remind Claude how to write", "set up the hooks", "add the hooks library",
  "turn off the style reminder", or "/hooks-library". These hooks re-deliver or
  check rules that an agent otherwise has to remember on every message. Do NOT
  use for machine-level hooks such as session auto-naming, which the
  session-autoname skill owns.
---

# hooks-library: make the rule land, instead of restating it

This skill wires the toolkit's hooks into one project. Read `../../README.md`
first for what each hook does and why it exists.

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
  `output-styles/` library in the `project-init` plugin) and say so rather than
  registering a hook that will sit silent.
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

## Removing it

1. Delete the `UserPromptSubmit` entry whose command names `style-reminder.mjs`
   from `.claude/settings.json`, leaving every other hook entry exactly as it
   was.
2. Delete `.claude/hooks/style-reminder.mjs`.
3. Delete `.claude/style-reminder.json` if it exists.

Removing the hook does not remove the output style. The style keeps working from
the system prompt; it is just delivered once again instead of every turn.

## If the owner says it is noisy or costly

That is real information, so do not talk them out of it. Reach for the throttle
before the uninstall: set `everyNPrompts` to 3 or 5 in
`.claude/style-reminder.json`, which keeps the reinforcement while cutting most
of the per-message cost.

If the complaint is that the style itself is wrong, the fix is in the style
file, not here. This hook only repeats what is already written.
