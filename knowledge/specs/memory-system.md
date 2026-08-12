# How project knowledge works

The project knowledge system keeps approved behavior, durable understanding, and raw exploration in one portable Markdown vault that Git owns and Obsidian may view.

## What it is for

A chat session ends, but a project must not forget what it is building, why it made a choice, or what a future session needs to avoid a wrong action. This system gives that information one visible home without creating a database, a private agent memory, or a second copy of the truth.

It also protects the project from the opposite failure: saving every interesting sentence until useful knowledge is buried in agent notes. A save has to pass four filters and the user sees what will change before it becomes current project truth.

## Who uses it

- **The project owner** wants the project to remember the right things, wants every durable change to remain reviewable in Git, and may browse the same files in Obsidian.
- **The main agent** needs a small startup map, an exact routing system, and a repeatable approval flow for saves.
- **A helper agent** may read the vault for its assigned work but cannot approve or silently write durable project knowledge.

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
- `knowledge/specs/` says what the product or system must do. One Markdown file owns each approved capability.
- `knowledge/memory/` says what is worth knowing so future work is not done incorrectly or worked out again.
- `knowledge/brainstorms/` holds raw exploration and interview transcripts. Nothing there is approved truth unless it is later saved through the normal process.
- `knowledge/.obsidian/` contains only the small shared settings needed for portable Markdown links. Personal layouts, appearance, hotkeys, plugins, themes, graph state, and device state stay untracked.

Empty type folders may contain `.gitkeep`. They do not get hand-maintained `README.md` indexes.

The `knowledge/` folder is deliberately exempt from the project's normal folder-instruction-file rule. The root instructions and this specification own its behavior; adding another instruction file inside the vault would duplicate authority.

### Keep Markdown and Git authoritative

The committed Markdown files and Git history are the system. There is no memory database, embedding index, transcript store, background curator, or private agent notebook.

Obsidian is an optional viewer and editor. The system works without it. Files use ordinary relative Markdown links with explicit `.md` extensions, never Obsidian-only wikilinks or block references. A save made in Obsidian follows the same approval and Git rules as any other file edit.

Opening `knowledge/` as an Obsidian vault intentionally limits Obsidian search, backlinks, and graph views to project knowledge. Links from knowledge files to repository files outside the vault remain normal Markdown and Git links, but the project does not rely on Obsidian to index those targets.

### Load a small map at startup

At the start of every main-agent session:

1. read `knowledge/project.md`;
2. read `knowledge/index.md`;
3. open only the specification or memory files relevant to the task; and
4. treat `knowledge/brainstorms/` as unchecked source material.

Claude receives the two startup files through a fail-open project `SessionStart` hook. Codex receives the same instruction through the project's root `AGENTS.md` and, where native Codex hooks are available, the equivalent fail-open `.codex/hooks.json` registration. Startup never loads the whole vault and never writes anything.

The root `CLAUDE.md` and `AGENTS.md` keep only a short route to this system. They do not copy this specification or the contents of `project.md`.

### Route specifications and memories to one home

A specification is the living truth for approved behavior. It has a descriptive H1, a one-sentence summary, and only the sections the capability needs. It carries no YAML because its words were approved directly by the owner. When approved behavior changes, the existing specification changes in the same work; Git owns older versions.

Memories use these seven types:

| Folder | Use it for | Do not use it for |
| --- | --- | --- |
| `context/` | A durable circumstance, stakeholder, boundary, or outside constraint that shapes several pieces of work | Ticket state or a preference that belongs in the reusable toolkit |
| `decisions/` | A non-obvious choice and why it was made when that reason prevents reversal or repeated debate | A routine choice or behavior already owned by a specification |
| `domain/` | A project-specific term or business rule an agent could misread | Product behavior or technical implementation |
| `knowledge/` | A project conclusion that prevents a likely mistake or repeated investigation | Raw external material, an obvious code fact, or a decision |
| `operations/` | A repeatable operating, release, or recovery procedure plus verification | A one-time task, current blocker, secret, or credential |
| `planning/` | Direction and sequence that matter beyond one ticket: goals, roadmap, milestones, durable risks, and assumptions | Live status, assignment, or handoff state |
| `references/` | External source material and the project-specific explanation of what it supports | A conclusion learned from the source, which belongs in `knowledge/` |

