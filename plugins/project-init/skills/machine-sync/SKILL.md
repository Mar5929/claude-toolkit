---
name: machine-sync
description: >-
  Audit THIS COMPUTER against the claude-toolkit's machine-wide set and install
  whatever is missing into the owner's own ~/.claude folder. Use when the owner
  is setting up a new computer, or says things like "set up this machine from my
  toolkit", "point this computer at the toolkit", "I have a new laptop", "make
  sure my machine-wide rules are here", "check my global Claude settings against
  the toolkit", or "/machine-sync". It checks the machine-wide rules, the
  required settings values, and the machine-wide hooks, starting with the rule
  that no commit or pull request ever carries credit to Claude or any other AI
  agent. It reports every gap first and changes nothing without approval.
---

# machine-sync: bring a computer up to the toolkit

`project-init` and `project-sync` set up a project folder. This skill is the
third sibling and it works one level up: it sets up the **computer**, by
comparing `~/.claude/` against the toolkit's machine-wide set and installing
what is missing.

Why a separate scope exists at all: everything the other two skills install
lands inside one repository, so a repository nobody ever ran them on gets
nothing. Some rules have to hold everywhere, including in a repository the owner
cloned five minutes ago. Those live in the machine-wide set.

Run the steps in order. **Never change anything before step 5.**

## Step 1: refresh the installed toolkit

This skill reads the toolkit from the installed plugin copy, and that copy does
not update itself when the repository changes on GitHub. A stale copy produces a
stale audit, which is exactly the failure this step prevents.

Inside a Claude Code session run `/plugin marketplace update claude-toolkit`.
From a terminal run `claude plugin marketplace update claude-toolkit`.

Skip this only when reading from a freshly pulled local clone.

**On a brand-new computer the plugin is not installed yet.** In that case the
owner has to add the marketplace first, which is the one step only they can do,
because it needs their GitHub access:

```
/plugin marketplace add Mar5929/claude-toolkit
/plugin install project-init@claude-toolkit
```

Then restart the session and run this skill.

## Step 2: read the machine-wide set

From this skill's directory, `../../machine/` holds it, with its own `README.md`
index. Read that index rather than working from the list below, so a piece added
to the toolkit after this file was written is still picked up.

It has three kinds of thing:

- **`machine/rules/*.md`**: rule files that install to `~/.claude/rules/`.
  Claude Code loads every `.md` file in that folder in every project on the
  machine, so a file there is in force everywhere with no wiring needed.
- **`machine/settings/required.json`**: settings keys and values that
  `~/.claude/settings.json` must carry. This is a fragment to merge, never a
  file to copy over the owner's settings.
- **Machine-wide hooks**, named in the index. Their scripts live in the
  `hooks-library` plugin at `plugins/hooks-library/hooks/`, alongside every
  other hook in the toolkit. The index says which ones are machine-wide.

Note the toolkit version from `../../.claude-plugin/plugin.json` for step 7.

Find the toolkit files in this order: the installed plugin copy this skill ships
inside, then a local clone of the repository if the owner has one, then fetch
`Mar5929/claude-toolkit`, then ask.

## Step 3: find this computer's Claude folder

It is `~/.claude/`. On Windows that is `C:\Users\<name>\.claude`, and on macOS
and Linux `/home/<name>/.claude` or `/Users/<name>/.claude`.

If `CLAUDE_CONFIG_DIR` is set in the environment, that wins. Check for it before
assuming the default, and use whatever it points at for every path below.

Confirm the resolved path out loud in the report, so the owner can see which
folder is about to be touched.

## Step 4: audit, changing nothing

For each item in the set, look at what the computer actually has. Four possible
findings, and they are not the same:

| Finding | What it means |
|---|---|
| **Missing** | Not on this computer at all. Install it. |
| **Behind** | Present, but different from the toolkit's current copy. Show the difference and ask. |
| **Matches** | Present and the same. Nothing to do. |
| **Conflicts** | Present and set to something the toolkit's value would overwrite. Show both values and ask. Never overwrite silently. |

What to check, item by item:

**Each rule file.** Does `~/.claude/rules/<name>.md` exist? Compare it with the
toolkit's copy. Judge by intent, not exact wording: a file saying the same thing
in different words is not behind. Only a file genuinely missing something the
toolkit's copy now says is behind.

**Also check `~/.claude/CLAUDE.md` for the same rule written inline.** The
machine-wide rules folder is newer than that file, so the rule may already be
there as a section, in which case installing the rule file would give the owner
the same instruction twice in two wordings. Report that as a finding of its own
and offer to remove the section when the file is installed. Removing text from
the owner's own instructions is a change they must see and approve first, and
never a side effect of installing something else.

