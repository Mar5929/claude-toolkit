# Second-brain v3 technical specification

Status: draft for owner review. This document defines the proposed behavior. It
does not authorize implementation, installation in a project, migration, or
deployment.

## 1. Purpose

Second-brain v3 gives Claude and Codex shared, durable project knowledge using
ordinary Markdown files committed to Git.

The system should make four things easy:

1. A new session can find the right project truth without reading the whole
   repository.
2. Specifications, decisions, knowledge, context, references, domain material,
   and operations remain distinguishable.
3. Related information is connected with human-readable backlinks.
4. The owner controls which additional conclusions are preserved after work.

## 2. Product principles

### 2.1 Git and Markdown are the system

The Markdown files in the project repository are the memory and knowledge
system. Git provides history, review, branches, and recovery.

There is no separate memory service whose content can disagree with the
repository.

### 2.2 Human readability comes first

The owner must be able to browse, read, edit, reorganize, and review the system
without a special tool.

V3 therefore uses:

- descriptive folder and file names;
- normal Markdown headings;
- short plain-language metadata lines where needed;
- relative Markdown links; and
- `README.md` indexes at each navigation level.

V3 does not require YAML frontmatter, JSON records, generated identifiers,
hashes, or a database schema.

### 2.3 One canonical home per kind of truth

Each piece of information belongs in the home that owns it:

- required behavior in `specs/`;
- durable project memory in the matching typed `memory/` folder;
- ticket state and handoffs in work-tracker; and
- code behavior in code and tests.

Other documents may link to that truth but should not copy it.

### 2.4 AI judgment remains primary

Claude or Codex decides, from the work and conversation, what is relevant to
read and what is worth proposing for preservation.

The system provides rules and schemas. It does not hard-code semantic outcomes,
parse a narrow set of approval phrases, or use scripts to decide what a
conversation means.

### 2.5 Recommendations are proactive; persistence is controlled

At a natural completion point, the main agent reviews the work for durable
learning. It proactively recommends useful updates, but it does not silently
write additional memory or specification content.

The owner responds in normal language. The agent interprets that response,
asks a focused question only when the intent is genuinely unclear, and applies
only what the owner approved.

### 2.6 No arbitrary proposal limit

The agent proposes every meaningful durable update it recommends. It groups
related proposals so they are readable. It does not stop at a fixed count.

The filter is usefulness, not a number.

## 3. Information architecture

### 3.1 Top-level specifications

`specs/` contains the authoritative description of what the product or system
must do.

It contains:

```text
specs/
  README.md
  <system-area>/
    README.md
    <capability>.md
```

The root `README.md` lists all system areas. Each area `README.md` explains the
area, lists its specifications, and links to the most important decisions,
knowledge, domain material, and operating procedures.

Specifications are divided by meaningful system area, not by arbitrary file
size. An area may contain one document or many. A small project may have one
area. A larger project may have many.

### 3.2 Typed memory

`memory/` contains six information types:

```text
memory/
  README.md
  context/
  decisions/
  knowledge/
  references/
  domain/
  operations/
```

Each type contains its own `README.md`, then project-specific area folders:

```text
memory/<type>/
  README.md
  <system-area>/
    README.md
    <topic>.md
```

The area names should normally align with `specs/` so a person can move between
the behavior and the knowledge behind it. A memory type may also use a clearly
named cross-cutting area such as `project-wide`, `security`, or `delivery` when
the subject genuinely spans the system.

### 3.3 Folder growth

Project setup creates the root indexes and only the area folders the project
currently needs. It does not create a forest of empty directories.

When one area becomes too broad to browse comfortably, it may gain another
human-readable subfolder and local `README.md`. The agent proposes that
reorganization before moving files.

There is no required maximum file count, depth, or document length. The test is
whether a person can find and understand the material.

## 4. Authority rules

### 4.1 Specifications

When the owner changes required product or system behavior as part of a task,
the applicable specification, implementation, and tests should change
together. This is part of the requested work, not an optional memory proposal.

The agent reports those incorporated changes during wrap-up.

If the owner is exploring an idea rather than authorizing a behavior change,
the agent does not silently turn the discussion into an approved
specification. It proposes the specification change for approval.

### 4.2 Context

Context explains durable circumstances needed to interpret future work. It may
include project constraints, important current conditions, boundaries, and
assumptions that affect multiple tasks.

Context is not the backlog, the active ticket, or the next task. Those belong
to work-tracker.

### 4.3 Decisions

A decision document explains what was decided, why, what alternatives were
considered, and what follows from it.

Accepted decisions are current unless the document is explicitly marked
superseded and links to its replacement. Git history alone is not enough to
warn a reader that an old decision no longer governs.

### 4.4 Knowledge

Knowledge records a non-obvious understanding future work can reuse, such as an
implementation constraint, failure mode, integration behavior, or reason a
seemingly simpler approach does not work.

It should explain why the knowledge matters and link to evidence or the parts
of the system it affects.

