# Every Work Item Moves Through the Same Fourteen Stages

A work item carries one current stage. The stage is where the work stands right
now, written down, so a session picking the work up reads it instead of asking
the owner or rereading a conversation.

## The fourteen stages

| Stage | What it covers |
| --- | --- |
| `01-discovery` | Working out what the owner actually wants. |
| `02-refinement` | Turning that into requirements, one question at a time. |
| `03-requirements-approved` | The owner approved the requirements. Building may start. |
| `04-solution-design` | Deciding how it gets built. |
| `05-breakdown` | Splitting the work into smaller items when it is too big for one. |
| `06-implementation-plan` | The ordered steps for building it. |
| `07-tracking-setup` | Creating whatever the tracker needs to follow the build. |
| `08-build` | Writing the code or the documents. |
| `09-testing` | Checking it does what the requirements said. |
| `10-bug-fixing` | Fixing what testing found. |
| `11-user-approval` | The owner saw it and approved it. |
| `12-pr-and-push` | The change is on a branch, in a pull request, pushed. |
| `13-deployment` | It is live wherever it goes live. |
| `14-spec-update` | The project's specification is brought back in line with what was built. |

The two-digit prefix is part of the name, so the stages sort in order everywhere
they are listed.

Spec-update is its own stage on purpose. Build and testing change what was
agreed, and a step folded inside another step is the one that gets quietly
skipped.

## Skipping, and going backwards

`03-requirements-approved`, `11-user-approval`, and `12-pr-and-push` are never
skipped. Every other stage may be skipped when it does not apply.

A skipped stage goes in the progress log with the reason it was skipped.
Several stages skipped at once are one entry, not one each. Nobody walks the
list stage by stage: set the stage the work is actually at, and say in that one
line what was passed over and why. A small item honestly runs `03`, `08`, `11`,
`12` and logs four entries.

A work item may go back to an earlier stage. That goes in the log with its
reason too.

## The stage sets the status

The stage decides the tracker status, so the two can never disagree.

| Stage | Status |
| --- | --- |
| `01`, `02` | Backlog |
| `03` | Ready |
| `04` through `11` | In Progress |
| `12`, `13` | In Review |
| `14` | Done |

`Cancelled` is set by hand at any stage, and no stage produces it.

Reaching `14-spec-update` is not on its own proof that the work landed. Where a
tracker requires evidence that the change is in the default branch before it
will say Done, that requirement stands.

## The progress log

Every work item carries a progress log: short, plain-language entries, each one
dated and marked with the stage it happened in.

```text
2026-08-29 | 04 solution-design | Chose a rule file over the knowledge manual so there is one copy of the stage list.
2026-08-30 | 05 breakdown | Skipped. One file changes, no sub-items.
2026-08-31 | 09 testing | The owner rejected the label names. Wants two digits so they sort.
```

Write an entry when:

- a stage starts;
- a stage is skipped;
- a decision changes direction;
- the owner approves or rejects something;
- a blocker appears or clears;
- something is learned that changes the plan; or
- a piece of work the owner asked for is finished.

Write one outside that list when a future session would be lost without it.

Never write an entry that repeats what Git, the pull request, or the
requirements already say. These all stay out:

- "Ran the tests." Git says it.
- "Read the tracker code and its documents." Files opened is not an event.
- "Fixed a typo." Nothing a future session needs.
- "Considered seven stages and dropped it." A dropped idea, not a decision that
  stuck.

## Where the stage and the log are written

**A local folder tracker.** The `stage` field in the item's `ITEM.yaml`, and a
"Progress log" section in its `STATUS.md`. One command writes the stage, the
status, and the log line together, so none of the three can be done without the
others:

```text
work update WI-014 --stage 08 --note "Started the build."
```

**GitHub issues.** A label named for the stage, and one comment titled "Progress
log" that is edited in place. Never open a second comment.

```text
gh issue comment 42 --body "## Progress log"
gh issue edit 42 --remove-label 07-tracking-setup --add-label 08-build
gh api repos/OWNER/REPO/issues/42/comments --jq '.[] | select(.body | startswith("## Progress log")) | .id'
gh api --method PATCH repos/OWNER/REPO/issues/comments/COMMENT_ID -f body="$(cat log.md)"
```

The first command runs once, when the issue has no log comment yet. Set the
board's Status field to what the mapping above says, the same way the project
already sets it.

## Reaching the last stage

`14-spec-update` means running the project's `remember` review and bringing the
specification current, so the written behavior matches what was actually built.

## Nothing enforces any of this

No code checks that a stage name is real, refuses a move backwards, demands a
reason for a skip, or looks for a changed specification. A tracker stores the
stage, derives the status, and appends the log line. This file says what is
correct, and agents follow it the way they follow every other rule.

Work items that existed before this carry no stage until someone sets one. A
missing stage is normal and is never an error.
