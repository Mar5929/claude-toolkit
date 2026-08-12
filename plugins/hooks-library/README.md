# hooks-library

Hooks that make a rule land mechanically, instead of writing the rule down again
and hoping.

**Setup: wires into settings.** Install once per machine, then switch each hook
on by adding it to a settings file, either the machine's or one project's.

## Why this exists

Rules that must be applied to every single message do not survive a long working
session. That is not a guess. Assistant-authored text was parsed out of real
session transcripts across three projects and checked against one rule with no
interpretation in it at all, "No em dashes":

| Project | Assistant messages | Em dashes | Rate |
|---|---|---|---|
| davis-advisors-sfdc | 2,259 | 1,284 | one per 1.8 messages |
| DragonFly | 840 | 208 | one per 4 messages |
| claude-toolkit | 49 | 4 | one per 12 messages |

Every one of those projects carried the rule. It was four words long, it
appeared in the global rules and in each project's own `.claude/rules/`, and it
was broken constantly. Restating it more loudly had already been tried.

The split that matters is not important versus unimportant. It is **once per
decision** versus **once per message**. "Never commit a secret" fires at one
point and holds. "No em dashes" fires on every sentence you write, thousands of
tokens after you last read it, while you are busy with something else. That
second kind needs the instruction re-delivered, or checked, or both.

## What ships today

### style-reminder

A `UserPromptSubmit` hook. Every time the owner sends a message, it reads the
project's active output style and puts it back in front of the agent.

An output style is delivered once, in the system prompt at session start. This
hook makes that delivery repeat, so the voice instruction is never thousands of
tokens stale by the time a reply gets written.

**It reads the style file, never a copy.** The hook resolves which style is
active and reads that file, so editing the style is the only edit needed. A
reminder with the text baked in would be one more copy to fall out of step.

How it picks the style:

1. `style` in `.claude/style-reminder.json`
2. `outputStyle` in `.claude/settings.local.json`
3. `outputStyle` in `.claude/settings.json`
4. `plain-language`

Then it reads `.claude/output-styles/<name>.md` and strips the frontmatter.

**When it stays silent**, which matters as much as when it fires:

- no matching style file in the project;
- the owner switched to a built-in style (Explanatory, Learning, Proactive,
  Default), which has no project file, so re-stating the old one would be wrong;
- the style file is larger than `maxChars`, rather than injecting something
  enormous on every turn;
- the throttle says this is not a reminder turn.

**What it is not.** A reminder, not a check. It reads nothing the agent wrote
and blocks nothing. It cannot catch a violation, it only lowers the odds of one.
It also costs a small amount on every message, which is the price of the repeat.

It fails open and quiet. Any unexpected error exits 0 with nothing written. A
broken reminder must never block the owner's message.

Since #102 it also falls back to the machine-wide style. It looks for the style
file in the project first and then in `~/.claude/output-styles/`, and it resolves
the style name from the project's local settings, the project's committed
settings, then `~/.claude/settings.json`. A project that installs its own style
still wins. This is what makes a machine-level install work in a repo that was
never set up with this toolkit.

### writing-guard

A `Stop` hook. It reads the finished reply and blocks on an em dash or a section
sign, handing the agent the violation so it rewrites before the owner sees
anything.

**Only the two hard bans fire.** Not word choice, not invented labels, not
figures of speech, not answer-first, not list versus sentences. Those are
judgement calls and they stay with the output style, because a wrong block costs
the owner a turn. A script checks what a script can see.

A third check, `filler-opener`, is implemented and **off by default**. It catches
a reply that starts with "Sure", "Let me", "Great question". It proxies for "lead
with the answer", which #102 put on the not-checked list, so it stays off unless
a project turns it on.

**Quoting.** An em dash inside a fenced code block or a backtick span is ignored,
because the agent is quoting a file rather than writing. Prose that quotes a file
with no code markers cannot be told apart from the agent's own words and is not
exempt. That limit was known before the build, not discovered after.

**Loop safety, three layers**, because a hook that can force another turn must
never force them forever: it honors `stop_hook_active`; it never blocks twice on
identical text, since the agent evidently cannot fix it; and it caps blocks per
session.

It fails open. Any unexpected error exits 0. A broken guard must never wedge a
session.

### no-ai-attribution-guard

