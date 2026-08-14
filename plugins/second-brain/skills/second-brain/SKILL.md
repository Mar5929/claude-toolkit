---
name: second-brain
description: >-
  Set up, adopt, detect, migrate, explain, or maintain the toolkit's portable
  project knowledge system. Use for project memory, knowledge, specifications,
  Obsidian-vault setup, flat-layout migration, or retired second-brain review.
  Markdown and Git stay authoritative. Never infer a migration field, import
  similarly named ordinary folders, or restore retired verifier machinery.
---

# Project knowledge system

The whole project brain lives under `knowledge/`. Obsidian may open that folder
as a vault, but normal Markdown files and Git remain the source of truth.

## Choose the path

Run the installed detector first in an existing project:

```text
node .claude/tools/knowledge-layout.mjs detect . --json
```

If the tools are not installed yet, run the copy in this plugin.

- `knowledge`: audit the installed assets and routes. Do not migrate again.
- `flat-149`: run a no-write plan, show it, and apply only after the owner
  approves that exact plan.
- `retired-v3`: create separate review drafts. Never finalize automatically.
- `none`: offer the complete greenfield tree.
- `mixed` or `unknown`: stop. Name the signatures and ask the owner rather than
  moving anything.

Folder names alone never prove that this system is installed.

## Greenfield setup

Show the complete tree from the plugin README and receive approval for the
whole system. Then:

1. Copy the template tree from this skill's `references/templates/knowledge/`.
2. Draft the real `knowledge/project.md` framing with the owner: what the
   project is, why it exists, what finished looks like, its main workstreams
   and boundaries, who is involved, and where active work is tracked. Do not
   copy the placeholder template as finished project truth.
3. Copy `build-knowledge-index.mjs`, `knowledge-health.mjs`, and
   `knowledge-layout.mjs` from the plugin's `tools/` folder into
   `.claude/tools/`.
4. Copy `knowledge-session-start.mjs` and `save-reminder.mjs` into
   `.claude/hooks/`.
5. Register the startup loader under Claude `SessionStart` and the reminder
   under `PreToolUse` with the `Bash` matcher. Where native Codex hooks exist,
   register the same fail-open startup loader. Always put the read instruction
   in root `AGENTS.md`, because Claude hooks do not run for Codex.
6. Add the same short route to root `CLAUDE.md` and `AGENTS.md`: read
   `knowledge/project.md`, then `knowledge/index.md`; specifications are
   approved behavior, memory is persistent knowledge, and brainstorms are
   unchecked. Include this short principle:

   > Keep project knowledge small: save persistent information only when a
   > stable fact, lasting event, decision, or state prevents repeated
   > explanation or the same wrong action. Put standing agent instructions in
   > rules, active work wherever its work item is being tracked, reusable
   > processes in skills, outside source material in references, and past
   > conversations in session history.
7. Set `CLAUDE_CODE_DISABLE_AUTO_MEMORY` to `1` and enable
   `second-brain@claude-toolkit` in the project's settings.
8. Build the index and run the plugin harness or equivalent fixture checks.

New projects start with an empty project-specific tag vocabulary. Never copy
the toolkit repository's topic tags into another project.

Do not create per-folder README indexes or a nested instruction file inside
`knowledge/`. Empty type folders use `.gitkeep` until their first document.

## Flat-layout migration

First produce the no-write plan:

```text
node .claude/tools/knowledge-layout.mjs plan .
```

Show the owner:

- every source and target;
- every old generated file that will be discarded and rebuilt;
- every Markdown file whose relative links will change;
- every warning or blocker; and
- the plan hash.

After the owner approves that exact plan, run:

```text
node .claude/tools/knowledge-layout.mjs apply . --approve <plan-hash>
```

Then install or refresh the runtime assets and root routes described above.
The tool moves knowledge documents and repairs Markdown links. The setup skill
owns instruction files, settings, and hook registration because those files may
already contain project-specific configuration.

Never hand-edit the generated index. Rebuild it.

After migration and runtime installation, run a full read-only health report:

```text
node .claude/tools/knowledge-health.mjs health --json
```

Use `cleanup` to show the owner short repair summaries. Do not silently
normalize old source values, add missing sessions, merge tags, or otherwise
rewrite knowledge.

## Retired-layout review

The old system's `Basis:` values and folder indexes cannot prove the source,
date, session, source file, or tags required by the current memory shape.

Create review material in a new empty directory outside the old knowledge tree:

```text
node .claude/tools/knowledge-layout.mjs review-retired . --output ../knowledge-review
```

The command copies supported specifications, memories, and brainstorms into
draft paths, adds visible placeholders to memory drafts, and writes a manifest
that accounts for each source. It leaves the project untouched and provides no
finalize command.

The owner reviews and approves every converted document through `remember`.
Only after every source is accounted for, links resolve, the new index is
built, startup routes work, and tests pass may an approved migration remove the
old rule, verifier, tools, and per-folder indexes.

After the approved conversion is installed, run the same full health report and
resolve every warning through `cleanup` before calling the migration complete.

## Git boundary

All changes stay in the requesting session's worktree. This plugin does not
commit, push, open or merge pull requests, or clean up branches. The project's
Git workflow owns those actions.

## Hard boundaries

- Do not write on detection or planning.
- Do not apply a plan with a different hash.
- Do not follow a symlink outside the repository.
- Do not overwrite a target or merge two candidate project overviews.
- Do not treat an ordinary `memory/`, `specs/`, or `knowledge/` folder as an
  installed system without its signatures.
- Do not restore the verifier, large memory rule, shape checker, per-folder
  indexes, background curation, or automatic capture.
- Do not commit health, property, tag, or provenance reports. Generate them on
  demand from the Markdown that Git already owns.
