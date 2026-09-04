<!-- claude-toolkit:knowledge-manual -->

# How to use project knowledge

Read this once at session start or when invoked via the remember skill. It is the knowledge operating manual for the AI second-brain AKA "knowledge" for the project.

A KNOWLEDGE BASE WITH POLLUTED INFORMATION OR MORE INFORMATION THAN NECESSARY OR INCORRECT FACTS IS WORSE THAN NO KNOWLEDGE BASE!! BE AS CLEAR, CONCISE, AND PURPOSEFUL WITH YOUR KNOWLEDGE BASE MAINTENANCE AS POSSIBLE!!

REMEMBER THE GOAL OF LONG TERM MEMORY IS SO THE AI AGENT GETS PROGRESSIVELY SMARTER AND UNDERSTANDS AND KEEPS TRACK OF THINGS BETTER THAN THE USER!

## What loads at startup

The loader reads these files in order when present:

1. `SOUL.md`: who the agent is in this project.
2. `knowledge/README.md`: this operating manual.
3. `knowledge/project.md`: what the project is and where work is tracked.
4. `knowledge/current.md`: disposable short-term work state.
5. `knowledge/memory/memory-index.md`: one line per memory file.
6. `knowledge/prds/spec-index.md`: one line per specification file.

## Put information in one place

<!-- knowledge-policy:routing:start -->

| Information | Canonical home |
| --- | --- |
| The agent's role and purpose here | `SOUL.md` |
| A standing instruction for agent behavior | `.claude/rules/` |
| A repeatable procedure | A skill |
| Settled behavior of the system, written in non-technical language | `knowledge/prds/` |
| A lasting fact, decision, event, context, or constraint | `knowledge/memory/` |
| Current objective, blocker, and next step | `knowledge/current.md` |
| Lessons about what this owner saves | `knowledge/memory-self-improvement.md` |
| Requirements and status for one piece of work | The work tracker |
| Requirements for a product or feature area bigger than one work item | `docs/PRDs/` |
| How one work item gets built, deleted once its specification is current | `docs/designs/` |
| Information needed only for this task | The conversation only |
| `grill-me` scratch pad, unchecked exploration | `knowledge/brainstorms/` |
| Outside source material | `ai-external-knowledge/` or the project's delivery files |
| Past conversations | Session history |

Procedures and live work are not memory. Link to requirements, code, source
material, or another canonical home instead of copying its meaning.

<!-- knowledge-policy:routing:end -->

<!-- knowledge-policy:trust:start -->

`knowledge/current.md` is overwritten and not trusted as lasting fact.
`knowledge/brainstorms/` is just unchecked scratch pad recordings. A current specification beats memory
about system behavior. Name disagreements instead of silently choosing.

<!-- knowledge-policy:trust:end -->

## Find before asking or searching broadly

<!-- knowledge-policy:find:start -->

Use `recall` to find information. Use this tiered search path:

1. `knowledge/current.md`.
2. `.claude/rules/`.
3. Skills.
4. The memory and specification indexes, then only the relevant files and their
   links. Check the work tracker when the question is about a work item.
5. Past sessions through `session-search` as a final resort or if relevant context may be found from this.

Name where you found the information.

Only `current` files answer what is true now. Others provide history. An index is
a map, not evidence; open the file before relying on it.

<!-- knowledge-policy:find:end -->

## How a work item moves

The fourteen stages a work item moves through, and the progress log it keeps, are in `.claude/rules/work-item-stages.md`.

## Memory Base

### What should be saved into the Memory base

Knowledge base memories are typically surfaced during a working session with the AI agent and the user in a project chat session (i.e. working on a work item, solutioning, user providing context, etc. etc.). The stages a work item moves through are in `.claude/rules/work-item-stages.md`.

These are the things that should be saved into the memory base.

#### Working/short-term memory

Save this type of information into the short term `knowledge/current.md`. KEEP INFORMATION AS CONCISE AND LEAN AS POSSIBLE. DO NOT JUST RAMBLE INTO THIS SHORT TERM MEMORY BASE!!

