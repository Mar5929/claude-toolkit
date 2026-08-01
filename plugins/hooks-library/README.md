# hooks-library

Guard hooks that enforce toolkit rules mechanically, instead of writing the rule
down again and hoping.

## Why this exists

Rules that must be applied to every single message do not survive a long working
session. That is not a guess. Assistant-authored text was parsed out of real
session transcripts across three projects and checked against one rule with no
interpretation in it at all, `writing-and-language.md`'s "No em dashes":

| Project | Assistant messages | Em dashes | Rate |
|---|---|---|---|
| davis-advisors-sfdc | 2,259 | 1,284 | one per 1.8 messages |
| DragonFly | 840 | 208 | one per 4 messages |
| claude-toolkit | 49 | 4 | one per 12 messages |

Every one of those projects carries the rule. It is four words long, it appears
in the global rules and in each project's own `.claude/rules/`, and it is broken
constantly. Restating it more loudly has already been tried.

The split that matters is not important versus unimportant. It is **once per
decision** versus **once per message**. "Never commit a secret" fires at one
point and holds. "No em dashes" fires on every sentence you write, thousands of
tokens after you last read it, while you are busy with something else. That
second kind needs a check, not a reminder.

The toolkit's other answer to the same measurement is the `plain-language`
output style (`project-init`'s `output-styles/` library), which puts the voice
rules in the system prompt where the session is reminded of them each turn. The
two do different halves of the job and neither replaces the other: a style
reduces how often the miss happens, and this guard catches the ones that still
get through. A style is also the only option for the misses no text check can
score, such as a reply being twice as long as it needed to be.

## What ships today

### writing-guard

A `Stop` hook. When the agent finishes a turn, it reads the final reply out of
the transcript and looks for three things:

| Check | Rule | Why it is safe to enforce |
|---|---|---|
| `em-dash` | `writing-and-language.md` | A literal character. No judgement. |
| `section-sign` | `writing-and-language.md` | A literal character. No judgement. |
| `filler-opener` | `how-to-reply.md` | The reply opens with "Sure", "Let me", "Great question" and friends. |

On a hit it exits 2 and writes the violations to stderr, which Claude Code feeds
back to the agent so it rewrites before you ever see the reply. Clean replies
exit 0 and cost nothing.

**What it deliberately does not check.** Whether a question was asked in prose
instead of the question box. Deciding that requires knowing whether the agent
genuinely needed an answer, and a wrong block costs a wasted turn. Measurement
put that violation at 2.6% in the project with the most data, so the noise would
outweigh the catch. The two structural rules, talking between tool calls and
closing without a next step, are the most-broken rules in the library at 56 to
60 percent of turns, but a text check cannot prevent them: the violation is in
the shape of the turn, not in any string. They need a different answer.

### Loop safety

A hook that can force another turn must never be able to force them forever.
Three independent layers:

1. honors `stop_hook_active` when the harness sets it;
2. never blocks twice on identical text, because if the agent did not fix it the
   second time it will not fix it the tenth; and
3. a hard cap of three blocks per session.

It also fails open. Any unexpected error exits 0. A broken guard must never
wedge a session.

## Install

Use the `hooks-library` skill (`/hooks-library`), which wires the hook into the
project's `.claude/settings.json` and verifies it runs. `project-init` and
`project-sync` both offer it.

## Configure

Optional, at `.claude/writing-guard.json` in the project root:

```json
{
  "checks": { "em-dash": true, "section-sign": true, "filler-opener": false },
  "maxBlocks": 3
}
```

Omit the file entirely to get all three checks and a cap of three. Set any check
to `false` to turn it off; a project whose owner likes an em dash can say so
once rather than fighting the guard.

## Test

```
node plugins/hooks-library/tests/writing-guard-harness.mjs
```

33 checks. Roughly a third of them assert that ordinary, correct text does
**not** trip the guard, and that weighting is deliberate: a false positive costs
the owner a wasted turn every time it fires. Two real false positives were
caught this way during development, where "great" matched the start of "Greatly
improved throughput" and "perfect" matched "Perfectly reasonable".

## What a hook is for

Three jobs, and the admission bar is different for each.

| Job | What it does | Bar |
|---|---|---|
| **Check** | Tests a finished output against a rule. `writing-guard`. | The rule must be checkable with no interpretation. If the check has to guess at intent it does not go here, because a wrong block costs the owner a turn. |
| **Trigger** | Fires a process at a moment agents forget, such as starting the durable-memory review once a pull request opens. | The firing must need no judgement. What happens next is an agent's job and may need plenty. |
| **Orient** | Puts the installed rules in front of a session at its start. | The rules must already exist and be canonical. The hook shows them; it does not restate or reinterpret them. |

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
