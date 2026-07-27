---
name: project-sync
description: >-
  Audit an EXISTING project against the claude-toolkit and set up whatever is
  missing. Use when the user points a project at the toolkit and says things
  like "make sure all the tools, rules, and systems from my toolkit are set up
  in this project", "sync this project with claude-toolkit", "audit this
  project against the toolkit", or "/project-sync". This skill inventories
  everything the toolkit currently ships (the general and Salesforce rules
  libraries, hooks, second-brain v1 containment, standalone skills such as
  grill-me, and any newer systems), cross-references the current project,
  reports the gaps, and closes each gap only with the user's approval.
---

# project-sync: bring an existing project up to the toolkit

`project-init` lays foundations in a NEW project. This skill is its sibling for
EXISTING projects: figure out what the toolkit provides, check the current
project against it, report the gaps, then close the gaps the user approves.

Run the steps in order. Never change anything before step 4.

## Step 1: inventory the toolkit

**First, refresh the installed toolkit so this audit sees the latest.** This
skill reads the toolkit from the installed plugin copy (option 1 below), and
that copy does NOT update itself when the repo changes on GitHub. A merged
change sits on GitHub until each machine pulls it. So before inventorying,
update the local copy: inside a Claude Code session run
`/plugin marketplace update claude-toolkit`, or from a terminal run
`claude plugin marketplace update claude-toolkit`. Skip this only when you are
reading from a freshly-pulled local clone (option 2). A stale plugin copy
produces a stale audit, so the project silently misses the newest rules and
systems, which is the exact failure this step guards against.

Build the list of things the toolkit currently provides. Do not hard-code
today's list; read the toolkit itself so new systems are picked up
automatically as it grows.

- Locate the toolkit files, in order of preference:
  1. They ship with this plugin. From this skill's directory, the sibling
     skill's `../project-init/references/` holds `general-rules/` (with its
     `README.md` index), `salesforce-rules/`, `thin-claudemd.md`, and
     `setup-flow.md`, and the plugin root holds `.claude-plugin/plugin.json`.
  2. A local clone of the toolkit repo, if the user has one.
  3. Fetch the repo (`Mar5929/claude-toolkit`), or ask the user where it lives.
- Enumerate, at minimum:
  - every rule file in `general-rules/`, noting from its `README.md` which are
    default ON and which are conditional; Salesforce projects also get the
    `salesforce-rules/` files
  - the per-server MCP tool rules in `references/mcp-best-practices.md`; these
    are conditional, so only audit the servers this project actually connects
  - each system from the setup gates: hooks, memory system, knowledge layer
  - each standalone skill offered by the setup flow, including `grill-me`
  - anything newer listed in the toolkit README under "What's here now"
  - skip roadmap items; they aren't built yet and can't be audited. The Unit 00
    v1 containment controls are the exception: they are shipped safety work and
    must be audited even though v2 itself is still a roadmap item
- Note the toolkit version (from `plugin.json` or `marketplace.json`) for the
  sync record in step 5.

## Step 2: audit the current project

For each inventory item, look for evidence in the project. Judge by intent, not
exact wording: a CLAUDE.md that says "never commit secrets" satisfies the
secrets rule even if the prose differs. Typical checks:

