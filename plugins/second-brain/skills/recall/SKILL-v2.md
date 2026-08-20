---
name: recall
description: >-
  Answer a project question from what the project already holds, widening one
  tier at a time from loaded context to exact lookup, curated search,
  relationship expansion, the tracker, gated session history, and an honest
  failure. Use when picking up work, changing behavior, asking what was decided
  or what happened, checking whether something is already written down, or
  running /recall. Read only. It never writes a canonical file, a cache, or an
  index.
---

# recall

This skill is the read path of memory system v2. It routes a question to the
owner that answers it, widens only when the narrower owner cannot answer, and
ends in either a sourced answer or a stated failure. It never invents a
plausible answer and never substitutes a recent but unrelated record.

The design authority behind it is the toolkit repository's
`knowledge/specs/memory-system.md`, retrieval architecture section 15. That spec
stays in the toolkit and is not installed into projects. Work item P4-6 replaces
that file's content with the approved v2 behavior at cutover, and the path does
not change.

Three things hold for every call here:

1. **Reading changes nothing.** No cache, no index, no working-set file, no
   metric, no local state of any kind. Retrieval reads canonical Markdown and
   exits. It works with `.memory/` absent.
2. **An empty answer stays empty.** A search that finds nothing reports nothing.
   Filling the gap with the nearest recent record is the failure this skill
   exists to prevent.
3. **A failure is a failure, not a no-result.** A parse error, an unknown
   filter, a scope refusal, or an unreadable file comes back as an error. Never
   report it as "there is nothing written about that."

## Step 0: know what this project's memory can do

Run this once per session, before promising an answer:

```text
node <plugin>/tools/memory.mjs capabilities
node <plugin>/tools/memory.mjs status
```

`capabilities` lists the operations this build carries and every degraded
feature with its reason. `status` says what memory holds right now. If an
operation you need reports unavailable, say so plainly and read the files
directly instead. Never invent a command that `capabilities` did not list.

Every command below is `node <plugin>/tools/memory.mjs <operation>`, where
`<plugin>` is wherever the second-brain plugin is installed for this project.

## Route the question before you search

| Question | First owner |
| --- | --- |
| What should happen? | The current specification |
| Why was this chosen? | The decision record and its evidence |
| What happened? | The event record and the entity timeline |
| What are we working on, and what is next? | `knowledge/current.md` |
| What is the live status of that work item? | The work tracker, where the project has one |
| What exists now? | Code, configuration, tests, deployed state |
| What did the source say? | The original source in the project's mapped reference area |
| What exact words were used in a conversation? | Original session history, after the gate |

Search with the project's own terms, exact tool and product names, and the
aliases the records already carry. Do not expand blindly into synonyms. An alias
never replaces the exact name, so carry both.

## The tier ladder

Start at tier 0. Move down one tier only when the tier you are on cannot answer.
Say which tier answered.

### Tier 0: loaded context

The boot brief already in this session carries the project identity, the current
focus, the blockers, the next step, and the pinned records. If it answers, that
is the answer. Do not run a search to confirm something already on screen.

### Tier 1: exact lookup

When you know the id or the path, open the record itself:

```text
node <plugin>/tools/memory.mjs get --id <record-id>
node <plugin>/tools/memory.mjs get --path knowledge/memory/decisions/<file>.md
node <plugin>/tools/memory.mjs spec-get --id <spec-name>
node <plugin>/tools/memory.mjs spec-get --path knowledge/specs/<file>.md
```

`--id` and `--path` are two different lookups. Pass exactly one. `get` returns
the whole record, its front matter, and its body, which is what a real answer
needs.

### Tier 2: curated project search

When you know the meaning but not the id:

```text
node <plugin>/tools/memory.mjs search --query "<the meaning in plain words>"
node <plugin>/tools/memory.mjs search --query "<meaning>" --type decision
node <plugin>/tools/memory.mjs search --query "<meaning>" --domain <domain> --topic <topic>
node <plugin>/tools/memory.mjs spec-search --query "<expected behavior>"
```

`--type` takes `fact`, `decision`, `event`, or `pattern`. `--status` takes
`active`, `superseded`, or `retired`, and without it a search answers with
active records only, because history is not current truth. `--limit` takes a
whole number. An unknown filter value is an error, not a quiet empty answer.

