---
name: second-brain
description: >-
  Set up, adopt, detect, migrate, explain, maintain, or cleanly remove the
  toolkit's portable project knowledge system. Use for project memory,
  knowledge, specifications, Obsidian-vault setup, flat-layout migration,
  removing the memory system, or retired second-brain review.
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

## Migration

The one supported source is the version 1 `knowledge/` layout. First produce
the no-write plan:

```text
node .claude/tools/knowledge-layout.mjs plan .
```

Show the owner:

- every source and target, and every file kept exactly where it is;
- every generated file that will be discarded;
- every file the owner has to route, one at a time, because the engine never
  moves a `planning/` file, a `references/` file, or the tag registry on its
  own;
- every version 2 field that is missing, which is reported as a gap and never
  filled in;
- every Markdown file whose relative links will change;
- every warning, collision, or blocker;
- the rollback steps; and
- the plan hash.

Answer each routing question with a `--route <path>=<destination>` or
`--route <path>=retire` flag, and pass the same flags to `apply`. After the
owner approves that exact plan, run:

```text
node .claude/tools/knowledge-layout.mjs apply . --approve <plan-hash>
```

`node .claude/tools/knowledge-layout.mjs rollback .` undoes it while the
receipt is still there.

Then install or refresh the runtime assets and root routes described above.
The tool moves knowledge documents, rewrites record front matter, and repairs
Markdown links. The setup skill owns instruction files, settings, and hook
registration because those files may already contain project-specific
configuration.

After migration and runtime installation, run a full read-only health report:

```text
node .claude/tools/knowledge-health.mjs health --json
```

Use `cleanup` to show the owner short repair summaries. Do not silently
normalize old source values, add missing sessions, merge tags, or otherwise
rewrite knowledge.

## Layouts this engine detects but does not convert

`flat-149` and `retired-v3` are reported by `detect` and refused by `plan`.
Their conversions shipped in toolkit 3.6.0 and were retired with the version 1
engine. A project on either one runs that earlier migration first, reaches the
version 1 `knowledge/` layout, and then runs this engine.

Show the owner the detected state and the refusal. Write nothing.

After the approved conversion is installed, run the same full health report and
resolve every warning through `cleanup` before calling the migration complete.

## Version 2 Codex startup route

This is the Codex route a version 2 project gets. Step 9 of project-init Gate 3
sends the installer here, so a new project takes this block. Every version 1
step above stays in force for a project already running version 1: it keeps its
version 1 route until it migrates.

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

## Removing the memory system from a project

The owner may take this system out of a project without breaking the rest of the
toolkit. Removal takes out the startup route and the memory-only support files.
It never deletes what the project owns. The `knowledge/` content, the
specifications, the references and sources, the rules, the other skills, the
delivery material, and the work-tracker records all stay exactly where they are.

Removing the system is not the same as deleting the knowledge. Deleting content
is a separate decision the owner makes on its own, and it is never folded into
these steps.

### Before removing anything

1. Ask which layout the project runs:

   ```text
   node <plugin path>/tools/knowledge-layout.mjs detect . --json
   ```

   `v2` follows the version 2 list below. `knowledge` follows the version 1
   list. `mixed` or `unknown` stops here: name the signatures and ask the owner.
2. Read `.claude/settings.json`, and `.claude/settings.local.json` where it
   exists, and list every registration whose command names a memory file.
3. Show the owner one list: every settings entry that goes, every file that
   goes, and everything that stays. Remove nothing until they approve it.
4. The Git boundary below still applies. Removal is an ordinary working
   change in the requesting session's worktree.

### Version 2 project

1. **Unregister the two hooks.** In the settings file, delete only the hook
   objects whose command names `boot-brief-session-start.mjs`, registered under
   `SessionStart`, and `memory-write-guard.mjs`, registered under `PreToolUse`.
   When a matcher group has no hooks left, delete the group. When an event
   array is empty, delete the event key. When the `hooks` block itself is
   empty, delete it. Every other hook stays untouched, including any that
   shares the same matcher. Repeat the same narrow edit in
   `.claude/settings.local.json` when it carries a copy.
2. **Check for `save-reminder.mjs`.** A project carried over from version 1 may
   still register it. It belongs to this system too, and all it does is raise
   the save moment before a pull request. Name it and let the owner decide.
3. **Drop `second-brain@claude-toolkit` from `enabledPlugins`,** leaving the
   other entries alone. That is what takes the skills out of the session.
   `remember`, `recall`, `cleanup`, `session-search`, and this skill ship with
   the plugin and are never copied into a project, so there is nothing else to
   delete. Remove a copy under `.claude/skills/` only where that project made
   one.
