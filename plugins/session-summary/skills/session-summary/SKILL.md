---
name: session-summary
description: Summarize this chat session as a short numbered list of the main things the user asked for and where each one stands. Use this whenever the user asks to summarize, recap, or catch up on the session or conversation, asks "what did I ask for", "what did we do", "where do things stand", "status of my requests", "session summary", "recap this chat", or runs /session-summary. Also use it when a session is wrapping up or being handed off and the user wants the requests-and-status view rather than a story of the work. Prefer this over writing a narrative summary of your own actions, even when the user's wording is casual.
---

# Session summary

One short numbered list: the main things the user asked for in this session, and
where each one stands. Nothing else.

People ask for this when they have lost the thread, or when they are about to
close the session and want to know what is still open. Both readers want the
same thing: their own asks back, in their own words, each with an honest status.
A narrative of what you did does not answer that question, which is why the
output is a list of their requests rather than a list of your work.

## The output

A numbered list, and nothing around it. No title, no opening line, no closing
line, no offer to continue. The list is the whole reply.

```
1. <the request, in the user's own terms>. Status: <status>. <one clause of outcome>
```

Numbered rather than bulleted, so the user can say "tell me more about number 2"
and you both know what that means.

One line per request, in the order the requests were made. Order is how the user
remembers the session, so do not group by status or sort by importance.

## Count the asks, not the steps

The most common way this goes wrong is a list longer than the session. A long
session usually holds one to three real requests. Everything else is work those
requests caused, and it does not get its own line.

Before writing a line, ask: **would this have come up at all if the earlier
request had not been made?** If it only exists because you were already carrying
out an earlier request, it belongs to that request and gets no line of its own.

These are not separate requests:

- The user choosing from options you offered, or approving something you
  proposed. That is a decision inside the request that prompted it.
- The user answering a question you asked.
- The user confirming, correcting, or nudging work already under way.
- Parts, steps, or phases of one job. A request that took six pieces of work is
  still one request.
- Work you suggested and then did. That was yours, not theirs.

**If you find yourself indenting a sub-list under a line, you have gone a level
too deep.** Collapse it. The line says what was asked; the status says where the
whole thing stands, however many pieces it took.

Worked example. The user says "sync this project with my toolkit", then picks
four of the six gaps you found, then answers a question about whether one item is
already handled elsewhere. That is **one** line: "Sync this project against the
toolkit." The four gaps are what the sync did. The question was a decision inside
it. A six-line answer here would make one afternoon look like a week of separate
asks, and would bury the one thing the user actually wanted to see.

## Status words

Use these, and only these, so the list scans at a glance:

| Status | Means |
|---|---|
| Done | Finished, and you checked it |
| Done, unverified | Finished, but not tested or confirmed. Say what was not checked |
| Partly done | Some landed. Say what is left |
| Blocked | Cannot proceed. Say what is blocking it |
| Waiting on you | Needs the user's own action. Say the action |
| Not started | Agreed but not begun |
| Dropped | The user changed direction or withdrew it |
| Answered | It was a question, not a build |

## Keep their words

Write each line the way the user would describe it, not the way the work turned
out. Someone scanning the list should recognize their own ask instantly. If they
said "make the other agents aware of the vault", that is the line. "Created a
reference document and updated two instruction files" is the outcome, and belongs
after the status, in a clause.

## Be honest about status

The status says what actually happened, not what was attempted or intended. If
something failed, was skipped, was only partly checked, or was never run, the
line says so plainly.

This is the one place where a tidier summary is worse than a messy one. The list
is what the user relies on after they have forgotten the session, so a request
recorded as done when it was only attempted quietly turns into a wrong assumption
weeks later.

If part of the session is no longer visible to you (context was trimmed or
summarized), say that as a final numbered line instead of guessing at what was
asked. Inventing a plausible request is the failure that ruins the whole list.

## Example

```
1. Fix the login timeout on staging. Status: Done. Session cookie lifetime
   corrected in auth/session.ts, deployed to staging.
2. Add a retry to the payment webhook. Status: Partly done. Retry is in; the
   dead-letter queue for repeated failures is still open.
3. Explain why the nightly job runs twice. Status: Answered. Two cron entries
   exist, one left over from the old deploy.
4. Turn on alerting for failed payments. Status: Waiting on you. Needs someone
   with the PagerDuty admin login to add the service.
```

## Summarizing a session other than this one

Same rules when the user points at a transcript, a log, or an exported chat:
their turns define the list, their words shape each line, and anything the record
does not settle gets said rather than guessed.
