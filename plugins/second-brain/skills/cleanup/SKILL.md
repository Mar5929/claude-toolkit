---
name: cleanup
description: >-
  Review project knowledge for stale, repeated, conflicting, unchecked, broken,
  malformed, badly tagged, untraceable, or misplaced content. Use when the owner
  asks, after a migration, or for a focused review after a concrete warning.
  Propose short meaning summaries and use the normal remember approval flow.
---

# cleanup

Run a full review when the owner asks or after a memory migration. Run a focused
review when `remember` or `project-sync` finds a concrete warning. Startup, a
calendar schedule, ordinary saves without warnings, and age alone never trigger
a review.

A project with more than 20 approved tags gets a vocabulary warning. That is a
reason to review unused and overlapping tags, never permission to prune them.

Read `knowledge/project.md` and `knowledge/index.md`, then generate the complete
read-only mechanical report:

```text
node .claude/tools/knowledge-health.mjs health --json
```

The owner installs Obsidian tools on his machines outside this toolkit: an
Obsidian MCP server (tools named `mcp__obsidian__*`) and the
`kepano/obsidian-skills` skills. When they are present, use them to find, read,
and search notes during the review. Reading and searching only: repairs go
through `remember` and stay ordinary Markdown with relative links, never
Obsidian-only wikilinks, embeds, or extra properties. The tools are optional;
everything here works without them.

For a focused review, limit the explanation and proposals to the named warning,
changed files, files that point to an old or deleted path, and any global tag
overlap it caused. For a full review, include the complete approved tag
vocabulary, counts, unused tags, and overlaps. Open every current specification
and memory, then compare its claims with relevant code, settings, source files,
and work-item state. The tool checks Markdown structure. The agent reviews meaning
because the tool cannot detect stale, repeated, conflicting, or misplaced ideas.

## Look for

- stale statements contradicted by current code, settings, or behavior;
- one fact copied into multiple canonical files;
- conflicting current guidance;
- `agent-conclusion-unchecked` claims that can now be confirmed or dropped;
- exact owner wording mislabeled as a paraphrase, or paraphrases mislabeled as
  exact quotes;
- missing, invalid, or silently invented properties;
- broken source files, missing session references, or false file-level source
  confidence for mixed-source claims;
- unapproved, repeated, excessive, fragmented, unused, or overlapping tags;
- retained history missing `superseded-by:`;
- broken relative links;
- source material mixed with project conclusions;
- live work-item state copied into persistent knowledge;
- memories one authoritative repository file already says; and
- content routed to the folder describing its topic instead of why it matters.

## Propose, never silently repair

Use `remember` for every edit, merge, move, or deletion. Start with
separate What, Where, Why, Assumptions, and Unverified bullets. Full file text
appears only when the owner asks for it. Structural changes remain visibly
owner-approved, and the repair adds no meaning outside the approved bullets.

When merging files, repair every affected link in the same approved change.
When deleting, say what replaces the file or why no replacement is needed. Git
keeps history, but that does not make an unapproved deletion acceptable.

For every repair, name what will become current and what will stop being
current. Never treat age by itself as evidence that a memory is stale. Never
change tags, properties, words, locations, or current status in the background.

After approved changes run:

```text
node .claude/tools/build-knowledge-index.mjs
node .claude/tools/knowledge-health.mjs health --json
```

If nothing needs repair, say so briefly and write nothing.
