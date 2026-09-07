---
summary: How project knowledge worked under the layout with seven memory subfolders and a fixed tag list, superseded on 2026-08-21 and kept only as history.
area: knowledge-system
status: superseded
source: The design this repository ran until issue #215
created_at: 2026-08-04
tags: [knowledge-system, memory, second-brain, history]
approved_by: Mike Rihm
approval_date: 2026-08-04
project: claude-toolkit
superseded_by: knowledge/prds/knowledge-system.md
---

# How project knowledge works (superseded, do not build from this)

**Superseded on 2026-08-21 by [How the knowledge system works](knowledge-system.md).**
Kept as history. It describes the layout with seven memory subfolders and a fixed
tag list, which the current design replaced with one flat folder and free-form
tags. Where this file and `knowledge-system.md` disagree, `knowledge-system.md`
wins.

The project knowledge system keeps approved behavior, persistent understanding, and raw exploration in one portable Markdown vault that Git owns and Obsidian may view.

## What it is for

A project's `knowledge/` folder is curated working context that helps future
agents work correctly. It is not a store for raw client delivery artifacts.

A chat session ends, but a project must not forget what it is building, why it made a choice, or what a future session needs to avoid a wrong action. This system gives that information one visible home without creating a database, a private agent memory, or a second copy of the truth.

It also protects the project from the opposite failure: saving every interesting sentence until useful knowledge is buried in agent notes. A save has to pass the persistent-information test and the user approves a short meaning summary before it becomes current project truth.

Every new agent starts as a stranger. The system therefore uses one small,
fixed structure that tells it what a file means, what it may trust, and which
current home it should read or update without needing an earlier chat.

## Who uses it

- **The project owner** wants the project to remember the right things, wants every persistent change to remain reviewable in Git, and may browse the same files in Obsidian.
- **The main agent** needs a small startup map, a clear placement system, a short approval flow for saves, and a separate way to find a past Claude Code CLI discussion when current project files leave a real gap.
- **A helper agent** may read the vault for its assigned work but cannot approve or silently write persistent project knowledge.

## What it must do

### Keep one knowledge root

Every project using the system has this shape:

```text
knowledge/
  .obsidian/
    app.json
  project.md
  index.md
  specs/
  memory/
    tags.md
    context/
    decisions/
    domain/
    knowledge/
    operations/
    planning/
    references/
  brainstorms/
```

The folders have one responsibility each:

- `knowledge/project.md` is the short project overview: what the project is, why it exists, what finished looks like, its main workstreams and boundaries, who is involved, and where active work is tracked. It is framing, not a second specification or status report.
- `knowledge/index.md` is generated from current specifications and memories. It gives each file's title, one-sentence summary, and relative link.
- `knowledge/prds/` says what the product or system must do. One Markdown file owns each approved capability.
- `knowledge/memory/` says what is worth knowing so future work is not done incorrectly or worked out again.
- `knowledge/brainstorms/` holds internal exploration and owner interviews. Raw client meeting records and client-provided files stay in the project's delivery or client-artifact folder. Nothing in brainstorms is approved truth unless it is later saved through the normal process.
- `knowledge/.obsidian/` contains only the small shared settings needed for portable Markdown links. Personal layouts, appearance, hotkeys, plugins, themes, graph state, and device state stay untracked.

Empty type folders may contain `.gitkeep`. They do not get hand-maintained `README.md` indexes.

The `knowledge/` folder is deliberately exempt from the project's normal folder-instruction-file rule. The root instructions and this specification own its behavior; adding another instruction file inside the vault would duplicate authority.

### Keep Markdown and Git authoritative

The committed Markdown files and Git history are the system. There is no memory database, embedding index, transcript store, background curator, or private agent notebook. Existing local Claude Code CLI transcripts remain a separate historical source. The system may search them read-only but never copies, indexes, or promotes them into current project truth.

Obsidian is an optional viewer and editor. The system works without it. Files use ordinary relative Markdown links with explicit `.md` extensions, never Obsidian-only wikilinks or block references. A save made in Obsidian follows the same approval and Git rules as any other file edit.

Opening `knowledge/` as an Obsidian vault intentionally limits Obsidian search, backlinks, and graph views to project knowledge. Links from knowledge files to repository files outside the vault remain normal Markdown and Git links, but the project does not rely on Obsidian to index those targets.

### Load a small map at startup

At the start of every main-agent session:

1. read `knowledge/project.md`;
2. read `knowledge/index.md`;
3. open only the specification or memory files relevant to the task; and
4. treat `knowledge/brainstorms/` as unchecked source material.