4. **Ask about `CLAUDE_CODE_DISABLE_AUTO_MEMORY`,** once. Left at `1`, the
   host's built-in memory stays off. Deleted, it comes back on. Recommend
   leaving it set: the project's knowledge is still Markdown that Git owns,
   and the built-in memory would put a second, hidden store beside it.
5. **Delete the copied hook files:**
   `.claude/hooks/boot-brief-session-start.mjs` and
   `.claude/hooks/memory-write-guard.mjs`.
6. **Delete the copied tools** from `.claude/tools/`: `memory.mjs`,
   `memory-write.mjs`, `boot-brief.mjs`, `tracker-adapter.mjs`, `gold-set.mjs`,
   `knowledge-layout.mjs`, `isolation-fixtures.mjs`, and the `lib/` folder.
   Setup copies the whole tools folder, so that list is every file it brings.
   Leave every other file in that folder. A project that ran the tools from the
   plugin folder has nothing to delete here.
7. **Remove the Codex startup route** from `AGENTS.md`: delete the block between
   the two `second-brain:startup-route` markers, and the markers, and nothing
   else. Text outside them belongs to the project. Where the route was written
   without markers, show the owner the exact lines before deleting them.
8. **Remove the memory route from root `CLAUDE.md` and `AGENTS.md`:** the
   startup reads, the authority split, the approval pointer, and the save
   route. Leave every other instruction standing. Where the two files share one
   marked block, edit both in the same change so they stay identical.
9. **Delete `.memory/`** where it exists, and remove its `.gitignore` entry and
   the comment above it. That state is local, disposable, and never canonical.
10. **Leave `knowledge/` alone.** `project.md`, `map.md`, `current.md`,
    `specs/`, the four record folders, and the optional `pins.md` and
    `retrieval-gold-set.md` all stay. Records keep their front matter, which is
    what makes re-adoption a matter of registering the routes again rather than
    rebuilding anything.

### Version 1 project

A project that never adopted version 2 removes what version 1 setup installed.
Same shape, different files.

1. Unregister `knowledge-session-start.mjs`, under `SessionStart`, and
   `save-reminder.mjs`, under `PreToolUse` with the `Bash` matcher, using the
   same narrow settings edit as above.
2. Delete `.claude/hooks/knowledge-session-start.mjs` and
   `.claude/hooks/save-reminder.mjs`.
3. Delete `.claude/tools/build-knowledge-index.mjs`,
   `.claude/tools/knowledge-health.mjs`, and
   `.claude/tools/knowledge-layout.mjs`. Leave every other file in that folder.
4. Drop the plugin from `enabledPlugins` and settle the
   `CLAUDE_CODE_DISABLE_AUTO_MEMORY` question, both as above.
5. Remove the short knowledge route from root `CLAUDE.md` and `AGENTS.md`.
6. Leave `knowledge/` in place, `knowledge/index.md` included. The index is
   generated and its builder is gone, so it stops updating and becomes a
   snapshot. Say that plainly. Deleting it is the owner's separate call.
7. Leave `knowledge/.obsidian/app.json` and its `.gitignore` allowlist. They
   belong to the folder the project is keeping.

### What removal never touches

- Anything under `knowledge/`.
- Project rules, the output style, and every skill outside this plugin.
- Any other plugin, its hooks, or its files. Guard hooks, setup material, and
  every non-memory hook keep running.
- The work tracker, delivery and client material, references, and source
  records.
- Git history.

### After removal

No brief prints at session start. Nothing refuses a hand edit under
`knowledge/memory/`, `knowledge/specs/`, or `knowledge/current.md` any more, so
those files are ordinary Markdown the owner edits directly. The skills are gone
from the session.

The read-only tools in the plugin folder still run by hand against the project,
because the knowledge tree is intact and they only read it. That is the check
that removal broke nothing:

```text
node <plugin path>/tools/memory.mjs capabilities
```

It reports the project, its pin count, and its `degraded` list, and it exits 0.
A crash, or a report with no project, means something under `knowledge/` was
removed that should not have been.

### Check the removal

1. Search the settings files for `boot-brief-session-start`,
   `memory-write-guard`, `knowledge-session-start`, and `save-reminder`. Nothing
   should match.
2. Confirm every other hook is still registered and still fires.
3. Confirm the project's Git status shows no change under `knowledge/`.
4. Start a fresh session and confirm it prints no brief and reports no error.
5. Report to the owner exactly what was removed and what stayed.

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
