# docs/PRDs: requirements for a whole product or feature area

PRD is short for product requirements document.

A PRD holds the requirements for something **bigger than one ticket**. Tickets
are created from it, and built from it.

One file per product or feature area.

## What goes in one file

- The goal.
- Why it matters.
- What the people using it need.
- What has to be true for the whole area to count as finished.
- Links to the work items created from it.

## How long a file lives

A PRD lives as long as the feature area does. It is **not** deleted when a
ticket closes. It sits beside the tickets it produced, because the two belong
together.

## What this folder is not

- **Not one ticket's requirements.** Those stay in the issue body, or in the
  work item. That has not changed.
- **Not the build plan.** That is `docs/designs/`.
- **Not how the finished system behaves.** That is `knowledge/prds/`. Both
  folders say PRD. This one holds what should be built for a feature area. That
  one holds how the system already behaves once it is settled.