The startup route also carries one short principle:

> Keep project knowledge small: save persistent information only when a stable
> fact, lasting event, decision, or state prevents repeated explanation or the
> same wrong action. Put standing agent instructions in rules, active work
> wherever its work item is being tracked, reusable processes in skills,
> outside source material in references, and past conversations in session
> history.

Claude receives the two startup files through a fail-open project `SessionStart` hook. Codex receives the same instruction through the project's root `AGENTS.md` and, where native Codex hooks are available, the equivalent fail-open `.codex/hooks.json` registration. Startup never loads the whole vault and never writes anything.

The root `CLAUDE.md` and `AGENTS.md` keep only a short route to this system. They do not copy this specification or the contents of `project.md`.

### Decide where persistent information belongs before saving

The always-loaded `where-persistent-information-belongs.md` rule owns the full
placement table. Before proposing a save, the main agent searches wherever the
current work item is being tracked and the current rules, skills,
specifications, memories, and references.

Active work stays with its work item. Standing agent instructions go to rules.
Reusable agent processes go to skills. Approved product or system behavior goes
to specifications. Persistent project facts, lasting events, decisions, and
states go to memory. Outside source material goes to references. Past
conversation stays in session history.

An open, closed, or external work item may already own a ticket-specific
decision. Closing the item or keeping it outside the repository is not a reason
to copy the decision into memory. The `remember` skill can identify a work item,
rule, or skill as the correct home, but it writes only approved specification
and memory changes. Other homes follow the project's normal work process.

### Route specifications and memories to one home

A specification is the living truth for approved behavior. It has a descriptive H1, a one-sentence summary, and only the sections the capability needs. It carries no YAML because its words were approved directly by the owner. When approved behavior changes, the existing specification changes in the same work; Git owns older versions.

Memories use these seven types:

| Folder | Use it for | Do not use it for |
| --- | --- | --- |
| `context/` | A persistent circumstance, stakeholder, boundary, or outside constraint that shapes several pieces of work | Work-item state or a preference that belongs in the reusable toolkit |
| `decisions/` | A non-obvious choice and why it was made when that reason prevents reversal or repeated debate | A routine choice or behavior already owned by a specification |
| `domain/` | A project-specific term or business rule an agent could misread | Product behavior or technical implementation |
| `knowledge/` | A project conclusion that prevents a likely mistake or repeated investigation | Raw external material, an obvious code fact, or a decision |
| `operations/` | A repeatable operating, release, or recovery procedure plus verification | A one-time task, current blocker, secret, or credential |
| `planning/` | Direction and sequence that matter beyond one work item: goals, roadmap, milestones, persistent risks, and assumptions | Live status, assignment, or handoff state |
| `references/` | External source material and the project-specific explanation of what it supports | A conclusion learned from the source, which belongs in `knowledge/` |

External research and project understanding are not interchangeable. A scraped page, paper, exported source, or persistent source note belongs in `references/`. A conclusion the project drew from it belongs in `knowledge/`. When research produces both, save two linked files rather than mixing source material and conclusion into one canonical file.

Live work status, branches, pull requests, blockers, assignments, and landing
proof stay wherever the work item is being tracked. Secrets and private
personal information never go in the vault.

### Apply the persistent-information test

Before drafting a persistent save, the agent asks these questions in order:

1. **Will it still matter after the current task or session?** If not, keep it
   wherever the work item is being tracked or in the handoff when no work item
   exists.
2. **Is it a stable fact, lasting event, decision, or state?** Difficulty,
   novelty, and conversation length are not enough.
3. **Does a current work item, rule, skill, specification, memory, or reference
   already own it?** If yes, update or link to that home instead of copying it.
4. **Would leaving it out cause a repeated explanation or the same wrong
   action?** If not, do not create project knowledge.

Questions 1, 2, and 4 must be yes. Question 3 must be resolved through the
existing owner or a genuinely new home before anything is proposed.

### Use fixed file shapes

Every memory starts with this YAML vocabulary:

```yaml
---
source: owner-paraphrase
date: 2026-08-12
session: 6ef7ee24-1f50-4d7b-b9b3-2e007d86bc2e
tags:
  - project-subject
---
```

The allowed fields are:

- `source:` exactly one of `owner-quote`, `owner-paraphrase`,
  `read-from-file`, `agent-observed`, or `agent-conclusion-unchecked`.
  `owner-quote` means verbatim words. `owner-paraphrase` means the owner stated
  the meaning but these are not presented as exact words.
