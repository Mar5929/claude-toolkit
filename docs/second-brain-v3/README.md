# Second-brain v3

Status: current shipped design for the second-brain plugin. Adoption in each
project remains opt-in and owner-approved.

Second-brain v3 is a shared project memory and knowledge system for Claude and
Codex. Its contents are ordinary Markdown files committed to the same Git
repository as the project.

The system is intentionally simple:

1. Root instructions tell Claude and Codex where project truth lives.
2. Agents read only the material relevant to the work.
3. The main agent performs the requested work and notices durable information.
4. At defined completion points and natural stopping points after meaningful
   work, the main agent drafts the exact words it proposes to save, with a
   source on every claim.
5. A read-only agent, `memory-verifier`, checks that draft before the owner sees
   it, and flags every claim it cannot confirm.
6. The owner sees the real words, already checked, and approves, cuts, or edits
   them in normal language.
7. The main agent saves them. Two scripts then rebuild the indexes and check the
   shape of each document.
8. The updates travel through the same worktree and pull request as the task.

V3 is not a database, knowledge graph, transcript collector, background
service, or deterministic rules engine. AI judgment decides what is relevant
and how the approved information fits the schema.

## The system in one picture

```mermaid
flowchart TD
    A[CLAUDE.md or AGENTS.md] --> B[Shared second-brain rule]
    B --> C[Root indexes and relevant system areas]
    C --> D[Current specifications]
    C --> E[Durable memory and knowledge]
    C --> F[Discovery brainstorms]
    G[Main agent completes meaningful work] --> H[Main agent drafts the real words, a source on every claim]
    H --> I[memory-verifier checks the draft, read-only]
    I --> J[Main agent fixes what came back wrong, marks what is unchecked]
    J --> K{Owner response}
    K -->|approve or edit| L[Main agent writes the canonical Markdown]
    K -->|skip| M[Write nothing]
    L --> N[memory-index-build.mjs, then memory-shape-check.mjs]
    N --> O[Task pull request]
    O --> P[memory-verifier duplicate and conflict review]
    P --> Q[Git history on merge]
```

## Project layout

Projects create only the system-area folders and documents they need.

```text
project/
  CLAUDE.md
  AGENTS.md
  .claude/
    rules/
      second-brain.md
    references/
      second-brain-reference.md
    agents/
      memory-verifier.md
    tools/
      memory-index-build.mjs
      memory-shape-check.mjs
  brainstorms/
    README.md
    <date>-<topic>.md
  specs/
    README.md
    <system-area>/
      README.md
      <capability>/
        README.md
        <optional-supporting-document>.md
  memory/
    README.md
    context/
      README.md
      <system-area>/
    planning/
      README.md
      <system-area>/
    decisions/
      README.md
      <system-area>/
    knowledge/
      README.md
      <system-area>/
    references/
      README.md
      <system-area>/
    domain/
      README.md
      <system-area>/
    operations/
      README.md
      <system-area>/
```

`<system-area>` comes from the project, such as `authentication`, `billing`,
`reporting`, `salesforce`, `mobile-app`, or `project-wide`. V3 does not impose a
universal list.

## What each home owns

| Home | What belongs there | Authority |
|---|---|---|
| `specs/` | Current approved product and system behavior | Authoritative for what the system should do |
| `brainstorms/` | Raw discovery, interviews, options, and unresolved exploration | Non-authoritative input to later decisions and specifications |
| `memory/context/` | Durable circumstances, constraints, stakeholders, and project background | Current project context |
| `memory/planning/` | Vision, goals, roadmap, milestones, timeline, strategic dependencies, durable risks, and assumptions | Current high-level direction, not ticket status |
| `memory/decisions/` | Important choices, reasons, alternatives, and consequences | Current rationale unless marked superseded |
| `memory/knowledge/` | Reusable technical and project understanding | Current durable understanding |
| `memory/references/` | Sources and why they matter | Supporting material, not automatic truth |
| `memory/domain/` | Business language, concepts, actors, policies, and examples | Current domain meaning |
| `memory/operations/` | How to operate, release, recover, support, and verify the system | Current operating guidance |
| Project artifact folders | Raw meeting notes, transcripts, communications, deliverables, research, and source exports | Canonical raw evidence |
| Work tracker | Backlog, ticket status, blockers, ticket relationships, handoffs, branches, pull requests, and landing proof | Authoritative for work state |
| Git | Exact document history, branches, review, and recovery | Authoritative history |

One piece of truth has one canonical home. Other documents link to it instead
of copying it.

## How discovery becomes approved behavior

Brainstorms stay in one flat folder because discovery often crosses system
areas or begins before the correct area is known. Specifications use stable
system-area folders because they describe approved current behavior.