**Each settings value.** Read `~/.claude/settings.json` and compare each key in
`required.json`. Missing key means missing. Key present with a different value
means conflicts, and the report shows the current value and the toolkit's value
next to each other.

**Each machine-wide hook.** Two separate checks, because one without the other
does nothing:

1. Is the script in `~/.claude/hooks/`, and does it match the toolkit's copy?
2. Is it registered in `~/.claude/settings.json` under the right event, with a
   command pointing at that script?

A hook with a script and no registration never runs. A registration pointing at
a script that is not there fails on every command. Report each half separately.

**Whether the pieces of one rule are all present.** Where the index says several
pieces cover one rule, a partial install is not a pass. Say which piece is
missing and what that leaves uncovered, in plain words.

**Projects that override a machine-wide settings value.** Optional and only when
the owner asks or a project is open: a project's `.claude/settings.json` or
`.claude/settings.local.json` beats the machine's. If one sets a key the
machine-wide set also sets, name the project and the value, so the owner knows
the machine-wide value is not in force there.

## Step 5: report, then wait

One table, every item, one row each. Say what is missing, what is behind, what
conflicts, and what already matches. For anything behind or conflicting, show
the actual difference before asking.

Number the rows so the owner can answer with a number. They may approve all,
approve some, or none. Then wait. Nothing is written before an answer.

If everything matches, say so in one line and stop. Do not write a report about
a computer that needs nothing.

## Step 6: install what was approved

**Rule files.** Copy into `~/.claude/rules/`. Create the folder if it is not
there.

**Settings values.** Merge into `~/.claude/settings.json` key by key. Read the
file, change only the approved keys, write it back. Never write the toolkit's
fragment over the file: that settings file holds the owner's permissions, their
enabled plugins, and their marketplaces, and replacing it would take all of that
with it. If the file does not exist, create it holding only the approved keys.

**Hook scripts.** Copy the `.mjs` file from the `hooks-library` plugin into
`~/.claude/hooks/`. Copy it. Do not symlink, and do not point the registration
at a path inside the installed plugin, because plugin paths move when the
marketplace updates and a hook that disappears mid-session is worse than no
hook.

**Hook registration.** Add an entry to `~/.claude/settings.json` under the right
event, **merging into what is there**. Other hooks may already be registered.
Preserve every existing entry, and skip the write when an entry with the same
command already exists. Never remove a hook the toolkit did not install.

Write an absolute path in the command, with forward slashes even on Windows:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"C:/Users/<name>/.claude/hooks/no-ai-attribution-guard.mjs\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Two things about that path, and both have bitten before. Do not write
`$CLAUDE_PROJECT_DIR`: there is no project when the hook is registered on the
machine. Do not write a Git Bash style path such as
`/c/Users/<name>/.claude/...`: Node on Windows cannot open it, so the hook fails
on every command. Resolve the real path in step 3 and write it out.

## Step 7: prove it works, then record it

Do not report success because a file was written. Show it actually running.

**A rule file**: confirm it is in `~/.claude/rules/` and tell the owner it takes
effect in their next session, not this one. Rules load at session start.

**A settings value**: read the file back and show the key.

**A hook**: run it by hand against a command it should refuse and one it should
allow. For `no-ai-attribution-guard`:

```
echo '{"tool_input":{"command":"git commit -m \"x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\""}}' | node ~/.claude/hooks/no-ai-attribution-guard.mjs
```

That must print a JSON object whose `permissionDecision` is `deny`. Then:

```
echo '{"tool_input":{"command":"git commit -m \"fix the login timeout\""}}' | node ~/.claude/hooks/no-ai-attribution-guard.mjs
```

That must print nothing at all. Both results, or the hook is not working and
saying it is would be false. The hook also takes effect in the next session,
because settings are read at session start.

**Record the sync.** Write or update `~/.claude/toolkit-machine-sync.md` with
the date, the toolkit version from step 2, what was installed, and anything the
owner said no to. The last part is what stops the next run asking about the same
deliberate "no" again.

## What this skill never does

- Change anything before the owner approves the specific item.
- Write over `~/.claude/settings.json` instead of merging into it.
- Remove a rule, a hook, or a settings value the toolkit did not install.
- Remove a section from `~/.claude/CLAUDE.md` as a side effect of installing
  something. That is its own approved item or it does not happen.
- Touch any project folder. That is what `project-sync` is for, and the two are
  run separately.
- Report a hook as installed when only the script or only the registration is
  there.
