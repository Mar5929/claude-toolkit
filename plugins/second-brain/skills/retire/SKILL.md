---
name: retire
description: >-
  Take one knowledge file out of current use: supersede it with a replacement,
  retire it as history, or delete it. Use when the owner says something is out
  of date, wrong, replaced, or should be removed, when a decision is reversed,
  or when they run /retire. Never deletes to tidy up, and never treats age alone
  as a reason.
---

# retire

One file at a time. This skill changes what answers questions about what is true
now. It does not tidy the folder, and it does not judge a file by its age.

For a sweep across many files, use `reflect` instead.

## Pick the right action

| What happened | Action |
|---|---|
| The new information agrees and adds to it | **Update.** Use `remember`, not this skill. |
| It is contradicted, and the replacement exists or is being written | **Supersede** |
| It no longer applies, but its history still matters | **Retire** |
| It is a copy made by mistake, a secret, or was never true | **Delete** |

**Being old is never a reason.** Written two years ago and still true means still
true. If nothing has contradicted it, the right move may be to set
`confirmed_at` to today and leave it alone.

**Something that stopped being true is superseded or retired, never deleted.**
The fact that it changed is often the useful part.

## Supersede

Three steps. They happen together or not at all. A half-done supersede is worse
than none, because the old file still reads as current.

1. **Write the new file**, with `supersedes` set to the old file's path. This
   goes through the normal `remember` approval first.
2. **Mark the old file.** Set `status: superseded` and `superseded_by` to the new
   file's path. Leave the rest of it alone: its words are the history.
3. **Fix everything pointing at it.** Search the whole repository for the old
   filename:

   ```text
   grep -rn "old-file-name" --include="*.md" .
   ```

   Every place that treats it as current gets repointed at the replacement. A
   link that deliberately references the history stays, but says so.

The old file stays on disk. It stops answering what is true now and stays
findable.

## Retire

Set `status: retired`. Nothing else changes.

Use this when the thing the file describes is gone rather than replaced: a
system that was switched off, a client that ended, a constraint that no longer
applies to anything. There is no replacement to point at, so `superseded_by`
stays absent.

Then run the same repository search and fix anything still treating it as
current.

## Delete

Only three reasons, and say which one out loud before doing it:

1. **A copy made by mistake.** Two files saying the same thing from the same
   source. Keep the better one.
2. **A secret.** A password, key, or token that should never have been written
   down. Delete it, then tell the owner to rotate the credential, because it is
   compromised the moment it reaches Git and Git keeps everything.
3. **Something that was never true.** Different from something that stopped
   being true. This is a file that was wrong when it was written.

Anything else is a supersede or a retire. "It is clutter", "it is old", and "we
do not need it" are not reasons to delete.

## Show it before doing it

Same approval as any other write. One group, and nothing happens until the owner
answers:

```text
1. <the file, in plain words>
   - What: <what stops being current, and what becomes current instead>
   - Where: <exact path, and the action: supersede, retire, or delete>
   - Source: <what says this is no longer true, and how sure that is>
   - Tags: <any tag change, or None>
   - Assumptions: <everything assumed or unchecked, or None>
```

For a delete, `What` names which of the three reasons applies.

Silence, an unclear answer, or a request to see the file all mean nothing
happens. Asking to see it is not approval.

## Finish

1. Make the change.
2. Repair every reference the search found.
3. Run both:

   ```text
   node .claude/tools/build-knowledge-index.mjs
   node .claude/tools/check-knowledge.mjs
   ```

   The checker catches a `superseded_by` pointing at a file that does not exist
   and a status that disagrees with it, which is how a half-done supersede gets
   caught.
4. Say exactly what changed, what now points where, and what the owner skipped.

If any step fails, the change is unfinished. Report the failure with its output.

## Edge cases

- **The replacement does not exist yet.** Write it first, through `remember`.
  Never mark a file superseded with nothing to point at.
- **The owner wants it gone but it is not one of the three delete reasons.**
  Say which action fits instead and why, then do what he decides.
- **Several files are affected.** This skill does one file. If the change
  cascades, name every affected file first and let the owner see the full list
  before anything moves.
- **The file is already superseded or retired.** Say so and change nothing.
- **Nothing still points at it.** Say that too. It means the repair step is
  already done.
