# work-tracker plugin

A production-ready Git-native work tracker shared by Claude and Codex. It gives
every session one reliable answer to what exists, what is active or blocked,
what comes next, where the work lives, and whether a claimed completion is
actually in the default branch.

**Setup: sets up a project.** Install once per machine, then each project opts
in and gets its own work-item folders and generated views.

## Install

```text
/plugin install work-tracker
```

Then use:

```text
/work
```

Natural requests such as "add this to the backlog," "start WI-014," "what
should I work on next?", and "reconcile the tracker with Git" trigger the same
skill.

## What it installs

- **work**: agent instructions used by both Claude and Codex.
- **`work.mjs`**: one dependency-free Node.js implementation for every command,
  built on three modules in `scripts/lib/`: `tracker.mjs` (reads and writes the
  work-item records), `github.mjs` (the optional issues and Project mirror), and
  `common.mjs` (shared file, Git, and formatting helpers).
- **Validation and reconciliation**: deterministic checks suitable for CI.
- **Optional GitHub adapter**: creates or links a GitHub Project and mirrors
  local work into repository issues.

No database, model, cloud service, or external tracker is required for the core.

Its reference documents are `references/command-reference.md` (every command and
flag), `references/record-format.md` (the exact shape of `ITEM.json` and the
other per-item files), and `references/github-projects.md` (the mirror).

## Where tickets live

Most projects use `work-items/`; Salesforce engagement projects may use
`engagement/work-items/`.

Each ticket folder contains:

- `ITEM.json`: structured status, priority, type, relationships, blockers, Git
  evidence, and optional GitHub identifiers.
- `SPEC.md`: the user-authored purpose, requirements, and decisions.
- `STATUS.md`: the readable current handoff and recent dated history.
- `HISTORY.ndjson`: the complete dated history.

The existing four stage folders remain:

- `01-backlog/`: Backlog and Ready.
- `02-in-progress/`: In Progress and In Review.
- `03-completed/`: Done.
- `04-archived/`: Cancelled and archived completed items.

`DASHBOARD.md` and `01-backlog/BACKLOG.md` are generated views. They can be
deleted and rebuilt without losing ticket truth.

## Commands

```text
work init
work add
work status
work next
work start
work update
work link
work finish
work landed
work reconcile
work validate
work dashboard
work github ...
```

Every command supports readable output. Agent workflows use `--json`.
Validation and command failures return nonzero exit codes.

## How completion is proven

`finish` records the completion commit and asks Git whether that commit is an
ancestor of the configured default branch. If yes, the item becomes Done and
records the landed commit and date. If not, it becomes In Review.

An agent statement, branch name, closed issue, or pull-request number alone
cannot mark a ticket Done. `validate` rejects false completion evidence.

## Relationships and next-item selection

Relationships include `depends_on`, `blocks`, `related_to`, `parent`, and
`supersedes`. The tool validates IDs, keeps inverse links consistent, and
rejects dependency cycles.

`next` ranks deterministically. It continues actionable active work first, then
considers Ready and Backlog items by priority, dependency readiness, blockers,
creation date, and ID. It explains the recommendation and uses no model.

## Existing manual folders

`init` adopts the toolkit's prior `work-items/` convention. It identifies
existing `WI-<number>-<slug>` folders, infers only safe metadata from their
location, and marks it for review. It never overwrites `SPEC.md`, `STATUS.md`,
or other notes.

## Optional GitHub Project

The adapter can create a Project or link an existing one. It configures:

- statuses: Backlog, Ready, In Progress, In Review, Done, Cancelled;
- repository labels: bug, enhancement, task; and
- one issue and Project item per local work item.

It uses the existing `gh` authentication and stores no credentials. Git remains
authoritative. GitHub edits are reported as drift until the owner explicitly
chooses how to resolve them.

## How it relates to the toolkit

- `project-init` offers work-tracker during scaffolding instead of creating a
  second manual tracking system.
- `project-sync` detects the existing four-stage convention and offers safe
  adoption.
- The `work-item-folders.md` rule tells agents to use this tracker when it is
  installed.
- second-brain may link files under `knowledge/specs/` and `knowledge/memory/`
  to work-item folders, but
  work-tracker owns task status and handoff state.

## Verification

Run:

```text
node --test plugins/work-tracker/tests/work-tracker.test.mjs
node plugins/work-tracker/skills/work/scripts/work.mjs validate --cwd PROJECT
claude plugin validate .
```

The test suite uses temporary Git repositories and a fake GitHub CLI
(`tests/fixtures/mock-gh.mjs`). It never changes a live Project or issue. The toolkit's bundled Codex plugin validator
also checks the Codex manifest during release validation.

## Maintaining this plugin

A content change bumps both plugin manifests and the marketplace version. Keep
this README, the top-level README, project-init and project-sync, the work-item
rule, and `docs/toolkit-map.md` current in the same change.
