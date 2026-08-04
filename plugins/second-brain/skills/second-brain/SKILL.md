---
name: second-brain
description: >-
  Set up, adopt, explain, review, or maintain the shipped Git-native
  second-brain v3 system for Claude and Codex. Use for project memory,
  knowledge, specifications, durable-update reviews, v3 installation, and
  brownfield adoption. V3 uses Markdown and Git only. Never import retired v1
  content or add a database, memory MCP server, embeddings, transcript capture,
  or background curation. A hook may enforce a rule or start a review, never
  write memory.
---

# Second-brain v3

Second-brain v3 is the toolkit's production-ready project memory and knowledge
system. It uses human-readable Markdown committed to the adopting project's Git
repository.

The complete core contains:

- one always-loaded procedure at `.claude/rules/second-brain.md`;
- the longer routing detail at `.claude/references/second-brain-reference.md`,
  opened only when the routing is unclear;
- one read-only checking role at `.claude/agents/memory-verifier.md`;
- two scripts in `.claude/tools/`, `memory-index-build.mjs` and
  `memory-shape-check.mjs`, which do the mechanical part in about a second;
- equivalent compact routes in `CLAUDE.md` and `AGENTS.md`;
- flat indexed discovery under `brainstorms/`;
- capability specifications under `specs/`; and
- typed memory for context, planning, decisions, knowledge, references, domain,
  and operations.

V3 has no database, memory MCP server, embeddings, transcript capture, or
background curator. The memory core installs no hooks of its own. A hook from
the `hooks-library` plugin may enforce a rule or start a review, and never
writes memory.

## Canonical sources

Read these completely before performing the matching work:

- `references/second-brain-rule.md`: the always-loaded procedure. How a save
  works, who writes, when to run the review, and the boundaries.
- `references/second-brain-reference.md`: what each home is for, the optional
  document aids, evidence, repetition, links, and superseding.
- `references/folder-layout.md`: complete core and project-area structure.
- `references/markdown-schemas.md`: copy-ready document shapes.
- `references/orientation-snippet.md`: shared root-file route.
- `references/adoption-guide.md`: greenfield and brownfield workflows.
- `../../agents/memory-verifier.md`: the read-only checking role.
- `../../tools/memory-index-build.mjs`: builds each index's list of documents
  from the documents themselves.
- `../../tools/memory-shape-check.mjs`: confirms title, summary, source line,
  allowed folder, and index entry, in about a second.
- `references/templates/`: copy-ready root indexes.

Resolve paths from this installed skill or the local toolkit checkout. Do not
recreate the canonical files from memory.

## Determine the request

Use the appropriate path:

1. **Explain or locate.** Describe the authority map or help the agent find
   current project truth.
2. **Greenfield setup.** Install the complete core after showing the exact tree
   and receiving approval.
3. **Brownfield adoption.** Perform a read-only audit first, show exact proposed
   treatments, and change only what the owner approves.
4. **Durable-update review.** At an approved completion point, draft the real
   words, have the memory verifier check them, then show the owner and save what
   they approve.
5. **Pre-merge review.** When a pull request contains durable-document changes,
   have the verifier compare them with the latest project memory before merge.
6. **Maintenance.** Repair indexes, links, conflicts, or structure within the
   owner-approved boundary.

Use `project-init` as the normal orchestrator for a new project and
`project-sync` for an existing project. A direct `/second-brain` request may
perform the same scoped setup or adoption workflow.

## Setup boundary

Before writing:

1. Confirm the repository, current worktree, and branch.
2. Determine whether the project is greenfield or brownfield.
3. Read `references/adoption-guide.md`.
4. Show the complete core, known project-specific system areas, and root-file
   edits.
5. Ask the owner to approve, edit, or skip v3 as one coherent system.

Do not offer a partial installation that omits the rule, role, root routes,
indexes, or one of the seven typed memory homes.

After approval:

1. copy the canonical rule, the reference, the verifier role, and both scripts;
2. copy every root index template;
3. merge the orientation snippet into both root instruction files without
   replacing existing content;
4. add only approved real specification areas, and create each memory-area index
   with the first durable document that area owns;