A `PreToolUse` hook on the `Bash` matcher. It refuses any command that would put
AI credit on the owner's work: a `git commit`, `git tag`, `git merge`,
`git notes`, `gh pr create`, `gh pr edit`, `gh release create`, or
`gh issue create` whose text carries a `Co-Authored-By` trailer naming an AI, a
"Generated with Claude Code" line, Claude's no-reply email address, or the
Claude Code link that ships in the default credit line.

**This is the only machine-wide hook in the toolkit.** Every other hook here is
registered in a project's `.claude/settings.json`. This one is registered in the
owner's own `~/.claude/settings.json` and installed by the `machine-sync` skill
in the [`project-init`](../project-init/README.md) plugin, so it covers every
repository on the machine, including ones that were never set up with the
toolkit. Its script still lives here, because splitting hooks across two plugins
by scope would mean checking two folders to answer "what hooks does the toolkit
ship?".

**Why a hook and not just the setting.** The `attribution` setting, with
`commit` and `pr` set to an empty string, already removes the lines Claude Code
adds by itself, and it is the main defense. It has two holes: a project's
settings file beats the machine-wide one, and it does nothing about text an
agent types into a message by hand. The Claude Code documentation names the
answer: "To block an action regardless of what Claude decides, use a PreToolUse
hook instead."

**It is tuned differently from `writing-guard`.** A wrong writing block costs
the owner a turn, so that hook leans toward letting things through. Here a wrong
pass puts an AI's name on client work and cannot be taken back once it is
pushed, so this one leans toward blocking.

**What stops it firing on ordinary commits.** This repository writes about the
`Co-Authored-By: Claude` trailer in its own rules, tickets, and commit messages.
Two things keep that working: every trailer pattern is anchored to the start of
a line, because a real trailer sits on its own line and prose about it does not;
and only publishing commands are scanned, so writing the same words into a file,
searching for them, or reading them is untouched. A `Co-Authored-By:` trailer
naming a real person stays allowed, which the tests check directly.

**It costs nothing on ordinary commands.** A command with none of the marker
words exits after a handful of substring checks, with no file read and no
subprocess.

It fails open. Any unexpected error exits 0 and the command runs.

**Its one limit, stated plainly.** It only sees commands run in the terminal. A
commit made any other way is never seen, and the `no-ai-attribution.md` rule in
the machine-wide set is the backup for those. The rule, the setting, and this
hook each cover a hole the other two leave.

### The two Salesforce guards

Both are `PreToolUse` hooks on the `Bash|PowerShell` matcher, written in Node so
they behave the same under Git Bash and PowerShell. They are Salesforce-only, so
`project-init` Gate 2 offers them only when the stack is Salesforce.

| File | Guide | What it does |
|---|---|---|
| `hooks/guard-protected-orgs.js` | `salesforce-prod-guard-hook.md` | Confirms before any Salesforce CLI deploy or destructive command hits a production org. Works out which orgs are production from the local org store, with no network call. Tuned by `templates/protected-orgs.json`, copied to the project's `.claude/`. |
| `hooks/guard-permission-set-deploy.js` | `salesforce-permset-guard-hook.md` | Blocks a deploy shipping a permission set that has not been preflighted in the last 30 minutes. That omission silently and irreversibly deletes grants, and Salesforce's own `deploy validate` and `deploy preview` cannot detect it. |

**Installing them copies them into the project, so the project does not need this
plugin afterwards.** Each guide ends with the hook file in the project's
`.claude/hooks/` and an entry in the project's `.claude/settings.json`. Install
this plugin to get the guides and the files; after that the project runs the
hooks on its own, and a clone of it needs nothing from here.

The permission set guard depends on `permsets.py`, which is not in this plugin.
It ships in the `project-init` library at `library/tools/permsets.py`, and Gate 1
copies it to `tools/permissions/permsets.py`. Without it the guard blocks every
permission set deploy forever.

## Install

Use the `hooks-library` skill (`/hooks-library`), which wires a hook into the
project's `.claude/settings.json` and verifies it runs. `project-init` and
`project-sync` both offer them.

`style-reminder` and `writing-guard` are only useful next to an installed output
style, so install those together. `project-init` Gate 5 installs the style;
`style-reminder` makes it repeat.

The two Salesforce guards install from their own guides in this folder,
`salesforce-prod-guard-hook.md` and `salesforce-permset-guard-hook.md`, which
`project-init` Gate 2 follows step by step.

