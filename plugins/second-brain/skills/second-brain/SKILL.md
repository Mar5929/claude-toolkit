---
name: second-brain
description: >-
  Set up, adopt, explain, review, or maintain the shipped Git-native
  second-brain v3 system for Claude and Codex. Use for project memory,
  knowledge, specifications, durable-update reviews, v3 installation, and
  brownfield adoption. V3 uses Markdown and Git only. Never import retired v1
  content or add a database, memory MCP server, hooks, scripts, embeddings,
  transcript capture, or background curation.
---

# Second-brain v3

Second-brain v3 is the toolkit's production-ready project memory and knowledge
system. It uses human-readable Markdown committed to the adopting project's Git
repository.

The complete core contains:

- one shared rule at `.claude/rules/second-brain.md`;
- one on-demand role at `.claude/agents/memory-librarian.md`;
- equivalent compact routes in `CLAUDE.md` and `AGENTS.md`;
- flat indexed discovery under `brainstorms/`;
- capability specifications under `specs/`; and
- typed memory for context, planning, decisions, knowledge, references, domain,
  and operations.

V3 has no database, memory MCP server, embeddings, runtime scripts, memory
hooks, transcript capture, or background curator.

## Canonical sources

Read these completely before performing the matching work:

- `references/second-brain-rule.md`: canonical installed behavior and schema.
- `references/folder-layout.md`: complete core and project-area structure.
- `references/markdown-schemas.md`: copy-ready document shapes.
- `references/orientation-snippet.md`: shared root-file route.
- `references/adoption-guide.md`: greenfield and brownfield workflows.
- `../../agents/memory-librarian.md`: reusable specialist role.
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
4. **Durable-update review.** At an approved completion point, propose useful
   updates and invoke the memory librarian after approval.
5. **Maintenance.** Repair indexes, links, conflicts, or structure within the
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

1. copy the canonical rule and role;
2. copy every root index template;
3. merge the orientation snippet into both root instruction files without
   replacing existing content;
4. add only the approved real system-area indexes;
5. review the diff for duplicate or conflicting authority; and
6. offer the initial memory pass and `grill-me`.

Setup scaffolding is an ordinary approved project change. Initial project
context, planning, specifications, and memory use the memory librarian.

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

Read `.claude/rules/second-brain.md` and conduct its durable-update review only:

- at substantial task completion before the pull request is opened or merged;
- at the end of a brainstorm or requirements interview; or
- at the end of a milestone or project phase.

An unfinished-session handoff, ordinary response, commit, or timer does not
trigger the review.

Propose every useful durable update. There is no fixed limit. The owner may
approve, select, edit, combine, defer, or skip proposals in normal language.

## Invoke the memory librarian

After approval:

1. provide the approved content and boundaries;
2. provide the current worktree and branch;
3. provide relevant task, code, test, and discussion context;
4. identify known canonical documents, brainstorms, and relationships;
5. identify any separately approved risky structural work; and
6. state what the librarian must not infer.

For Claude, invoke the installed `memory-librarian` project agent. For Codex,
delegate to a subagent and instruct it to read
`.claude/agents/memory-librarian.md` and
`.claude/rules/second-brain.md` completely before writing.

If the host cannot invoke a dedicated agent, report the approved update as
pending. Do not silently replace the librarian with an unreviewed ad hoc write.

The main agent must inspect the actual diff after the librarian finishes.

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
