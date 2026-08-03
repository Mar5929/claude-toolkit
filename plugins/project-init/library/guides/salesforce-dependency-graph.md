# Installing the Salesforce dependency graph

`../tools/kb/` holds a proven, self-contained Python tool that compiles
a Salesforce project's `force-app/` metadata into a gitignored SQLite graph of
components and connections. It answers the question a large org asks every day:
"if I rename or delete this field, what breaks, N steps out?" The project's
written knowledge records WHY something exists; this records WHAT connects to
WHAT. The tool's own `README.md` documents usage, scopes, determinism, and known
limits.

Offer it for **Salesforce projects**, and press the case on an org merge or any
org large enough that field-level impact analysis is a recurring question. It is
optional the same way every other gate is: a small org is well served by search
and the deploy checks alone.

**Non-Salesforce project?** This tool cannot analyze it: the parser reads
`force-app/` metadata only. Use graphify instead, the local tree-sitter code
graph that covers Swift, web, and generic repos and answers the same impact
questions. See `graphify-dependency-graph.md`. The rest of this file is the
Salesforce path.

## Install the kit (four parts)

The rule without the tool is advice with no enforcement, and the tool without
the hook goes stale. Install all four or none.

1. **The tool.** Copy every file in `../tools/kb/` into the project at
   `tools/kb/`. Do not drop files: the orchestrator imports all of them at
   startup. Copy its `README.md` too; it is the tool's own documentation.

2. **The gitignore entries.** The graph is a build artifact, never a commit.
   Ensure the project's `.gitignore` contains:

   ```
   tools/kb/*.sqlite
   tools/kb/*.db
   tools/kb/_freshness_stamp.json
   tools/kb/_drift_pending.md
   __pycache__/
   *.pyc
   ```

3. **The rule.** Copy `../rules/salesforce/dependency-graph.md` into the project's
   `.claude/rules/`. It is what makes future sessions answer impact questions
   from the graph instead of from memory, deal with the drift file, and never
   point the tool at an org.

4. **The freshness hook** (Gate 2). Merge this entry into the project's
   `.claude/settings.json` `hooks.Stop` array:

   ```json
   {
     "type": "command",
     "command": "python3 \"${CLAUDE_PROJECT_DIR}/tools/kb/graph_freshness_hook.py\"",
     "timeout": 60
   }
   ```

   The hook fingerprints `force-app/`, and on change rebuilds the graph and
   writes `tools/kb/_drift_pending.md` naming the changed connections. It is
   silent when nothing changed, never builds a graph that does not exist yet,
   never blocks the session, and `GRAPH_FRESHNESS=0` disables it. Note the hook
   lives inside the tool folder, not with the project's other hooks, because it
   imports the rest of the tool.

**Optional overlays.** The `yamls` and `kb-index` scopes need curated inputs
(files under `engagement/knowledge-base/`) that most projects will not have yet;
skip them until the project curates those. The `yamls` scope needs
`pip install -r tools/kb/requirements.txt` (PyYAML); the core build is
stdlib-only.

**Storage.** There is one store: the gitignored SQLite file, rebuilt from the
project's own metadata. Nothing is published anywhere and there is nothing to
ask the owner about.

## Verify (do not skip)

1. `python3 tools/kb/test_catalog.py` ends `OK`.
2. `python3 tools/kb/build_graph.py --scope force-app` completes and prints the
   build summary plus a `[graph_backend] local:` line. On a project whose
   `force-app/` is still empty, a 0-component build is the expected result, not
   a failure.
3. If the project has metadata: pick one field and run
   `python3 tools/kb/query_graph.py "Field:<Object>.<Field>"`; it must return
   the writers, direct connections, and impact radius sections.

## Writing up an org that already has metadata

A project that adopts the graph with a large existing org gets an immediate
second use out of it: the graph is the worklist for writing down what the org
actually does.

1. **The map.** Build the graph, then run
   `python3 tools/kb/query_graph.py --map`. It prints objects, flows, and Apex
   classes ranked by how connected they are, which is a good proxy for how much
   each one matters.
2. **Work the list in batches, busiest first.** Five to ten subsystems at a
   time, never the whole org in one pass. Batches can span sessions.
3. **Feed each subsystem its factual skeleton:**
   `python3 tools/kb/query_graph.py "<component>"` gives the writers, direct
   connections, and impact radius. That is the WHAT. Read the metadata and add
   the WHY.
4. **Aim for rough, real coverage, not polish.** A thin note per subsystem beats
   a perfect note for three of them. The freshness hook keeps it honest from
   then on.

Where those notes live is the project's own choice: `memory/knowledge/` when
second-brain is installed, otherwise `docs/`.

## Known limits (say these out loud; do not oversell)

- The parser extracts flow and workflow writers, NOT Apex or integration
  writers. A field written only by Apex classifies as `manual_only` and shows no
  writer. Never say "nothing writes this" on the graph's word alone.
- Apex read edges are regex-derived and marked low confidence: near complete,
  not exhaustive.
- Every connection carries its own source and confidence. Trust per edge, not
  per graph.

## Hard rule to carry into the project

The graph is built ONLY from local `force-app/` files already on disk. Never run
any Salesforce CLI command that writes to an org or retrieves components from
one as part of building or testing the graph (`sf project deploy`,
`sf project retrieve`, `sf data ...`, `sf org ...`). The tool is org-independent
by design, which is what makes it safe to run at any time. The rule in step 3
carries this into the project.
