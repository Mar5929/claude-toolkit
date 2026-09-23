# docs: the catalog and the build plans

Two things live here, and they do two different jobs.

- **`toolkit-map.md`** is the catalog across every plugin: what each piece is,
  how the pieces relate, and the straight answer on what looks redundant but is
  not. It is the only place that answers "is anything here duplicated?" A
  plugin's own `README.md` describes that plugin and cannot see the others.
- **`designs/`** holds the build plan for one work item, written once that
  item's requirements are approved. Designs are kept after delivery (decision
  D21). The rules are below.

Requirements do not live here. They live in `knowledge/prds/`, because
requirements and settled behavior are the same document at two points in time,
told apart by its `status` line.

## Working in here

### The map

- **Update the map in the same change that adds, renames, or removes a plugin
  or a skill**, alongside that plugin's `README.md` and the top-level
  `README.md`. A map that lags is worse than no map, because a session trusts
  it.
- **The map names things, it does not restate them.** Where a canonical index
  already exists (the general rules index, the output styles index, the
  Salesforce rules index), the map links to it rather than listing its contents
  again.
- **`orphan-check.mjs` treats this file as an index document**, so a shipped
  file named only here still counts as findable. That makes an out-of-date map
  able to hide a real gap. Check the map is right before relying on it.

### `designs/`

This folder is for a project whose work items live outside the repository, on a
GitHub issue board, in Linear, in Jira, or in anything else. A project that
tracks work in the Git-ignored `.work-items/` folder keeps each design with its
own item instead.

- **One file per work item**, named `<issue number>-<short-slug>.md`.
- **Create it at stage `04-solution-design`**, or during earlier review when
  explicitly authorized. Keep one authoritative design updated as review proceeds.
- **Before designing or reviewing a toolkit solution**, read and apply the
  [owner's handshake principle](../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md#design-principle-guide-the-agent-through-handshakes).
  Read the active item's review plan before resuming, and keep its accepted
  decisions and review position.
- **What one file holds:**
  - how each approved requirement will be met;
  - the files the change touches;
  - how it will be tested;
  - the order the work is done in;
  - the preparation needed to understand the design;
  - bottom Notes with relevant decisions and their approval state, open
    questions, remaining document tasks, and the exact resume point.
  Update the design as answers settle. The work item links here and keeps other
  work. Do not create a separate prep or interview record.
- **Publish authorized documentation-only changes directly to main:** check,
  commit, and push promptly. Code and configuration keep their implementation
  workflow. See Toolkit Operating System R25 for the publication policy.
- **Keep the design after delivery** (decision D21). Where still-useful
  reasoning lives is agreed with the owner before any design is deleted.

## Where the detail lives

- `../README.md`: what the toolkit is and how to install it.
- Each plugin's `README.md` under `../plugins/`: that plugin's own description.
- `../tests/AGENTS.md`: what each check asks.
