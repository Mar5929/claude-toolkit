# Log the Work, Spec It, Then Build It

Two things hold in this project, whatever it uses to track work:

1. **Every piece of work is logged in the project's tracker before it is built.**
   Nothing gets built off a request that lives only in a conversation.
2. **Nothing is built until a refinement session has filled in the spec.** A
   title is not a ticket.

The project's root instructions name the tracker and where it lives. Read that
first. If the root instructions do not name one, ask the owner before writing
work anywhere.

## Why both

The first one exists so the owner can open the tracker and see where things
stand without asking anyone. Work that lives only in a chat is invisible to
them, and it disappears when the conversation ends.

The second exists because a ticket with only a title gets built to whatever the
agent guessed it meant. The guess is usually close enough to look right and
wrong enough to waste the work.

## What the spec has to answer

Six parts, in plain words:

- **The requirements.** What has to be true for this to count as finished.
- **The goal.** What this work is meant to achieve.
- **The reason.** Why we are doing it, and what problem or gap it closes. If it
  came out of something going wrong, say what went wrong.
- **What the person using it experiences.** What they notice, before and after.
- **How it behaves from the outside.** The end user's view of how it works, step
  by step. What they do, what happens back. Not the internals.
- **Edge cases.** The odd and unhappy situations this has to handle, and exactly
  what should happen in each one. Name the behavior, do not just name the case.

Write them into the ticket itself, wherever the ticket lives. In a tracker that
holds work as files in the repository, that is the work item's `SPEC.md`. In an
external tracker, it is the ticket body.

## The refinement session

A refinement session is the owner and the agent working through those six parts
together until they agree on all of them, one question at a time. The agent asks,
recommends an answer, and writes down what the owner decides. It ends when every
part is answered and nothing contradicts anything else.

The `grill-me` skill runs this kind of interview and is worth using when it is
installed, but the session is the requirement and the skill is only one way to
hold it.

Mark the ticket so anyone can see the session happened. Which mark depends on the
tracker: a status, a label, or a line in the spec. The project's root
instructions say which.

## What to do when a ticket is missing or thin

- **No ticket and work is about to start?** Stop. Write the ticket first.
- **Work already underway with no ticket?** Stop and write it now, describing
  what is actually being built.
- **Ticket exists but the spec has gaps?** Do not start. Say exactly which of the
  six parts are missing, and offer to run the refinement session.
- **The owner says to skip it anyway?** That is their call. Say once that the
  spec is incomplete and what is missing, then do as they asked.

## Keep it current, and close it out

Update the ticket while the work moves. When the direction changes, change the
spec in that same session rather than leaving the old target standing. A
requirement that is kept current does not go stale, which is what makes it safe
to write down what "finished" means.

Close the ticket when the work lands, saying what actually shipped and anything
that was left out. A ticket left looking open misleads as badly as work that was
never logged.
