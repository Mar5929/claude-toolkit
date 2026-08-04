---
name: remember
description: >-
  Save clear owner-approved project information through second-brain v3, into
  the specification when it states what the system should do and into memory
  otherwise. Recognize requests such as "remember this", "save that", "capture
  what we did", "remember that <feature> should <behavior>", or "/remember". Use
  the on-demand memory librarian to place and write the content in Markdown and
  Git. Never write retired v1, create a quick-write store, or add databases,
  embeddings, or transcript capture. A hook never writes memory.
---

# Remember with second-brain v3

A clear request to remember specific information supplies approval to save that
content. The owner does not need to approve a second filing proposal.

## Confirm v3 is installed

The project must contain:

- `.claude/rules/second-brain.md`;
- `.claude/agents/memory-librarian.md`;
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
it. `.claude/rules/second-brain.md` has the full routing table; this is the one
split that gets missed.

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

## Show what you will save, and where, before writing

Always tell the owner what you are about to record and where it will land. What
you write stays, and they cannot see the placement decision you are making.

Present a short list, one line per document:

```
- <one-line summary of the content>  ->  <destination path>
  Why there: <one clause>
```

Then act on the clarity of the request:

- **The request named the content** (`remember that production releases require
  owner approval`). Show the list and proceed in the same turn. A clear request
  already approved the content, so do not ask for a second approval. The list is
  there for transparency, and so the owner can correct a placement they disagree
  with after the fact. **A specification is written the same way.** The owner
  just stated the behavior, so that is the approval. Do not add a stop the
  memory path does not have.
- **The request was vague** (`remember this`, `/remember` with no argument).
  Recommend the specific durable takeaways you would save and where each would
  go, then **stop and wait**. Do not guess at the content. Ask through whatever
  blocking question mechanism the host provides rather than in ordinary prose.

Say plainly when something the owner might expect to be saved is already
recorded, and name the document that holds it, rather than filing a duplicate.

Never expand the list beyond what the owner approved. A request to remember one
thing is not licence to record everything discussed.

## Delegate the write

1. Read `.claude/rules/second-brain.md`.
2. Confirm the current repository, worktree, and branch.
3. Identify the approved content, relevant context, known canonical documents,
   relationships, and anything the librarian must not infer.
4. **Invoke the dedicated memory librarian. This is mandatory, not a
   preference.** The main agent does not write specification or memory documents
   itself, even when the change looks like a one-line edit it could make faster.
   The librarian owns both homes; routing something to `specs/` is not a reason
   to write it yourself.
   - Claude: use the installed `memory-librarian` project agent.
   - Codex: delegate to a subagent and require it to read
     `.claude/agents/memory-librarian.md` and the canonical rule first.
   Give the librarian the approved content, the destinations you showed the
   owner, the canonical documents to link to, and anything it must not infer.
5. Inspect the resulting diff.
6. Report what changed, where it was placed, why, and any unresolved issue. If
   the librarian filed something somewhere other than the destination you showed
   the owner, say so and explain the difference.
7. **When the write reversed something a specification already said, show the
   old wording and the new wording.** Nothing stopped to ask first, so this
   report is the only place the owner sees that approved behavior changed rather
   than grew. Put the two lines next to each other and name the document:

   ```
   specs/export/record-export/README.md
   was:  Archived records are excluded from every export.
   now:  Archived records are included in every export.
   ```

   Adding a behavior no specification covered yet is not a reversal and needs no
   before-and-after block.

The librarian handles routine placement, nearest-index maintenance, and
mandatory structural links. A risky or large change involving deletion,
authority, canonical homes, broad reorganization, splitting, merging, or
supersession, or a new top-level system area requires a separate visible
proposal and owner approval.

If the host cannot invoke the dedicated librarian or the librarian cannot
finish, do not silently write the update another way. Retry or report the
failure and keep the task unfinished. The pull request may open under the
project's Git workflow, but it does not merge as though the approved update
succeeded unless the owner explicitly waives it.

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
