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

### memory-pr-hook

A `PreToolUse` hook on the `Bash` matcher. It holds the command that opens a
pull request, once per branch per session, so the agent runs the memory check at
the moment it applies instead of forgetting it.

**Why.** `wrap-up-ritual.md` already says to check what is worth saving when a
piece of work finishes, and every toolkit project carries the rule. Counted from
real transcripts, looking only at what the agent itself wrote:

| Project | Check mentioned | Memory agent actually used |
|---|---|---|
| DragonFly | 3.4% of turns | 3.4% |
| davis-advisors-sfdc | 0.5% | 12% |
| claude-toolkit | 19% | 0% |

The DragonFly agent described the failure itself, after opening five pull
requests in a day and running the check on none of them: "The review is a step
that exists only in a file I read at the start of the session, hundreds of tool
calls earlier. By the time I reached the moment it applies, it was not in front
of me."

**What it knows, and it is all it knows.** A pull request is about to be opened,
this project checks what to save to memory first, the rule is in
`wrap-up-ritual.md`, and what was found goes in the pull request description.

**What it must never contain.** No memory types or destinations, no check for
whether any system is installed, no list of words that decides what is worth
saving, and none of the wording of the check itself. Those all live in the
rules. This is the test for whether it is built correctly, not a preference: the
davis-advisors-sfdc project's memory hook went the other way with 46 text
patterns, and its own log shows it firing on helper agent output and on messages
from other sessions instead of on the owner's words.

**It denies, it never asks.** An `ask` decision would put a permission popup in
front of the owner on every pull request and let one click skip the check. The
hold is handed to the agent, so the owner never sees it.

**Held once per branch per session**, so the agent's own retry a moment later
goes straight through. Every pull request in a session still gets held once.
There is no cap, because the hold no longer blocks the owner.

**It costs nothing on ordinary commands.** A command with no `gh` in it exits
after one substring check, with no file read and no subprocess.

It fails open. Any unexpected error exits 0 and the command runs.

**Two limits, stated plainly rather than implied away:**

1. **It cannot tell whether the check actually happened.** It only guarantees
   the check is raised at the right moment. Every way of verifying it breaks the
   rule above about what it must not contain: a marker written by the memory
   agent would require knowing that system exists, and would hold forever in a
   project without it; a marker written by the agent can be written without
   doing the check; reading the transcript needs a list of words to look for,
   which is the davis-advisors-sfdc mistake exactly. What closes most of the gap
   is not the hook: every pull request description says what the check found, so
   a skip is visible to the owner at merge time.
2. **It only sees commands typed in the terminal.** A pull request opened on the
   GitHub website, or by any other tool, is never seen. `wrap-up-ritual.md` is
   the backup for those.

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

`memory-pr-hook` goes into every project by default. It points at
`wrap-up-ritual.md`, so the install checks that rule is present and offers it if
it is not: a hook pointing at a missing file is a dead end. That check belongs in
the skill, never in the hook.

The two Salesforce guards install from their own guides in this folder,
`salesforce-prod-guard-hook.md` and `salesforce-permset-guard-hook.md`, which
`project-init` Gate 2 follows step by step.

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

### memory-pr-hook

Optional, at `.claude/memory-pr-hook.json` in the project root:

```json
{
  "enabled": true,
  "maxHolds": 0
}
```

Omit the file to get it on with no limit. `maxHolds` of 0 means no limit; it
exists only as a safety valve against a runaway loop, not as a cap on how many
pull requests get checked.

## Test

```
node plugins/hooks-library/tests/style-reminder-harness.mjs
node plugins/hooks-library/tests/writing-guard-harness.mjs
node plugins/hooks-library/tests/memory-pr-hook-harness.mjs
```

38 checks, 55 checks, and 52 checks. In all three harnesses, a large share of
the checks assert the hook does **nothing**, and that weighting is deliberate.
Each hook fails in two directions and only one is visible. Injecting the wrong
text, blocking a good reply, or holding a command that was never opening a pull
request is obvious; staying silent when it should have fired looks exactly like
everything working.

For `memory-pr-hook` the false-positive risk is real rather than theoretical:
this repository writes about `gh pr create` in rules, tickets, commit messages,
and prose, so a hook that matched the words anywhere in a line would fire
constantly on text that is not a command.

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
| **Trigger** | Fires a process at a moment agents forget. `memory-pr-hook`, which starts the memory check when a pull request opens. | The firing must need no judgement. What happens next is an agent's job and may need plenty. |
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
