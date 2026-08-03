# session-summary

Recaps a session as a short numbered list, one line per main request you made,
each with an honest status.

**Setup: install and go.** Install once per machine. It reads the conversation
and writes nothing, so there is nothing to set up in a project.

## What it does

Ask for a summary and you get a list, not a story:

```
1. Fix the login timeout on staging. Status: Done. Session cookie lifetime
   corrected in auth/session.ts, deployed to staging.
2. Add a retry to the payment webhook. Status: Partly done. Retry is in; the
   dead-letter queue for repeated failures is still open.
3. Turn on alerting for failed payments. Status: Waiting on you. Needs someone
   with the PagerDuty admin login to add the service.
```

No title, no opening line, no closing line. The list is the whole reply.
Numbered so you can say "tell me more about number 2".

## One line per ask, not per step

A long session usually holds one to three real requests. Everything else is the
work those requests caused, and it does not earn its own line. Choosing from
options, approving a proposal, answering a question, and confirming work in
flight are all decisions inside a request, not new requests. Neither are the
parts of one job: a request that took six pieces of work is still one line.

The test the skill applies is whether something would have come up at all if the
earlier request had not been made. If not, it belongs to that request. Without
this, one afternoon's work reads like a week of separate asks and the thing you
actually wanted to see is buried.

## Why it exists

Two moments create the need, and both want the same answer. Mid-session you lose
the thread and want to know what is still open. End of session you are about to
close the window and want to know what did not get finished.

A summary written as "here is what I did" answers neither, because it is
organized around the work rather than around what you asked for. This skill
inverts that: your requests are the list, in the order you made them, in the
words you used, and the status is what actually happened to each one.

## The status words

A small fixed set, so the list scans at a glance rather than being read:

| Status | Means |
|---|---|
| Done | Finished, and checked |
| Done, unverified | Finished, but not tested or confirmed |
| Partly done | Some landed, and what is left is named |
| Blocked | Cannot proceed, and what is blocking it is named |
| Waiting on you | Needs your own action, and the action is named |
| Not started | Agreed but not begun |
| Dropped | You changed direction or withdrew it |
| Answered | It was a question, not a build |

The status has to match what actually happened, including the parts that failed
or were never verified. This is the one place where a tidier summary is worse
than a messy one: the list is what you rely on after you have forgotten the
session, so a request recorded as done when it was only attempted quietly
becomes a wrong assumption weeks later.

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
assistant volunteered is not listed as something you asked for.