- `source-file:` the exact repository path, present only when `source: read-from-file`.
- `date:` the save or last-change date in `YYYY-MM-DD` form.
- `session:` a retrievable reference to the conversation or work session that
  produced the save. It is not a transcript copy. The knowledge session-start
  hook prints the current session id into the session so the agent can write
  it. It says `unavailable` only when no id was printed, as in a Codex session,
  which does not run the hook. When a later session adds to an existing file,
  the file-level field keeps the creating session's id and the new session is
  named in the `Claim source:` marker on the new sections.
- `tags:` an Obsidian-compatible YAML list of one to three project-specific
  subjects chosen from `knowledge/memory/tags.md`. A new tag and its
  plain-language meaning are approved with the save.
- `superseded-by:` the relative path of the current replacement, present only on retained history.

These six names are the complete property vocabulary. An agent never invents a
new field silently. The source value covers the file. A claim from another
source is marked beside that claim in the body so the file-level value does not
give it false confidence. The fixed marker sits directly above the affected
claim:

```text
> Claim source: read-from-file; path/to/source.md
```

The source value and retrievable trace after the semicolon change to match the
claim. `agent-conclusion-unchecked` is a lead to verify, never truth a later
agent may repeat.

Tags describe subjects only. The folder already says whether a memory is a
decision, context, domain language, project knowledge, an operation, planning,
or a reference. The `source` value already says how its claims were obtained.
A new project begins with an empty project tag vocabulary and never inherits
the toolkit repository's tags.

Before proposing tags, the agent reads the complete approved vocabulary and its
usage counts. The owner sees only relevant existing tags, proposed tags, and
warnings about a new or overlapping tag during a normal save. A full health
review shows the complete vocabulary, counts, unused tags, and likely overlaps.
Reusing a tag is the default. Nothing merges, renames, or removes tags without
the owner's approval. More than 20 approved tags creates a health warning so
the vocabulary is reviewed rather than silently pruned.

Documents moved mechanically from the flat #149 layout are grandfathered in
their existing approved shape. Migration does not invent a missing `session:`
value or rewrite their source fields. The current shape becomes required when a
grandfathered document is next edited through an approved save; the proposal
makes the missing fields visible to the owner rather than guessing them.

A memory has a descriptive H1 and a one-sentence summary directly beneath it. A specification has the same title and summary shape but no YAML. Files use lowercase hyphenated names that describe their contents.

One fact has one canonical home. Other files link to it instead of copying it. Related links are added only when useful; links do not have to be forced into every file or duplicated in both directions when the relationship is not useful from both sides.

### Generate one index

`knowledge/index.md` is generated from Markdown files beneath `knowledge/prds/` and `knowledge/memory/`. It excludes itself, `project.md`, `memory/tags.md`, brainstorms, Obsidian settings, and empty-folder markers.

It also excludes a retained memory carrying `superseded-by:`. Git and the
health view preserve access to that history, but obsolete wording does not
remain in the startup map as current truth.

The generator extracts each file's H1 and first prose paragraph after YAML, groups entries by their folder, sorts them deterministically, and writes paths relative to `knowledge/index.md`. Missing titles fall back to readable file names. Empty roots are valid.

Nobody edits the index by hand. The save flow rebuilds it after an approved change. The source files win if an index is stale.

### Provide four focused skills, three tools, and two small hooks

Alongside its `second-brain` setup and migration skill, the plugin ships:

- `remember`, which applies the persistent-information test, finds the canonical home, obtains approval, writes only the approved meaning, and rebuilds the index;
- `recall`, which starts with `project.md` and the index, searches only as broadly as the task needs, and distinguishes current truth from brainstorms;
- `cleanup`, which reviews stale, repeated, conflicting, or misplaced knowledge and uses the same approval rules before changing anything;
- `session-search`, which searches existing local Claude Code CLI transcripts only after current project files fail to answer, returns small historical matches to the agent, and never writes project knowledge or transcript data;
- a read-only health tool that generates health, property, tag, and provenance
  views from the current Markdown without committing another representation of
  truth;
- a read-only startup loader that prints `project.md` and `index.md` and fails open if either is missing; and
- a pull-request reminder that asks the main agent to run `remember` but never writes or approves a save.

The health tool checks mechanical facts such as allowed properties, source
values, tag usage, repository paths, and replacement links. The agent reviews
meaning, including stale or conflicting claims, repeated facts, and content
  that no longer passes the persistent-information test. The plugin does not ship a verifier
agent, a large always-loaded memory rule, an automatic shape gate, per-folder
indexes, background capture, or automatic curation.

Built-in private auto-memory is disabled in projects that adopt this system.

