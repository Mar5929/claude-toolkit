---
name: hooks-library
description: >-
  Install, remove, or check the toolkit's hooks in a project. Use when the user
  says "install the spec check reminder", "set up the hooks", "add the hooks
  library", "turn off the spec check reminder", "remind me about the work item
  stage", "make Claude explain things
  simply every time", "answer me like I'm five on every message", "turn off the
  explain simply reminder", or "/hooks-library". These hooks check a moment
  mechanically that an agent otherwise has to remember on its own.
---

# hooks-library: make the rule land, instead of restating it

This skill wires the toolkit's hooks into one project. Read `../../README.md`
first for what each hook does and why it exists.

Five hooks install through this skill, in four groups.

**Every project that uses `session-skills`.** `spec-check-reminder` asks once,
at the session's first file edit, whether the spec-check review has run, so a
build from a drifted specification is caught as it starts. It belongs in
projects that use the `session-skills` plugin, which ships the `spec-check`
skill it points at. It registers under `PostToolUse` with an
`Edit|Write|NotebookEdit` matcher.

**Every project that tracks work items with stages.**
`work-item-stage-reminder` asks once, at the session's first file edit, which
work item this is, what stage it is at, and whether the progress log is current.
It belongs in projects that answered the tracker question and carry the
`work-item-stages.md` rule; without both there is no stage to set and the
reminder is noise. It registers under `PostToolUse` with the same
`Edit|Write|NotebookEdit` matcher as `spec-check-reminder`, so both entries sit
in that one matcher's `hooks` array.

**Any project, when the owner asks for it.** `explain-simply-reminder` asks, on
every message the owner sends, for the answer to be written as if the reader is
five years old. It needs no other plugin. It registers under `UserPromptSubmit`,
which takes no matcher. Never install it because it seems like a good idea: it
changes the voice of every answer in the project, so it goes in only when the
owner asks for that.

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

The five steps below cover the three general hooks. Work out first which one the
owner is asking for, and run the steps for that one.

## Step 1: work out what is already there

- Does `.claude/settings.json` exist in this project? Read its `hooks` block.
- Is an entry for the hook you are about to install already registered? If so,
  report that and stop unless the owner wants it changed or removed.
- **For `spec-check-reminder` only, is the `session-skills` plugin installed?**
  The reminder names the `spec-check` skill, which ships there. In a project
  without that plugin, offer to install `session-skills` first or skip this
  hook. `explain-simply-reminder` depends on nothing, so skip this question for
  it.
- Is `node` available? Both hooks need it. `node --version`.

Report what you found before changing anything.

## Step 2: explain it in the owner's terms, then confirm

Say plainly what the hook will do to their sessions.

For `spec-check-reminder`:

> Specifications drift as different sessions add to them. This asks one
> question the first time Claude edits a file in a session: if you are building
> from a spec, has the spec-check review run? Then it stays quiet for the rest
> of the session.

Say the limit honestly:

- It is a reminder, not a gate. It never reads the file being edited and never
  blocks anything.
- It cannot tell real build work from a one-line fix, so it asks on the first
  edit either way.

For `explain-simply-reminder`:

> Every time you send a message, this asks Claude to answer as if the reader is
> five years old: plain words, short, bullet points, and no dropping the numbers
> or file paths to get there.

Say the limits honestly, and do not skip the last one:

- It is a reminder, not a check. It reads nothing Claude wrote and blocks
  nothing, so a complicated answer can still come back.
- It fires on every message. There is no throttle, on purpose.
- **It applies to everything, not just the answers you wanted simplified.**
  Design discussions, documents written into the repository, and commit messages
  all come out of the same session. In a project whose main output is writing,
  say so before installing it.

## Step 3: copy the hook into the project

Copy the hook's script from this plugin's `hooks/` folder into the project's
`.claude/hooks/`: `hooks/spec-check-reminder.mjs` or
`hooks/explain-simply-reminder.mjs`. Copy it; do not symlink and do not point
the hook command at a path inside the installed plugin, because plugin paths
move when the marketplace updates and a hook that vanishes mid-session is worse
than no hook.

## Step 4: register it, merging rather than overwriting

**Merge into the existing structure.** Other hooks may already be registered,
and the event's array may already exist. Preserve every entry that is there.
Skip the write entirely if an entry with the same command already exists.

`spec-check-reminder` goes under `hooks.PostToolUse` with an
`Edit|Write|NotebookEdit` matcher:

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

`explain-simply-reminder` goes under `hooks.UserPromptSubmit`, which takes **no
`matcher` key**. A project running the toolkit's project knowledge already has a
`UserPromptSubmit` entry for `memory-reminder.mjs`; add this alongside it in the
same entry's `hooks` array rather than replacing it:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/explain-simply-reminder.mjs\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

## Step 5: prove it works before saying it works

Do not report success from the fact that a file was written. Run the script and
read what comes back.

`spec-check-reminder` fires once per session, so feed it a fake event twice with
the same session id: the first run prints the reminder, the second prints
nothing.

```bash
echo "{\"session_id\":\"install-check\"}" | node .claude/hooks/spec-check-reminder.mjs
echo "{\"session_id\":\"install-check\"}" | node .claude/hooks/spec-check-reminder.mjs
```

`explain-simply-reminder` fires every time, so both runs print the same
reminder. Check that, and check it stays quiet on nothing:

```bash
echo "{\"session_id\":\"install-check\"}" | node .claude/hooks/explain-simply-reminder.mjs
echo "{\"session_id\":\"install-check\"}" | node .claude/hooks/explain-simply-reminder.mjs
```

Tell the owner it takes effect in the next session, not this one.

## Removing it

For `spec-check-reminder`: delete its entry from the `PostToolUse` array in
`.claude/settings.json`, leaving every other hook entry exactly as it was, then
delete `.claude/hooks/spec-check-reminder.mjs`. It has no config file.

For `explain-simply-reminder`: delete its entry from the `UserPromptSubmit`
array, leaving any other entry there alone, then delete
`.claude/hooks/explain-simply-reminder.mjs`. It has no config file. Watch for
`memory-reminder.mjs` sitting in the same entry; that one belongs to project
knowledge and stays.

For either Salesforce guard, delete its entry from the `PreToolUse` array whose
matcher is `Bash|PowerShell`, leaving the other guard's entry alone, then delete
the script from `.claude/hooks/`. Removing `guard-protected-orgs.js` also makes
`.claude/protected-orgs.json` dead; delete it too.

## If the owner says it is noisy

That is real information, so do not talk them out of it, and do not offer to
tune it. Neither hook has a setting to turn down.

`spec-check-reminder` already fires only once per session. If that is still too
much, remove it with the steps above.

`explain-simply-reminder` fires every message by design, and firing less often
is exactly the staleness it exists to prevent. There is no middle setting worth
building here: the toolkit already deleted a hook that tried to be a cleverer
version of this one. Remove it, and point the owner at the `explain-simply`
skill in `session-skills`, which gives them the same voice on request instead of
always.
