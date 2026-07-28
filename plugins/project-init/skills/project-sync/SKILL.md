---
name: project-sync
description: >-
  Audit an EXISTING project against the claude-toolkit and set up whatever is
  missing. Use when the user points a project at the toolkit and says things
  like "make sure all the tools, rules, and systems from my toolkit are set up
  in this project", "sync this project with claude-toolkit", "audit this
  project against the toolkit", or "/project-sync". This skill inventories
  everything the toolkit currently ships (the general and Salesforce rules
  libraries, hooks, the Git-native work-tracker, second-brain v1 retirement,
  standalone skills such as grill-me, and any newer systems), cross-references
  the current project,
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
  - the `work-tracker` plugin and any existing `work-items/` or
    `engagement/work-items/` tree
  - each standalone skill offered by the setup flow, including `grill-me`
  - anything newer listed in the toolkit README under "What's here now"
  - skip roadmap items; they aren't built yet and can't be audited. The Unit 00
    v1 retirement behavior is the exception: existing v1 integration must be
    reported even though v3 itself is still a roadmap item
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
- **Second-brain status:** v1 is the retired Neon/MCP architecture. V3 is
  specified but not shipped, and v2 is superseded. If the project has no v1,
  mark memory and
  knowledge **deferred** and do not offer installation. If it has v1, identify
  only the local integration surface: `.mcp.json`, `.claude/settings.json`,
  `.codex/config.toml`, hook registrations and wrappers, curator agents, v1
  rules, outbox scaffolding, and any local `brain/` or `memories/` path. Do not
  call the Worker, read Neon, open local token files, or inspect legacy memory
  content.
- **V1 activity:** report whether automatic digest, recall, capture,
  session-end curation, curator reminders, or MCP connections are still wired
  for Claude or Codex. A flag in `.claude/settings.json` is not enough when a
  Codex wrapper supplies its own environment, so trace each committed hook
  entry to the command it runs.
- **Retirement choices:** recommend reversible local deactivation first:
  disable every automatic v1 hook and remove the v1 MCP connection from
  committed Claude and Codex configuration. Also offer removal of specifically
  listed committed v1 files after separate approval. Never bundle deletion of a
  non-empty outbox, cache, ignored file, token, connector, database, or cloud
  resource into ordinary project sync.
- **Knowledge layer:** existing v1 curator files, `know-*` nodes, SHA pins, and
  drift reports are retired. Do not refresh, reconcile, import, or use them as
  current truth.
- **Standalone toolkit skills:** check the previous sync record and the
  available host plugins. For `grill-me`, classify whether it is available to
  invoke, previously declined, or not applicable. Do not look for a copied
  `SKILL.md` inside the project because the canonical skill stays in its plugin.
- **Work tracker:** detect `work-items/` and `engagement/work-items/`. If
  `.work-tracker.json` and per-item `ITEM.json` records exist, run the tracker
  validator and classify the system as present or partial from its output. If
  only the older stage folders, `BACKLOG.md`, `SPEC.md`, and `STATUS.md` exist,
  classify them as safely adoptable, not as a competing tracker. If neither
  exists, classify work-tracker as missing or previously declined.
- **GitHub Project option:** inspect only the checked-in tracker configuration.
  Report whether GitHub mirroring is configured. Do not create, link, or modify
  a Project during the audit. Offer it separately in step 4 because it changes
  external issues, labels, fields, and Project items.
- **Previous sync record**: read it if present (step 5 format) so deliberate
  opt-outs are respected.

Classify every item: **present**, **partial**, **missing**, **retired** (a v1
integration that should be deactivated or removed), **declined** (the owner
previously opted out), or **not applicable** (say why).

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
(retired v1 deactivation first when present, then default-ON rules, then other
systems).

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
- Do not install second-brain v1 or claim v3 is available. For an existing v1
  project, offer the following only after reporting the exact local scope:
  1. **Deactivate:** remove v1 MCP entries and automatic hook registrations
     from committed Claude and Codex configuration. Preserve old scripts and
     agents temporarily.
  2. **Remove local integration:** delete only the committed v1 files and
     settings the owner explicitly approves.
  Neither option contacts the Worker or Neon, reads legacy memory, imports
  anything into v3, or deletes cloud infrastructure. Account-level connectors,
  local token cleanup, and cloud deletion are separate owner-approved work.
- For an approved work-tracker gap, install the plugin and run `work init` at
  the detected canonical path. This may add metadata and generated views, but
  it must not overwrite existing `SPEC.md`, `STATUS.md`, or notes. Show any
  adopted records that still need owner review.
- Treat GitHub Projects as a second approval. Local tracker installation does
  not imply permission to create issues or a Project. If approved, use
  `work github connect` and report the exact repository and Project before
  synchronizing tickets.

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
2. **Note follow-ups** for anything deferred, including separate connector,
   token, or cloud cleanup for a retired v1 integration.
3. **Port-back reminder**: if the project had a better version of a toolkit
   item, or this sync surfaced an improvement, offer to draft a PR back to the
   `claude-toolkit` repo so every other project benefits.