5. review the diff for duplicate or conflicting authority; and
6. offer the initial memory pass and `grill-me`.

Setup scaffolding is an ordinary approved project change. Initial project
context, planning, specifications, and memory go through the save flow in the
rule: draft, check, show, save.

## Brownfield adoption

Read and follow the complete audit in `references/adoption-guide.md`.

Make no project changes during the audit. Preserve good existing document
homes. For every source recommend one of:

- keep and link;
- move with approval;
- consolidate with approval; or
- leave unresolved.

Distinguish observed behavior, inference, owner-confirmed intent, and unknowns
when confusing them could mislead future work.

Never mass-move, duplicate, delete, or declare existing documents current to
make the repository resemble a template.

## Main-agent completion review

Read `.claude/rules/second-brain.md` and conduct the memory check it describes.
That rule owns when the check runs, what the proposal looks like, and what
counts as approval. Do not paraphrase it here or anywhere else: three slightly
different wordings of the same rule is how they drifted apart before.

Two things from it that are easy to get wrong, restated as pointers rather than
as a second copy:

- The check runs at the moment a pull request is opened, and the pull request
  does not wait for the owner's answer.
- Asking the owner a yes-or-no question is not approval. Show them the actual
  words, already checked, and save what they approve.

## Draft, check, then save

The main agent owns whether what gets written is true. It drafts the exact
words, it saves them, and it never hands correctness to somebody else.

Before the owner sees anything, invoke the memory verifier and wait for its
report. Give it:

1. the exact drafted text and the destination path for each piece;
2. a source for every claim, and which of the three kinds it is (it is in a
   file, the owner said it, or the agent worked it out);
3. the owner's actual words for anything of the second kind;
4. the current worktree and branch; and
5. which lines the owner wrote themselves, which are not to be checked.

For Claude, invoke the installed `memory-verifier` project agent in the
foreground. For Codex, delegate to a subagent and instruct it to read
`.claude/agents/memory-verifier.md` and `.claude/rules/second-brain.md`
completely first. Either way, wait for the report. Nothing runs in the
background, because a report that never arrives is the same as no check.

Then fix what came back wrong, mark what could not be confirmed, show the owner
the real words, and save what they approve. Run
`node .claude/tools/memory-index-build.mjs` and then
`node .claude/tools/memory-shape-check.mjs`. A failed shape check means the save
is not finished.

If the verifier cannot be invoked or cannot finish, say so. Do not save
unchecked words as though they had been checked. Retry or report the failure,
and keep the task unfinished. The pull request may open under the project's Git
workflow, but it does not merge as though the check happened unless the owner
explicitly waives it.

## Review parallel memory before merge

When a pull request contains specification or memory changes, first bring the
branch current through the project's Git workflow. Then invoke the memory
verifier again, in the foreground. Give it the pull-request changes and ask it
to compare them with the latest relevant documents and indexes for:

- the same durable truth placed in two different canonical files; and
- conflicting current guidance that Git merged without a text conflict.

The verifier sizes the read to the change: a new durable document gets the full
read, an amendment gets that document and what it links to, a generated index
line gets a quick look. It reports `Clear` or names both paths and the concrete
overlap or conflict. It does not discard another branch's information, and it
performs no repair. Any repair that deletes, consolidates, moves, splits, or
supersedes content requires the normal visible owner approval, and the main
agent makes it.

## Archived v1 boundary

V1 Worker, Neon, MCP, curator, hook, outbox, cache, and knowledge content is not
a v3 migration source or current truth.

Do not contact cloud resources, open secret files, read legacy memory, or
import it. Existing local v1 wiring does not block v3 setup. During a
brownfield audit, list that committed wiring separately and offer locally
approved deactivation or removal without making it part of v3 memory.

The installable plugin contains no v1 implementation. Historical source exists
only in the toolkit repository archive and is not setup or migration guidance.

## Git boundary

All writes stay in the requesting session's worktree. Second-brain does not
commit, push, open or merge pull requests, deploy, or clean up worktrees.
Existing Git workflow rules own those actions.
