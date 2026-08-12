# Offer a Context Handoff Before Heavy Work in a Loaded Session

When context is heavy and the next step is reasoning-heavy, pause and offer a
handoff. If the session is long (lots of prior tool output, big files already
read, an earlier compaction) and you are about to execute a plan or start a
complex, multi-step task, tell the owner plainly and offer to write a
self-contained handoff prompt they can paste into a fresh session. Skip this for
small edits, quick lookups, or when the relevant context is still fresh.

**A handoff runs `remember` first when project knowledge is installed.** Before
writing the prompt, let that skill apply the save filters, show the owner the
exact proposed words, and wait when approval is required. Anything not saved
goes inside the handoff prompt instead, so the next session still has it. The
order matters: write the prompt first and the durable review gets skipped, because once
the prompt is on screen the session is over in the owner's head.

This is the one moment where the most context is about to be destroyed and
nothing else can catch it. The session-end event fires when the owner clears, but
it cannot stop the clear and cannot say anything to the agent. So the check has
to happen before, on purpose, which is what this rule is for.

The `handoff` plugin's `/handoff` command does all of this in order. Where it is
installed, use it. Where it is not, or when the owner asks in their own words
("I'm going to clear context", "write me something to paste into a new chat"),
run the same three steps yourself: the `remember` review, the owner's answer, then
the prompt.

Unfinished work state is not project knowledge. Live status, blockers, and next
actions belong in the work tracker and in the handoff prompt, never in a
knowledge document. What becomes project knowledge is what would have to be
worked out again from scratch: decisions and their reasons, understanding that
took effort to reach, and constraints that were discovered.
