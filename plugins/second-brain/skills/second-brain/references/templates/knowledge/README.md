<!-- claude-toolkit:knowledge-manual -->

# How to use project knowledge

Read this file once when a session starts. It is the operating manual for this
project's knowledge system and wins if another knowledge instruction disagrees.
Skills may reopen the section they need after context is compacted.

## What loads at startup

The fail-open startup loader reads these files in order when they exist:

1. `SOUL.md`: who the agent is in this project.
2. `knowledge/README.md`: this operating manual.
3. `knowledge/project.md`: what the project is and where work is tracked.
4. `knowledge/current.md`: disposable short-term work state.
5. `knowledge/memory/memory-index.md`: one line per memory file.
6. `knowledge/specs/spec-index.md`: one line per specification file.

Missing files never block the session. If this manual was not supplied by the
startup loader, read it once before using project knowledge. Do not reload it on
every prompt.

## Put information in one place

<!-- knowledge-policy:routing:start -->

| Information | Canonical home |
|---|---|
| The agent's role and purpose here | `SOUL.md` |
| A standing instruction for agent behavior | `.claude/rules/` |
| A repeatable procedure | A skill |
| Settled behavior of the system | `knowledge/specs/` |
| A lasting fact, decision, event, context, or constraint | `knowledge/memory/` |
| Current objective, blocker, and next step | `knowledge/current.md` |
| Requirements and status for one piece of work | The work tracker |
| Information needed only for this task | The conversation only |
| Unchecked exploration | `knowledge/brainstorms/` |
| Outside source material | The project's reference or delivery files |
| Past conversations | Session history |

A procedure is never a memory. Live work is never long-term memory. Do not copy
requirements, code, source material, or another file's meaning into knowledge.
Link to the canonical home instead.

<!-- knowledge-policy:routing:end -->

<!-- knowledge-policy:trust:start -->

`knowledge/current.md` is overwritten, never appended, and is not trusted as a
lasting fact. `knowledge/brainstorms/` is unchecked. A current specification
beats a memory about how the system works. When current files disagree, name
both instead of silently choosing.

<!-- knowledge-policy:trust:end -->

## Find before asking or searching broadly

<!-- knowledge-policy:find:start -->

Use `recall` and stop at the first tier that answers:

1. `knowledge/current.md`.
2. `.claude/rules/`.
3. Skills.
4. The memory and specification indexes, then only the relevant files and their
   links. Check the work tracker when the question is about a work item.
5. Past sessions through `session-search`.

When tiers 1 through 4 find nothing, say what was searched. Offer or announce a
session search before running it. Treat every result as possibly out of date and
ask whether it is still accurate. A past session never becomes current truth or
gets saved on the strength of being found there.

Only files marked `current` answer what is true now. Superseded and retired files
answer questions about history. An index is a map, not evidence. Open the file
before relying on its line.

<!-- knowledge-policy:find:end -->

## Save only durable, useful truth

<!-- knowledge-policy:save-test:start -->

Use `remember`. Before proposing a save, answer all seven questions:

1. Is it a lasting fact, decision, event, state, context, or constraint?
2. Did the project change, rather than the agent merely doing work?
3. Is it likely to remain useful and true in six months?
4. Would omitting it force the owner to explain it again or cause a wrong act?
5. Can it already be found or worked out from code, a rule, skill,
   specification, work item, or existing memory?
6. Can it name its source and where that source can be checked?
7. Could a future agent read it as broader or more certain than it is?

If the first four are not satisfied, do not save. If the last three are not
safe, link, tighten, verify, or do not save. When unsure, do not save.

<!-- knowledge-policy:save-test:end -->

<!-- knowledge-policy:never-save:start -->

Never save tool calls, searches, commands, scratch reasoning, dropped ideas,
temporary steps, routine errors, files opened, edit logs, sub-agent activity,
chat, copies of code or specifications, procedures, open tasks, live status,
stale claims with no historical value, passwords, keys, tokens, or private
personal information.

<!-- knowledge-policy:never-save:end -->

## Use the two file shapes

<!-- knowledge-policy:file-shapes:start -->

Memory is flat under `knowledge/memory/`, one topic per Markdown file. A memory
requires these YAML fields:

`summary`, `type`, `status`, `source`, `confidence`, `created_at`, `tags`,
`approved_by`, `approval_date`.

- `type`: `fact`, `decision`, `event`, `context`, or `constraint`.
- `status`: `current`, `superseded`, or `retired`.
- `confidence`: `observed`, `reported`, or `inferred`.
- `tags`: free-form YAML list. There is no fixed vocabulary.

A specification lives under `knowledge/specs/` and requires `summary`, `area`,
`status`, `source`, `created_at`, `tags`, `approved_by`, and `approval_date`.
Specifications have no `type` or `confidence`.

Optional fields go in only when they apply: `confirmed_at`, `source_quote`,
`effective_from`, `effective_to`, `project`, `work_item`, `supersedes`,
`superseded_by`, and, for memory, `related_memories`.

Use a lowercase, hyphen-separated topic filename. The body starts with a plain
title and explains the truth without depending on the original conversation.
Use ordinary relative Markdown links. Never edit either generated index by hand.

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
   - Where: <exact path and action>
   - Source: <source and observed, reported, or inferred>
   - Tags: <tags and filing details>
   - Assumptions: <everything unchecked, or None>
```

The owner approves `What` and `Source`; assumptions are approved separately.
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

## Skill map

<!-- knowledge-policy:skill-map:start -->

- `recall`: walk the find order and report conflicts or gaps.
- `remember`: test, place, propose, write approved meaning, rebuild, and check.
- `retire`: supersede, retire, or delete one file safely.
- `reflect`: review the whole folder and propose cleanup.
- `session-search`: read-only search of past Claude Code CLI sessions.
- `second-brain`: install, detect, convert, or repair this system.
<!-- knowledge-policy:skill-map:end -->
