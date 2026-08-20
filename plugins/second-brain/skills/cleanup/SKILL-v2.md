---
name: cleanup
description: >-
  Turn a memory review worklist into approved repairs. Run a focused review
  after every approved save, and a deep review when the owner asks, after a
  migration, or when the backlog gets long. Use when the owner asks to clean up,
  tidy, or review project knowledge, when a save reports a problem, or after a
  migration. Present five bullets per item, wait for the owner, and apply every
  fix through the normal lifecycle operations. Age alone never deletes anything.
---

# cleanup

This skill is the repair workflow of memory system v2. It reads a worklist from
`memory.mjs review` and turns each item the owner keeps into one approved
lifecycle or pin operation.

The design authority behind it is the toolkit repository's
`knowledge/specs/memory-system.md`, review architecture section 17. That spec
stays in the toolkit and is not installed into projects. Work item P4-6 replaces
that file's content with the approved v2 behavior at cutover, and the path does
not change.

Four things hold for every run here, and none is negotiable:

1. **Review writes nothing.** `memory.mjs review` reads canonical Markdown,
   judges it, and returns a worklist. It has no write capability, it cannot call
   the write coordinator, and it leaves no worklist file, no `.memory/` state,
   and no note behind. If you want the worklist later, run it again.
2. **Cleanup has no write path of its own.** Every repair leaves through the
   same lifecycle and pin operations any other change uses, with the same
   two-phase approval. There is no bulk mode, no fix-all flag, and no
   non-interactive approval.
3. **Age alone never deletes or retires anything.** A passed review date asks
   for a recheck. Nothing is removed because it is old.
4. **Similar wording never merges two records.** MERGE is for identical meaning
   only. Two meanings that disagree stay separate and link to each other.

## Step 0: know what this project's memory can do

```text
node <plugin>/tools/memory.mjs capabilities
node <plugin>/tools/memory.mjs status
```

`capabilities` lists the operations this build carries and every degraded
feature with its reason. If review reports a category as skipped, say so plainly
rather than treating the silence as a pass. Never invent a command
`capabilities` did not list.

Every command below is `node <plugin>/tools/memory.mjs <operation>`, where
`<plugin>` is wherever the second-brain plugin is installed for this project.

## Step 1: choose the review scope

```text
node <plugin>/tools/memory.mjs review [--scope focused|deep] [--since <YYYY-MM-DD>]
```

| Scope | When it runs | What it covers |
| --- | --- | --- |
| `focused` (the default) | After every approved save, and after a concrete warning | Everything a save can break: duplicates, conflicts, provenance, review dates, links, supersession, retired phrases, generated views, pins, and anything review could not read |
| `deep` | Only when the owner asks, after a migration, or when the backlog is long | The focused set plus the whole-corpus categories: vocabulary, records that no longer look durable, and the gold set |

`--since <date>` narrows the record-level categories to records settled on or
after that date. Use it for the focused review after a save: it keeps the
worklist about what just changed while still covering the links, views, and pins
a save can break in a record it never touched.

Startup, a calendar schedule, and age never start a review.

## Step 2: read the worklist

The result is an array. Each item carries six fields:

| Field | What it holds |
| --- | --- |
| `category` | Which section 17 problem this is |
| `severity` | `high`, `medium`, or `low` |
| `record_ids` | The records the item is about |
| `paths` | The files the item is about |
| `what_is_wrong` | One plain sentence naming the problem |
| `suggested_operation` | The operation that would fix it |

The suggestion is a starting point, not a decision. Read the records before you
propose anything: open each one with `get`, and follow its evidence with
`sources`. An item you cannot verify is an item you do not propose.

## Step 3: what each category means, and what it does not

| Category | What it means | What it never means |
| --- | --- | --- |
| `duplicate-candidate` | Two active records of one type state nearly the same meaning | That they are duplicates. Only the owner settles that, and only identical meaning may MERGE |
| `evidence-consolidation` | One meaning is held by two records resting on different sources | That one source is discarded. Every evidence entry moves onto the surviving record |
| `current-conflict` | Two linked conflicting records are both active | That one is wrong. Both may have been true over different periods, which is SUPERSEDE, not DELETE |
| `unlinked-conflict` | A conflict is visible from one side only | That the conflict is new. The missing half of the link is the repair |
| `provenance` | A record cites nothing, cites a source that is not there, or does not say who approved it | That the meaning is wrong. Usually the evidence needs finding, not the record removing |
| `stale-review-date` | The record asked to be rechecked and the date has passed | That it is stale. Recheck it against current reality, then CONFIRM or CORRECT |
| `broken-link` | A record names an id nothing carries, or links to a file that is not there | That the target never existed. Check for a move before you rewrite anything |
| `supersession-gap` | Statuses and dates disagree about which record is current | That the older record goes away. Superseded records stay for history and timelines |
| `retired-phrase` | A phrase a retired record ended still reads as current truth somewhere | That the line is deleted. Correct it, quote it as history, or exempt it with a reason |
| `stale-view` | A generated view does not match what its inputs produce | That the view is edited by hand. It is rebuilt |
| `pin-error` | A pin no longer renders, or the pin set is pushing the startup budget | That the record is wrong. Only startup visibility changes |
| `search-capability` | Review could not read a file, or had to drop one as out of scope | That the content is gone. Say what was not covered |
| `vocabulary` | Domain or topic values are single-use, overlapping, or too many | Permission to prune them. It is a reason to review them with the owner |
| `durable-information` | A record states live work state, or rests only on a conversation | That it is deleted. Live work state moves to wherever the work item is tracked, and the record is retired with a reason |