`spec-search` covers `knowledge/specs/` only. Use it for "what should happen"
and `search` for everything else.

A match is a place to open, not an answer. Open the record before you rely on
it.

### Tier 3: relationship and timeline expansion

When one record is not the whole story:

```text
node <plugin>/tools/memory.mjs related --id <record-id>
node <plugin>/tools/memory.mjs timeline --entity <entity> --from 2026-01-01 --to 2026-08-01
node <plugin>/tools/memory.mjs sources --id <record-id>
```

`related` returns outgoing links from the record's link fields and its body,
plus backlinks derived from the project's tracked Markdown as it stands now.
There is no link registry to be stale. A file that names the record without
linking to it comes back as a mention, which is honest rather than hidden.

`timeline` returns one entity's dated sequence, oldest first, and deliberately
includes superseded and retired records, because a history question is exactly
what those records still answer.

### Tier 4: active work and the tracker

Read `knowledge/current.md` for the current focus, the blockers, the next step,
and the handoff. Read `knowledge/project.md` and `knowledge/map.md` when you
need the project's identity or where its own areas live.

Live work-item status belongs to the tracker, not to memory. The retrieval
router does not call the tracker adapter, so the tracker's live status reaches
you through the boot brief where one is configured, or by reading the tracker
directly with the project's own tooling. Never treat `knowledge/current.md` as a
second copy of tracker status, and never restate one inside the other.

### Tier 5: session history, behind a gate

Native session history stays in the host's own store. It is searched in place,
read only, and only when one of these is true:

- the owner asked to search past conversations; or
- you have searched the relevant current owners and can name why they are
  insufficient for this question.

Name the insufficiency out loud before you search. "I did not find it yet" is
not a reason. "The specification states the behavior but not who asked for the
change, and no decision record cites it" is.

The `session-search` skill owns the search itself. A result carries the host,
the session id, the date, the role, the message locator, and a short excerpt.
Open the exact segment before relying on its wording.

**A history miss is scoped, never absolute.** Report the machine, host, project,
and date range actually searched. A miss means no evidence was found in that
named scope. It never means the subject was never discussed. History search is
optional, and its absence never fails project memory.

### Tier 6: honest failure

When the ladder ends without reliable evidence, say so and name:

- the current project layers searched;
- whether a tracker was available;
- whether direct search was available;
- the session-history machines, hosts, and dates searched, or that history was
  not searched and why; and
- any source that could not be read.

Every retrieval call returns a `searched` list carrying exactly this. Use it
rather than writing the scope from memory. Do not offer an unrelated recent
record as a consolation answer, and do not guess.

## How to read a result

Each result carries the project id, the layer, the record id or path, the
status, a one-sentence summary, the provenance, the match reason, and a
degraded-state warning when one applies.

The `project_id` says which project answered. A result from another project's
scope is not an answer to this project's question.

A `degraded_warning` is not decoration. It appears when a record is superseded
or retired, cites no evidence, is missing version 2 metadata, or is a
specification with no front matter. Repeat the warning when you use the result.

At equal relevance, results rank in this order, and so should your answer:

1. the current approved specification or the original source;
2. the current owner or client statement;
3. source code, Git, issue, or pull request evidence;
4. active memory;
5. agent observation; and
6. agent inference or unchecked brainstorm.

## What memory holds: four types, not seven folders

Records are one of four types, one meaning per file, in the folder matching
their type:

| Type | Holds | Folder |
| --- | --- | --- |
| `fact` | A durable state of the world for this project | `knowledge/memory/facts/` |
| `decision` | A choice and why it should not be reopened | `knowledge/memory/decisions/` |
| `event` | Something that happened, including completed work | `knowledge/memory/events/` |
| `pattern` | A repeated shape drawn from other records | `knowledge/memory/patterns/` |

Subject matter lives in the `domain` and `topics` fields, not in the folder
name, so search by `--domain` and `--topic` rather than guessing a folder. A
project may map its own reference, delivery, and brainstorm areas, and
`knowledge/map.md` names them.

`status` says whether a record is current: `active`, `superseded`, or `retired`.
A superseded record is history. Follow `superseded_by` to the successor before
answering with it.

## Trust exactly what epistemic_status allows

`epistemic_status` says how the record knows what it says. It is a required
field, and it decides how far you may lean on the record.

