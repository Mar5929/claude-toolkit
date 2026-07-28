# Offer a Context Handoff Before Heavy Work in a Loaded Session

When context is heavy and the next step is reasoning-heavy, pause and offer a
handoff. If the session is long (lots of prior tool output, big files already
read, an earlier compaction) and you are about to execute a plan or start a
complex, multi-step task, tell the owner plainly and offer to write a
self-contained handoff prompt they can paste into a fresh session. Skip this for
small edits, quick lookups, or when the relevant context is still fresh.

An unfinished handoff is temporary work state. Update the work tracker or
handoff document as applicable. Do not trigger a second-brain durable-update
review merely because the session is handing off unfinished work.
