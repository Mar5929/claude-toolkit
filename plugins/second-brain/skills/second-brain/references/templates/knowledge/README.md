<!-- claude-toolkit:knowledge-manual -->

# How to use project knowledge

Read this once at session start or when invoked via the remember skill. It is the knowledge operating manual for the AI second-brain AKA "knowledge" for the project.

## What loads at startup

The loader reads these files in order when present:

1. `SOUL.md`: who the agent is in this project.
2. `knowledge/README.md`: this operating manual.
3. `knowledge/project.md`: what the project is and where work is tracked.
4. `knowledge/current.md`: disposable short-term work state.
5. `knowledge/memory/memory-index.md`: one line per memory file.
6. `knowledge/specs/spec-index.md`: one line per specification file.

## Put information in one place

<!-- knowledge-policy:routing:start -->

| Information | Canonical home |
| --- | --- |
| The agent's role and purpose here | `SOUL.md` |
| A standing instruction for agent behavior | `.claude/rules/` |
| A repeatable procedure | A skill |
| Settled behavior of the system, written in non-technical language | `knowledge/specs/` |
| A lasting fact, decision, event, context, or constraint | `knowledge/memory/` |
| Current objective, blocker, and next step | `knowledge/current.md` |
| Lessons about what this owner saves | `knowledge/memory-self-improvement.md` |
| Requirements and status for one piece of work | The work tracker |
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

## For your (AI agent) reference on what a typical work-item lifecycle is

The typical lifecycle of a work item is discovery->refinement->requirements finalization->solution design->OPTIONAL work item breakdown and further sub-item refinement->implementation plan->project management setup (for work item implementation tracking)->build phase->testing->iteration bug fixing->user approval->PR/push->deployment. The spec is typically updated after deployment since requirements could slightly change during build/testing phases.

## What should be saved into the memory base

Knowledge base memories are typically surfaced during a working session with the AI agent and the user in a project chat session (i.e. working on a work item, solutioning, user providing context, etc. etc.). The typical lifecycle of a work item is listed here under the '## For your (AI agent) reference on what a typical work-item lifecycle is' heading for reference.

### Working/short-term memory

Working memory is the active context required to complete the current task.
Examples include:

- the current conversation;
- active goals and plans;
- tool outputs;
- retrieved documents;
- temporary files;
- intermediate calculations;
- scratch notes;
- unverified hypotheses;
- current debugging observations;
- partial implementation state.

Working memory is necessary, but it is not automatically durable knowledge.

Most working memory should disappear when the work is complete.

The system may preserve session or work-item state long enough to resume interrupted work, but **resumability is not the same thing as long-term memory**.

A tool result, transcript, execution trace, or scratch note should not become long-term memory merely because it existed.

<!-- knowledge-policy:save-test:start -->
### Long-term memory

Long-term memory comes in a few kinds, borrowed from cognitive science: working
memory, semantic memory, episodic memory, and procedural memory. These categories
describe **what kind of knowledge something is**. They do not require every
category to live in the same physical folder. Some forms of durable agent
knowledge belong in the persistent memory base, while others belong in skills,
rules, specifications, or native agent instructions.

These are the non-negotiables of what are considered AI Memory :

1. The information MUST be relevant to the project itself.
2. Project memory is: persistent facts, decisions, user feedback, project milestones, project context (people, places, things, goals, etc.), project state, meaningful project events that occurred, constraints, relationships, facts that are difficult to infer from the repository alone, current truths about the project that the future agents will otherwise repeatedly need explained. These pieces of memory must be provided by the user or worked out by both the user and the agent together during a particular session.

<!-- knowledge-policy:save-test:end -->

<!-- knowledge-policy:never-save:start -->
### What never goes in memory

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
- A procedure that belongs in a rule or a skill.
- Authoritative system behavior that belongs in a specification.
- An open task or implementation step that belongs in work-item tracking.
- Live status of current work.
- Anything stale, superseded, or contradicted with no historical value.
- Passwords, keys, and tokens, ever, because this folder is in Git and Git keeps everything.

<!-- knowledge-policy:never-save:end -->

### Reject example

A real proposal, rejected. It asked to amend a memory about which Salesforce org
is which: "The CLI default org for this repository is GREEN_FullCopy, set in the
committed `.sf/config.json`. Mike set it to GREEN on 2026-08-11 in commit a0605f0
and changed it to GREEN_FullCopy the next day in commit 3a53b56. A read without
`-o` returns sandbox rows that look like production data. Always name the org.
The policy and reasoning are in the `salesforce-safety-guardrails` rule."

It fails three ways:

- Question 5: the default value sits in a committed config file, so a pointer to
  that file is the only allowed form.
- Routing: "always name the org" is a procedure a loaded rule already owns, and
  procedures are never memory.
- Question 3: the commit-by-commit history is agent work history, not a change
  to the project.

## What should be saved as a `knowledge/specs/`

Specs are finalized, approved specifications and requirements about how the system should behave - logic, behavior, UI, UX, and other requirements that an AI cannot determine from reading the raw code. The specs should not simple regurgitate what can be understood from reading the raw code.

Specs must be written in clear, concise, laymen's terms without jargon. They should be organized neatly in system areas. They are living truth and must be deduplicated and updated when the AI works with the user to finalize work items. The typical lifecycle of a work item is listed here under the '## For your (AI agent) reference on what a typical work-item lifecycle is' heading for reference.

## Use the two file shapes

<!-- knowledge-policy:file-shapes:start -->

Memory is flat under `knowledge/memory/`, one topic per file, and requires:

`summary`, `type`, `status`, `source`, `confidence`, `created_at`, `tags`,
`approved_by`, `approval_date`.

- `type`: `fact`, `decision`, `event`, `context`, or `constraint`;
- `status`: `current`, `superseded`, or `retired`;
- `confidence`: `observed`, `reported`, or `inferred`;
- `tags`: a free-form YAML list with no fixed vocabulary.

A specification under `knowledge/specs/` requires `summary`, `area`, `status`,
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

Show one numbered group per proposed file:

```text
1. <plain name>
   - What: <the meaning, three sentences at most>
   - Project value: <how this helps future work on the current project>
   - Where: <exact path and action>
   - Source: <source and observed, reported, or inferred>
   - Tags: <tags and filing details>
   - Assumptions: <everything unchecked, or None>
   - Verdict: <one line per save-test question, 1 to 7, each saying pass or fail
     and why. Question 5's line names the files, rules, and config searched.>
```

The verdict lines are shown with the group, so the owner sees the reasoning
before answering.

The owner approves `What`, `Project value`, and `Source`; assumptions are
approved separately.
Silence, an unclear answer, or asking to see full text is not approval. Write
only the approved meaning and source. If the owner edits the words, use those
words exactly.

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
log of recent proposal outcomes.

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