External research and project understanding are not interchangeable. A scraped page, paper, exported source, or durable source note belongs in `references/`. A conclusion the project drew from it belongs in `knowledge/`. When research produces both, save two linked files rather than mixing source material and conclusion into one canonical file.

Live work status, branches, pull requests, blockers, assignments, and landing proof stay in the work tracker. Secrets and private personal information never go in the vault.

### Apply four save filters in order

Before drafting a durable save, the agent asks these questions in order:

1. **Is it relevant to this project?** If not, do not save it here.
2. **Is it project work rather than a lesson about the agent or a reusable tool?** If it belongs in the toolkit, its settings, or another product, propose that home instead.
3. **Can a future session find the answer in one existing authoritative file without doing meaningful work again?** If yes, link or name that file and do not create a memory. A narrow exception allows a project conclusion that only becomes clear by combining several files.
4. **Would leaving it out make a future agent likely to take a wrong action?** If not, do not save it.

All four filters must pass. Difficulty, novelty, or conversation length alone does not make something durable knowledge.

### Use fixed file shapes

Every memory starts with this YAML vocabulary:

```yaml
---
source: user-said-it
date: 2026-08-11
session: current-session
tags: [project-knowledge]
---
```

The allowed fields are:

- `source:` exactly one of `user-said-it`, `read-from-file`, `agent-saw-it-happen`, or `agent-guess-unchecked`.
- `source-file:` the exact repository path, present only when `source: read-from-file`.
- `date:` the save or last-change date in `YYYY-MM-DD` form.
- `session:` enough information to trace the conversation or work session that produced the save. It is not a transcript copy.
- `tags:` a short list chosen from `knowledge/memory/tags.md`. A new tag is approved with the save.
- `superseded-by:` the relative path of the current replacement, present only on retained history.

The source value covers the file. A fact from another source is marked in the body where it appears. `agent-guess-unchecked` is a lead to verify, never truth a later agent may repeat.

Documents moved mechanically from the flat #149 layout are grandfathered in
their existing approved shape. Migration does not invent a missing `session:`
value or rewrite their source fields. The current shape becomes required when a
grandfathered document is next edited through an approved save; the proposal
makes the missing fields visible to the owner rather than guessing them.

A memory has a descriptive H1 and a one-sentence summary directly beneath it. A specification has the same title and summary shape but no YAML. Files use lowercase hyphenated names that describe their contents.

One fact has one canonical home. Other files link to it instead of copying it. Related links are added only when useful; links do not have to be forced into every file or duplicated in both directions when the relationship is not useful from both sides.

### Generate one index

`knowledge/index.md` is generated from Markdown files beneath `knowledge/specs/` and `knowledge/memory/`. It excludes itself, `project.md`, `memory/tags.md`, brainstorms, Obsidian settings, and empty-folder markers.

The generator extracts each file's H1 and first prose paragraph after YAML, groups entries by their folder, sorts them deterministically, and writes paths relative to `knowledge/index.md`. Missing titles fall back to readable file names. Empty roots are valid.

Nobody edits the index by hand. The save flow rebuilds it after an approved change. The source files win if an index is stale.

### Provide three skills and two small hooks

The `second-brain` plugin ships:

- `remember`, which applies the filters, finds the canonical home, obtains approval, writes the approved words, and rebuilds the index;
- `recall`, which starts with `project.md` and the index, searches only as broadly as the task needs, and distinguishes current truth from brainstorms;
- `cleanup`, which reviews stale, repeated, conflicting, or misplaced knowledge and uses the same approval rules before changing anything;
- a read-only startup loader that prints `project.md` and `index.md` and fails open if either is missing; and
- a pull-request reminder that asks the main agent to run `remember` but never writes or approves a save.

The plugin does not ship a verifier agent, a large always-loaded memory rule, a shape checker, per-folder indexes, background capture, or automatic curation.

Built-in private auto-memory is disabled in projects that adopt this system.

### Support two approval modes

