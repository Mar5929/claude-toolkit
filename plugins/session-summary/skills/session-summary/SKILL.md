---
name: session-summary
description: Summarize this chat session as a plain bullet list of every request the user made and where each one stands. Use this whenever the user asks to summarize, recap, or catch up on the session or conversation, asks "what did I ask for", "what did we do", "where do things stand", "status of my requests", "session summary", "recap this chat", or runs /session-summary. Also use it when a session is wrapping up or being handed off and the user wants the requests-and-status view rather than a story of the work. Prefer this over writing a narrative summary of your own actions, even when the user's wording is casual.
---

# Session summary

Produce one scannable list: every request the user made, and where each one
stands. Nothing else.

People ask for this when they have lost the thread, or when they are about to
close the session and want to know what is still open. Both readers want the
same thing: their own asks back, in their own words, each with an honest status.
A narrative of what you did does not answer that question, which is why the
output is a list of their requests rather than a list of your work.

## The output

Only bullets. No title, no opening line, no closing line, no offer to continue.
The list is the whole reply.

One bullet per request, in the order the requests were made:

```
- <the request, in the user's own terms>. Status: <status>. <one clause of outcome>
```

Order matters because it is how the user remembers the session. Do not group by
status or sort by importance.

If one request had parts that ended in different states, keep it as one bullet
with indented sub-bullets, one per part. Splitting it into separate top-level
bullets makes the session look longer than it was.

### Status words

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

## What counts as a request

Read the user's own turns, in order. Their messages define the list.

- **One bullet per distinct ask.** Repeats, nudges, and "yes, go ahead" fold
  into the bullet they belong to.
- **A correction updates the bullet it corrects**, rather than adding a new one.
  Note the change inside that bullet when it matters to the outcome.
- **Slash commands the user ran are requests** (for example a merge command),
  and get their own bullet.
- **Answers to your questions are not requests.** They are decisions inside an
  existing bullet.
- **Your own suggestions are not requests** unless the user took them up. Work
  you volunteered does not become something they asked for.

Leave out chit-chat, thanks, acknowledgements, your reasoning, the tools you
used, and files you touched unless naming one is the outcome.

## Keep their words

Write each bullet the way the user would describe it, not the way the work
turned out. Someone scanning the list should recognize their own ask instantly.
If they said "make the other agents aware of Lydon's vault", that is the bullet.
"Created a reference document and updated two root instruction files" is the
outcome, and belongs after the status, in a clause.

## Be honest about status

The status says what actually happened, not what was attempted or intended. If
something failed, was skipped, was only partly checked, or was never run, the
bullet says so plainly.

This is the one place where a tidier summary is worse than a messy one. The list
is what the user relies on after they have forgotten the session, so a request
recorded as done when it was only attempted quietly turns into a wrong
assumption weeks later.

If part of the session is no longer visible to you (context was trimmed or
summarized), say that in one final bullet instead of guessing at what was asked.
Inventing a plausible request is the failure that ruins the whole list.

## Example

```
- Fix the login timeout on staging. Status: Done. Session cookie lifetime
  corrected in auth/session.ts, deployed to staging.
- Add a retry to the payment webhook. Status: Partly done. Retry is in; the
  dead-letter queue for repeated failures is still open.
- Explain why the nightly job runs twice. Status: Answered. Two cron entries
  exist, one left over from the old deploy.
- Turn on alerting for failed payments. Status: Waiting on you. Needs someone
  with the PagerDuty admin login to add the service.
- Rename the internal API routes. Status: Dropped. You decided to wait for the
  v3 release instead.
```

## Summarizing a session other than this one

Same rules when the user points at a transcript, a log, or an exported chat:
their turns define the list, their words shape each bullet, and anything the
record does not settle gets said rather than guessed.