### Keep every approval review short

The main agent shows one short group of plain bullets for each separately routed
item:

```text
1. <plain name>
   - What: <meaning that may be added, changed, moved, or removed>
   - Where: <current or proposed home>
   - Why: <repeated explanation or wrong action this prevents>
   - Assumptions: <every assumption, or None>
   - Unverified: <every unchecked claim, or None>
```

The owner may keep, change, or skip each item. No reply means no write. Different
homes or meanings use separate groups and separate approval choices.

Full file text, frontmatter, and complete diffs stay hidden unless the owner
asks to see them. Asking to see full text is not approval. The main agent may
show it in chat or put it in the current working branch, then waits for the
owner's keep, change, or skip decision.

Approval covers the meaning in the five bullets. The agent writes only that
meaning and required file structure. It does not add a claim, source,
assumption, example, reason, or background that the bullets did not cover. If
drafting needs anything new, the agent stops and shows a revised short review.

Owner edits are accepted as the owner's meaning. An agent-derived claim remains
visibly unchecked until the owner confirms it. Helper agents may research or
review but cannot substitute for the owner's approval.

The save runs only at a natural moment: when the owner asks to remember, before a pull request opens, before a handoff or context reset, or at another meaningful completion point with a settled persistent result. It does not run after every response, commit, or small fix.

Creating, editing, merging, moving, superseding, and removing are equal
first-class memory actions. All use the same short approval. A merge, move, or
removal says what becomes current and what stops being current. Git keeps older
wording, so obsolete wording does not remain current merely to preserve history.

A full health review runs when the owner asks or after a memory migration. A
focused review is offered when an approved save or project update check finds a
concrete warning. Startup, ordinary saves without warnings, a calendar
schedule, and age alone do not prompt a review. Cleanup proposes short repair
summaries and never changes persistent knowledge in the background.

### Migrate existing projects without losing knowledge

`project-sync` and the packaged migration tool identify layouts by system signatures, not by folder names alone:

- **new knowledge layout:** the required `knowledge/project.md`, `knowledge/index.md`, and nested knowledge trees are present;
- **flat #149 layout:** top-level `specs/`, `memory/`, and `brainstorms/` plus the #149 index, tags, runtime skills/tool, or root route are present;
- **retired v3 layout:** the old second-brain rule, verifier, tools, and root-folder index pattern identify the retired system;
- **none:** no project-knowledge-system signatures are present; and
- **mixed or unknown:** signatures conflict, are partial, or similarly named ordinary project folders could be mistaken for the system.

Mixed or unknown layouts stop without writing. Ordinary folders named `memory`, `specs`, or `knowledge` are never moved from their names alone.

For a flat #149 project, migration begins with a dry run. It checks target collisions, symlink escapes, and links before any write. After explicit approval it moves every document byte-for-byte except for deterministic Markdown link repair, moves the tag list, discards and rebuilds the generated index, installs the new startup routes, and verifies that no document was lost. Links into the moved tree from other tracked Markdown files are repaired too. A rerun is safe and reports the new layout.

For a retired v3 project, the tool cannot safely infer the new YAML source, date, session, source-file, or tags from old `Basis:` lines and folder indexes. It therefore creates a review manifest and conversion drafts while leaving the old system untouched. The owner resolves every uncertain field and approves the conversion before finalization. Removal of the retired rule, verifier, tools, and per-folder indexes happens only after the new files, links, generated index, startup routes, and tests all pass. The DragonFly project performs its real conversion under ticket #171.

Greenfield setup creates the exact new tree, asks the owner for the real `project.md` framing rather than inventing it, registers both supported startup routes, installs the four focused skills and packaged tools, and leaves empty type folders ready for use.

## How it behaves from the outside

### Saving

1. The main agent reads `knowledge/project.md` and `knowledge/index.md`, then
   searches wherever the current work item is being tracked and the current
   rules, skills, specifications, memories, and references.
2. It applies the persistent-information test. If nothing qualifies, it says so
   in one line and continues the handoff, pull request, or completion flow.
3. It identifies the existing owner or correct new home. A work item, rule, or
   skill follows the project's normal work process rather than becoming memory.
4. For a specification or memory change, it checks the complete project tag
   vocabulary and usage without showing an unrelated list.
5. It shows separate What, Where, Why, Assumptions, and Unverified bullets for
   each item and waits for the owner's keep, change, or skip decision.
6. It writes only the approved meaning, rebuilds `knowledge/index.md`, repairs
   relevant links, and reports the changed paths.
7. It runs a focused read-only health check. It finishes the approved save,
   then offers cleanup only when the check found a concrete warning.