```mermaid
flowchart LR
    A[Interview or exploration] --> B[brainstorms/date-topic.md]
    B --> C{Owner approves behavior}
    C -->|yes| D[specs/system-area/capability/README.md]
    C -->|not yet| B
    D --> E[Implementation and tests]
    B <--> D
```

Every specification links to all applicable brainstorms that informed it.
Each brainstorm links back to every resulting specification. One brainstorm
may inform several specifications, and one specification may use several
brainstorms.

`brainstorms/README.md` indexes the dated files and their resulting
specifications. A brainstorm is stored once, never copied into every area it
touches.

Raw brainstorming never becomes current behavior merely because an agent wrote
it down.

## How specifications evolve

Each capability has its own folder. Its `README.md` is the one required,
canonical specification. Supporting documents such as `user-flows.md`,
`data-model.md`, `interfaces.md`, or `migration.md` are created only when they
make a substantial specification easier to understand.

The canonical specification describes current approved behavior. Git preserves
its exact previous versions. An important historical choice receives a linked
decision record when its rationale will help future work. Routine changes do
not require duplicate archived specifications or a changelog.

If old behavior is still deployed, supported, or relevant for compatibility,
the current specification describes that continuing boundary.

## Where the agent instructions live

The operating instructions are split in two, because most of a save needs only
the first part:

```text
.claude/rules/second-brain.md            always loaded: how a save works
.claude/references/second-brain-reference.md   opened when routing is unclear
```

The rule says how a save works, who does which part, and where things go. The
reference says what each home is for in detail, plus the rules on evidence,
repetition, links, and superseding. An agent opens the reference when it
genuinely cannot tell where something goes, not on every save.

Both `CLAUDE.md` and `AGENTS.md` carry the routing schema in full and tell their
agent to read that shared rule for everything else. Routing has to work before
an agent opens another file, and Codex reads only `AGENTS.md`, so that one part
is copied on purpose. Both root sections change in the same commit as the rule,
and the rule wins if they ever disagree.

The memory verifier reads the same shared rule and the relevant project
indexes. Its reusable role instructions live at
`.claude/agents/memory-verifier.md`. The path is shared project content even
when Codex invokes the role through its own delegation mechanism.

## When the main agent proposes updates

The main agent conducts a short durable-knowledge review only:

- when a substantial task request is complete, at the moment its pull request is
  opened. The pull request does not wait for the owner's answer: it opens with
  the code in it, and the approved memory is committed to the same branch before
  it is merged;
- at the end of a brainstorming or requirements interview;
- at the end of a milestone or project phase; or
- at another natural stopping point after meaningful work, when the owner ends
  or pauses the task and a settled durable result exists.

A session handing off to a fresh one, or about to have its context cleared, does
trigger this review. That moment has the most at stake, because the context is
about to be destroyed and nothing can catch a clear after it happens. Save what
the owner approves and carry everything else inside the handoff prompt.

An ordinary chat message, a commit, or a trivial action does not trigger it.
Live status, blockers, and next actions are not memory.
One review may satisfy several nearby stopping points unless later work changes
the durable result.

The main agent proposes every useful update it recommends. There is no fixed
number. The owner may approve all, approve selected items, change wording or
destinations, defer an item, or skip everything. An edit the owner makes is
taken exactly as written and needs no further checking, because the owner is the
source.
A deferred item changes no durable document and creates no second-brain queue.

What the owner sees is the real text, already checked by `memory-verifier`, with
the destination path for each piece and anything unchecked visibly marked. Not a
table describing what would be written. The main agent writes the approved words
itself, then runs the index builder and the shape check. A failed shape check
means the save is not finished, and the owner is told in plain words what is
missing. If the approved write cannot be completed, the task remains unfinished
and does not merge as though it succeeded unless the owner explicitly waives it.

## Parallel sessions and Git

Every active chat session works in its own worktree and branch, and every write
lands there.

Task-related code, tests, specifications, and approved memory updates normally
use one pull request. A brainstorming-only session or standalone memory cleanup
may use a documentation-only pull request.

No session writes directly to `main`, another session's worktree, or a shared
external store. Git exposes text conflicts when parallel branches edit the same
lines, but it cannot detect the same truth filed in two paths or two different
files that disagree.

Before a pull request containing specification or memory changes merges, its
branch is brought current through the existing Git workflow. The main agent then
invokes `memory-verifier` for a read-only comparison against the latest relevant
documents and indexes. It reports semantic duplicates or conflicting current
truth, sized to the change: a new durable document gets the full read, an
amendment gets that document and what it links to, a generated index line gets a
quick look. Any destructive or meaning-changing repair remains owner-approved.

Nothing that writes a file runs in the background. Every agent that produces a
report is run in the foreground, so its report reaches the session that called
it without that session having to ask, and no write can still be part-way
through when the work is committed.

## Greenfield and brownfield projects

