---
name: hooks-library
description: >-
  Install, remove, or check the toolkit's hooks in a project. Use when the user
  says "install the spec check reminder", "set up the hooks", "add the hooks
  library", "turn off the spec check reminder", or "/hooks-library". These
  hooks check a moment mechanically that an agent otherwise has to remember on
  its own.
---

# hooks-library: make the rule land, instead of restating it

This skill wires the toolkit's hooks into one project. Read `../../README.md`
first for what each hook does and why it exists.

Three hooks install through this skill, in two groups.

**Every project that uses `session-skills`.** `spec-check-reminder` asks once,
at the session's first file edit, whether the spec-check review has run, so a
build from a drifted specification is caught as it starts. It belongs in
projects that use the `session-skills` plugin, which ships the `spec-check`
skill it points at. It registers under `PostToolUse` with an
`Edit|Write|NotebookEdit` matcher.

**Salesforce projects only.** `guard-protected-orgs.js` confirms before a deploy
or destructive command hits a production org. `guard-permission-set-deploy.js`
blocks a deploy shipping a permission set that has not been preflighted. Each has
its own step-by-step guide in this plugin's folder,
`salesforce-prod-guard-hook.md` and `salesforce-permset-guard-hook.md`. Follow
the guide rather than the steps below; both guards register under `PreToolUse`
with the same `Bash|PowerShell` matcher, not under `PostToolUse`.
`project-init` Gate 2 is where they usually come up.

The machine-wide `no-ai-attribution-guard` does not install through this skill.
The `machine-sync` skill in the `project-init` plugin installs it into
`~/.claude/`.

Everything here is opt-in and reversible. Never install a hook the owner has not
approved, and never edit `settings.json` without showing what will change.

## Step 1: work out what is already there

- Does `.claude/settings.json` exist in this project? Read its `hooks` block.
- Is a `spec-check-reminder` entry already registered? If so, report that and
  stop unless the owner wants it changed or removed.
- **Is the `session-skills` plugin installed?** The reminder names the
  `spec-check` skill, which ships there. In a project without that plugin,
  offer to install `session-skills` first or skip this hook.
- Is `node` available? The hook needs it. `node --version`.

Report what you found before changing anything.

## Step 2: explain it in the owner's terms, then confirm

Say plainly what the hook will do to their sessions:

> Specifications drift as different sessions add to them. This asks one
> question the first time Claude edits a file in a session: if you are building
> from a spec, has the spec-check review run? Then it stays quiet for the rest
> of the session.

Say the limit honestly:

- It is a reminder, not a gate. It never reads the file being edited and never
  blocks anything.
- It cannot tell real build work from a one-line fix, so it asks on the first
  edit either way.

## Step 3: copy the hook into the project

Copy `hooks/spec-check-reminder.mjs` from this plugin into the project's
`.claude/hooks/`. Copy it; do not symlink and do not point the hook command at a
path inside the installed plugin, because plugin paths move when the marketplace
updates and a hook that vanishes mid-session is worse than no hook.

## Step 4: register it, merging rather than overwriting

Add to `.claude/settings.json` under `hooks.PostToolUse` with an
`Edit|Write|NotebookEdit` matcher. **Merge into the existing structure.** Other
hooks may already be registered, and a `PostToolUse` array may already exist.
Preserve every entry that is there. Skip the write entirely if an entry with
the same command already exists.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/spec-check-reminder.mjs\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

## Step 5: prove it works before saying it works

Do not report success from the fact that a file was written. Feed it a fake
event twice with the same session id: the first run prints the reminder, the
second prints nothing.

```bash
echo "{\"session_id\":\"install-check\"}" | node .claude/hooks/spec-check-reminder.mjs
echo "{\"session_id\":\"install-check\"}" | node .claude/hooks/spec-check-reminder.mjs
```

Tell the owner it takes effect in the next session, not this one.

## Removing it

For `spec-check-reminder`: delete its entry from the `PostToolUse` array in
`.claude/settings.json`, leaving every other hook entry exactly as it was, then
delete `.claude/hooks/spec-check-reminder.mjs`. It has no config file.

For either Salesforce guard, delete its entry from the `PreToolUse` array whose
matcher is `Bash|PowerShell`, leaving the other guard's entry alone, then delete
the script from `.claude/hooks/`. Removing `guard-protected-orgs.js` also makes
`.claude/protected-orgs.json` dead; delete it too.

## If the owner says it is noisy

That is real information, so do not talk them out of it. The reminder fires
once per session by design; if that is still too much, remove it with the steps
above.
