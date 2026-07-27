---
name: work
description: Manage a repository's Git-native work tracker and its optional GitHub Issues and Projects mirror. Use for requests such as "add this to the backlog", "what should I work on next?", "start WI-014", "update the handoff", "what is blocking this?", "relate these tickets", "is this in main?", "mark this finished", "reconcile the tracker with Git", or "create/link a GitHub Project". Also use at the start or end of substantial repository work when a tracked item should be read or updated.
---

# Work Tracker

Use the dependency-free Node.js command at `scripts/work.mjs`, resolved relative
to this `SKILL.md`. Run it from any directory inside the target Git repository.
Use `--json` when structured output will help the agent reason or chain actions.

Git repository files are authoritative. A connected GitHub Project mirrors
them; it does not silently replace local status.

## Orient before changing work

1. Run `node <skill-root>/scripts/work.mjs status --json`.
2. If the tracker is not initialized, offer `init`. Confirm the location when
   both `work-items/` and `engagement/work-items/` could be appropriate.
3. Read the selected item's `SPEC.md`, `STATUS.md`, and `ITEM.json` before
   implementing it.
4. Use the commands below instead of manually moving folders or editing
   structured fields.

## Route natural requests

| Request | Command |
|---|---|
| Add this to the backlog | `add` |
| What is active or blocked? | `status` |
| What should I work on next? | `next` |
| Start this item | `start` |
| Change status, next step, branch, or blockers | `update` |
| Relate or unrelate tickets | `link` |
| Is this work in the default branch? | `landed` |
| Record branch completion or verified landing | `finish` |
| Compare tickets with Git | `reconcile` |
| Check tracker integrity for CI | `validate` |
| Rebuild the dashboard | `dashboard` |
| Create, link, sync, or inspect GitHub Projects | `github` |

Run `node <skill-root>/scripts/work.mjs help` for exact flags. Read
`references/command-reference.md` when constructing a less common command.

## Apply status rules

Use exactly these statuses:

- `Backlog`: captured but not ready.
- `Ready`: actionable, with dependencies satisfied.
- `In Progress`: actively being implemented.
- `In Review`: branch work appears complete but still needs review or landing.
- `Done`: Git evidence proves the completion commit is in the configured
  default branch.
- `Cancelled`: intentionally stopped or declined.

Never set `Done` through `update`. Use `finish`; it verifies Git ancestry. If
the commit is not in the default branch, `finish` records the branch completion
and keeps the item `In Review`.

Use `bug`, `enhancement`, or `task` as the work-item type. Use `urgent`, `high`,
`medium`, or `low` as priority.

## Preserve the handoff

Keep `next_step` exact and executable. Record why an item is blocked, not just
that it is blocked. Use `update --note` for a dated handoff entry.

Tracker commands preserve the user-notes section of `STATUS.md`. The full
machine-readable history lives in `HISTORY.ndjson`; `STATUS.md` shows only the
latest entries so it remains useful to a cold session.

## Manage relationships

Use `depends_on`, `blocks`, `related_to`, `parent`, or `supersedes`.
The tool validates target IDs, writes the appropriate inverse relationship,
and rejects dependency cycles. Use `link --remove` to remove both sides.

## Use GitHub Projects only when configured

Read `references/github-projects.md` before creating or linking a Project.
Creating a Project configures these Status options:

`Backlog`, `Ready`, `In Progress`, `In Review`, `Done`, `Cancelled`.

It also ensures the repository labels `bug`, `enhancement`, and `task` exist.
The adapter uses the user's existing `gh` authentication and stores no token.

For an existing Project, do not replace Status options unless the owner
explicitly approves `--configure-status`. Synchronization updates issues and
Project fields from Git. If GitHub differs, `github reconcile` reports the
drift and recommends an explicit repair.

## Close substantial work

1. Update the item's exact next step or run `finish`.
2. Run `validate`.
3. Run `reconcile`, adding `--github` when connected.
4. Commit the tracker record with the related implementation.

Do not claim success when validation, Git ancestry, or GitHub verification was
not available. Report the limitation and the supported next command.
