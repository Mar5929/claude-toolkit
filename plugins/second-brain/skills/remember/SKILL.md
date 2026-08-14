---
name: remember
description: >-
  Decide where persistent information belongs and save approved specification or
  memory changes under knowledge/. Use when the owner says remember, save,
  capture, or write this down; before a pull request opens; before a handoff or
  context reset; or at another settled completion point. Check the current work
  item, rules, skills, specifications, memory, and references before proposing
  anything. Show short What, Where, Why, Assumptions, and Unverified bullets,
  then write only the meaning the owner approves.
---

# remember

`knowledge/specs/memory-system.md` is the authority when the adopting project
has it. This skill supplies the portable workflow.

## Start with every possible owner

Read, in order:

1. `knowledge/project.md`;
2. `knowledge/index.md`;
3. wherever the current work item is being tracked;
4. the relevant current rule, skill, specification, memory, or reference; and
5. the project's always-loaded instructions.

Search before drafting. An open or closed external work item may already own a
ticket-specific decision. A current file may already own a rule, procedure,
behavior, fact, or source. Update or link to that owner instead of creating a
second copy.

Before choosing memory tags, run the read-only project vocabulary view:

```text
node .claude/tools/knowledge-health.mjs tags --json
```

Read the complete project-specific vocabulary and usage counts yourself. Do not
show the owner an unrelated wall of tags. Mention a tag only when the proposal
adds, removes, renames, or changes the meaning of one.

## Test whether anything should persist

Persistent project information is a stable fact, lasting event, decision, or
state that prevents the owner from repeating an explanation or a future agent
from taking the same wrong action.

Ask these four questions:

1. **Will it still matter after the current task or session?** If not, keep it
   wherever the work item is being tracked or in the handoff.
2. **Is it a stable fact, lasting event, decision, or state?** Difficulty,
   novelty, and conversation length are not enough.
3. **Does a current work item, rule, skill, specification, memory, or reference
   already own it?** If yes, update or link to that home. Do not copy it.
4. **Would leaving it out cause a repeated explanation or the same wrong
   action?** If not, do not create project knowledge.

Continue only when questions 1, 2, and 4 are yes and question 3 has been
resolved through the existing owner or a genuinely new home.

## Decide where it belongs

Use the project's `where-persistent-information-belongs.md` rule when present.
This is the portable fallback:

- **Wherever the work item is being tracked:** its goal, reason, requirements,
  scope, edge cases, decisions, progress, blockers, assignments, and next step.
- **Rules:** standing instructions for how agents behave or work.
- **Skills:** reusable processes agents should follow across tasks or projects.
- **`knowledge/specs/`:** approved product or system behavior beyond one work
  item.
- **`knowledge/memory/context/`:** persistent circumstances, stakeholders,
  boundaries, and outside constraints.
- **`knowledge/memory/decisions/`:** persistent choices and the reasons that
  prevent reversal or repeated debate.
- **`knowledge/memory/domain/`:** project-specific terms and business rules.
- **`knowledge/memory/knowledge/`:** non-obvious project conclusions that
  prevent repeated mistakes or investigation.
- **`knowledge/memory/operations/`:** project-specific operating, release, or
  recovery procedures. A reusable agent process belongs in a skill instead.
- **`knowledge/memory/planning/`:** persistent direction, roadmap, milestones,
  risks, and assumptions beyond one work item.
- **`knowledge/memory/references/`:** outside source material and what it
  supports.
- **`knowledge/brainstorms/`:** raw exploration only. It is not a save and does
  not become truth merely because it exists.
- **Session history:** past conversation that is useful only as history.

If the right home is a work item, rule, or skill, say so and follow the
project's normal work process. Do not create memory as a temporary substitute.
This skill writes only approved specification and memory changes.

External material belongs in `references/`. A conclusion drawn for this project
belongs in `knowledge/`. When both independently pass the persistent test,
propose them as separate items. Never mix unchecked research into an approved
decision.

Secrets and private personal information never go in the vault.

## Use the fixed file shapes

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

## Show a short meaning review

For each separately routed item, show only this short group first:

```text
1. <plain name>
   - What: <meaning that may be added, changed, moved, or removed>
   - Where: <current or proposed home>
   - Why: <repeated explanation or wrong action this prevents>
   - Assumptions: <every assumption, or None>
   - Unverified: <every unchecked claim, or None>
```

Keep every path, number, date, and name needed to make the decision. Include a
new tag and its plain meaning, a source change, a missing trace, or a metadata
change inside `What`, `Assumptions`, or `Unverified` when it needs approval.
Do not show unrelated tag counts or metadata.

The owner may keep, change, or skip each item. No reply means no write. When
nothing qualifies, say so in one line and continue the handoff, pull request,
or completion flow.

Do not show full file text, frontmatter, or a full diff unless the owner asks.
Asking to see full text is not approval. Show it in chat or in a working-branch
file, then wait for keep, change, or skip.

Approval covers the meaning in the five bullets. It does not permit extra
claims, sources, assumptions, reasoning, examples, or background. Draft only
the approved meaning and the file structure needed to store it. If drafting
requires anything new, stop and show a revised short proposal.

Creating, editing, merging, moving, superseding, and removing use the same
review. For a merge, move, or removal, `What` says what becomes current and
what stops being current.

## Finish an approved save

1. Write only the approved meaning and required file structure.
2. Repair any relative Markdown links affected by the approved change.
3. Run:

   ```text
   node .claude/tools/build-knowledge-index.mjs
   node .claude/tools/knowledge-health.mjs health --focus <changed-path> --json
   ```

4. Report the paths written, moved, or removed and anything the owner skipped.
   Run the focused health command once for each changed memory or specification.
5. Show only concrete health warnings tied to the changed files or proposed
   tags. Finish the approved save first, then offer a focused cleanup review.
   Never silently expand the approved change.

For a move or deletion, also focus the old path. This includes memories that
still point to a path that no longer exists.

If writing or index generation fails, the save is unfinished. Report the
failure. Do not merge as though persistent information was saved.

## When this runs

- the owner asks to remember or save something;
- a pull request is about to open;
- a session is about to hand off or clear context; or
- another natural completion point has a settled persistent result.

Do not run it after every message, commit, or small fix. One review may cover
several nearby completion moments when the result has not changed.

## Edge cases

- Nothing passes the test: say so in one line and write nothing.
- The item is already owned: name the owner in one line and do not copy it.
- The home is unclear: show separate candidate routes with their assumptions.
  Do not guess.
- One review contains different kinds of information: split them into separate
  five-bullet groups with separate approval choices.
- A closed or external work item owns the decision: link or update it. Closing
  or living outside the repository is not a reason to create memory.
- Full text is requested: show it, then wait for approval.
- Current files conflict: show the exact conflict and change neither.
- Saved knowledge conflicts with code or observed behavior: show both.
- The owner skips everything or does not reply: write nothing and keep no queue.
- An agent-derived claim remains unchecked: keep it visibly
  `agent-conclusion-unchecked` until the owner confirms it.
- An older source value appears: include the proposed replacement in `What` and
  wait. Never silently relabel existing persistent information.
- The index is stale: source documents win; rebuild it.
