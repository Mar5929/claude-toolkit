---
name: hooks-library
description: >-
  Install, remove, or check the toolkit's guard hooks in a project. Use when the
  user says "install the writing guard", "stop me using em dashes", "set up the
  guard hooks", "add the hooks library", "turn off the writing guard", or
  "/hooks-library". These hooks enforce rules mechanically that an agent
  otherwise has to remember on every message. Do NOT use for machine-level hooks
  such as session auto-naming, which the session-autoname skill owns.
---

# hooks-library: enforce the checkable rules instead of restating them

This skill wires the toolkit's guard hooks into one project. Read
`../../README.md` first for what each hook does and why it exists.

Everything here is opt-in and reversible. Never install a hook the owner has not
approved, and never edit `settings.json` without showing what will change.

## Step 1: work out what is already there

- Does `.claude/settings.json` exist in this project? Read its `hooks` block.
- Is a `writing-guard` entry already registered? If so, report that and stop
  unless the owner wants it changed or removed.
- Does `.claude/writing-guard.json` exist? If so, report which checks are off.
- Is `node` available? The hook needs it. `node --version`.

Report what you found before changing anything.

## Step 2: explain it in the owner's terms, then confirm

Say plainly what the hook will do to their sessions:

> After you finish a reply, this checks it for em dashes, section signs, and
> openers like "Sure" or "Let me". If it finds one, you never see that reply.
> It goes back and gets rewritten first. A clean reply is untouched and costs
> nothing.

Say the cost honestly too: when it fires, the turn takes slightly longer,
because the reply is written twice. It fires at most three times per session and
never twice on the same text.

Ask which checks they want. All three is the default. A project whose owner
genuinely wants em dashes should turn that check off rather than fight it.

## Step 3: copy the hook into the project

Copy `hooks/writing-guard.mjs` from this plugin into the project's
`.claude/hooks/`. Copy it; do not symlink and do not point the hook command at a
path inside the installed plugin, because plugin paths move when the marketplace
updates and a hook that vanishes mid-session is worse than no hook.

## Step 4: register it, merging rather than overwriting

Add to `.claude/settings.json` under `hooks.Stop`. **Merge into the existing
structure.** Other hooks may already be registered, and a `Stop` array may
already exist. Preserve every entry that is there. Skip the write entirely if an
entry with the same command already exists.

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

If the owner chose to disable a check, write `.claude/writing-guard.json` with
only the keys they changed.

## Step 5: prove it works before saying it works

Do not report success from the fact that a file was written. Run it:

```
echo '{"transcript_path":"","session_id":"install-check"}' | node .claude/hooks/writing-guard.mjs
```

Exit 0 and no output means the hook loads and fails open correctly. Then run the
plugin's own harness if the toolkit clone is available:

```
node plugins/hooks-library/tests/writing-guard-harness.mjs
```

Tell the owner it takes effect in the next session, not this one.

## Removing it

1. Delete the `Stop` entry whose command names `writing-guard.mjs` from
   `.claude/settings.json`, leaving every other hook entry exactly as it was.
2. Delete `.claude/hooks/writing-guard.mjs`.
3. Delete `.claude/writing-guard.json` if it exists.

Turning off a single check is not a removal. Edit `.claude/writing-guard.json`
instead and leave the hook installed.

## If the owner says it is annoying

That is real information, so do not talk them out of it. Find out which check
fired and on what text. A wrong block is a bug in the guard: the check is
supposed to have no judgement in it, so a false positive means the pattern is
wrong. Fix the pattern in the toolkit and add the text that tripped it to the
harness's clean-text list, which is what caught the "Greatly" and "Perfectly"
false positives during development. Turning the check off in one project is the
fallback, not the first answer.
