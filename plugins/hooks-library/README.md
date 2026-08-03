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

## Install

Use the `hooks-library` skill (`/hooks-library`), which wires the hook into the
project's `.claude/settings.json` and verifies it runs. `project-init` and
`project-sync` both offer it.

The hook is only useful next to an installed output style, so install the two
together. `project-init` Gate 5 installs the style; this hook makes it repeat.

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

## Test

```
node plugins/hooks-library/tests/style-reminder-harness.mjs
node plugins/hooks-library/tests/writing-guard-harness.mjs
```

38 checks and 55 checks. In both harnesses, roughly half the checks assert the
hook does **nothing**, and that weighting is deliberate. Both hooks fail in two
directions and only one is visible. Injecting the wrong text or blocking a good
reply is obvious; staying silent when it should have fired looks exactly like
everything working.

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
| **Check** | Tests a finished output against a rule. | The rule must be checkable with no interpretation. If the check has to guess at intent it does not go here, because a wrong block costs the owner a turn. |
| **Trigger** | Fires a process at a moment agents forget, such as starting the durable-memory review once a pull request opens. | The firing must need no judgement. What happens next is an agent's job and may need plenty. |
| **Orient** | Puts the installed rules or style in front of a session, at its start or on every turn. `style-reminder`. | The content must already exist and be canonical. The hook shows it; it does not restate or reinterpret it. |

The original bar, "checkable with no interpretation," is the **check** bar only.
Applying it to the other two would rule out every hook that fires a process,
since firing is not a judgement about content at all.

What no hook here may do: decide what is true, write durable memory, or approve
its own proposal. A trigger hook starts the review that produces proposals; the
owner still answers them and the memory librarian still does the writing. That
boundary is what lets second-brain use hooks without reopening the failure that
retired v1, where hooks wrote memory on their own.

## Adding a hook here

Name the job it does from the table above and meet that job's bar. Getting it
wrong must be cheap to recover from. If it fits none of the three, it stays a
rule and an agent applies judgement to it.
