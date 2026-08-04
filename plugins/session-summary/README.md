# session-summary

Recaps a session as a table, one row per main request you made, each with an
honest status, then pulls anything that still needs you out into its own block
below it.

**Setup: install and go.** Install once per machine. It reads the conversation
and writes nothing, so there is nothing to set up in a project.

## What it does

Ask for a summary and you get two parts, not a story.

First, a table. One row per request, in the order you asked:

| # | What you asked | Status | Where it landed |
|---|---|---|---|
| 1 | Fix the login timeout on staging | ✅ **Done** | Session cookie lifetime corrected in `auth/session.ts`, deployed to staging. |
| 2 | Add a retry to the payment webhook | ⏳ **Partly done** | Retry is in. The dead-letter queue for repeated failures is still open. |
| 3 | Why does the nightly job run twice? | 💬 **Answered** | Two cron entries exist, one left over from the old deploy. |

Then, always last, the block that says what needs you:

### 🔴 Still open, and it needs you

**Alerting for failed payments is not on.** Adding the service needs the
PagerDuty admin login, which I do not have.

That second part is the point of the shape. In a flat list every line looks the
same, so the one thing that needs you is buried among the things that do not.

No title above the table, and no closing offer to continue. When nothing needs
you, the block stays and says "nothing needed from you" in one line, so a
finished session does not read as an open loop.

## One row per ask, not per step

A long session usually holds one to three real requests. Everything else is the
work those requests caused, and it does not earn its own row. Choosing from
options, approving a proposal, answering a question, and confirming work in
flight are all decisions inside a request, not new requests. Neither are the
parts of one job: a request that took six pieces of work is still one row.

The test the skill applies is whether something would have come up at all if the
earlier request had not been made. If not, it belongs to that request. Without
this, one afternoon's work reads like a week of separate asks and the thing you
actually wanted to see is buried.

## Why it exists

Two moments create the need, and both want the same two answers: what did I ask
for and where does each one stand, and what still needs me. Mid-session you lose
the thread and want to know what is still open. End of session you are about to
close the window and want to know what did not get finished.

A summary written as "here is what I did" answers neither, because it is
organized around the work rather than around what you asked for. This skill
inverts that: your requests are the rows, in the order you made them, in the
words you used, and the status is what actually happened to each one.

## The status words

A small fixed set, each with a symbol, so the table scans at a glance rather than
being read:

| Status | Written as | Means |
|---|---|---|
| Done | ✅ **Done** | Finished, and checked |
| Done, unverified | ⚠️ **Done, unverified** | Finished, but not tested or confirmed |
| Partly done | ⏳ **Partly done** | Some landed, and what is left is named |
| Blocked | 🔴 **Blocked** | Cannot proceed, and what is blocking it is named |
| Waiting on you | 🔴 **Waiting on you** | Needs your own action, and the action is named |
| Not started | ⚪ **Not started** | Agreed but not begun |
| Dropped | ⛔ **Dropped** | You changed direction or withdrew it |
| Answered | 💬 **Answered** | It was a question, not a build |

The status has to match what actually happened, including the parts that failed
or were never verified. This is the one place where a tidier summary is worse
than a messy one: the table is what you rely on after you have forgotten the
session, so a request recorded as done when it was only attempted quietly
becomes a wrong assumption weeks later.

If something went wrong or surprised the assistant, it goes in the
`Where it landed` cell of the request it came out of. There is no separate block
for mistakes, which keeps each one attached to the request it belongs to.

## Install and use

```
/plugin install session-summary
```

Then say any of: "summarize this session", "what did I ask for", "where do
things stand", "recap this chat before I close it", or run `/session-summary`.

It also works on a session other than the current one. Point it at a transcript,
a log, or an exported chat and the same rules apply to that record.

## What it deliberately leaves out

Chit-chat, acknowledgements, the assistant's own reasoning, the tools it used,
and files it touched, unless naming one is the outcome of a request. Work the
assistant volunteered is not listed as something you asked for. There is no
third part: no wrap-up, no narrative of the work, no block for things you did not
ask about.
