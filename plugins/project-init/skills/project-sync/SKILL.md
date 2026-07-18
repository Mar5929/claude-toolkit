---
name: project-sync
description: >-
  Audit an EXISTING project against the claude-toolkit and set up whatever is
  missing. Use when the user points a project at the toolkit and says things
  like "make sure all the tools, rules, and systems from my toolkit are set up
  in this project", "sync this project with claude-toolkit", "audit this
  project against the toolkit", or "/project-sync". This skill inventories
  everything the toolkit currently ships (CLAUDE.md boilerplate rules, hooks,
  memory system, knowledge layer, and any newer systems), cross-references the
  current project, reports the gaps, and closes each gap only with the user's
  approval.
---

# project-sync: bring an existing project up to the toolkit

`project-init` lays foundations in a NEW project. This skill is its sibling for
EXISTING projects: figure out what the toolkit provides, check the current
project against it, report the gaps, then close the gaps the user approves.

Run the steps in order. Never change anything before step 4.

## Step 1: inventory the toolkit

Build the list of things the toolkit currently provides. Do not hard-code
today's list; read the toolkit itself so new systems are picked up
automatically as it grows.

- Locate the toolkit files, in order of preference:
  1. They ship with this plugin. From this skill's directory, the sibling
     skill's `../project-init/references/` holds `claude-md-boilerplate.md`
     and `setup-flow.md`, and the plugin root holds `.claude-plugin/plugin.json`.
  2. A local clone of the toolkit repo, if the user has one.
  3. Fetch the repo (`Mar5929/claude-toolkit`), or ask the user where it lives.
- Enumerate, at minimum:
  - every standard CLAUDE.md boilerplate rule, noting which are default ON
    and which are conditional
  - the per-server MCP tool rules in `claude-md-boilerplate.md`'s "MCP tool
    rules" section and `references/mcp-best-practices.md`; these are conditional,
    so only audit the servers this project actually connects
  - each system from the setup gates: hooks, memory system, knowledge layer
  - anything newer listed in the toolkit README under "What's here now"
  - skip roadmap items; they aren't built yet and can't be audited
- Note the toolkit version (from `plugin.json` or `marketplace.json`) for the
  sync record in step 5.

## Step 2: audit the current project

For each inventory item, look for evidence in the project. Judge by intent, not
exact wording: a CLAUDE.md that says "never commit secrets" satisfies the
secrets rule even if the prose differs. Typical checks:

- **CLAUDE.md**: does it exist, and does it carry the intent of each default-ON
  boilerplate rule?
- **Hooks**: are guard and orientation hooks configured (the project's
  `.claude/` settings and hook scripts)?
- **Memory system** (the `second-brain` MCP architecture): is there a committed
  `.mcp.json` with a `second-brain` server pointing at `<origin>/mcp/<id>`; does
  `.claude/settings.json` carry `BRAIN_BACKEND=mcp`, `BRAIN_PROJECT`, and the
  `Stop` hook running `brain-mcp-capture.mjs`; is the `brain-curator` agent
  installed with its `## Project profile` filled in (no `<...>` placeholders left);
  and is the project registered on the server (its own database + a grant)? A
  local `brain/` or `memories/` directory with bash hooks is the OLD, retired
  design: flag it to migrate to the MCP skill.
- **Knowledge layer**: is the `knowledge-curator` agent installed (with its
  profile filled), and are there `know-*` nodes with `covers:` SHA pins on the
  sources they explain?
- **Previous sync record**: read it if present (step 5 format) so deliberate
  opt-outs are respected.

Classify every item: **present**, **partial**, **missing**, **declined** (the
owner previously opted out), or **not applicable** (say why).

## Step 3: report before touching anything

Show one table: item, status, and what specifically is missing or drifted. Make
no changes in this step. Let the user pick what to fix, and recommend an order
(default-ON rules first, then systems).

## Step 4: close the approved gaps, one at a time

Work the way project-init does: explain what the item is for, recommend how it
should look in THIS project, confirm, act, summarize. Ground rules:

- Opt-in per item. A "no" gets recorded, not argued with.
- Adapt to the project. Fold rules into the existing CLAUDE.md's voice and
  structure; don't paste toolkit text verbatim over a file that has its own
  style.
- Never weaken something the project already does better than the toolkit
  version. If the project's variant is an improvement, leave it and flag it
  for port-back instead (see wrap-up).
- For systems with their own installer skill in the toolkit (for example the
  `second-brain` memory architecture), follow that skill's own setup instructions
  (its `setup-recipe.md`) rather than improvising.

## Step 5: record the sync

Write a short sync record so future runs know where things stand. Default
location: a "Toolkit sync" section at the bottom of the project's CLAUDE.md
(or `.claude/toolkit-sync.md` if the user prefers). Record:

- the toolkit version synced against, and the date
- items set up or already present
- items the owner deliberately declined, so future syncs never re-nag about a
  considered "no"

## Wrap-up

1. **Summarize**: fixed, already present, declined, deferred.
2. **Note follow-ups** for anything deferred.
3. **Port-back reminder**: if the project had a better version of a toolkit
   item, or this sync surfaced an improvement, offer to draft a PR back to the
   `claude-toolkit` repo so every other project benefits.