Every proposal starts with plain-language bullets under these exact headings:

```text
What I want to change
Why
```

The bullets tell the owner what will be saved, edited, moved, or removed and why it passes the four filters before presenting file contents.

Short saves are shown in chat with numbered paths and the exact proposed words. The owner may keep, cut, or edit each item. No reply means no write.

For every specification and for a large draft that is easier to review in context, the main agent may write the complete draft to the current working branch, point the owner to that file, and stop for direct review. The branch is the visible proposal, not approved truth. The owner may edit the file directly or approve it in chat. The draft does not merge until approved.

Owner edits are accepted as the owner's words. An agent-derived claim remains visibly unchecked until the owner confirms it. Helper agents may research or review but cannot substitute for the owner's approval.

The save runs only at a natural moment: when the owner asks to remember, before a pull request opens, before a handoff or context reset, or at another meaningful completion point with a settled durable result. It does not run after every response, commit, or small fix.

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

Greenfield setup creates the exact new tree, asks the owner for the real `project.md` framing rather than inventing it, registers both supported startup routes, installs the three skills and packaged tools, and leaves empty type folders ready for use.

## How it behaves from the outside

### Saving

1. The main agent reads `knowledge/project.md` and `knowledge/index.md`, then searches current instructions, specifications, and memories for an existing owner.
2. It applies the four save filters in order. If nothing passes, it says so briefly and writes nothing.
3. It prefers editing the existing canonical file. If a new area, tag, or file is required, that is part of the proposal.
4. It shows `What I want to change` and `Why`, then the exact draft in chat or the complete working-branch file.
5. It waits for owner approval. A helper-agent report, hook, or earlier brainstorm cannot approve a save.
6. It writes only the approved words, rebuilds `knowledge/index.md`, repairs relevant links, and reports the changed paths.

### Recalling

1. The main agent starts with the project overview and generated index.
2. It opens the relevant specification before changing behavior.
3. It searches `knowledge/specs/` and the most likely memory type, then widens only when needed.
4. It follows useful links and reports conflicting current truth instead of choosing silently.
5. It reads brainstorms only when raw exploration is relevant and labels them as unchecked.

### Reviewing in Obsidian

1. The user opens the repository's `knowledge/` folder as a vault.
2. Obsidian reads the same Markdown files Git tracks.
3. New links are written as relative Markdown and updated on rename when Obsidian performs the rename.
4. Project migration and branch moves still use the toolkit's link-aware scripts; they do not depend on Obsidian being open.

## Edge cases

- If `project.md` or the index is missing at startup, the loader reports the missing file and allows the session to continue. It never creates framing on the owner's behalf.
- If two current files disagree, show the exact conflict and change neither until the owner chooses.
- If saved knowledge disagrees with code or observed behavior, show both sources. Do not silently trust either one.
- If an external source and the project conclusion are mixed, propose linked `references/` and `knowledge/` files.
- If a migration finds both a top-level `project.md` and an older planning file that could become the overview, stop for an owner choice.
- If a migration finds a collision, ambiguous signature, dangling mapped link, or path outside the repository, make no writes.
- If retired content cannot be converted without guessing, keep the original, make the uncertainty visible in the draft manifest, and block finalization.
- If the owner cuts every proposal or does not reply, write nothing and keep no hidden queue.
- If the index disagrees with its source files, regenerate it; never hand-edit it.

## What it deliberately does not do

- It does not make Obsidian required or use Obsidian as a database.
- It does not install or depend on the whole `kepano/obsidian-skills` package. Its Markdown skill prefers frontmatter and wikilinks that conflict with this specification. Its CLI skill may be used as an optional, on-demand link check when a compatible running Obsidian is available, but filesystem and Git checks remain authoritative.
- It does not create canvases, Bases, generated visual maps, or a second representation of canonical knowledge.
- It does not let hooks, helper agents, or background processes write durable knowledge.
- It does not restore the retired verifier, large rule, shape checker, or hand-maintained indexes.
- It does not migrate ordinary similarly named folders without a verified system signature.
- It does not silently rewrite, discard, or reinterpret existing saved documents during migration.
