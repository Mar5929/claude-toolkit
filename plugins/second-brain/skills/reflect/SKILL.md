---
name: reflect
description: >-
  Sweep the whole knowledge folder for duplicates, overlaps, contradictions,
  superseded decisions, and files whose value has expired, then propose what to
  do about each one. Use when the owner asks for a review or cleanup, after a
  migration, or when they run /reflect. Proposes only; it never rewrites meaning
  on its own.
---

# reflect

Memory that only ever grows becomes a pile nobody trusts. This is the sweep that
keeps it small and true.

It looks across the whole folder at once, which is what makes it different from
`remember` (one save) and `retire` (one file).

**It proposes. It does not decide.** Every change to meaning goes to the owner
first.

## When to run it

- The owner asks for a review or cleanup.
- After converting a folder from an older shape.
- After a batch of saves, when several files landed on nearby topics.

Not on a schedule, not at startup, and never because files are old. Age is not a
finding.

## Start with the mechanical pass

```text
node .claude/tools/check-knowledge.mjs
```

That catches what a script can see: missing fields, values outside their list,
bad dates, a `superseded_by` pointing nowhere, a status that disagrees with it,
subfolders, filenames that are not plain words, files with no title, an
oversized `current.md`, and secrets.

Fix those first. They are defects, not judgment calls, and most are one edit.

Then do the part no script can do. Read the files and compare their meaning.

## What to look for

Read `knowledge/memory/memory-index.md` and `knowledge/specs/spec-index.md`
first: one line per file makes near-duplicates visible before you open anything.

- **Duplicates.** Two files saying the same thing from the same source. Two files
  saying it from genuinely different sources are two pieces of evidence, not a
  duplicate.
- **Overlaps.** Two files that each hold half of one topic, so neither answers
  the question on its own.
- **Contradictions.** Two current files that cannot both be true.
- **A memory competing with a specification.** Once behavior is settled the
  specification owns it. The memory should explain history and point at it, not
  answer "how does this work."
- **Superseded in fact but not in status.** Something was replaced and nobody
  marked the old file.
- **Changed preferences.** The owner has since said something different.
- **Repeated episodes that imply a pattern.** Three files describing the same
  kind of event may be worth one file naming the pattern.
- **Expired value.** A file about a thing that no longer exists.
- **Stale claims.** A file contradicted by the current code, settings, or
  observed behavior.
- **`inferred` claims that can now be settled.** Either confirm them and change
  `confidence`, or drop them.
- **Misplaced content.** A procedure sitting in memory that should be a rule or
  a skill. Live work status copied out of the tracker. Raw source material mixed
  into an approved decision. A fact the production code already answers.
- **Broken links**, and files pointing at a path that no longer exists.

## What to propose

For each finding, one of these:

| Action | When |
|---|---|
| Update one file | It is right but incomplete or out of date in a small way |
| Merge | Two files are halves of one topic |
| Link | They are separate topics that should reference each other |
| Supersede | One replaces the other |
| Retire | It no longer applies but the history matters |
| Delete | A copy made by mistake, a secret, or something never true |
| Move | It belongs in a rule, a skill, a specification, or the tracker |
| Leave it | It looked like a finding and is not |

"Leave it" is a real answer. Say it out loud rather than manufacturing a change.

## Show the findings, then wait

Number every finding. One group each, so the owner can answer by number:

```text
1. <the finding, in plain words>
   - What: <what is wrong, and what would change>
   - Where: <every file path involved>
   - Source: <what shows this is a problem>
   - Tags: <any tag change, or None>
   - Assumptions: <everything assumed or unchecked, or None>
```

He replies with numbers: keep, cut, or edit. Only what survives is done.

Do not show file text unless asked. Do not bundle unrelated findings into one
number. Do not carry a rejected finding forward to raise again next time.

## The two things you may do unasked

Rebuilding the indexes and repairing a broken link. Neither changes meaning.

Everything else waits, including anything that looks obviously right.

## Finish

Apply only what was approved, through `remember` for writes and `retire` for
supersede, retire, and delete. Then:

```text
node .claude/tools/build-knowledge-index.mjs
node .claude/tools/check-knowledge.mjs
```

Report what changed, what the owner skipped, and anything still outstanding.

If nothing needs changing, say so in one line and write nothing. A sweep that
finds nothing is a good outcome, not a failed run.

## Edge cases

- **The folder is empty or nearly so.** Say so and stop. There is nothing to
  consolidate.
- **A finding needs a decision only the owner can make.** Show it as a question,
  not as a proposal with a recommended action attached.
- **Two files conflict and it is not clear which is right.** Show both with their
  exact statements and their sources. Change neither until he says.
- **A file is unreadable or its frontmatter will not parse.** Name it, show the
  checker's message, and propose the repair. Never rewrite it from guesswork.
- **The sweep would touch most of the folder.** Stop and say so first. A change
  that large is a migration, and it gets its own decision.