Working memory is the active context required to complete current tasks. All entries should be as concise as possible and be dated so future agents know when information is no longer relevant in short-term memory.

Examples include:

- unorganized todo's the user asked for that they want to get to later;
- upcoming events;
- active items, their goals and plans;
- summary of large tasks and a path to work;
- intermediate calculations;
- scratch notes;
- unverified hypotheses;
- partial implementation state.

<!-- knowledge-policy:save-test:start -->
#### Long-term memory

REMEMBER THE GOAL OF LONG TERM MEMORY IS SO THE AI AGENT GETS PROGRESSIVELY SMARTER AND UNDERSTANDS AND KEEPS TRACK OF THINGS BETTER THAN THE USER!

These are the non-negotiables of what are considered long-term AI Memory:

1. The information MUST be relevant to the project itself.
2. Project memory is: persistent facts, decisions, user feedback, project milestones, project context (people, places, things, goals, etc.), project state, meaningful project events that occurred, constraints, relationships, facts that are difficult to infer from the repository alone, current truths about the project that the future agents will otherwise repeatedly need explained. These pieces of memory must be provided by the user or worked out by both the user and the agent together during a particular session.
3. How a real failure here was fixed is memory: what broke, the cause, the resolution.

<!-- knowledge-policy:save-test:end -->

<!-- knowledge-policy:never-save:start -->
### What never goes into the memory base

The system should aggressively avoid storing transient or low-value information.
None of this becomes durable memory:

- Tool calls, searches, web lookups, and commands run.
- Rough thinking and scratchpad reasoning.
- Ideas or hypotheses that were tried and dropped.
- Temporary implementation steps and low-level execution details with no lasting relevance.
- Ordinary test and compiler errors.
- Files opened, and a blow-by-blow of edits.
- Every action performed by a sub-agent.
- Chit-chat and conversational filler.
- Copies of code or specifications that already exist. Never save something an agent could work out by reading the production code.
- A procedure that belongs in a rule or a skill. One past fix is not this.
- Authoritative system behavior that belongs in a specification.
- An open task or implementation step that belongs in work-item tracking.
- Live status of current work.
- Anything stale, superseded, or contradicted with no historical value.
- Passwords, keys, and tokens, ever, because this folder is in Git and Git keeps everything.

<!-- knowledge-policy:never-save:end -->

## What should be saved as a `knowledge/prds/`

PRD is short for product requirements document. This folder used to be called `knowledge/specs/`, and an older session or an older project may still call these files specs. They are the same thing.

A PRD here is a finalized, approved statement of how the system should behave - logic, behavior, UI, UX, and other requirements that an AI cannot determine from reading the raw code. It should not simply regurgitate what can be understood from reading the raw code.

A PRD must be written in clear, concise, laymen's terms without jargon. They should be organized neatly in system areas. They are living truth and must be deduplicated and updated when the AI works with the user to finalize work items. The stages a work item moves through are in `.claude/rules/work-item-stages.md`.

## Use the two file shapes

<!-- knowledge-policy:file-shapes:start -->

Memory is flat under `knowledge/memory/`, one topic per file, and requires:

`summary`, `type`, `status`, `source`, `confidence`, `created_at`, `tags`,
`approved_by`, `approval_date`.

- `type`: `fact`, `decision`, `event`, `context`, or `constraint`;
- `status`: `current`, `superseded`, or `retired`;
- `confidence`: `observed`, `reported`, or `inferred`;
- `tags`: a free-form YAML list with no fixed vocabulary.

A PRD under `knowledge/prds/` requires `summary`, `area`, `status`,
`source`, `created_at`, `tags`, `approved_by`, and `approval_date`, with no
`type` or `confidence`.

Optional fields go in only when they apply: `confirmed_at`, `source_quote`,
`effective_from`, `effective_to`, `project`, `work_item`, `supersedes`,
`superseded_by`, and, for memory, `related_memories`.

Use a lowercase, hyphenated topic filename. Start the body with a plain title and
standalone truth. Use relative Markdown links. Never hand-edit generated indexes.

