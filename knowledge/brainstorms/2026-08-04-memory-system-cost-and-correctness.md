# Memory system cost and correctness (issue 144): Brainstorm / Discovery Notes

Date: 2026-08-04
Goal: Work out why saving to memory takes ten minutes and always ends in
correcting things, and settle what to build instead. Refinement session for
GitHub issue #144.

The agreed requirements are in the body of issue #144. The decisions and what
was rejected are in its refinement comment. This file is the account of how the
session got there, including the two diagnoses that turned out to be wrong.

## Where the session started

Mike had just watched this repository run its own memory system for the first
time, under issue #138. Two documents took over ten minutes and about 150,000
tokens across three passes. His words: "this is just a very brutal and not
elegant memory system", and "there has to be a better way to do this."

## Diagnosis 1, wrong: it costs too many tokens

The first pass measured the cost and proposed five ways to cut it: the main
agent writes ordinary saves, split the long rule, generate the indexes, run the
pre-merge review only when another branch touched memory, and reconsider the
seven folders.

Mike's response killed it: "a few minutes is fine, but the problem is there
seems to be a lot of correcting and back and forth and it ends up just being in
like a loop." He also said the design itself sounded right to him: the main
agent works out what to save, the memory agent works out where it goes and how
to organise it.

So the wait was never the complaint. The rework was.

He also pushed back on two of the five directly. On cutting the indexes: "I feel
like we need an index right? or some map? we can't just cut it right?" On the
pre-merge review: "why wouldn't today just identify that nothing is saving it
and move on? what's the design flaw from today's session?"

The honest answer to the second one was that there was no design flaw. The main
agent's own instructions to that review told it to compare everything against
everything and to judge a test written minutes earlier. Seven minutes of work
came from a badly written prompt, not from the system. That suggestion was
withdrawn.

## Diagnosis 2, incomplete: facts are written from recollection with no source

The second pass traced today's four review findings back to their origin. Three
came from the main agent asserting things it had not checked, in a 1,500 word
briefing handed to the librarian. The librarian wrote them down faithfully.

Karpathy's LLM Wiki design was read at Mike's request, to see what other people
do. Two things from it landed:

- Its architecture has raw sources that never change, and a wiki compiled from
  them. Ours has only the wiki. The librarian compiles from a conversation
  nobody can go back and check.
- One of its builders wrote: "The filter sits at ingest. Most post-processing
  machinery becomes a solution to problems the schema should have prevented."
  That is exactly a review at the end catching what should never have been
  written.
- On Mike's index worry, the answer was clear: every version of that design
  keeps an index. Nobody cuts it. What they do differently is build it from the
  pages rather than typing it.

## What broke diagnosis 2

Mike produced a field report from a DragonFly session, written by that session,
covering four librarian invocations in ninety minutes. It is saved alongside
this file.

The decisive fact in it: the librarian wrote "nine months after the manifest was
written" into a committed memory document when the real gap was four days, and
**it had been given both dates in its instructions**. The right facts were in
front of it. A source layer would not have saved that.

The report also showed three failures that have nothing to do with memory at
all: the librarian cannot hand its report back to the caller, going idle is not
the same as having finished (which caused a file to be committed mid-write), and
two librarians ran in one folder with the rule silent about it.

And it raised a question nobody had settled: what is the librarian actually for?
The caller supplied the tables, the numbers, the source line and the citations.
The librarian supplied placement and prose. The plugin's description reads as
though the librarian decides what the document says.

## Diagnosis 3, the one that held: correctness is unowned

The main agent assumes the librarian is checking, because it is the specialist.
The librarian assumes it was handed the truth, because it was told to write what
it was given. Neither checks. The only thing that checks is the review at the
end, so every mistake becomes rework.

That explains all three sets of evidence at once: wrong facts supplied and
written, right facts supplied and written wrong, and duplication created with
the rule banning it loaded in the agent that created it.

## Mike's two proposals, and the push back on them

He proposed two flows. Both kept the main agent responsible for content, both
added a verifying agent, and both had the owner see the real changes rather than
a table describing them. The difference was whether the librarian stays and
organises at the end, or becomes the verifier while the main agent saves.

Two things were pushed back on:

**Checking after approval is backwards.** In his first flow the owner approves
and then the verifier checks. That moves the back and forth one step later
rather than removing it. The owner is the one person who cannot tell whether
"nine months" should say "four days", so nothing unchecked should reach him.

**Keeping the librarian to organise means doing the work twice.** If the main
agent has already drafted the words and the owner has approved those exact
words, the librarian may not rewrite them. What is left is placement and index
maintenance, which is mechanical.

The strongest objection to dropping the librarian was examined and does not
hold. The rule forbids the main agent writing memory *silently*. What made a
write safe was the owner's approval, never the second agent.

## The worked example that produced requirement 15

Mike asked how a real requirement would flow through. He described Anchor, his
iOS fitness app: every workout logged must store each exercise and the exact
reps, sets, time or dose actually done, kept separate from plans, so that six
months later the coach can compare what was done against what was planned and
build a new program from it.

Walking it through showed most of it was a specification, not memory, and that
getting that wrong would quietly stop it being enforced. It produced two
capability specifications and one business term (the meaning of "dose"), and the
check would have flagged two lines the agent had added that Mike never said:
generalising "six months" to "a period the owner chooses", and the definition of
"dose" itself.

That example is what put requirement 15 in the spec.

## Open questions the session did not settle

- Whether issue #141 closes as part of this or stays separate. Left for the
  build.
- What the smallest path looks like for a save that is only one added index
  line. Requirement 18 says it scales; how is implementation.
- Whether the shape check is a script in each project or something the toolkit
  ships once. Not discussed.

## What Mike cut

- Measuring the new cost against the old numbers. He does not want it as a
  requirement.

## What Mike added

- The rename from `memory-librarian` to `memory-verifier`, with everything that
  points at the old name updated. 44 files today.