`no-ai-attribution-guard` does not install through the `hooks-library` skill,
because it is not a project hook. The `machine-sync` skill (`/machine-sync`) in
the `project-init` plugin installs it into `~/.claude/`, alongside the rule and
the settings values it works with. Installing it per project would leave every
repository nobody set up uncovered, which is the gap it exists to close.

## Configure

### style-reminder

Optional, at `.claude/style-reminder.json` in the project root:

```json
{
  "style": "plain-language",
  "everyNPrompts": 1,
  "maxChars": 4000
}
```

Omit the file to get the resolved style, a reminder on every message, and a
4,000 character ceiling. Set `everyNPrompts` to 3 to remind on every third
message instead, which cuts the per-message cost if the reminder is doing more
work than it needs to.

### writing-guard

Optional, at `.claude/writing-guard.json` in the project root:

```json
{
  "checks": { "em-dash": true, "section-sign": true, "filler-opener": false },
  "maxBlocks": 3
}
```

Omit the file to get the two hard bans on, `filler-opener` off, and at most three
blocks per session.

### no-ai-attribution-guard

Optional, at `no-ai-attribution-guard.json` next to the installed script in
`~/.claude/hooks/`:

```json
{
  "enabled": true
}
```

Omit the file to get it on. Setting `enabled` to false switches the guard off,
and it is an escape hatch for a wrong block that cannot be reworded, not a
normal setting. The written rule still applies when the guard is off.

## Test

```
node plugins/hooks-library/tests/style-reminder-harness.mjs
node plugins/hooks-library/tests/writing-guard-harness.mjs
node plugins/hooks-library/tests/no-ai-attribution-guard-harness.mjs
```

38 checks, 55 checks, and 43 checks. In all three harnesses, a large
share of the checks assert the hook does **nothing**, and that weighting is
deliberate. Each hook fails in two directions and only one is visible. Injecting
the wrong text or blocking a good reply is obvious; staying silent when it
should have fired looks exactly like everything working.

For `no-ai-attribution-guard` the false-positive risk is real rather than
theoretical: this repository writes about the `Co-Authored-By: Claude` trailer
in rules, tickets, commit messages, and prose, so a hook matching those words
anywhere in a line would fire constantly on text that is not the thing it
guards against.

## What was here before, and came back

`writing-guard` was removed in #101 along with the voice rules it enforced, on
the theory that the style plus the reminder would be enough. The removal came
with a stated condition: if em dashes climbed back toward the rate in the table
at the top of this file, bring the check back rather than write the rule down in
a fourth place.

#102 brought it back, narrower than before. It used to check three things and
cite three rule files that no longer exist. It now checks two, and both are
characters, with no interpretation anywhere in it.

## What a hook is for

Three jobs, and the admission bar is different for each.

| Job | What it does | Bar |
|---|---|---|
| **Check** | Tests a finished output against a rule. `writing-guard`, and `no-ai-attribution-guard`. | The rule must be checkable with no interpretation. If the check has to guess at intent it does not go here, because a wrong block costs the owner a turn. The exception is a rule where a wrong pass costs more than a wrong block, which `no-ai-attribution-guard` is: an AI's name on client work cannot be taken back once it is pushed. Say so out loud when claiming it. |
| **Trigger** | Fires a process at a moment agents forget. | The firing must need no judgement. What happens next is an agent's job and may need plenty. |
| **Orient** | Puts the installed rules or style in front of a session, at its start or on every turn. `style-reminder`. | The content must already exist and be canonical. The hook shows it; it does not restate or reinterpret it. |

The original bar, "checkable with no interpretation," is the **check** bar only.
Applying it to the other two would rule out every hook that fires a process,
since firing is not a judgement about content at all.

What no hook here may do: decide what is true, write durable memory, or approve
its own proposal. A trigger hook starts the review that produces proposals; the
draft is still checked, the owner still answers it, and only then is it written.
That boundary is what lets project knowledge use hooks without reopening the
failure that retired v1, where hooks wrote memory on their own.

## Adding a hook here

Name the job it does from the table above and meet that job's bar. Getting it
wrong must be cheap to recover from. If it fits none of the three, it stays a
rule and an agent applies judgement to it.

Say which scope it is for, because that decides who installs it. A project hook
goes into a project's `.claude/settings.json` through the `hooks-library` skill.
A machine-wide hook goes into `~/.claude/settings.json` through `machine-sync`,
and it also needs a row in `plugins/project-init/machine/README.md`. Pick
machine-wide only when the rule has to hold in a repository nobody set up with
the toolkit; everything else is a project hook.