### 4.5 References

A reference document points to an external or internal source, explains why it
is useful, and records any limitations. It does not copy a full source into the
repository.

### 4.6 Domain

Domain documents define business terms, actors, concepts, policies, rules, and
examples. They help agents use the owner's language consistently.

### 4.7 Operations

Operations documents explain how to run, release, support, recover, or verify
the system. They include prerequisites, steps, evidence of success, and
recovery guidance where relevant.

### 4.8 Work tracking

Work-tracker remains authoritative for:

- backlog and ticket status;
- what is active, blocked, or next;
- ticket dependencies and related tickets;
- branch and pull-request state;
- handoffs; and
- proof that completed work reached the main branch.

V3 documents may link to a work-item folder. They do not copy live ticket
status or maintain a competing task list.

## 5. Shared Claude and Codex instructions

### 5.1 Canonical detailed rule

The installed project's detailed v3 rule lives at:

```text
.claude/rules/second-brain.md
```

This is the canonical operating rule for both Claude and Codex. It contains:

- the folder dictionary;
- how to orient and retrieve relevant material;
- the document placement rules;
- the backlink rule;
- the end-of-activity review;
- the approval boundary;
- correction and supersession behavior; and
- the separation from work-tracker.

The `.claude` location is retained because it is the toolkit's existing shared
rule library and Claude Code loads it naturally. The content is not
Claude-specific.

### 5.2 Root orientation files

`CLAUDE.md` and `AGENTS.md` each contain a compact, equivalent v3 section that:

1. tells the agent to read `.claude/rules/second-brain.md`;
2. lists `specs/` and the six memory types in one short map;
3. points to the root `specs/README.md` and `memory/README.md` indexes;
4. says that related documents use backlinks; and
5. says work-tracker owns ticket state.

The full schemas do not appear in both root files. Duplicating them would
create three versions that can drift. The root files provide enough
orientation for every session; the shared rule owns the details.

### 5.3 Precedence

If a root summary and the shared rule disagree, the agent must stop and report
the inconsistency. It must not silently choose one or update both without
understanding which reflects the owner's current intent.

Project-specific rules in `CLAUDE.md`, `AGENTS.md`, or another approved project
rule may narrow the generic v3 behavior. They must not silently move authority
out of Git or remove the owner-approval boundary.

## 6. Reading workflow

### 6.1 Session orientation

At the beginning of a project session, the agent:

1. reads its root orientation file;
2. reads `.claude/rules/second-brain.md`;
3. reads `specs/README.md` and `memory/README.md` when the task touches product
   behavior or durable project knowledge; and
4. opens only the relevant area indexes and documents.

The agent does not load every memory file into every session.

### 6.2 Task retrieval

The agent identifies the likely area from the owner's request, the active work
item, the files being changed, and the root indexes. It then:

1. reads the applicable specification;
2. follows its related links to relevant decisions, knowledge, domain context,
   references, and operations;
3. reads the matching area indexes to find neighboring documents; and
4. searches repository text when the task crosses areas or the right document
   is uncertain.

This is AI-guided retrieval over ordinary files. V3 does not require a router,
index database, embeddings, or a retrieval script.

### 6.3 Backlink traversal

Related links must say why the destination matters. A bare list of filenames is
not enough.

The agent follows only relationships relevant to the task. Backlinks make the
knowledge traversable, but they do not require the agent to recursively read
the entire graph.

## 7. Writing workflow

### 7.1 During approved work

The agent updates a specification during the task when the owner has authorized
a change to required behavior. The corresponding code and tests change in the
same work.

The agent may also update an already-approved memory document when the task
explicitly includes that update.

### 7.2 End-of-activity review

The main agent performs the review at these natural points:

- task completion;
- an owner-signaled end of a chat or work session;
- handoff or wrap-up;
- end of a milestone or project phase;
- project completion; or
- an explicit `/remember` or equivalent request.

No hook is used. If a conversation ends without another agent turn, no review
can run after the fact.

The review asks:

1. Did required behavior change, and are its specification, code, and tests
   aligned?
2. What durable decisions, context, knowledge, references, domain material, or
   operational learning would help a future session?
3. Is that information already present or already incorporated by this task?
4. Which additional Markdown updates are worth recommending?
5. Which existing documents and backlinks would those updates affect?

### 7.3 Review response

The agent presents:

```text
Already incorporated
- What was updated during the approved task, or "None."

Proposed durable updates
- Destination
- Concise proposed content
- Why it will help future work
- Related documents or backlinks to add

No update recommended
- Say this plainly when there is nothing worthwhile to preserve.
```

The agent includes every meaningful recommendation and groups related items.
There is no fixed proposal count.

### 7.4 Owner approval

The owner may respond naturally, including:

- approve everything;
- approve selected proposals;
- edit the wording or destination of one or more proposals;
- combine or split proposals;
- defer a proposal; or
- skip all proposals.

The AI interprets the owner's meaning. No deterministic natural-language parser
or list of magic approval phrases is part of v3.

