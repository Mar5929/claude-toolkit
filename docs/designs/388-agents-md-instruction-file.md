# AGENTS.md as the project instruction file

Build plan for [issue #388](https://github.com/Mar5929/claude-toolkit/issues/388).
The issue owns scope, approval and status.
The parent PRD's [build philosophy](../../knowledge/prds/toolkit-operating-system/toolkit-operating-system.md#the-owners-build-philosophy)
governs this design: instructions and handshakes, no new machinery, no code that
detects patterns in language, and objective file checks stay objective.

## What the live Claude Code page says

Source: https://code.claude.com/docs/en/memory, read 2026-09-21. The saved copy at
`ai-external-knowledge/claude-code/memory.md` is dated 2026-09-04 and is out of
date on this subject, so it is refreshed as build step 1.

| What the repository has | What Claude Code reads |
| --- | --- |
| `AGENTS.md`, and no `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` in the working directory or above it | `AGENTS.md` |
| `AGENTS.md` and `CLAUDE.md` both | `CLAUDE.md` files only. `AGENTS.md` is ignored. |
| A `CLAUDE.md` that contains the import line for `AGENTS.md` | `CLAUDE.md`, with `AGENTS.md` included through the import |

Version: Claude Code reads `AGENTS.md` directly from v2.1.277. Mike's laptop runs
2.1.271 today, confirmed with `claude --version`. On this laptop the import route
is the only route that works.

Sessions that cannot read `AGENTS.md` at all, and read `CLAUDE.md` only:

- Claude Code older than v2.1.277.
- Sessions that do not fetch feature flags: Amazon Bedrock, other third-party
  providers, and sessions with telemetry disabled.
- The first session after an install or an upgrade.
- Sessions with `disableAllHooks` or `allowManagedHooksOnly` set.
- Sessions with the built-in `agents-md` plugin disabled.

For those sessions the page says to import `AGENTS.md` from a `CLAUDE.md`.

Import behavior:

- The import line never causes a double read, under any value of the "Project
  instructions" setting.
- A relative `@path` import resolves against the file that holds the import, not
  the working directory. A folder `CLAUDE.md` holding the import line therefore
  imports the `AGENTS.md` beside it.
- Import parsing skips code spans, so an import line written inside backticks is
  literal text and is not expanded.
- `@imports` inside an `AGENTS.md` do expand for Claude Code.
- The root `CLAUDE.md` is re-read after `/compact`. Nested files reload as
  Claude reads files in their folders.

What differs when `AGENTS.md` is read directly rather than through an import:

- It is not listed in `/memory` or `/context`.
- `InstructionsLoaded` hooks do not fire. They do fire for an `AGENTS.md` that
  was imported from a `CLAUDE.md`.
- An `AGENTS.md` in an extra directory added with `--add-dir` does not load.

Files Claude Code never reads: `AGENTS.local.md`, `AGENTS.override.md`, and
anything under `.agents/`. `~/.claude/CLAUDE.md`, managed `CLAUDE.md` and
`.claude/rules/` keep loading alongside `AGENTS.md`.

The "Project instructions" setting has four values: `claude-md-or-agents-md`
(default), `claude-md-and-agents-md`, `claude-md`, and `managed-only`. It lives
only in `~/.claude/settings.json`, in `--settings`, or in managed settings under
`pluginConfigs` `agents-md@builtin` `options.instructionFiles`. It is ignored in
project settings and local settings, so this design does not use it.

A symlink `CLAUDE.md` pointing at `AGENTS.md` also works, but the Edit and Write
tools refuse to write through a symlink and Windows clones break it. The page
prefers the import.

## Target layout for a new project

Every place that has an instruction file gets a pair of files.

- `AGENTS.md` holds all the content: the fixed owner lines above the title,
  "Read `.claude/rules` first", the toolkit manual route, the project knowledge
  route, the System Guide line when that component is enabled, the codemap, the
  tools table, the quick saves table, and where work is tracked.
- `CLAUDE.md` beside it is exactly one line and nothing else:

```
@AGENTS.md
```

- The same pair goes in every major folder that gets a folder instruction file:
  `<folder>/AGENTS.md` holds the folder content, `<folder>/CLAUDE.md` is the
  same one line.
- The root title line becomes `# AGENTS.md: working in <project>`.
- `AGENTS.md` must contain no `@path` import lines anywhere. Codex expands no
  imports, so an import line would reach a Codex session as literal text.
  Ordinary Markdown links and backticked paths are safe for both hosts. The
  current content already meets this: the root `CLAUDE.md` has one Markdown link
  and no import line.
- No symlink, no `AGENTS.local.md`, no `AGENTS.override.md`, no instruction file
  under `.agents/`, and no change to the per-machine "Project instructions"
  setting.

Tree for a new project with two major folders:

```
acme-crm/
  AGENTS.md            all the root instructions
  CLAUDE.md            one line: @AGENTS.md
  docs/
    AGENTS.md          what docs/ holds and how to work there
    CLAUDE.md          one line: @AGENTS.md
  force-app/
    AGENTS.md
    CLAUDE.md
```

## Target layout for this repository

| File today | What it becomes |
| --- | --- |
| `AGENTS.md`, one line "Read CLAUDE.md in this folder and follow it." | Deleted, then recreated by the move as the content file |
| `CLAUDE.md`, 93 lines of content | Moved to `AGENTS.md`; a new one-line `CLAUDE.md` replaces it |
| `docs/CLAUDE.md`, 50 lines | Moved to `docs/AGENTS.md`; new one-line `docs/CLAUDE.md` |
| `plugins/CLAUDE.md`, 91 lines | Moved to `plugins/AGENTS.md`; new one-line `plugins/CLAUDE.md` |
| `tests/CLAUDE.md`, 61 lines | Moved to `tests/AGENTS.md`; new one-line `tests/CLAUDE.md` |

Commands, at the repository root:

```
git rm AGENTS.md
git mv CLAUDE.md AGENTS.md
printf '@AGENTS.md\n' > CLAUDE.md
git add CLAUDE.md
```

The same two steps for each folder, with no `git rm` because no folder
`AGENTS.md` exists yet:

```
git mv docs/CLAUDE.md docs/AGENTS.md
printf '@AGENTS.md\n' > docs/CLAUDE.md
git add docs/CLAUDE.md
```

Removing the old one-line `AGENTS.md` first is what lets Git follow the content
from `CLAUDE.md` to `AGENTS.md` as a rename.

Content changes inside the moved files are limited to the title line and the few
sentences that describe the mechanism itself. Everything else is unchanged in
this issue. Content corrections belong to #385.

## Folder-level files

Decision: rename folder files too, as pairs. In new projects this happens at
setup. In existing projects it happens through `project-sync`, one folder at a
time, and only after the owner says yes to that folder.

Reasons:

- One naming convention everywhere. Requirement 1 says `CLAUDE.md` stops being
  where instructions are written, and a folder `CLAUDE.md` holding content would
  contradict that.
- A folder `AGENTS.md` is also read by a Codex session that starts inside that
  folder, because Codex assembles `AGENTS.md` files from the project root down
  to the starting directory. That is a small gain.
- Nothing gets worse for Codex. A root-started Codex session still does not load
  a nested file on its own, exactly as today with folder `CLAUDE.md` files. The
  root codemap line keeps telling it to open the folder file.

The alternative, renaming only the root and leaving folder files as `CLAUDE.md`,
touches fewer files now but leaves two conventions in place forever. Every
document would have to describe both, and later sessions would keep writing new
folder `CLAUDE.md` files. Not recommended.

PRD consequence: `knowledge/prds/toolkit-operating-system/folder-instruction-files.md`
is finalized and was approved by Mike on 2026-08-22. Lines 70-73 and 118-123 say
the toolkit deliberately keeps one root `AGENTS.md` and creates no nested ones.
Both reverse. That is a requirements change and needs Mike's approval. It is
open point 2.

## Fallback for sessions that cannot read AGENTS.md

The one-line `CLAUDE.md` import is the fallback, and it is permanent in this
design, not a temporary step. It costs one line per folder.

It holds against the "both files present means `CLAUDE.md` only" rule. That rule
has a third row in the live page's own table: a `CLAUDE.md` that already imports
`AGENTS.md` gives you your `CLAUDE.md` with `AGENTS.md` included through the
import. See the table in "What the live Claude Code page says", row three. The
page also states the import never causes a double read under any setting value.

Two side effects of the import route are useful. An imported `AGENTS.md` is
listed under Memory files in `/context`, and `InstructionsLoaded` hooks fire for
it. A directly read `AGENTS.md` is neither listed nor hooked. That makes the
import route easier to verify.

On Mike's laptop today at 2.1.271, the import route is the only route that
works. Testing the native route needs an upgrade to 2.1.277 or later first.

Alternatives considered:

| Alternative | Why not |
| --- | --- |
| `AGENTS.md` only, no `CLAUDE.md` anywhere | Fails today on this laptop at 2.1.271, and fails in Bedrock sessions, third-party provider sessions, telemetry-off sessions, and the first session after an upgrade |
| Keep `CLAUDE.md` as the content file and have `AGENTS.md` import it | Codex expands no imports, so Codex would receive a literal `@CLAUDE.md` line and no instructions |
| Symlink `CLAUDE.md` to `AGENTS.md` | The Edit and Write tools refuse to write through a symlink, and Windows clones break it |
| Set "Project instructions" to `claude-md-and-agents-md` and ship `AGENTS.md` alone | The setting is per machine and is ignored in project settings, so every machine would need it; it still does not help sessions that cannot read `AGENTS.md` at all; it adds machinery the build philosophy rules out |

Possible simplification later: when every machine runs 2.1.277 or later and no
session runs on a third-party provider, deleting every one-line `CLAUDE.md` at
once switches Claude to native reading with no other change. Nothing else in the
layout has to move.

## How Codex is affected

Codex loading facts verified 2026-09-21 from
https://learn.chatgpt.com/docs/agent-configuration/agents-md,
https://learn.chatgpt.com/docs/config-file/config-advanced,
https://learn.chatgpt.com/docs/config-file/config-reference,
https://learn.chatgpt.com/docs/import,
https://learn.chatgpt.com/docs/environments/cloud-environment,
and the source file `codex-rs/core/src/agents_md.rs` in
https://github.com/openai/codex.

What Codex does:

- It finds the project root, which is the first ancestor holding a
  `project_root_markers` entry, `.git` by default, and never walks past it.
- From that root down to the current working directory it reads, in each
  directory, `AGENTS.override.md`, then `AGENTS.md`, then any
  `project_doc_fallback_filenames`. That last setting is empty by default, so
  Codex never reads a `CLAUDE.md` natively. At most one file per directory.
- The parts are joined root first, so a file nearer the working directory
  appears later and overrides earlier text. The global file from `~/.codex` is
  joined to the project parts with the literal separator `--- project-doc ---`.
- The chain is built once per run, or once per session in the terminal
  interface. A nested `AGENTS.md` below the starting directory never loads, and
  nothing loads later because Codex opened a file in a subfolder.
- Codex supports no import syntax at all. An `@path` line reaches the model as
  literal text.
- `project_doc_max_bytes` defaults to 32 KiB, 32768 bytes, and it is a shared
  budget across the whole chain. Empty files are skipped. Once the budget runs
  out, later files are dropped, so a large root file can starve the folder files
  below it.
- The Codex `/import` command maps Claude Code instruction files to `AGENTS.md`.
  Codex cloud and Codex desktop use the same discovery.

What changes for Codex after the move:

- Today Codex reads the one-line `AGENTS.md` and then has to open `CLAUDE.md`
  with a tool call. After the move Codex receives the full root content at
  session start with no extra step: the fixed owner lines, "Read `.claude/rules`
  first", the manual route, the knowledge route, and the codemap.
- Whether Codex follows a plain sentence such as "Read CLAUDE.md in this folder
  and follow it" is not documented anywhere. It is model discretion.
  `plugins/project-init/skills/project-sync/SKILL.md` lines 440-450 already
  hedges and names the weakness. The move removes that uncertainty for the root
  content, because the content is now in the file Codex loads itself. It remains
  for `.claude/rules/`, which Codex still does not load on its own, but that is
  now one instruction away instead of two.
- Folder `AGENTS.md` files load for Codex only when a session starts inside that
  folder's subtree. A root-started session still opens them by following the
  codemap line, exactly as today.

Two constraints this adds to the design:

- Never create an `AGENTS.override.md`. Claude Code never reads it, and Codex
  prefers it over `AGENTS.md` and silently drops `AGENTS.md` in that directory.
- The 32 KiB shared budget is now a real limit. The root file here is about 7 KB
  and folder files are 3 KB to 5 KB, so a session started three folders deep
  stays well under it. The existing "under 200 lines" health check in
  `project-sync` at lines 492-494 now protects the Codex budget as well as
  Claude's context. Say so where that check is described.

The toolkit currently documents none of `AGENTS.override.md`,
`project_doc_max_bytes` or `project_doc_fallback_filenames`. Capturing one Codex
page is open point 6.

## How existing projects move through project sync

Requirement 5: existing projects move only through `project-sync`, and the
owner's content is preserved.

What sync reports, without changing anything:

| Finding | Reported as |
| --- | --- |
| Root has a content-bearing `CLAUDE.md` and a one-line pointer `AGENTS.md` | One gap: "instruction files in the old layout" |
| A folder holds a content-bearing `CLAUDE.md` | One more gap, per folder |
| A project `AGENTS.md` holds anything besides the pointer line | Shown to the owner with the question of where that text goes |

What sync does after a yes, per file:

1. `git mv CLAUDE.md AGENTS.md`, content byte for byte.
2. The only content edits: the title line `# CLAUDE.md: ...` becomes
   `# AGENTS.md: ...`, and the sentence that says `AGENTS.md` is a pointer to
   `CLAUDE.md`, if present, is removed.
3. Write the one-line `CLAUDE.md`.
4. Record the move in `.claude/toolkit-sync.md`.

Never overwritten:

- The owner's wording inside a folder file. The existing rule at
  `plugins/project-init/skills/project-sync/SKILL.md` lines 574-575 stays: a
  folder file that is already present is left alone and never rewritten into
  toolkit wording.
- Owner-written text in the project's `AGENTS.md`. Sync shows it and asks where
  it goes.
- Nothing moves without a yes, per file.

`CLAUDE.local.md`: a project that has one keeps working. Claude reads
`CLAUDE.local.md` as before, and the one-line `CLAUDE.md` still brings in
`AGENTS.md` through the import. The sync report says so rather than asking the
owner to move it.

## Every file that changes, in build order

Line numbers below were re-checked with `grep -n` on 2026-09-21 against the
current repository. The Source column says which commit each check ran on:
`e8b48ec` or `2e0e3ae`, the current `origin/main`. Where a number in the
inventory reports no longer matched, the current number is given here.

### Step 1: refresh the saved Claude Code documentation

| File | What changes | Source of the line numbers |
| --- | --- | --- |
| `ai-external-knowledge/claude-code/*.md` | Regenerated by `node .claude/tools/capture-claude-code-docs.mjs`. Its own first commit. Never hand-edited. | Report report-prd-inflight.md |

The tool is all or nothing: it deletes every `.md` in that folder and refetches
all 161 pages with 8 workers, rewrites links to full URLs, regenerates the
folder `README.md`, and exits non-zero if any fetch fails. Check `git status`
after it runs and confirm `memory.md` now describes `AGENTS.md` reading.

### Step 2: tests and the orientation hook

These move first so the checks describe the new shape before the files move.

| File | What changes | Source of the line numbers |
| --- | --- | --- |
| `tests/installed-copy-check.mjs` | Line 216 constant `AGENTS_MD` holds the old pointer sentence; lines 219-226 fail unless `AGENTS.md` matches it exactly. Replace with: `CLAUDE.md` must be exactly `@AGENTS.md`, at root and in every folder pair. Header comment line 28, comment line 212, pass message line 238. | grep, e8b48ec |
| `tests/knowledge-startup-check.mjs` | Lines 99-103. Line 100 reads `CLAUDE.md` for the four startup paths, line 101 for `memory-inbox.md` and "completely", line 102 asserts `AGENTS.md` is one line naming `CLAUDE.md`. Read `AGENTS.md` for the routes; assert `CLAUDE.md` is exactly one line `@AGENTS.md`. | grep, e8b48ec |
| `tests/orphan-check.mjs` | Line 71 treats `README.md` and `CLAUDE.md` as index documents. `AGENTS.md` becomes the index; the one-line `CLAUDE.md` indexes nothing. Comment at line 16. | grep, e8b48ec |
| `tests/toolkit-startup.test.mjs` | Fixture lines 17 and 18 swap roles; line 58 deletes both files; the test at lines 72-76 asserts "CLAUDE.md is missing" and "chain is incomplete" and is rewritten for the new premise; line 108 asserts the shipped manual template names `CLAUDE.md`. | grep, e8b48ec |
| `plugins/project-init/library/hooks/toolkit-session-start.mjs` | Line 22 checks `CLAUDE.md` state; line 23 orders the chain `AGENTS.md -> CLAUDE.md`; line 26 and line 30 wording becomes "Read the project's AGENTS.md"; lines 40-41 reverse: a missing or empty `AGENTS.md` is the gap, and a `CLAUDE.md` that is not the one-line import is reported; line 67 fallback wording. | grep, e8b48ec |
| `.claude/hooks/toolkit-session-start.mjs` | Installed copy. Byte identical to the shipped file today, checked with `diff`. Reconcile in the same change. | `diff`, e8b48ec |
| `plugins/project-init/library/hooks/README.md` | Correction to the inventory: this file names no instruction file. It holds only the hook registration JSON and command paths. No change needed unless the hook's installation wording changes. | grep, 2e0e3ae |

### Step 3: shipped templates and setup skills

| File | What changes | Source of the line numbers |
| --- | --- | --- |
| `plugins/project-init/skills/project-init/references/thin-claudemd.md` | Renamed to `thin-agents-md.md`. Title line 1; line 117; the whole `## AGENTS.md` section at lines 144-155, whose body is the old pointer sentence, becomes the one-line `CLAUDE.md` section; line 161 upkeep sentence becomes "CLAUDE.md never changes, because it holds nothing that can go out of date." | grep, 2e0e3ae |
| `plugins/project-init/skills/project-init/references/folder-claudemd.md` | Renamed to `folder-agents-md.md`. The section "Why the toolkit keeps one root AGENTS.md" at lines 42-54 reverses. | grep, 2e0e3ae |
| `plugins/project-init/skills/project-init/references/root-file-examples.md` | Title line 1; sample heading line 10; sample title line 21; folder codemap examples at lines 51, 54, 55; the sample `AGENTS.md` at lines 81-95 becomes the sample one-line `CLAUDE.md`. | grep, 2e0e3ae |
| `plugins/project-init/skills/project-init/references/setup-flow.md` | Lines 44, 188, 243, 259. | grep, 2e0e3ae |
| `plugins/project-init/skills/project-init/SKILL.md` | Frontmatter description line 6; Gate 1 folder-file instruction lines 61-71, including "Never create a nested AGENTS.md" at line 71; knowledge fallback line 299; Gate 5 heading line 341; line 352; the `AGENTS.md` creation block at lines 458-463; reference list lines 596-598. | grep, 2e0e3ae |
| `plugins/project-init/skills/project-sync/SKILL.md` | "Codex reachability" section at lines 433-481 becomes an instruction-file pair audit: `AGENTS.md` carries content, `CLAUDE.md` is the one-line import, offer the move. "CLAUDE.md health" at lines 483-564 becomes "AGENTS.md health", and the size check at lines 492-494 also names the Codex 32 KiB budget. "Folder CLAUDE.md files" at lines 566-590. The tracker-pointer instruction at line 745 that writes into both root files contradicts the one-line rule and is corrected. The dangling reference at lines 656-658 cites a section "What must stay in the root file" that does not exist in `thin-claudemd.md`; fix it against the renamed file. | grep, 2e0e3ae |
| `plugins/project-init/skills/project-init/references/work-tracking-choice.md` | Line 188, "AGENTS.md gets nothing", reverses. | grep, 2e0e3ae |
| `plugins/project-init/skills/project-init/references/toolkit-manual-delivery.md` | Lines 18-19. | grep, 2e0e3ae |
| `plugins/project-init/library/templates/toolkit-manual.md` | Lines 94-95 route sentence; line 108; lines 278 and 282 table rows. | grep, e8b48ec |
| `plugins/project-init/library/rules/general/README.md` | Lines 4, 5, 9, and the retired-rule row at line 113. | grep, 2e0e3ae |
| `plugins/project-init/library/rules/salesforce/README.md` | Line 11. | grep, 2e0e3ae |
| `plugins/project-init/README.md` | Lines 37, 44, 169, 172, 173, 174, 178, 214, 220, including the two renamed reference file names. | grep, 2e0e3ae |
| `plugins/project-init/library/guides/mcp-best-practices.md` | Lines 4 and 77. | grep, 2e0e3ae |
| `plugins/project-init/library/guides/graphify-dependency-graph.md` | Line 44. | grep, 2e0e3ae |
| `plugins/sf-architect-solutioning/.claude-plugin/plugin.json` | Description string at line 3 names `CLAUDE.md`. | grep, 2e0e3ae |
| `plugins/sf-architect-solutioning/skills/sf-architect-solutioning/SKILL.md` | Lines 82, 84, 184. | grep, 2e0e3ae |
| `plugins/sf-architect-solutioning/skills/sf-architect-solutioning/references/naming-conventions.md` | Line 3. | grep, 2e0e3ae |
| `plugins/sf-architect-solutioning/skills/sf-architect-solutioning/references/solution-plan-template.md` | Line 160. | grep, 2e0e3ae |
| `plugins/sf-architect-solutioning/skills/sf-architect-solutioning/references/solutioning-checklist.md` | Lines 18 and 21. | grep, 2e0e3ae |
| `plugins/sf-architect-solutioning/README.md` | Line 22. | grep, 2e0e3ae |
| `plugins/git-workflows/skills/merge-and-clean-up/SKILL.md` | Line 22, "Read the repository's AGENTS.md, CLAUDE.md, and local workflow rules". | grep, 2e0e3ae |
| `plugins/project-init/skills/machine-sync/SKILL.md` | No change. Its references are machine files: `~/.claude/CLAUDE.md` and the retired `~/.codex/AGENTS.md` block. | Report report-plugins.md |

### Step 4: this repository's own files

| File | What changes | Source of the line numbers |
| --- | --- | --- |
| `AGENTS.md`, `CLAUDE.md` | The root pair, moved as shown above. | Direct read, 2e0e3ae |
| `docs/CLAUDE.md`, `plugins/CLAUDE.md`, `tests/CLAUDE.md` | Each moved to `AGENTS.md` with a new one-line `CLAUDE.md`. `docs/CLAUDE.md` line 50 cross-reference; `plugins/CLAUDE.md` line 91 cross-reference. | grep, 2e0e3ae |
| `tests/CLAUDE.md` content | Line 28 index list; lines 37-38 describe `shared-with-agents-md` markers that exist nowhere else and are already wrong; lines 60-61 describe the retired one-pointer-line rule. Corrected as part of the move. | grep, e8b48ec |
| `.claude/rules/README.md` | Line 5 becomes: the root `AGENTS.md` says "Read `.claude/rules` first" and Codex follows it, while Claude Code loads the folder automatically. Line 45, the retired `keep-claudemd-current.md` row, names the renamed reference file. | grep, e8b48ec |
| `.claude/rules/claude-code-docs-first.md` | Line 21, "a CLAUDE.md convention". | grep, e8b48ec |
| `tests/README.md` | Line 3 links to `CLAUDE.md`. | grep, e8b48ec |
| `docs/designs/README.md` | Line 28 names both root files. | grep, e8b48ec |
| `README.md` | Lines 20, 54, 325, and the repository tree at line 89. Correction to the inventory: lines 114 and 116 no longer name either file. | grep, 2e0e3ae |
| `plugins/CLAUDE.md` lines 1 and 5 | Say "seven" plugins; there are eight. Change only if #385 has not already done it. | grep, 2e0e3ae |

### Step 5: knowledge, PRDs and the catalog

| File | What changes | Source of the line numbers |
| --- | --- | --- |
| `knowledge/toolkit-manual.md` | Line numbers re-checked on `2e0e3ae`: the route sentence is at line 126, not 120-121; the `plugins/` link is at line 152, not 147; the tracker row link `../CLAUDE.md#where-work-is-tracked` is at line 347, not 342. All three point at files that become one-line imports. | grep, 2e0e3ae |
| `knowledge/prds/toolkit-operating-system/folder-instruction-files.md` | Lines 70-73 and 118-123 reverse. Add a Notes section recording the change and Mike's approval date. Needs open point 2 answered first. | grep, e8b48ec |
| `knowledge/prds/toolkit-operating-system/toolkit-operating-system.md` | Lines 33, 84 and 611 hard-name `CLAUDE.md`. Lines 179 and 189 are already host-neutral and stay. | grep, e8b48ec |
| `knowledge/prds/toolkit-operating-system/knowledge-system.md` | Lines 264, 1497, 2124. | grep, e8b48ec |
| Generated knowledge indexes | Rebuild with `node .claude/tools/build-knowledge-index.mjs`. Never hand-edited. | Project CLAUDE.md tools table |
| `docs/toolkit-map.md` | Line numbers re-checked on `e8b48ec`: lines 93-96, not 88-96; line 443, not 441-443; line 547, not 546. | grep, e8b48ec |
| `.claude/toolkit-sync.md` | Append one dated entry. Line numbers re-checked on `e8b48ec` after #387 merged: the Gates table row that says "AGENTS.md points to CLAUDE.md" is line 195, not 169; the stale installed-copy-check description is lines 255-256, not 226-227. Correct both inside the new entry rather than rewriting history. | grep, e8b48ec |

### Step 6: version numbers

| File | What changes | Source of the line numbers |
| --- | --- | --- |
| `plugins/project-init/.claude-plugin/plugin.json` line 4 and `.codex-plugin/plugin.json` line 3 | Bump from 0.77.5 | grep, 2e0e3ae |
| `plugins/sf-architect-solutioning/.claude-plugin/plugin.json` line 4 and `.codex-plugin/plugin.json` line 3 | Bump from 1.1.0 | grep, 2e0e3ae |
| `plugins/git-workflows/.claude-plugin/plugin.json` line 4 and `.codex-plugin/plugin.json` line 3 | Bump from 0.2.1 | grep, 2e0e3ae |
| `.claude-plugin/marketplace.json` line 9 | `metadata.version` is 0.124.9 now. The next number is assigned by the Main Orchestrator, which owns release numbers. | grep, 2e0e3ae |

`.agents/plugins/marketplace.json` has no version field and is unrelated to
instruction files. It registers plugins for Codex. Claude Code reads no
instruction file under `.agents/`.

### Step 7: deliberately not touched

Historical designs, research files, brainstorms, the misc folder, and
`archive/`. The inventory counted 251 matches across them. None of them load in
a session, and they are records of what was true when they were written.

`ai-external-knowledge/claude-code/*.md` is never hand-edited. It changes only
through the capture tool in step 1.

## Sequence with work in flight

| Item | Overlapping files | Order | Who rebases |
| --- | --- | --- | --- |
| PR #387, project sync record | `CLAUDE.md`, `.claude/toolkit-sync.md`, `knowledge/toolkit-manual.md` | Merged already, commit `de5fb58`. The hard wait is satisfied. | Nobody |
| PR #386, second-brain action hold | `.claude-plugin/marketplace.json` version line only | Merged already, commit `1fc3f2f` | Nobody |
| #390, Terse output style | None of the listed files | Merged already, commit `e8b48ec` | Nobody |
| #392, Plain English rewrite | `.claude-plugin/marketplace.json`, `plugins/project-init/.claude-plugin/plugin.json`, `knowledge/toolkit-manual.md` lines 66-75, the output style files | Merged already, commit `2e0e3ae`. #392 merged, no overlap with the listed files except `knowledge/toolkit-manual.md` line shifts. The three line numbers cited for that file were re-checked at `2e0e3ae` and are 126, 152, 347. | Nobody |
| #385, documentation corrections | `CLAUDE.md`, `root-file-examples.md`, `plugins/project-init/skills/project-init/SKILL.md`, `toolkit-operating-system.md`, probably `docs/toolkit-map.md` | Recommended: #385 lands first, then #388 moves the corrected content | #385 lands first, so #388 rebases. If the Main Orchestrator prefers #388 first, #385 branches from main after #388 merges and edits `AGENTS.md`, `thin-agents-md.md` and `folder-agents-md.md` instead. |
| #383, instruction and rule text | `project-sync/SKILL.md`, `folder-claudemd.md`, `thin-claudemd.md`, `folder-instruction-files.md`, `root-file-examples.md` | Recommended: #388 first. #383 is text-only and applies just as well to the renamed files, and #383 is waiting on #378 anyway. | #383 rebases |
| #380, acknowledgment hooks | `plugins/project-init/library/hooks/toolkit-session-start.mjs` | Not at the same time. #388 changes only the file-name logic and the chain sentence; #380 changes how often the hook speaks. | Whichever lands second. Flag to the Main Orchestrator. |
| #389 | None | Any | Nobody |

Only one of #385, #383 and #388 may be in flight at a time on the shared files.

The Main Orchestrator reported #392 as about to merge and its content as
unknown. It has since merged and its content is now known, as recorded in the
row above. Recheck `git log` for anything newer before the build starts.

## How it is tested

### Claude Code, import route, works today at 2.1.271

1. Create a scratch Git repository under a private temporary folder. Never use
   the shared temporary folders `toolkit-knowledge-review`,
   `second-brain-action-hold`, `second-brain-save-reminder` or
   `second-brain-work-item-close`.
2. Run `/project-init` there, accept Gate 1 with two folders, accept Gate 5.
3. Check the files: root `AGENTS.md` holds the content, root `CLAUDE.md` is
   exactly `@AGENTS.md`, each folder has the same pair.
4. Run `/context` and confirm both `CLAUDE.md` and `AGENTS.md` appear under
   Memory files.
5. Ask "what do your project instructions say" and confirm the codemap comes
   back.
6. Read a file inside one of the folders, then ask again, and confirm that
   folder's content is now in the answer.
7. Run the installed SessionStart hook by hand from
   `.claude/hooks/toolkit-session-start.mjs` and confirm it says to read
   `AGENTS.md` and reports no gap.
8. Delete `AGENTS.md` and run the hook again; it must report the gap.

Proves: the pair loads, the folder pair loads on demand, and the hook describes
the new shape. Does not prove anything about the native route or about Codex.

### Claude Code, native route, after upgrading to 2.1.277 or later

1. Upgrade Claude Code. This is Mike's call and is open point 3.
2. In the scratch repository, temporarily remove the one-line `CLAUDE.md` files.
3. Start a session and look for the line "no CLAUDE.md found; AGENTS.md loaded:".
4. Read a file in a folder and confirm that folder's `AGENTS.md` loads.
5. Put the `CLAUDE.md` files back.

Proves: the content files work on their own on a new enough version, which is
what the later simplification would rely on. Does not prove the layout is safe
to ship without the `CLAUDE.md` files, because older and third-party sessions
are not covered by this test.

### Codex

1. Open the scratch repository in Codex and ask what its instructions say. The
   full `AGENTS.md` content should come back with no extra tool call.
2. Start Codex inside a subfolder and confirm that folder's `AGENTS.md` is also
   in the instructions.
3. Start Codex at the root, edit a file in a folder, and confirm the codemap
   line sends it to open the folder file.

Proves: Codex receives the root content at start, and the folder chain works
when a session starts inside the folder. Does not prove Codex reliably follows
the codemap line from a root-started session; that is model discretion and is
not documented.

### Existing-project sync path

1. Copy an existing toolkit project, or build the old shape by hand in the
   scratch repository: a content `CLAUDE.md`, a pointer `AGENTS.md`, one sentence
   the owner wrote, and one folder `CLAUDE.md`.
2. Run `/project-sync` and approve the move.
3. Diff before and after and confirm the owner's wording is byte identical apart
   from the title line.
4. Confirm `.claude/toolkit-sync.md` got the entry.

Proves: requirement 5, that existing projects move only through sync with the
owner's content preserved. Does not prove anything about projects with layouts
the toolkit has never produced.

### Repository checks, on the build branch

Run all of these with `TMPDIR` set to a private folder under the session
scratchpad:

1. `node tests/link-check.mjs`
2. `node tests/orphan-check.mjs`
3. `node tests/installed-copy-check.mjs`
4. `node tests/knowledge-startup-check.mjs`
5. `node --test tests/toolkit-startup.test.mjs`
6. `claude plugin validate .`

All must pass. Baseline before the change, measured 2026-09-21: link-check 482
links across 284 files, orphan-check 248 files and 69 indexes, installed-copy
27 checks, knowledge-startup 13 checks, toolkit-startup 10 tests.

Proves: file shapes, links, installed copies and the startup route are
consistent. Does not prove a host actually followed any instruction.

### This repository after merge

1. Start a fresh Claude Code session here and confirm `CLAUDE.md` and
   `AGENTS.md` both appear under Memory files in `/context`, and that the
   SessionStart hook says to read `AGENTS.md`.
2. Start a Codex session here and ask what the instructions say; the answer
   comes from `AGENTS.md`.

## Documentation brought up to date

- `ai-external-knowledge/claude-code/`: refreshed with
  `node .claude/tools/capture-claude-code-docs.mjs`, as build step 1 and as its
  own first commit. The tool is all or nothing: it deletes every `.md` in that
  folder, refetches all 161 pages, regenerates the folder `README.md`, and exits
  non-zero if any page fails. Nothing in it is hand-edited.
- `ai-external-knowledge/codex/`: new folder holding one captured page, the
  Codex `AGENTS.md` page at
  https://learn.chatgpt.com/docs/agent-configuration/agents-md, with the source
  URL and capture date in a `README.md`, as `.claude/rules/ai-external-knowledge.md`
  requires. This gives `claude-code-docs-first.md` a Codex page to point at.
  This adds scope, so it is open point 6.
- `knowledge/toolkit-manual.md` and its shipped template
  `plugins/project-init/library/templates/toolkit-manual.md`: the route sentence,
  the `plugins/` link and the tracker row.
- `knowledge/knowledge-manual.md`: no change needed, it names neither file.
  `keep-manuals-current.md` asks for that conclusion to be recorded, so it is
  recorded here and in the issue's delivery evidence.
- PRDs: `folder-instruction-files.md` lines 70-73 and 118-123 plus a new Notes
  section; `toolkit-operating-system.md` lines 33, 84, 611;
  `knowledge-system.md` lines 264, 1497, 2124.
- `docs/toolkit-map.md` lines 93-96, 443, 547.
- READMEs: root `README.md`, `tests/README.md`,
  `plugins/project-init/README.md`, `plugins/project-init/library/rules/general/README.md`,
  `plugins/project-init/library/rules/salesforce/README.md`,
  `.claude/rules/README.md`.
- `.claude/toolkit-sync.md`: one appended dated entry that also corrects the
  stale statements at lines 195 and 255-256.
- `docs/designs/README.md` line 28.
- Generated knowledge indexes rebuilt with
  `node .claude/tools/build-knowledge-index.mjs`.
- This design file is deleted at stage `14-spec-update`.

## Open points for Mike

1. Do we keep a one-line `CLAUDE.md` holding `@AGENTS.md` beside every
   `AGENTS.md`, permanently?
   Recommended: yes. It is the only layout that works on every Claude Code
   version and every session type today, including this laptop at 2.1.271, and
   Claude reads the content exactly once.
2. Do we rename the folder-level files to `AGENTS.md` pairs too, in new projects
   at setup and in existing projects through sync with a yes per folder?
   Recommended: yes. It keeps one naming convention everywhere, and it changes
   the finalized folder-instruction PRD, which is why it needs your approval.
3. Do we upgrade Claude Code on this laptop to 2.1.277 or later before the
   native-route test?
   Recommended: yes, after the build, so both routes get tested; the import
   route can be tested now without the upgrade.
4. Do we let #385 land its small text fixes before #388 moves the files?
   Recommended: yes. A rename with no content edits merges without conflicts and
   keeps the Git history readable.
5. Do existing projects move only when sync offers it per file and you say yes,
   never silently?
   Recommended: yes. This is what requirement 5 already says, and this point is
   here to confirm it.
6. Do we capture one Codex documentation page into a new
   `ai-external-knowledge/codex/` folder?
   Recommended: yes, one page only. The repository has no captured Codex
   documentation today, so the "read the page first" rule has nothing to point
   at when an agent changes anything about how Codex loads instructions.

## Notes

Updated 2026-09-21.

Status: proposed design, phase 1 of #388, awaiting the Main Orchestrator's
review with Mike. Nothing has been built. No file in the repository has been
changed by this work.

Resume point: the Main Orchestrator reviews this design with Mike and answers
the six open points. Open points 2 and 6 change scope, so the build cannot start
on the folder-file rename or the Codex capture until they are answered. When the
answers are in, the build starts at step 1, the documentation refresh, on branch
`issue-388-agents-md-instruction-file`.

Facts still to verify before the build:

- Whether anything merged after `2e0e3ae` touches a file listed in "Every file
  that changes". Run `git log --oneline` and compare.
- The exact next `metadata.version` number for `.claude-plugin/marketplace.json`.
  It is 0.124.9 now. The Main Orchestrator assigns the next one.
- Whether #385 has already changed `plugins/CLAUDE.md` lines 1 and 5 from
  "seven" to "eight", so #388 does not change it twice.

Decisions and approval state: every decision in this design is proposed. None is
approved. The decisions are the target layout, the folder-file rename, the
permanent one-line `CLAUDE.md` fallback, the Codex position, this repository's
own move, the file list and build order, the sequencing with in-flight work, the
existing-project sync route, the test plan, and the documentation list.

Conflicts between a decision and a report, kept as the decision says and flagged
here:

- The inventory said `plugins/project-init/library/hooks/README.md` needed a
  wording change. A `grep -n` at `2e0e3ae` found no instruction-file name in
  that file. Recorded as no change needed.
- The inventory said `README.md` lines 114 and 116 name `CLAUDE.md`. At
  `2e0e3ae` they do not. The live mentions are lines 20, 54, 89 and 325.

Written by the #388 lead session, with Opus helper agents for the read-only
inventory of `plugins/`, the rest of the repository, the setup skills, the
parent PRD and in-flight work, and the Codex documentation.