### Recalling

1. The main agent starts with the project overview and generated index.
2. It opens the relevant specification before changing behavior.
3. It searches `knowledge/prds/` and the most likely memory type, then widens only when needed.
4. It follows useful links and reports conflicting current truth instead of choosing silently.
5. It reads brainstorms only when raw exploration is relevant and labels them as unchecked.

### Searching past Claude Code sessions

1. The main agent reads the relevant current project files first. It searches session history only when those files do not answer and a past discussion may fill the gap, or when the owner asks.
2. The default scope is the current project. The agent may widen to repository worktrees when relevant. It never searches every project on the machine without the owner's explicit permission.
3. The first pass returns at most five matches. Each identifies the project, session, date, role, exact resume command, and no more than 500 characters around the match.
4. Raw matches stay in agent tool context. The agent expands only one selected result to its complete visible message or adjacent conversation turn when the small excerpt is not enough.
5. The agent checks current project files before relying on a historical claim. Current files remain authoritative, and any conflict is shown rather than silently resolved from history.
6. The agent tells the owner that history was searched only when the answer depends on it, it conflicts with current files, or a failed search leaves a real gap. It does not narrate routine supporting searches or show raw matches unless asked.
7. The owner may ask to open or resume the exact matching session. Saving any result as persistent truth remains a separate `remember` action with normal approval.

### Reviewing in Obsidian

1. The user opens the repository's `knowledge/` folder as a vault.
2. Obsidian reads the same Markdown files Git tracks.
3. New links are written as relative Markdown and updated on rename when Obsidian performs the rename.
4. Project migration and branch moves still use the toolkit's link-aware scripts; they do not depend on Obsidian being open.

## Edge cases

- If `project.md` or the index is missing at startup, the loader reports the missing file and allows the session to continue. It never creates framing on the owner's behalf.
- If two current files disagree, show the exact conflict and change neither until the owner chooses.
- If saved knowledge disagrees with code or observed behavior, show both sources. Do not silently trust either one.
- If a memory disagrees with a specification, show both. Treat the
  specification as current approved behavior unless the owner approves changing
  it.
- If an older memory uses a retired source value or lacks a session reference,
  report the repair in the five short bullets and wait. Never silently relabel it.
- If a memory is old but remains correct, leave it alone. Age is not evidence of
  staleness.
- If an external source and the project conclusion are mixed, propose linked `references/` and `knowledge/` files.
- If an open, closed, or external work item already owns the decision, update or
  link to it instead of creating memory.
- If a review contains different kinds of information, split it into separate
  five-bullet groups and route each one independently.
- If an assumption or claim is unchecked, show it before approval and keep it
  visibly unchecked if saved.
- If the owner asks for full text, show it and then wait for approval. The
  request to see it is not approval.
- If a migration finds both a top-level `project.md` and an older planning file that could become the overview, stop for an owner choice.
- If a migration finds a collision, ambiguous signature, dangling mapped link, or path outside the repository, make no writes.
- If retired content cannot be converted without guessing, keep the original, make the uncertainty visible in the draft manifest, and block finalization.
- If the owner cuts every proposal or does not reply, write nothing and keep no hidden queue.
- If the index disagrees with its source files, regenerate it; never hand-edit it.
- If Claude Code transcript saving is disabled, or local history expired, was removed, moved, or is unreadable, say what is known without claiming no discussion happened.
- If the transcript format contains an unknown record, skip that record and continue. Never guess that tool output, hidden thinking, or metadata is visible conversation text.

## What it deliberately does not do

- It does not make Obsidian required or use Obsidian as a database.
- It does not install or depend on the whole `kepano/obsidian-skills` package. Its Markdown skill prefers frontmatter and wikilinks that conflict with this specification. Its CLI skill may be used as an optional, on-demand link check when a compatible running Obsidian is available, but filesystem and Git checks remain authoritative. When a machine carries Obsidian tools installed outside the toolkit (that package or an Obsidian MCP server), the `remember`, `recall`, and `cleanup` skills may use them to find, read, and search notes, never to change how files are written.
- It does not create canvases, Bases, generated visual maps, or a second representation of canonical knowledge.
- It does not capture, copy, archive, index, edit, or upload Claude Code transcripts.
- It does not let hooks, helper agents, or background processes write persistent knowledge.
- It does not restore the retired verifier, large rule, shape checker, or hand-maintained indexes.
- It does not migrate ordinary similarly named folders without a verified system signature.
- It does not silently rewrite, discard, or reinterpret existing saved documents during migration.
