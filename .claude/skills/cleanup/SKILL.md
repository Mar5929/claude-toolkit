---
name: cleanup
description: >-
  Review everything saved in specs/ and memory/ and propose edits, merges, and
  deletions for anything stale, repeated, or no longer worth keeping. Use when
  the user asks to clean up, tidy, prune, or review what is saved, asks whether
  memory is still accurate, or runs /cleanup. The user asks for this; never run
  it on your own.
---

# cleanup

`specs/memory-system.md` is the law for this. If anything here disagrees with
it, the specification wins.

The user may ask at any time for a review of what is saved. Only then.

## What to look for

Read `memory/index.md` first, then open the files it lists.

- **Stale.** The file says something that is no longer true. Check it against the
  code, the settings, and the running system where you can.
- **Repeated.** Two files say the same fact. One fact lives in exactly one file;
  everywhere else links to it.
- **No longer worth keeping.** Nothing in the file would stop a future agent
  making a mistake or having to work something out again.
- **Unchecked.** A file marked `source: agent-guess-unchecked` that could now be
  confirmed or dropped.
- **Superseded.** A file replaced by another but not marked `superseded-by:`.
- **Broken links.** A link pointing at a file that moved or is gone, or a link
  with no matching link back.
- **In the wrong folder.** It sits in the folder that says what it is about
  rather than the folder that says why it matters.

## What to propose

Three kinds of change, and they follow the normal save rules exactly:

- **An edit**: the file stays, with different words.
- **A merge**: two files become one, and every link pointing at either one is
  re-pointed in the same change.
- **A deletion**: the file goes. Say why. Git keeps every old version, so a
  deleted file can always be brought back.

A rewritten or merged file is judged for length the same way a new one is. The
two questions are in "How much detail to write" in
[the remember skill](../remember/SKILL.md). Read them before proposing an edit,
because a cleanup pass is the best chance to cut a file that grew past what it
needed to be.

## How to show it

Same as any save. Each piece leads with one line the user can take in at a
glance: its number, its destination, its one-sentence summary, and its source
value. The full words sit directly under it. Then stop and wait.

The user replies with numbers: keep, cut, or edit. Write only what the user
kept, exactly as drafted or exactly as they typed it. Then run:

```
node .claude/tools/build-memory-index.mjs
```

Then state exactly which files were written, which were deleted, and what was
cut.

## Edge cases

- **Nothing needs cleaning up.** Say so in one line and show nothing else.
- **The user cuts everything.** Change nothing, and keep no list for later.
- **Two files disagree and you cannot tell which is right.** Show both and the
  exact sentences that disagree. Do not pick one.
- **A file is stale but you are not sure what replaced it.** Propose the edit you
  believe is right, mark the new wording `source: agent-guess-unchecked`, and let
  the user cut it on sight.
