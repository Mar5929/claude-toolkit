---
name: remember
description: >-
  Save approved behavior or durable project knowledge under knowledge/. Use
  when the owner says remember, save, capture, or write this down; before a
  pull request opens; before a handoff or context reset; or at another settled
  completion point. Apply all four filters, show What I want to change and Why,
  show the exact words, and write only what the owner approves.
---

# remember

`knowledge/specs/memory-system.md` is the authority when the adopting project
has it. This skill supplies the portable workflow.

## Start with the map

Read, in order:

1. `knowledge/project.md`;
2. `knowledge/index.md`;
3. the relevant current specification or memory; and
4. the project's always-loaded instructions.

Search before drafting. Prefer an edit to the existing canonical file. A fact
that already has one owner gets a link, not a second copy.

Before choosing tags, run the read-only project vocabulary view:

```text
node .claude/tools/knowledge-health.mjs tags --json
```

Read the complete project-specific vocabulary and usage counts yourself. Do not
show the owner an unrelated wall of tags. A normal proposal shows only the
relevant existing tags with counts, the proposed tags, and any warning about a
new or overlapping tag.

## Apply the four filters in order

Save only when every answer passes:

1. **Is it relevant to this project?** If not, do not save it here.
2. **Is it project work rather than a lesson about an agent or reusable tool?**
   If it belongs in the toolkit, settings, or another product, propose that
   home instead.
3. **Can one existing authoritative repository file answer it without the next
   session working it out again?** If yes, point at that file. The narrow
   exception is a project conclusion that only becomes clear by combining
   several files and prevents a wrong action.
4. **Would leaving it out make a future agent likely to take a wrong action?**
   If not, do not save it.

Difficulty, novelty, and conversation length do not make something memory.

## Route it

- `knowledge/specs/<area>/<capability>.md`: approved behavior the product or
  system must have.
- `knowledge/memory/context/`: durable circumstances, stakeholders,
  boundaries, and outside constraints.
- `knowledge/memory/decisions/`: non-obvious choices and why they were made.
- `knowledge/memory/domain/`: project-specific terms and business rules.
- `knowledge/memory/knowledge/`: conclusions this project should apply.
- `knowledge/memory/operations/`: repeatable procedures plus verification and
  recovery.
- `knowledge/memory/planning/`: direction, roadmap, milestones, durable risks,
  and assumptions.
- `knowledge/memory/references/`: external source material and what it
  supports.
- `knowledge/brainstorms/`: raw exploration only. It is not a save and does
  not become truth merely because it exists.

External material belongs in `references/`. A conclusion drawn for this project
belongs in `knowledge/`. When research produces both, propose two linked files.

Live status stays in the work tracker. Secrets and private personal information
never go in the vault.

## Draft the correct shape

Every memory starts with only these fields:

```yaml
---
source: owner-paraphrase
date: 2026-08-12
session: unavailable
tags:
  - project-subject
---
```

- `source:` is exactly `owner-quote`, `owner-paraphrase`, `read-from-file`,
  `agent-observed`, or `agent-conclusion-unchecked`. Use `owner-quote` only for
  verbatim words. A faithful rewrite is `owner-paraphrase`.
- `source-file:` is the exact repository path, present only for
  `read-from-file`.
- `date:` is the save or last-change date as `YYYY-MM-DD`.
- `session:` is a retrievable session reference when one exists, never a
  transcript copy. Use `unavailable` when no retained reference exists.
- `tags:` is a YAML list of one to three project subjects from
  `knowledge/memory/tags.md`. The folder owns memory type and `source` owns
  trust, so tags duplicate neither. A new project starts with its own empty
  vocabulary, not the toolkit repository's tags.
- `superseded-by:` appears only on retained history.

Those six names are the complete property vocabulary. Never invent a field
silently. If claims in one file come from different sources, mark the affected
claims in the body so the file-level source does not give them false confidence.
Use this adjacent marker consistently:

```text
> Claim source: read-from-file; path/to/source.md
```

Replace the source value and trace after the semicolon as needed. The marker
belongs directly above the claim it qualifies.

Then add a descriptive H1 and one-sentence summary. Use lower-case hyphenated
file names. A specification has the same H1 and summary but no YAML.

## Explain first, then show the words

Every proposal begins with these exact headings:

```text
What I want to change
Why
```

Use short plain bullets. Say what will be created, edited, moved, or removed;
why it passed the four filters; and what wrong action it prevents. Keep every
path, number, date, and name.

For a memory proposal also show, in plain words:

- the relevant existing tags and their counts;
- the proposed one to three tags;
- whether any tag is new or overlaps an existing tag;
- the source kind and whether the wording is quoted or paraphrased; and
- the source file or session reference, including `unavailable` when honest.

Creating, editing, merging, moving, superseding, and removing are equal memory
actions. Prefer changing the current canonical home. Do not leave obsolete
wording current merely to preserve it because Git already preserves history.

For one or two short pieces, show numbered paths and the exact proposed words
in chat. The owner may keep, cut, or edit each one. Then stop and wait.

For every specification and for a large draft, write the complete draft into
the current working branch, give the owner the path, and stop for direct review.
The branch file is the visible proposal, not approved truth. It must not merge
until the owner approves it. Read the owner's direct file edits and keep their
words as written.

A helper-agent report, hook, brainstorm, silence, or yes-or-no question does
not approve exact words. No reply means no write.

## Finish an approved save

1. Write only the approved words.
2. Repair any relative Markdown links affected by the approved change.
3. Run:

   ```text
   node .claude/tools/build-knowledge-index.mjs
   node .claude/tools/knowledge-health.mjs health --focus <changed-memory-path> --json
   ```

4. Report the paths written, moved, or removed and anything the owner cut.
   Run the focused health command once for each changed memory. Specification
   changes use the same path. The focused report still checks the complete tag
   vocabulary and usage.
   For a move or deletion, also focus the old path. This includes memories that
   still point to the old file, even when that file no longer exists.
5. Show only concrete health warnings tied to the changed files or proposed
   tags. Finish the approved save first, then offer a focused cleanup review.
   Never silently expand the approved change.

If writing or index generation fails, the save is unfinished. Report the
failure. Do not merge as though durable truth was saved.

## When this runs

- the owner asks to remember or save something;
- a pull request is about to open;
- a session is about to hand off or clear context; or
- another natural completion point has a settled durable result.

Do not run it after every message, commit, or small fix. One review may cover
several nearby completion moments when the result has not changed.

## Edge cases

- Nothing passes all filters: say so briefly and write nothing.
- The folder is unclear: name the two candidates and ask. Do not guess.
- Current files conflict: show the exact conflict and change neither.
- Saved knowledge conflicts with code or observed behavior: show both.
- The owner cuts everything or does not reply: write nothing and keep no queue.
- An agent-derived claim remains unchecked: keep it visibly
  `agent-conclusion-unchecked` until the owner confirms it.
- An older source value appears: propose the exact replacement and wait. Never
  silently relabel existing durable knowledge.
- The index is stale: source documents win; rebuild it.