## Step 4: propose one item at a time

Work the list in the order it comes back: highest severity first inside each
category. For each item the owner should decide on, show one group and nothing
else:

```text
1. <plain name of the repair>
   - What: <the exact meaning or operation>
   - Where: <the canonical destination>
   - Why: <the repeated explanation or wrong action this prevents>
   - Assumptions: <every assumption, or None>
   - Unverified: <every unchecked claim, or None>
```

Offer four actions: keep, change, edit, or skip. Silence, an unclear reply, a
request to see the full text, a helper agent, a hook, and a background process
are not approval. Do not batch several items into one group, and do not ask for
blanket approval of a category.

Show a worklist summary first when it is long: the count per category and the
highest severity in each. That is orientation, not approval.

## Step 5: apply through the normal operations

Every repair is the ordinary two-call write:

```text
node <plugin>/tools/memory.mjs <operation> ... --propose
node <plugin>/tools/memory.mjs <operation> --apply --proposal <id> --content-hash <hash>
```

| Item | Operation |
| --- | --- |
| A meaning that was wrong | `correct --id <id> --file <staged> --reason "<text>"` |
| A meaning that was true earlier | `supersede --old-id <id> --file <successor> --why "<text>"` |
| A meaning that ended with no successor | `retire --id <id> --reason "<text>" --phrase "<exact phrase>"` |
| Two records with identical meaning | `merge --ids <id>,<id> --survivor <id> --pin <choice>` |
| A meaning that is unchanged and now has more evidence | `confirm --id <id> --evidence <locator>` |
| An accidental, corrupt, or privacy record | `delete --id <id> --reason "<text>"` |
| Startup visibility only | `pin --id <id>` or `unpin --id <id>` |
| A record that should live somewhere else | `move --id <id> --to <path>` |
| A stale generated view | `rebuild-views` |

Read the exact flags each operation takes from `remember`'s draft or from the
plugin `README.md`. Never write into `knowledge/memory/`, `knowledge/specs/`, or
`knowledge/current.md` with `Edit`, `Write`, or a shell command: a deterministic
guard refuses it and names the operation you should have used.

## Step 6: review again, and report

Run the focused review once more after the last approved repair. A repair can
create a new item: a supersession changes two records, a merge drops a pin, a
correction can break a link. Report in plain words:

- how many items the review found, by category;
- which ones the owner approved and what changed, by path;
- which ones the owner skipped, so they are not raised again this session; and
- which categories the build reported as skipped, and why.

If nothing needed repairing, say so in one line. An empty worklist is a normal
answer.

## When this runs

- After every approved save, focused, narrowed with `--since`.
- When `project-sync` or a save reports a concrete warning, focused and limited
  to what the warning named.
- After a migration, deep.
- When the owner asks, at whichever scope they ask for.
- When the backlog of open worklist items has grown enough that the owner set a
  threshold and it has been crossed.

Never on startup, never on a schedule, and never because a record is old.

## Edge cases

- **The worklist is empty.** Say so and stop. Do not go looking for work the
  review did not find.
- **An item names a file that is not there.** Check for a move first. A repair
  that recreates a moved record makes two records out of one.
- **A category is reported as skipped.** Say which one and why. A skipped
  category is not a pass.
- **An item points at a record inside a declared subroot.** That record belongs
  to another project. Say so and leave it alone.
- **The owner approves a repair and the apply call refuses.** A refusal with
  `approval/stale-proposal` or `approval/source-changed` means the files moved
  after the review. Show a fresh proposal rather than retrying.
- **Two items name the same record.** Propose them together as one operation
  where one write fixes both, and say that is what you are doing.
- **The owner wants everything fixed at once.** Say plainly that each meaning
  needs its own approval, then work the list one item at a time.
