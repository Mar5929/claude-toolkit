---
name: remember
description: >-
  Save clear owner-approved project information through second-brain v3, into
  the specification when it states what the system should do and into memory
  otherwise. Recognize requests such as "remember this", "save that", "capture
  what we did", "remember that <feature> should <behavior>", or "/remember".
  Draft the real words, have the read-only memory verifier check every claim,
  show the owner what will be written, then save it in Markdown and Git. Never
  write retired v1, create a quick-write store, or add databases, embeddings, or
  transcript capture. A hook never writes memory.
---

# Remember with second-brain v3

A clear request to remember specific information supplies approval to save that
content. The owner does not need to approve a second filing proposal.

## Confirm v3 is installed

The project must contain:

- `.claude/rules/second-brain.md`;
- `.claude/references/second-brain-reference.md`;
- `.claude/agents/memory-verifier.md`;
- `.claude/tools/memory-index-build.mjs` and
  `.claude/tools/memory-shape-check.mjs`;
- `brainstorms/README.md`;
- `specs/README.md`; and
- `memory/README.md` with all seven typed memory indexes.

If the coherent v3 core is absent, explain that nothing was written and offer
the `second-brain` setup or brownfield adoption workflow. Do not create a
partial memory folder as a shortcut.

## Understand the request

If the content and intended meaning are clear, proceed.

Examples:

- `Remember that production releases require owner approval` is clear.
- `Remember this discussion` is ambiguous. Propose the specific durable
  takeaway or ask one focused question.
- `Remember this and reorganize all architecture documents` approves the
  identified memory, not the large reorganization.

Do not use a parser or require a magic phrase. Interpret the owner's normal
language with AI judgment.

## Decide first whether it is a specification or memory

The word "remember" makes memory the obvious destination and it is often the
wrong one. Ask this before anything else: **is the owner telling you what the
system should do?** If they are, it belongs in `specs/`, and filing it in a
memory folder hides approved behavior where the next session will not look for
it. `.claude/rules/second-brain.md` has the full routing table, and
`.claude/references/second-brain-reference.md` has the detail behind it. This is
the one split that gets missed.

| The owner said | Where it goes |
|---|---|
| `remember that the export skips archived records` | `specs/<area>/<capability>/README.md`, under Required behavior |
| `remember that an export of more than 50,000 rows has to page` | the same specification, under Scenarios and edge cases |
| `remember that we built the export nightly because the API rate limit made it hourly impossible` | `memory/decisions/` |
| `remember that the vendor API returns 200 on a failed write` | `memory/knowledge/` |
| `remember that "archived" means closed more than 90 days, not deleted` | `memory/domain/` |

A statement about what the system should do goes in the specification even when
the owner used the word "remember", even when it is one sentence, and even when
no specification for that capability exists yet. When none exists, creating the
first `specs/<area>/<capability>/README.md` for an area that already exists is
routine placement. Creating a **new top-level system area** is a structural
change and needs the owner's visible approval first.

One request can be both. Split it, and say in the list which part went where.

## Check it before the owner sees it

The owner cannot tell whether a date, a count, or a gap is right. So nothing
unchecked reaches them.

Draft the exact words first. Then invoke the memory verifier in the foreground
and wait for its report. Give it the drafted text, the destination path for each
piece, and a source for every claim, saying which of the three kinds it is:

- **it is in a file**, and the verifier opens that file;
- **the owner said it**, and the verifier compares the draft against the owner's
  actual words, which you supply; or
- **the agent worked it out**, which nothing can confirm, so the verifier flags
  it as unchecked.

Claude invokes the installed `memory-verifier` agent. Codex delegates to a
subagent told to read `.claude/agents/memory-verifier.md` and
`.claude/rules/second-brain.md` first. Either way, wait for the report. Nothing
runs in the background.

Fix what came back wrong. Mark anything the verifier could not confirm so the
owner can see it is unchecked. Never quietly drop it and never quietly write it
as though it were solid.

## Show the real words, then save them

Show the actual text that will be written, with its destination path. Not a
summary of it, and not a table describing it.

```
specs/export/record-export/README.md
  ## Required behavior
  Archived records are excluded from every export.

memory/domain/export-terms.md
  "Archived" means closed more than 90 days ago, not deleted.
  Basis: Owner-confirmed 2026-08-04.
  UNCHECKED: the 90 day figure. The owner said "about three months".
```

Then act on the clarity of the request:

- **The request named the content** (`remember that production releases require
  owner approval`). Show the words and save them in the same turn. A clear
  request already approved the content, so do not ask for a second approval. The
  words are shown so the owner can correct anything before it settles.
- **The request was vague** (`remember this`, `/remember` with no argument).
  Draft the specific durable takeaways you would save, have them checked, show
  them, then **stop and wait**. Do not guess at the content. Ask through
  whatever blocking question mechanism the host provides, not in ordinary prose.

An edit the owner makes is written exactly as they wrote it. It needs no further
checking, because they are the source. If you think the edit is wrong, say so
and talk about it. Do not quietly change the words back.

Say plainly when something the owner might expect to be saved is already
recorded, and name the document that holds it, rather than filing a duplicate.

Never expand beyond what the owner approved. A request to remember one thing is
not licence to record everything discussed.

## Save it

1. Read `.claude/rules/second-brain.md`.
2. Confirm the current repository, worktree, and branch.
3. Write the approved words, exactly as the owner saw or edited them.
4. Run `node .claude/tools/memory-index-build.mjs`, then
   `node .claude/tools/memory-shape-check.mjs`. A failed shape check means the
   save is not finished: say what is missing in plain words and fix it.
5. Report what changed and where. If anything landed somewhere other than the
   destination you showed the owner, say so and explain why.
6. **When the save reversed something a specification already said, show the old
   wording and the new wording.** Nothing stopped to ask first, so this report is
   the only place the owner sees that approved behavior changed rather than grew.
   Put the two lines next to each other and name the document:

   ```
   specs/export/record-export/README.md
   was:  Archived records are excluded from every export.
   now:  Archived records are included in every export.
   ```

   Adding a behavior no specification covered yet is not a reversal and needs no
   before-and-after block.

Routine placement, index maintenance, and mandatory links need no second
decision after the content is approved. A risky or large change involving
deletion, authority, canonical homes, broad reorganization, splitting, merging,
supersession, or a new top-level system area needs a separate visible proposal
and the owner's approval first.

**When the save is only one added line to a list**, take the smallest path. The
index builder produces that line from the document itself, so there is no new
claim to check and nothing to approve. Run the builder and the shape check, and
say what changed.

If the verifier cannot be invoked or cannot finish, say so. Do not save
unchecked words as though they had been checked. Retry or report the failure,
and keep the task unfinished. The pull request may open under the project's Git
workflow, but it does not merge as though the check happened unless the owner
explicitly waives it.

## Boundaries

- Keep live ticket status, blockers, assignments, and handoffs in work-tracker.
- Keep raw meetings, transcripts, communications, and deliverables in their
  ordinary project artifact homes.
- Never store credentials, secrets, private data that does not belong in Git,
  raw chat transcripts, or temporary debug output.
- Never read or import retired v1 Worker, Neon, MCP, curator, hook, outbox,
  cache, or knowledge content.
- Never commit, push, merge, deploy, or contact external systems as part of
  remembering.
