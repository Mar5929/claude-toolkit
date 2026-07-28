# Knowledge-base backfill and ongoing freshness (existing codebases, any project type)

> **Archived v1 reference.** Do not run this backfill or read old `know-*`
> content as current truth. V3 starts from authoritative Git content and does
> not use this backfill, drift hook, or curator.

On a brand-new project the `know-*` knowledge layer starts empty and that is
fine: it fills in as work happens. On a project that ALREADY has code, the
code's "why" is undocumented history, and without a backfill the brain knows
nothing about the subsystems that exist. This reference covers both halves of
fixing that, for every project type:

1. **One-time backfill:** produce a map of the subsystems the repo already
   contains, then seed one initial `know-*` node per subsystem, in batches.
2. **Ongoing freshness:** install a Stop hook and a rule, by default, so
   later code changes surface drift to the knowledge-curator without anyone
   remembering to ask.

The Salesforce flavor of both halves ships with the structural layer
(`structural-layer.md`): its compiled dependency graph is the map, and its
freshness hook also rebuilds the graph. This doc is the canonical home of the
shared procedure; `structural-layer.md` supplies only the Salesforce map and
hook. A project installs exactly ONE freshness hook: the structural layer's
if that layer is installed, the generic one here otherwise.

## When to run this

During per-project onboarding (after `setup-recipe.md` Step 7, as part of
Step 10's first population), whenever the repo already has meaningful code.
Skip it for a greenfield repo; the freshness hook (Step 3 below) is still
worth installing once real source paths exist.

## Step 1: Produce the subsystem map

The map is the worklist: what exists, ranked busiest first. It is produced
deterministically and offline in all cases: a pure function of the checkout
at the current commit, no network, no builds.

- **Salesforce (structural layer installed):** the compiled dependency graph
  is the map. Build it, then print the worklist:

  ```
  python3 tools/kb/build_graph.py --scope force-app
  python3 tools/kb/query_graph.py --map
  ```

  Objects, flows, and Apex classes ranked by connectedness. See
  `structural-layer.md` for install and limits.

- **Every other project type:** run the bundled map script straight from the
  skill's references (it is a one-shot tool; committing it to the project is
  optional):

  ```
  python3 <references>/kb-backfill/subsystem_map.py --repo <project root>
  ```

  It auto-detects the type (override with `--type ios|web|generic`) and
  groups the tracked files into subsystems:

  - **web** (root `package.json`): each workspace package (any folder with
    its own `package.json`), plus one folder level under the common source
    roots (`src/`, `app/`, `lib/`, `server/`, ...).
  - **ios** (`.xcodeproj` or `Package.swift`): each app-target folder's
    feature subfolders (for example `Anchor/Views`, `Anchor/Coach`), with
    Xcode bundle folders (`.xcassets`, `.xcodeproj`) collapsed to one entry.
  - **generic** (everything else): top-level tracked folders, split one
    level deeper under recognized source roots (`src/`, `lib/`, `plugins/`,
    `tools/`, ...).

  Ranking: commits touching the subsystem, then file count. Each row also
  shows the dominant languages and a few notable files (entry points), so
  the curator can orient without a search. Pointing `--repo` at a subfolder
  of a bigger repo works (it maps just that subtree).

## Step 2: The one-time batched backfill

This is the same batched-curator procedure the setup recipe's Step 10 and
the structural layer use; the only per-type difference is the factual
skeleton fed to the curator.

1. **COVERAGE first.** Dispatch the knowledge-curator in COVERAGE mode with
   the map from Step 1: a read-only report comparing the map against
   existing `know-*` nodes, gaps ranked. Let the owner pick priorities or
   confirm "top of the map first."
2. **DOCUMENT in batches of 5-10 subsystems, busiest first.** One curator
   dispatch per batch; never the whole codebase in one pass. Batches can
   span sessions and days; the map is cheap to regenerate.
3. **Feed each subsystem its factual skeleton:**
   - Salesforce: the subsystem's graph connections,
     `python3 tools/kb/query_graph.py "<component>"` (writers, direct
     connections, impact radius).
   - Everything else: the subsystem's row from the map (its file list,
     entry points, languages) plus its tests and any README next to it.
   The skeleton is the WHAT; the curator reads the code and adds the WHY.
4. **Per subsystem the curator writes one `know-*` node** (standard body
   shape from the agent template), pins `covers:` SHAs for the one or two
   files that carry the core of the subsystem, links it, and adds its row to
   `know-codemap`.
5. **Goal: rough, real coverage, not polish.** A thin node per subsystem
   beats a perfect node for three of them. The freshness mechanism below
   keeps it honest from then on.

## Step 3: Install ongoing freshness (default, not opt-in)