- **CLAUDE.md and `.claude/rules/`**: does CLAUDE.md exist and point at
  `.claude/rules/`, and does that folder carry each default-ON general rule (a
  file, or the rule's intent folded into CLAUDE.md)? Judge by intent, not exact
  wording or file name.
- **CLAUDE.md health** (presence is not enough, see below).
- **Hooks**: are guard and orientation hooks configured (the project's
  `.claude/` settings and hook scripts)?
- **Second-brain status:** v1 is the Neon/MCP architecture and is legacy. V2 is
  specified but not shipped. If the project has no v1, mark memory and
  knowledge **deferred** and do not offer installation. If it has v1, identify
  its `.mcp.json`, settings, hooks, curator agents, outbox, and any local
  `brain/` or `memories/` cache as migration evidence. Do not delete or migrate
  any of it.
- **V1 containment:** for an existing v1 project, check the committed settings
  for `BRAIN_V1_WRITE_MODE=read-only`, `BRAIN_CAPTURE=0`,
  `BRAIN_CURATE_ON_END=0`, `BRAIN_RECALL=0`, and `BRAIN_KC_NUDGE=0`. Report
  missing values as a reversible containment gap. Do not read
  `.claude/settings.local.json` or expose tokens.
- **The memory is scoped to THIS project.** Connectors are attached per Claude
  account, not per repo, so another project's brain is visible in every session
  and a background job can hold only that one; a session then answers from the
  wrong codebase's memory, in detail, with nothing in the answer to catch it. Is
  `BRAIN_CONNECTOR` set in `.claude/settings.json` to this project's connector
  name, and is `brain-scope-guard.mjs` wired as a `PreToolUse` hook on `mcp__.*`?
  Without the var the guard can only ask, not deny.
- **The v1 server is contained:** do not send a real write. If the owner
  separately approves a harmless route check, `POST /fast/<id>/node` with no
  credentials must return HTTP 423 and the exact `v1_read_only` body before any
  database access. Reads should say `legacy/advisory`. A live deployment check
  is not part of an ordinary project sync unless the owner approves it.
- **Knowledge layer:** existing v1 curator files and `know-*` nodes are evidence,
  not a system to refresh. Preserve them and disable curator reminders.
- **Standalone toolkit skills:** check the previous sync record and the
  available host plugins. For `grill-me`, classify whether it is available to
  invoke, previously declined, or not applicable. Do not look for a copied
  `SKILL.md` inside the project because the canonical skill stays in its plugin.
- **Previous sync record**: read it if present (step 5 format) so deliberate
  opt-outs are respected.

Classify every item: **present**, **partial**, **missing**, **declined** (the
owner previously opted out), or **not applicable** (say why).

### CLAUDE.md health

A project can pass every check above and still have a CLAUDE.md nobody reads.
The file only ratchets: `keep-claudemd-current.md` tells every session to add to
it, and nothing tells a session to subtract. So audit its shape, not just its
presence. Read the file and report:

- **Size.** How many lines? The thin model (`thin-claudemd.md`) targets a file a
  session reads in full. Past roughly 250 lines, flag it and say which sections
  account for the bulk.
- **Duplication against `.claude/rules/`.** For each rule file in that folder,
  is the same rule also spelled out in CLAUDE.md? Restating it is worse than
  moving it, because the two copies drift and neither wins. List every rule that
  is said twice.
- **A codemap that became a changelog.** Codemap entries should be one line per
  folder or module plus any load-bearing invariant. Flag entries carrying dated
  history ("2026-07-17 changed X, decision #17"); that history belongs in git
  and the design doc.
- **Live state that belongs in the status doc.** Current phase, next action, and
  open TODOs drift the moment they are written here. Flag them for the status
  doc.
- **Stale content.** Anything the code, paths, or decisions have since
  contradicted.

Report this as findings with a recommended trim, not as a pass or fail, and
treat the trim as one more item the owner opts into at step 4. Two constraints
on any trim you propose:

- **Never drop the file's self-maintenance mandate.** The wording making
  CLAUDE.md a living document that sessions must keep current stays, verbatim.
  A trim that removes it guarantees the file goes stale next.
- **Check cross-references before renumbering.** Grep the repo for references to
  CLAUDE.md section or rule numbers. If a trim would renumber sections other
  files point at, say exactly which, and let the owner choose between
  renumbering with the fixes and keeping the numbering stable.

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
- Do not install second-brain v1 or claim v2 is available. For an existing v1
  project, the only change this sync may offer is the committed containment
  settings listed in step 2. Apply them only after approval and leave every
  legacy file and remote resource intact.

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
