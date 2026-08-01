# hooks-library

Hooks that make a rule land mechanically, instead of writing the rule down again
and hoping.

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

## Install

Use the `hooks-library` skill (`/hooks-library`), which wires the hook into the
project's `.claude/settings.json` and verifies it runs. `project-init` and
`project-sync` both offer it.

The hook is only useful next to an installed output style, so install the two
together. `project-init` Gate 5 installs the style; this hook makes it repeat.

## Configure

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

## Test

```
node plugins/hooks-library/tests/style-reminder-harness.mjs
```

32 checks. Roughly a third of them assert the hook stays **silent** when it
should, and that weighting is deliberate. A reminder hook fails in two
directions and only one is visible: injecting the wrong text is obvious, while
staying silent when it should have fired looks exactly like everything working.

## What was here before

`writing-guard`, a `Stop` hook that read the finished reply and blocked on em
dashes, section signs, and filler openers, was removed along with the three
voice rules it enforced. Voice now lives in one place, the output style, and is
reinforced by repetition rather than by blocking a finished reply.

That trade is worth stating plainly, because the table at the top of this file
is the evidence against it: a reminder lowers the odds of a miss, a check caught
them. Nothing now catches an em dash that slips through. If the rate climbs back
toward what that table shows, the answer is to bring a check back, not to write
the rule down in a fourth place.

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
