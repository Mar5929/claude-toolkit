# Optional GitHub Issues and Projects adapter

## Authority

Git repository files remain authoritative by default. GitHub issues and Project
fields are a visible collaboration mirror. An agent changes local records
first, then runs `work github sync`.

The adapter does not store credentials. It uses the existing GitHub CLI login.
The token needs the `project` scope.

## Create or link

Create and link a new Project:

```text
work github connect --create --owner OWNER --repo OWNER/REPOSITORY \
  --title "Repository work"
```

Link an existing Project:

```text
work github connect --project-number 12 --owner OWNER \
  --repo OWNER/REPOSITORY
```

The adapter links the Project to the repository, verifies its Status field, and
ensures the issue labels `bug`, `enhancement`, and `task` exist.

For a new Project, the Status field is configured automatically. For an
existing Project whose options differ, the command stops. Re-run with
`--configure-status` only after the owner approves replacing those options.

## Statuses

- Backlog
- Ready
- In Progress
- In Review
- Done
- Cancelled

GitHub's built-in close workflows can also set Done when an issue closes. Git
still wins when the two disagree. `work github reconcile` reports the
difference instead of importing it silently.

## Synchronization behavior

`work github sync`:

1. creates or updates one repository issue per work item;
2. applies exactly one tracker type label;
3. adds the issue to the configured Project;
4. sets the requested Status option;
5. closes Done issues as completed;
6. closes Cancelled issues as not planned;
7. reopens issues when local work becomes active again; and
8. records the issue and Project item identifiers in `ITEM.json`.

Issue bodies point back to the repository item and repeat only a short generated
handoff. They state that the Git record is authoritative.

## Reconciliation

`work github reconcile` reports:

- local items without issues;
- issues missing from the Project;
- mismatched Project status;
- mismatched tracker type labels; and
- the exact synchronization command that repairs each finding.

It does not import ambiguous GitHub edits or silently change local tickets.
