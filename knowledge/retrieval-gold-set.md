# Retrieval gold set

Ten questions in my own words, each with the file that should answer it. The
runner asks the memory tool every question and checks whether the expected file
comes back near the top.

- Bar: 8 of 10
- Results checked: the first 5

Run it with:

```
node plugins/second-brain/tools/gold-set.mjs
```

Every retrieval change runs this set before and after. A change nobody can
measure does not get accepted, which is the whole reason the file exists.

## What the runner says today

This repository still runs memory system v1. Its `knowledge/project.md` carries
no project front matter yet, so the memory tool cannot resolve the project and
no question can run. The runner reports that as `not-measured` with every
question blocked. It never reports a pass it did not earn.

The cutover work item turns that on. After it lands, the questions marked
`Answerable: now` run immediately. The ones marked `after migration` stay
pending until the migration gives those records their version 2 front matter,
because a record with no `status`, `id`, or `entities` field is not something
the router can return. Pending is not a failure. It is a list of what the
migration still owes this set.

Two things the migration has to get right for this set to reach the bar:

- the decision about `CLAUDE.md` and `AGENTS.md` needs the record id
  `decision-claude-md-and-agents-md-carry-the-same-block` and needs `AGENTS.md`
  in its `entities` list.
- the decision about where the memory spec lives has to be pinned.

If the migration lands different values, change the question rather than the
record. The questions are the fixed point here.

## How to read one question

The heading is the question in my words. The bullets under it say what the
runner does with it.

- **Ask** is the operation: `search` by default, or `get`, `spec-search`,
  `spec-get`, or `timeline`.
- **Query** is what gets typed into search when it differs from the heading.
- **Expect** names the files that have to come back, in backticks, or the word
  `nothing` when the honest answer is no result at all.
- **Case** says which of the section 18.1 cases this question covers.
- **Answerable** is `now` or `after migration`.

## The questions

### How does project knowledge work in this repo?

- Expect: `knowledge/specs/memory-system.md`
- Case: owner vocabulary
- Answerable: now

### Where does a folder instruction file belong, and what goes in it?

- Expect: `knowledge/specs/project-setup/folder-instruction-files.md`
- Case: routing
- Answerable: now

### What has to be true before something gets written down as a memory?

- Expect: `knowledge/specs/memory-system.md`
- Case: memory-absent
- Answerable: now
- Note: this one has to run with no `.memory/` folder in the project. The runner
  reports it blocked rather than deleting anything.

### Anything here about the Kubernetes autoscaler?

- Query: Kubernetes autoscaler
- Expect: nothing
- Case: must-return-nothing
- Answerable: now
- Note: the typed query is the subject on its own. A full sentence drags common
  words into the search and pulls back files that have nothing to do with it.

### What did the acme-billing project decide about invoices?

- Query: acme-billing invoices
- Expect: nothing
- Case: cross-project
- Answerable: now
- Note: acme-billing is another project. This repo must answer for itself and
  nothing else.

### Why does AGENTS.md repeat the same block instead of pointing at CLAUDE.md?

- Expect: `knowledge/memory/decisions/claude-md-and-agents-md-carry-the-same-block.md`
- Case: decision-rationale
- Answerable: after migration

### Open the decision about the shared block by its id

- Ask: get
- Id: decision-claude-md-and-agents-md-carry-the-same-block
- Expect: `knowledge/memory/decisions/claude-md-and-agents-md-carry-the-same-block.md`
- Case: exact-id
- Answerable: after migration

### Which two pushes changed the style file without its copy?

- Query: 09f28ab 36d2c2e
- Expect: `knowledge/memory/facts/nothing-catches-a-drifted-copy-before-it-lands.md`
- Case: punctuation-and-digits
- Answerable: after migration
- Note: the expected path is where the migration puts this record. It sits in
  `knowledge/memory/knowledge/` until then.

### What has happened to AGENTS.md over time?

- Ask: timeline
- Entity: AGENTS.md
- Expect: `knowledge/memory/decisions/claude-md-and-agents-md-carry-the-same-block.md`
- Case: timeline
- Answerable: after migration

### Where does the memory system spec live, and why is it not copied into projects?

- Expect: `knowledge/memory/decisions/memory-system-spec-stays-in-the-toolkit.md`
- Case: pinned
- Answerable: after migration