| Value | What it means for your answer |
| --- | --- |
| `approved` | The owner approved this meaning. Current truth |
| `documented` | A named document supports it. Cite the document |
| `observed` | An agent or the owner directly observed it. Cite when and where |
| `reported` | Someone reported it. Attribute it rather than stating it flatly |
| `diagnosed` | It is a conclusion from investigation. Give the reasoning with it |
| `inferred` | It was reasoned from other records. Say so, and name `based_on` |
| `suspected` | It is a lead. Never current truth |
| `unknown` | The record does not know. Treat it as an open question |

Specifications carry the owner's approved words. A memory record that conflicts
with a current specification does not overrule it: show both and treat the
specification as current behavior unless the owner approves changing it.

Repetition and age never promote a claim. An `inferred` record that has been
read fifty times is still inferred.

## Consequential recall

An answer is consequential when someone will change code, change behavior,
commit, ship, or tell a client because of it. For those, a search line is not
enough. Before answering:

1. **open the complete current record** with `get --id`, not the search summary;
2. **follow provenance** with `sources --id`, which returns each evidence entry,
   its `source_type`, its locator, when it was observed, and whether a locator
   inside the project is reachable;
3. **read the original evidence** at that locator, not the record's description
   of it;
4. **check `status`, `effective_from`, and `effective_to`**, so you do not
   answer with something that has expired or been replaced; and
5. **return the conflicts and the uncertainty with the answer**, rather than
   presenting a clean answer you had to pick between.

`sources` reports a locator it could not reach as unreachable and a locator
outside the project as unchecked. Say which one you got. An unreachable
evidence locator weakens the answer and the owner needs to know that.

Where the record names other records in `based_on`, read those too. An inference
is only as good as what it rests on.

## Follow-up questions in the same conversation

The conversation may keep the paths and record ids it just opened, so follow-up
questions stay natural. That memory is the conversation, not a file. Retrieval
writes no working set. When the question or the scope changes, search the
canonical files again rather than reusing what you happened to have open.

## Conflicts

When two current sources disagree, return both with their layers and their
provenance. Do not silently choose. Show the exact statements, name which layer
each came from, and let the owner decide. Records that conflict on purpose are
linked through `conflicts_with`, and `related --id` surfaces that link.

When saved memory conflicts with code or observed behavior, show both. Changing
the record is a save, which belongs to the `remember` skill and needs the
owner's approval.

## Optional Obsidian tools

Where the owner's machine has an Obsidian MCP server (tools named
`mcp__obsidian__*`) or the `kepano/obsidian-skills` skills installed, they may be
used to find, read, and search notes under `knowledge/`. Reading only. They are
optional, the vault is ordinary Markdown, and everything here works without
them. Never let a plugin view stand in for opening the canonical file.

The same holds for any navigation view or summary a project has separately
approved. It may help a person browse. Retrieval never depends on it, and a
generated view is never primary evidence.

## Edge cases

- **The question is already answered on screen:** answer from the boot brief and
  say so. Do not run a search for form's sake.
- **Search returns nothing:** report nothing found, name the scope from the
  `searched` list, and offer the next tier. Never fill the gap.
- **A command errors:** report the error and its reason code. An error is not
  evidence of absence.
- **A result carries a degraded warning:** repeat the warning with the answer.
- **The only match is superseded or retired:** say it is history, follow
  `superseded_by`, and answer from the successor.
- **The only match is `inferred` or `suspected`:** answer with the uncertainty
  attached, and offer to verify rather than promoting it.
- **A record cites evidence you cannot reach:** say the locator is unreachable
  and do not present the claim as verified.
- **The question is about live work status:** it belongs to the tracker, not to
  memory. Read the tracker, and say when no tracker is configured.
- **The question needs exact past wording:** state why current owners are
  insufficient, then use `session-search`. Never skip that sentence.
- **History finds nothing:** name the machine, host, project, and dates
  searched. Never say the subject was never discussed.
- **`.memory/` is absent:** retrieval works normally. That folder is local state
  the read path does not need or create.
- **A result names another project's scope:** it is not an answer here. Say so.
- **Someone asks retrieval to write, index, or cache something:** refuse. Any
  retrieval acceleration needs a new owner-approved decision record first.
