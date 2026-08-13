---
name: session-summary
description: Summarize this chat session as a table of the main things the user asked for and where each one stands, followed by anything that still needs the user. Use this whenever the user asks to summarize, recap, or catch up on the session or conversation, asks "what did I ask for", "what did we do", "where do things stand", "status of my requests", "session summary", "recap this chat", or runs /session-summary. Also use it when a session is wrapping up or being handed off and the user wants the requests-and-status view rather than a story of the work. Prefer this over writing a narrative summary of your own actions, even when the user's wording is casual.
---

# Session summary

Answer exactly two questions, and nothing else:

1. What did I originally ask for, and where does each one stand?
2. What still needs my input?

People ask for this when they have lost the thread, or when they are about to
close the session and want to know what is still open. Both readers want the
same thing: their own asks back, in their own words, each with an honest status,
and then the one thing that needs them. A narrative of what you did answers
neither question, which is why the output is built around their requests rather
than around your work.

A flat list of plain sentences fails the same way. Every line looks like every
other line, so the reader has to read all of it to find the one item that needs
them. The shape below is what makes it scannable.

## The output

Two parts, in this order, separated by a horizontal rule (`---`).

1. **A table.** Columns: `#`, `What you asked`, `Status`, `Where it landed`. One
   row per request, in the order the requests were made. This is the scan.
2. **A block for anything needing the user's input or action.** Heading
   `### 🔴 Still open, and it needs you`. Always last.

No title above the table. No closing offer to continue.

**There is no third part.** No block for things the user did not ask about, no
wrap-up, no narrative of the work. If something went wrong or surprised you, it
goes in the `Where it landed` cell of the request it came out of, the way row 2
of the example carries "One rule was nearly lost in the deletion and had to be
put back in its own file." That is a fact about how request 2 went, so it lives
in request 2's row.

When nothing needs the user, keep the block and say so in one line, so a
finished session does not read as an open loop:

```
### 🔴 Still open, and it needs you

Nothing needed from you.
```

## Count the asks, not the steps

**A row is a request, not a step.** A table makes it tempting to add rows, and a
summary longer than the session is still the way this most often goes wrong. A
long session usually holds one to three real requests. Everything else is work
those requests caused, and it does not get its own row.

Before writing a row, ask: **would this have come up at all if the earlier
request had not been made?** If it only exists because you were already carrying
out an earlier request, it belongs to that request and gets no row of its own.

These are not separate requests:

- The user choosing from options you offered, or approving something you
  proposed. That is a decision inside the request that prompted it.
- The user answering a question you asked.
- The user confirming, correcting, or nudging work already under way.
- Parts, steps, or phases of one job. A request that took six pieces of work is
  still one request.
- Work you suggested and then did. That was yours, not theirs.

**If a cell starts turning into its own list, you have gone a level too deep.**
Collapse it. The row says what was asked; the status says where the whole thing
stands, however many pieces it took.

Worked example. The user says "sync this project with my toolkit", then picks
four of the six gaps you found, then answers a question about whether one item is
already handled elsewhere. That is **one** row: "Sync this project against the
toolkit." The four gaps are what the sync did. The question was a decision inside
it. A six-row table here would make one afternoon look like a week of separate
asks, and would bury the one thing the user actually wanted to see.

## Status words and their symbols

Use these, and only these, so the table scans at a glance. Each one is written
with its symbol in front and the word in bold:

| Status | Written as | Means |
|---|---|---|
| Done | ✅ **Done** | Finished, and you checked it |
| Done, unverified | ⚠️ **Done, unverified** | Finished, but not tested or confirmed. Say what was not checked |
| Partly done | ⏳ **Partly done** | Some landed. Say what is left |
| Blocked | 🔴 **Blocked** | Cannot proceed. Say what is blocking it |
| Waiting on you | 🔴 **Waiting on you** | Needs the user's own action. Say the action |
| Not started | ⚪ **Not started** | Agreed but not begun |
| Dropped | ⛔ **Dropped** | The user changed direction or withdrew it |
| Answered | 💬 **Answered** | It was a question, not a build |

The eight words do not change, and no ninth one gets invented.

## Bold one phrase, where it carries the point

Bold the phrase the reader has to see, the way the first line of the open block
is bold in the example. Bold everywhere is the same as bold nowhere.

## Keep their words

Write the `What you asked` cell the way the user would describe it, not the way
the work turned out. Someone scanning the table should recognize their own ask
instantly. If they said "make the other agents aware of the vault", that is the
cell. "Created a reference document and updated two instruction files" is the
outcome, and belongs in `Where it landed`.

Keep the cell short enough to fit without losing what they meant. Short, not
reworded.

## Be honest about status

The status says what actually happened, not what was attempted or intended. If
something failed, was skipped, was only partly checked, or was never run, the row
says so plainly.

A tidy-looking table is worse than a messy one if a status was softened to fit a
cell. The table is what the user relies on after they have forgotten the session,
so a request recorded as done when it was only attempted quietly turns into a
wrong assumption weeks later.

Row 4 of the example says "Fixed twice. The first fix pointed at the wrong
file," which is the honesty this skill is for. There is no separate block for
mistakes, and dropping one does not soften this. It moves the honesty into the
row it belongs to.

If part of the session is no longer visible to you (context was trimmed or
summarized), say that as a final row instead of guessing at what was asked.
Inventing a plausible request is the failure that ruins the whole table.

## Example

This is a real summary of a real session. Produce this shape, these symbols,
these two parts, in this order.

````markdown
| # | What you asked | Status | Where it landed |
|---|---|---|---|
| 1 | Check the rules against the toolkit | ✅ **Done** | The toolkit had already made every one of these merges. This project was behind on all of them. |
| 2 | Consolidate DragonFly and my personal rules folder | ✅ **Done** | DragonFly: 34 rule files down to 27, merged into main. Personal folder: 16 down to 13. One rule was nearly lost in the deletion and had to be put back in its own file. |
| 3 | Port `small-deployable-changes.md` to the toolkit | ⛔ **Dropped** | You said no. |
| 4 | Fix the broken link in the decision document | ✅ **Done** | Fixed twice. The first fix pointed at the wrong file and the review caught it. |
| 5 | Why run the memory verifier before proposing? | 💬 **Answered** | So you never get asked to approve a claim nobody checked. |
| 6 | Merge it | ✅ **Done** | Pull request 29 is in main. Two other pull requests landed mid-session, so the branch had to be brought current first. |

---

### 🔴 Still open, and it needs you

**Another session has a half-finished merge sitting in your DragonFly folder.**
Two work-item files are in conflict. I did not touch it.

Two things follow from that:

1. Your folder will not show any of these rule changes until that session
   finishes and pulls.
2. My folder at `.claude/worktrees/rule-consolidation` and branch
   `worktree-rule-consolidation` are still there. Say the word once that merge is
   done and I will remove both.
````

## Summarizing a session other than this one

Same rules when the user points at a transcript, a log, or an exported chat:
their turns define the rows, their words shape each `What you asked` cell, and
anything the record does not settle gets said rather than guessed.