For a greenfield project, v3 starts with the project explanation, high-level
planning, system-area discovery, and approved specifications.

For a brownfield project, v3 begins with a read-only map of the existing
repository and documentation. Graphify or another analysis tool may help
produce that map, but its output is evidence rather than current truth.
Interviews backfill intent, business context, history, and constraints that
cannot be safely inferred from code.

Existing documents are kept and linked, moved with approval, or consolidated
with approval. Adoption does not duplicate every document into a template or
turn unverified inference into authoritative memory.

Raw meeting notes, transcripts, communications, deliverables, and other project
artifacts stay in their ordinary project scaffolding. V3 links to useful
evidence and preserves approved durable outcomes rather than copying the raw
record into agent memory.

## Optional document aids

Every durable specification or memory document has a descriptive title, a
one-sentence summary immediately after the title, type-specific content,
contextual relationships when useful, and a one-sentence entry in the nearest
index. Every document under `memory/` also carries a `Basis:` line directly
under that summary, saying where its content came from. Specifications carry no
`Basis:` line, because a specification is approved behavior by definition.

`node .claude/tools/memory-shape-check.mjs` enforces the title, the summary, the
`Basis:` line, and the index entry, and runs in about a second.
`node .claude/tools/memory-index-build.mjs` rebuilds each index's list of
documents from the documents themselves, so the list cannot fall out of step
with the folder. It touches only the `- [Title](path): summary` bullets, and
leaves the hand-written prose around them alone.

`Status`, validity guidance, `Tags`, `Sources`, and `Aliases` are optional
everywhere. An agent uses them only when they make a document easier to find,
understand, verify, or keep current. Templates do not require them or include
empty placeholders.

A time-sensitive document may use an owner-approved `Review after: <date>` or
`Review when: <event>`. Reaching the date or event tells an agent to verify the
information before relying on it. It does not automatically expire or rewrite
the document.

Normal Markdown links, descriptive titles, system-area indexes, and backlinks
are the primary navigation system.

## Specification set

- [Technical specification](TECHNICAL-SPECIFICATION.md): authority, reading,
  drafting, checking, approval, writing, concurrency, correction, and
  acceptance behavior.
- [Markdown schemas](MARKDOWN-SCHEMAS.md): human-readable shapes for
  brainstorms, specification folders, planning, and all other memory types.
- [Toolkit integration](TOOLKIT-INTEGRATION.md): plugin boundaries,
  `project-init`, `project-sync`, work-tracker, grill-me, Claude, Codex, and
  rollout.
- [Discovery record](../../brainstorms/2026-07-28-second-brain-v3-project-memory.md):
  raw owner interview and repository evidence that informed this design.

## Shipped source

- [Canonical project rule](../../plugins/second-brain/skills/second-brain/references/second-brain-rule.md):
  the always-loaded procedure copied into an adopting project.
- [Routing reference](../../plugins/second-brain/skills/second-brain/references/second-brain-reference.md):
  the longer companion, opened only when routing is genuinely unclear.
- [Memory verifier](../../plugins/second-brain/agents/memory-verifier.md):
  the read-only checking role used by Claude and Codex.
- [Adoption guide](../../plugins/second-brain/skills/second-brain/references/adoption-guide.md):
  greenfield setup and brownfield read-only adoption.
- [Copy-ready schemas](../../plugins/second-brain/skills/second-brain/references/markdown-schemas.md):
  starting shapes for indexes, specifications, brainstorms, and typed memory.
- [Index builder](../../plugins/second-brain/tools/memory-index-build.mjs) and
  [shape check](../../plugins/second-brain/tools/memory-shape-check.mjs): the two
  scripts installed to `.claude/tools/`.

## Explicitly not part of v3

- database, Worker, or hosted memory service;
- memory MCP connector;
- embeddings or semantic search;
- hooks or scripts that decide what is true, capture, recall, or choose the home
  for a piece of memory;
- transcript or per-message capture;
- background, scheduled, or autonomous curation;
- a deterministic natural-language approval parser;
- a machine schema over what a document says;
- mandatory tags, sources, aliases, or YAML frontmatter;
- a fixed proposal limit;
- automatic commits, pushes, merges, or deployments; or
- a second ticket, backlog, or handoff system.

A hook that enforces a rule or starts the durable review at a completion point
is not excluded. It writes nothing and approves nothing, so the approval
boundary above is unchanged.

The two scripts in `.claude/tools/` are not excluded either. Neither decides
what a document says. `memory-shape-check.mjs` reads and reports, changing
nothing. `memory-index-build.mjs` writes only the list of bullets inside an
index, and every bullet is copied from a document that already exists. Both are
run by hand, by the main agent, at a point in the save.

`memory-verifier` is invoked in the foreground for a drafted change and again
before a merge. It reads only, never writes, is not a background curator, and
does not act independently.