The generic freshness hook, its `KB_SOURCE_PATHS`, and the knowledge-freshness
rule are now wired by DEFAULT during install (setup recipe Step 7). The steps
below are the reference for that wiring AND the retrofit path for a project set
up before it shipped: such a project has only the push/PR nudge and its
knowledge layer silently rots, so retrofit it here. A fresh install only needs
to confirm `KB_SOURCE_PATHS` names real source paths.

- **Salesforce with the structural layer:** already done; the layer's
  install step 5 wired `tools/kb/graph_freshness_hook.py`, which rebuilds
  the graph on change and names the changed connections in
  `tools/kb/_drift_pending.md`. Install nothing else; skip to Verify.

- **Every other project type:**

  a. Copy `kb-backfill/kb_freshness_hook.py` into the project at
     `.claude/hooks/kb_freshness_hook.py`.

  b. In the project's `.claude/settings.json`: add to the `env` block the
     watched paths, taken from the curator profile's "Source code path(s)"
     (comma-separated, project-relative):

     ```json
     "KB_SOURCE_PATHS": "src,worker"
     ```

     and merge this entry into the `hooks.Stop` hooks array (next to the
     brain-mcp-capture hook):

     ```json
     {
       "type": "command",
       "command": "python3 \"${CLAUDE_PROJECT_DIR}/.claude/hooks/kb_freshness_hook.py\"",
       "timeout": 30
     }
     ```

  c. Add the artifacts to `.gitignore`:

     ```
     .claude/hooks/_kb_freshness_stamp.json
     .claude/hooks/_drift_pending.md
     ```

  d. Write the rule below to `.claude/rules/knowledge-freshness.md`.

  The hook fingerprints the watched paths at the end of each turn; on
  change it writes `.claude/hooks/_drift_pending.md` naming the added,
  modified, and deleted files. It is silent when nothing changed, extends
  (never overwrites) an unprocessed drift file, never blocks the session,
  and `KB_FRESHNESS=0` disables it. Unlike the Salesforce hook it cannot
  name changed connections, only changed files; the curator's `covers:` SHA
  reconcile does the rest.

## Rule to write in step 3d

```markdown
# Keep the Knowledge Layer Fresh

The second-brain `know-*` notes must not silently rot as code changes. A
Stop hook (`.claude/hooks/kb_freshness_hook.py`, wired in
`.claude/settings.json`, watching the paths in `KB_SOURCE_PATHS`) does the
mechanical half: when a watched source file changes, it writes
`.claude/hooks/_drift_pending.md` naming exactly which files.

## Rules

1. **When `.claude/hooks/_drift_pending.md` exists, process it.** Dispatch
   the knowledge-curator with that file's contents so it reconciles the
   `know-*` nodes covering the changed files (re-read the file, fix the
   node's why, re-anchor the `covers:` SHA). Delete `_drift_pending.md`
   after it has been processed. Do not let it sit across sessions.
2. **After a meaningful source change, update the covering `know-*` node**
   in the same session, per the knowledge-curator's DOCUMENT mode. The
   drift file tells you which files moved; the node explains why.
3. **Never commit freshness artifacts.** `_kb_freshness_stamp.json` and
   `_drift_pending.md` are gitignored; the hook recreates them.
4. **Kill switch.** Set `KB_FRESHNESS=0` to disable the hook (for example
   during a bulk import or refactor); re-enable it after.
```

## Verify (do not skip)

1. **Map:** the Step 1 command prints a table whose rows are recognizable
   subsystems of this repo (not noise folders), busiest first.
2. **Hook (generic path only):** run
   `python3 .claude/hooks/kb_freshness_hook.py < /dev/null` twice: both runs
   silent (first writes the stamp). Touch a file under a watched path, run
   again: it prints one `[kb-freshness]` line and
   `.claude/hooks/_drift_pending.md` names that file. Delete the drift file
   and revert the touch.
3. **Backfill:** after the first DOCUMENT batch, `know-codemap` has a row
   for every subsystem in that batch.

## Limits (state them, do not paper over them)

- For non-Salesforce projects the map is structure-based: it says what
  exists and how busy it is, not what connects to what. Impact analysis
  ("what breaks if I change this?") still requires a compiled structural
  graph, which exists for Salesforce today (`structural-layer.md`); for
  other stacks the compiler and tests plus `covers:` pins are the guard.
- The generic freshness hook reports changed FILES, not changed
  connections. That is exactly the input the curator's file-SHA drift model
  already expects.
- `git ls-files` sees tracked files only; brand-new untracked folders join
  the map once committed. Outside a git repo the script falls back to a
  filesystem walk and the commits column is empty.