<!-- knowledge-policy:file-shapes:end -->

## Get exact approval before changing lasting knowledge

<!-- knowledge-policy:approval:start -->

Nothing writes, updates, moves, merges, supersedes, retires, or deletes memory or
a specification without the owner's clear approval. Hooks only remind. Helper
agents cannot approve. The conversion of already-approved older files is the
only documented exception.

Every proposal uses one fixed shape, the same in every project. Each numbered
proposal is three blocks:

1. a bold headline, one plain sentence saying what gets saved, then an arrow and
   one of `New memory file`, `Memory, edit to an existing file`, `New spec file`,
   or `Spec, edit to an existing file`;
2. a block quote holding the meaning that would land in the file, three
   sentences at most; and
3. five one-line bullets, in this order: `Why`, `Where`, `From`, `Unsure`,
   `Checked`.

The headline and the quoted text carry the decision. The bullets are supporting
detail and stay short.

Send it as rendered Markdown, with a blank line between the three blocks. Never
put a proposal inside a code fence. Write every line as if the owner is five
years old: short words, no jargon. The arrow says memory or spec in those words,
so the owner never has to read a folder path to know which he is approving.
`Where` carries the path, whether the file is new or an edit, and the tags.
`Checked` names what was opened to confirm the information is not already
written down, and is shown with the block so he sees the reasoning before he
answers.

The exact template, with its two worked examples, is in the `remember` skill at
`references/proposal-template.md`. Read it before proposing.

The owner approves the quoted text, `Why`, and `From`. `Unsure` is approved
separately. Silence, an unclear answer, or asking to see full text is not
approval. Write only the approved meaning and source. If the owner edits the
words, use those words exactly.

`knowledge/current.md`, work items, generated index rebuilds, and broken-link
repairs do not need this meaning approval. Their own workflows still apply.

<!-- knowledge-policy:approval:end -->

## Keep current truth clean

<!-- knowledge-policy:lifecycle:start -->

Search for an existing topic before adding a file.

- Update when new information agrees and adds to the current file.
- Supersede when a replacement contradicts the old file. Write the replacement,
  mark the old file `superseded`, link both directions, and repair current links
  together.
- Retire when a file no longer applies but its history matters.
- Delete only a duplicate made by mistake, a secret, or something never true.

Age alone is never a reason to retire or delete. Something that stopped being
true is superseded or retired. Use `reflect` for folder-wide duplication and
conflict review, and `retire` for one file.

After a lasting knowledge change, rebuild and check:

```text
node .claude/tools/build-knowledge-index.mjs
node .claude/tools/check-knowledge.mjs
```

The source files win if an index disagrees with them.

<!-- knowledge-policy:lifecycle:end -->

## Memory self-improvement

`knowledge/memory-self-improvement.md` is this project's record of what the
owner counts as memory-worthy. It holds distilled lessons and a short rolling
log of recent proposal outcomes. If the user proposed an addition to what to consider memory or project-specific memory instructions, append one line per candidate to the `## Recent decisions` section of this file.

`remember` reads it with the save rules before gathering candidates, and appends
one line per candidate after the owner decides. Those appends are operational
state and need no approval. `reflect` merges repeated lines into lessons and
keeps the file under its 8,000 character cap, which the checker enforces.

The file is never a memory store. When a lesson there disagrees with this
manual, the manual wins and the disagreement is said out loud. Lessons stay in
this project. One that keeps recurring across projects graduates into this
manual through the normal toolkit change flow.

## Skill map

<!-- knowledge-policy:skill-map:start -->

- `recall`: walk the find order and report conflicts or gaps.
- `remember`: test, place, propose, write approved meaning, rebuild, and check.
- `retire`: supersede, retire, or delete one file safely.
- `reflect`: review the whole folder and propose cleanup.
- `session-search`: read-only search of past Claude Code CLI sessions.
- `second-brain`: install, detect, convert, or repair this system.
<!-- knowledge-policy:skill-map:end -->
