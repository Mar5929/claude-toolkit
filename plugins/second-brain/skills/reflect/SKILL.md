---
name: reflect
description: >-
  Sweep the whole knowledge folder for duplicates, overlaps, contradictions,
  superseded decisions, and expired value, then propose what to do. Use when the
  owner asks for a review, after a migration, or after several related saves.
---

# reflect

This is a read-first review across the whole folder. It proposes changes but
does not decide them. Read the trust, approval, and lifecycle sections of
`knowledge/README.md`. If the manual is missing, report the gap and stop.

## Mechanical pass

Run `node .claude/tools/check-knowledge.mjs`. Report every failure before doing a
meaning review. A malformed file is still not permission to rewrite its meaning.

Read the memory and specification indexes, then open the files needed to compare
nearby topics. Look for:

- duplicates from the same source;
- topics split across files so neither answers clearly;
- current files that contradict each other;
- memory competing with a current specification;
- files replaced in fact but still marked current;
- saved claims contradicted by their source, code, or observed behavior;
- inferred claims that can now be checked;
- expired value or broken links;
- procedures, live status, raw source material, or copied code in knowledge.

Age by itself is not a finding. Separate files from genuinely different sources
may be independent evidence rather than duplicates.

## Propose and wait

Number each independent finding. State the problem, every affected path, the
evidence, the recommended lifecycle action, and any uncertainty. Use the
manual's approval group instead of inventing a second review format.

Do not bundle unrelated findings. Do not carry a rejected finding into a later
review. Rebuilding generated indexes and repairing a broken link may happen
without meaning approval; everything else waits.

## Apply and finish

Use `remember` for approved writes and `retire` for an approved supersede,
retirement, or deletion. Then rebuild both indexes and run the checker again.

Report what changed, what the owner skipped, and what remains unresolved. If the
folder is empty or nothing needs changing, say so in one line and write nothing.

Stop and call the work a migration if the proposed change would touch most of
the folder.