If the meaning is clear, the agent acts. If a genuine ambiguity would change
what is written, the agent asks one focused question.

### 7.5 Apply

After approval, the agent:

1. reads the destination document again in its current branch state;
2. incorporates the approved content into the appropriate existing document or
   creates the approved new document;
3. updates the nearest area index;
4. adds the useful outgoing and incoming backlinks;
5. removes or marks contradictory current guidance as superseded;
6. checks that the same truth was not copied into another authority; and
7. reports exactly what changed.

The memory update follows the project's normal Git workflow. V3 itself does not
commit, push, merge, or deploy automatically.

### 7.6 `/remember`

`/remember` and natural phrases such as "remember this" invoke the same
placement and approval workflow.

If the request already states the content, destination, and instruction to
write it now, that request is approval. Otherwise the agent proposes the
destination and wording before writing.

## 8. Backlinks and relationships

### 8.1 Required structure

Every specification and memory document ends with:

```markdown
## Related

- [Descriptive title](relative/path.md)
  - Explains the relationship in one sentence.
```

Use a relative link so GitHub, local editors, Claude, and Codex can all follow
it.

### 8.2 Two-way links

When a relationship is useful from both documents, update both sides in the
same approved change.

Examples:

- a specification links to the decision that shaped it, and the decision links
  back to the specification it governs;
- knowledge links to its supporting reference, and the reference links back to
  the knowledge that uses it;
- an operations guide links to the specification whose behavior it operates,
  and that specification links to the guide.

A link does not need a backlink when the reverse path would add no useful
navigation. The agent uses judgment and explains any important one-way choice
in the proposal.

### 8.3 Relationship language

Relationship descriptions use plain language. Helpful verbs include:

- defines;
- supports;
- informed;
- constrains;
- depends on;
- implements;
- operates;
- replaces;
- supersedes; and
- provides evidence for.

These are writing conventions, not a closed enum enforced by code.

## 9. Correction, replacement, and history

Current documents should be corrected in place when their meaning remains the
same and the content simply needs to become accurate. Git preserves the
previous version.

Create a new document and mark the old one `Superseded` when the historical
choice remains important to understand. The old document links to the
replacement, and the replacement links back with an explanation.

Do not keep contradictory documents marked current. Do not create dated copies
such as `decision-v2-final-new.md`.

When files move during an approved reorganization, update indexes and backlinks
in the same change.

## 10. Failure and ambiguity behavior

- If the correct destination is unclear, propose the best location and explain
  why.
- If two documents disagree, report the conflict before treating either as
  current truth.
- If an approval is unclear, ask before writing.
- If a backlink target does not exist, repair it as part of the approved change
  or report it.
- If the task ends before the owner approves proposals, leave the files
  unchanged and include the proposals in the handoff.
- If no useful durable learning occurred, say so. Do not manufacture an update
  to satisfy a ritual.

## 11. Privacy and repository boundaries

Because v3 is committed to Git, agents must not store:

- passwords, tokens, credentials, or secrets;
- private personal information that does not belong in the repository;
- raw conversation transcripts;
- copied proprietary source material that the project cannot redistribute; or
- temporary debugging output with no durable value.

Sensitive operational knowledge may describe where a secret is obtained and
how it is used without containing the secret itself.

## 12. Acceptance criteria

V3 is ready to ship only when:

1. A new project can opt into the folder structure without receiving empty
   area trees it does not need.
2. An existing project can adopt v3 without overwriting or silently moving its
   current specifications and documentation.
3. `CLAUDE.md` and `AGENTS.md` both orient their agent to the same canonical
   shared rule and folder map.
4. A cold Claude session and a cold Codex session can locate the same relevant
   specification and related memory from the indexes and backlinks.
5. Specifications and all six memory types have human-readable templates.
6. Meaningful relationships can be followed in both directions with normal
   Markdown links.
7. Task status remains owned by work-tracker.
8. A requirement change updates the applicable specification, code, and tests
   together.
9. Post-activity proposals are not written without owner approval.
10. The owner can approve, select, edit, combine, defer, or skip proposals in
    normal language.
11. The review has no fixed proposal limit.
12. `/remember` uses the same workflow and does not create another write path.
13. The core requires no database, MCP server, hooks, scripts, embeddings,
    transcript capture, curator agent, or scheduled job.
14. Installation and sync instructions plainly state what will be created or
    changed before acting.

## 13. Not inherited from v2

The following v2 concepts are not v3 requirements unless the owner separately
adds them later:

- implementation units numbered 00 through 09;
- machine-enforced record schemas;
- write receipts;
- repository identity records;
- health states;
- token or retrieval budgets;
- fixed proposal counts;
- concurrency engines;
- local search indexes;
- structural graphs;
- automatic freshness checks;
- simulator suites; and
- legacy-system migration or retirement architecture.

Useful general ideas that also appear in older work count as v3 requirements
only when they are stated in this v3 specification.
