---
name: cleanup
description: >-
  Review project knowledge for stale, repeated, conflicting, unchecked, broken,
  or misplaced content. Use only when the owner asks to clean up or audit saved
  knowledge. Propose exact changes and use the normal remember approval flow.
---

# cleanup

Run only when the owner asks. Read `knowledge/project.md` and
`knowledge/index.md`, then open the files the review actually needs.

## Look for

- stale statements contradicted by current code, settings, or behavior;
- one fact copied into multiple canonical files;
- conflicting current guidance;
- `agent-guess-unchecked` claims that can now be confirmed or dropped;
- retained history missing `superseded-by:`;
- broken relative links;
- source material mixed with project conclusions;
- live tracker state copied into durable knowledge;
- memories one authoritative repository file already says; and
- content routed to the folder describing its topic instead of why it matters.

## Propose, never silently repair

Use `remember` for every edit, merge, move, or deletion. Start with
`What I want to change` and `Why`, then show the exact words or the complete
working-branch draft. Structural changes remain visibly owner-approved.

When merging files, repair every affected link in the same approved change.
When deleting, say what replaces the file or why no replacement is needed. Git
keeps history, but that does not make an unapproved deletion acceptable.

After approved changes run:

```text
node .claude/tools/build-knowledge-index.mjs
```

If nothing needs repair, say so briefly and write nothing.
