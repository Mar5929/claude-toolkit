# Codex handoff

## Resume in Codex or VS Code

Open this repository in Codex or VS Code with the Codex extension, then paste:

```text
Continue issue #269. Fetch origin and use an isolated worktree for
issue-269-second-brain-design. Read misc/Codex handoff.md on origin/main.
Resume the knowledge-template requirements review from that handoff.
Implementation is not yet approved.
```

This file carries the working context; it does not transfer the chat itself.

Handoff snapshot: 2026-09-12. This is a transfer note for unfinished work,
not an approved specification or a second work tracker.

## Goal and first reads

Help Mike define a reliable Second Brain that carries useful project context
between sessions, keeps knowledge readable and maintained, and saves clear
requirements answers without repeated save questions. Continue requirements
refinement; full requirements approval, solution design, and implementation
remain pending.

The PRD still carries older approval metadata dated 2026-09-07. Its refinement
note and the issue explicitly leave approval of the current whole document
pending; do not treat that old metadata as new approval.

Read the repository instructions, then:

1. [Issue #269](https://github.com/Mar5929/claude-toolkit/issues/269), the canonical work item.
2. [Knowledge-system PRD](../knowledge/prds/knowledge-system.md), the proposed requirements. It has 28 numbered requirements plus supporting sections. Older lists in the issue body lag this file; do not restore superseded requirements from old comments.
3. [PRD-creator draft](https://github.com/Mar5929/claude-toolkit/blob/issue-269-second-brain-design/misc/SKILL%20(2).md), the revised skill template on the review branch.
4. [Existing requirements-helper](../plugins/session-skills/skills/requirements-helper/SKILL.md), which already owns PRD interviews and draft maintenance in the shipped toolkit.

## Where the files stand

- The approved September 11 PRD refinements are on `main`: commits `59a50a6`, `55f64f1`, and `1d85035`. Their presence does not mean the described behavior is implemented.
- The edited PRD-creator draft belongs to branch `issue-269-second-brain-design`. Preserve that draft when updating the branch. It is not yet a packaged skill or merged toolkit change.
- On the source laptop, this session used sibling worktree `claude-toolkit-269`. On another machine, find or create an isolated worktree for the same branch using that machine's paths. Do not assume an old absolute Windows path exists there.
- Existing runtime files still use paths such as `knowledge/current.md`. The PRD's new folder layout is desired behavior, not an instruction to move folders during this review.
- The template cleanup passed a whitespace/diff check. It has not been tested as an installed skill, and no full plugin verification is claimed.

## Already captured in the PRD

The PRD is the source for the full wording; these are navigation pointers:

- Project folder layout: memory topic files and the glossary under `knowledge/memory/memory-entries/`; current work and memory lessons under `knowledge/memory/`; System Guide index and entries under `knowledge/system-guide/`; brainstorms at project-root `brainstorms/`. The owner's sketch is [misc/temp.txt](temp.txt).
- Requirement 7: one alphabetical glossary table with columns Term / aliases, Plain meaning, Refers to, Watch out, Source / date. Short rows, update existing terms, link detailed history, and clearly identify uncertainty and differing contexts.
- Requirements 14, 15, and 22: one maintained Markdown file per meaningful topic area. Avoid files for tiny details and endless append-only notes. Rewrite or remove outdated content within the approval rules, retaining useful dated history and superseded decisions when needed.
- Requirement 14: both `source` and `context` are required for long-term memories. Source identifies evidence; context briefly identifies the originating discussion or event and its known date.
- Requirement 20: a quick scan of the headline and short quote must make the proposed save understandable without reading the full memory or all supporting details.

Do not ask Mike to approve these same saved changes again.

## The PRD-creator draft

Mike supplied `misc/SKILL (2).md` and said: "I like the template of the PRD that
I had I want you to clean it up and add some additional enhancements to it."
Preserve that request when editing; do not replace the supplied hierarchy.

The revised draft retains the contents list, Introduction/Overview with Why
this exists, Goals, Requirements with area/subarea/requirement hierarchy,
Non-Goals, Success Metrics, Open Questions, and final Potential Solution
Designs to Explore. It cleans up numbering and incomplete text and adds:

- ongoing capture of clear answers in the canonical PRD during the same turn;
- focused document checks and the project's authorized commit/push workflow;
- no repeat approval request for an already-authorized answer or correction;
- clear separation of suggestions, agreed requirements, and permission to build;
- acceptance criteria, relevant rules/exceptions, UI and information guidance;
- updates to existing requirements instead of accumulating contradictory notes.

Review the resulting draft with Mike before deciding how to incorporate it
into the existing toolkit skill. Updating `misc/` alone does not install it.

## Latest discussion: consistent templates across the whole system

Mike first said: "current.md (current short term working memory) should have a
template and the agents must know how to store things in there. it can't be a
free for all". He then clarified: "I want to make sure that we have a template for all the other files
within the Second Brain knowledge system, right?" He requested a bounded audit.

The audit was read-only. The concluding system-wide requirement was proposed
in chat but has not been approved or added to the PRD:

> Every knowledge file type has one standard template and clear rules explaining what belongs in each section and how to maintain it. Agents follow those rules when creating and updating files, including when to replace or remove content and when useful history should remain. The system checks the relevant structure before reporting a save complete.

No new `current.md` entry schema was selected or saved. The next conversation
should resolve this broader requirement and the remaining per-file templates,
not treat the audit's recommendations as implementation approval.

## Audit findings to reuse, then verify before building

The read-only audit distinguished missing templates from missing guidance
for later edits. These are findings about the source reviewed then, not proof
of behavior in a fresh installed session.

| File type | Finding and source |
| --- | --- |
| `current.md` | The manual requires dated entries. The five-section [starter](../plugins/second-brain/skills/second-brain/references/templates/knowledge/current.md) has no date field, and the [checker](../plugins/second-brain/tools/check-knowledge.mjs) checks size/secrets rather than headings or dates. |
| `project.md` | A starter exists; ongoing section maintenance and stale-content removal need clearer guidance. See [starter](../plugins/second-brain/skills/second-brain/references/templates/knowledge/project.md). |
| Long-term memory | Shipped metadata rules lack a reusable body template for the newly agreed topic-area curation model. See [manual](../plugins/second-brain/skills/second-brain/references/templates/knowledge/README.md) and [checker](../plugins/second-brain/tools/check-knowledge.mjs). |
| PRDs and glossary | The reusable PRD body template is still a draft; the approved glossary table is in the proposed PRD, not yet shipped as a template. |
| Pending inbox | Requirement 28 defines desired behavior; the inbox template and workflow are not yet shipped. |
| System Guide explanations | Audit recommendation: consider a consistent body layout alongside the existing approval and upkeep rules. See [guidance](../plugins/system-guide/skills/system-guide/references/meaning-and-maintenance.md) and the [writer](../plugins/system-guide/tools/system-guide.mjs), which preserves approved body text. This remains the separate System Guide's responsibility. |
| Better-covered formats | Reuse the [managed manual](../plugins/second-brain/skills/second-brain/references/templates/knowledge/README.md), [index builder](../plugins/second-brain/tools/build-knowledge-index.mjs), [memory-learning template](../plugins/second-brain/skills/second-brain/references/templates/knowledge/memory-self-improvement.md), and [grill-me capture template](../plugins/session-skills/skills/grill-me/SKILL.md). Brainstorm routing still needs to follow the approved future project-root location. |

Generated files should keep their tool-owned formats. Do not introduce a second
owner or force every file type into the same layout.

## Other proposals still open

An earlier review proposed source traceability, optional entity names,
protecting later edits/deletions from old pending saves, shared warnings about
disputed facts, careful learning from rejection, and preserving parallel saves
in the final shared index. They were not approved as a group. Some overlap
with later saved source/context and inbox requirements; check the current PRD
before re-proposing anything.

## First action on the new laptop

Fetch `issue-269-second-brain-design`, open its worktree in the preferred editor, and read the
files above. Then resume with the system-wide template requirement and a short
list of the specific file templates still needing a decision. Keep Mike's
existing PRD structure and save his clear refinements promptly through the
project's authorized workflow. Do not begin the Second Brain implementation.
