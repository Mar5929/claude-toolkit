---
updated: 1970-01-01
---

# Current state

This file is the project's continuity. A new agent that cannot reach the prior
conversation reads it and knows where the work stands.

All four sections below are required. The write coordinator refuses an update
that drops any of them. The `updated` date in the front matter is the date
startup uses to decide whether this file is stale, so the coordinator sets it on
every write. Replace the placeholder date during setup.

Only `memory.mjs update-current` writes this file, and only on three triggers:
an explicit handoff, an approved change of current focus, and an approved
completed-work event that changes current state. Startup reads it and never
writes it. The owner may correct it by hand, and the system keeps maintaining it
afterwards.

Live status belongs in the work tracker when the project has one. This file does
not copy it.

## Current focus

Replace this with the one thing the project is working on right now.

## Blockers

Replace this with what is stopping progress, or write `None`.

## Next step

Replace this with the exact next action, specific enough to start without
asking a question.

## Handoff

Replace this with a short handoff that stands on its own: what was just done,
what was decided, what is in flight, and anything a fresh agent would otherwise
have to ask about.
