Follow and adhere to @CLAUDE.md

## Log every piece of work on the GitHub board

All work for this repo is tracked on the `claude-toolkit-project` board on
GitHub, which is connected to this repository. Log the work item there as a
GitHub issue before you start building it. If the work is already underway and
no ticket exists, stop and write the ticket first.

Every ticket carries a written spec. A title alone is not a ticket. The spec
answers all of the following, in plain words:

- **The requirements.** What has to be true for this to count as finished.
- **The goal.** What this work is meant to achieve.
- **The reason.** Why we are doing it, and what problem or gap it closes. If it
  came out of something that went wrong, say what went wrong.
- **What the person using it experiences.** What they notice, before and after.
- **How it behaves from the outside.** The end-user's view of how it works, step
  by step. What they do, what happens back. Not the internals.
- **Edge cases.** The odd or unhappy situations this has to handle, and exactly
  what should happen in each one. Name the behavior, do not just name the case.

You cannot start developing a ticket until the ticket has completed a "grill-me" session where the user and the AI agent (claude or codex) fully align on all the specifications listed above. During the grill-me session all the specs will be defined and written to the github ticket. When the grill-me session starts you must ensure the work item status is "Refining". When the grill-me session is completed, the "grill-me-completed" label will be applied and the work item status will be set to "Ready".

Keep the ticket current while the work moves, and close it when the work lands,
saying what actually shipped and anything that was left out.
