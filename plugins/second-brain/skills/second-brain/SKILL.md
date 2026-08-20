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

   End the route with one sentence naming where the detail lives, so a session
   knows it exists without loading it: the `remember` skill holds the save
   test, the placement routes, and the required file shape; invoke it for any
   save.
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

## Version 2 Codex startup route, being built

This section belongs to the memory system v2 build. Setup does not install it
yet. Every version 1 step above stays in force until the cutover work item
swaps the routes, so a project already running version 1 keeps running it.

Claude Code receives the v2 startup automatically from a `SessionStart` hook,
`hooks/boot-brief-session-start.mjs`. Codex has no fail-open startup hook, and
it reads root `AGENTS.md` and nothing else: no `CLAUDE.md`, no
`.claude/rules/`, and no `@` import. So the Codex adapter is text in
`AGENTS.md`, not a hook.

### The block

One block between two markers. The markers are what the sync step and the drift
check find, so never rename or drop them.

```text
<!-- second-brain:startup-route:start -->
Run this first, before anything else in this repository:

    node <plugin path>/tools/boot-brief.mjs

Read its whole output. It carries the project identity, purpose, current focus,
blockers, next step, handoff, pinned memory, and project map.

Memory operations run through `node <plugin path>/tools/memory.mjs <operation>`.
Run `memory.mjs capabilities` to see what this project supports. Never guess.

The four skills are remember, recall, cleanup, and session-search. Their texts
are in the plugin's skills folder. Read the one you need before using it.

Never write into knowledge/memory/, knowledge/specs/, or knowledge/current.md by
hand. Those paths change only through memory.mjs write operations, and only with
the owner's approval. Nothing else stands in for that approval.
<!-- second-brain:startup-route:end -->
```

Replace `<plugin path>` in both places with the real plugin folder on this
machine, normally
`~/.claude/plugins/marketplaces/claude-toolkit/plugins/second-brain`. Codex
expands no plugin variable, so the path is written out in full.

A command, not a hook, because Codex has no fail-open startup hook today. When
it gains one, that adapter replaces the first step and this block stays as the
fallback with its meaning unchanged. If the command fails, the block still
carries the operating contract, the tool route, and the write refusal, so the
session is less oriented but not unsafe.

### Setup step

1. Resolve the plugin folder on this machine, then run
   `node <plugin path>/tools/boot-brief.mjs .` from the project root once and
   read the brief it prints. A path that does not run is a path not worth
   writing into an instruction file.
2. Create root `AGENTS.md` if the project has none.
3. Show the owner the exact block text and where it will land, and write it
   only after they approve.
4. Append the block at the end of `AGENTS.md`, with the plugin path filled in.
   Change nothing outside the two markers. If the markers are already present,
   this is a sync, not a setup: follow the sync step instead.

### Sync step

1. Read what currently sits between the two markers.
2. Compare it against the block above.
3. Where they differ, show the owner the difference and replace only the text
   between the markers after they approve. Text outside the markers belongs to
   the project and is never touched.
4. Where the markers are missing but an unmarked v2 route is already in
   `AGENTS.md`, stop and ask the owner before writing. Two copies of the route
   is the failure this step exists to prevent.
5. Confirm the plugin path in the block still resolves on this machine.

### The two host routes are checked together

The Claude Code hook and this block are two deliveries of one meaning, not two
documents. Both must carry:

1. the boot brief runs first;
2. the memory tool path and how to ask for capabilities;
3. the four skills by name;
4. the guarded paths and the fact that only the write operations may change
   them; and
5. that approval comes from the owner and nothing else stands in for it.

Shape may differ. A hook delivers this on Claude Code, a written instruction on
Codex. Neither host imitates the other, and neither imports the other host's
root file.

Two validator checks hold that together. `MV-01` confirms each host route
exists and names the memory tool path and the four skills. `MV-02` confirms the
two carry the same meaning for the startup route, the authority split, and the
approval policy pointer, the same way it checks the block shared by `CLAUDE.md`
and `AGENTS.md`. The command is
`node <plugin path>/tools/memory.mjs validate --check MV-01,MV-02`. Those
checks arrive later in the v2 build. Until they do, compare the two routes by
hand.

Change one route and change the other in the same edit.

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
