# Installing the structural layer (compiled dependency graph)

The structural layer is the mechanical companion to the second-brain knowledge
layer: `references/structural-layer/` holds a proven, self-contained Python
tool that compiles a Salesforce project's `force-app/` metadata into a
gitignored SQLite graph of components and connections, answering "if I rename
this field, what breaks, N steps out?" The knowledge layer records WHY; this
records WHAT connects to WHAT. Its own `README.md` documents usage, scopes,
determinism, and known limits.

Install it for **Salesforce projects** (the profile that names it), or any
time the owner asks for impact analysis. The parser is Salesforce-specific
today; the schema and contract (`models.py`) are language-agnostic, so other
parsers can join later.

## Install steps

1. **Copy the tool.** Copy every file in `references/structural-layer/` into
   the project at `tools/kb/`. Do not drop files: the orchestrator imports all
   of them at startup.
2. **Gitignore the build artifacts.** Ensure the project's `.gitignore`
   contains:

   ```
   tools/kb/*.sqlite
   tools/kb/*.db
   __pycache__/
   *.pyc
   ```

3. **Ask the owner the storage question** (plain words, one question):
   "Where should the dependency graph live? **local** (recommended): a small
   database file on this machine, rebuilt from the code on demand — free,
   works offline, cannot go stale. **cloud**: also publish it to the project's
   second-brain database so cloud sessions can query it. **hybrid**: both."
   Record the answer in the project's `.claude/settings.json` `env` block as
   `"GRAPH_BACKEND": "local"` (or `cloud` / `hybrid`), next to
   `BRAIN_BACKEND`.

   If the owner picks cloud or hybrid: the local build still works today, but
   the publish step is a documented interface, not yet implemented — see the
   contract in `tools/kb/graph_backend.py` and implement it as part of the
   install (Neon tables + the two MCP query tools it specifies). The first
   project to choose cloud builds it; port it back to this plugin afterwards.

4. **Wire the knowledge-curator.** Paste the block below into the project's
   `.claude/agents/knowledge-curator.md`, as its own H2 section right before
   `## Your invariants`.

5. **Optional overlays.** The `yamls` and `kb-index` scopes need curated
   inputs (`engagement/knowledge-base/` files) most new projects will not have
   yet; skip them until the project curates those. The `yamls` scope needs
   `pip install -r tools/kb/requirements.txt` (PyYAML); the core build is
   stdlib-only.

## Verify (do not skip)

1. `python3 tools/kb/test_catalog.py` ends `OK`.
2. `python3 tools/kb/build_graph.py --scope force-app` completes and prints the
   build summary plus a `[graph_backend]` line. On a project whose
   `force-app/` is still empty, a 0-component build is the expected result,
   not a failure.
3. If the project has metadata: pick one field and run
   `python3 tools/kb/query_graph.py "Field:<Object>.<Field>"` — it must return
   the writers / direct connections / impact radius sections.

## Hard rule to carry into the project

The graph is built ONLY from local `force-app/` files already on disk. Never
run any Salesforce CLI command that writes to an org or retrieves components
from one as part of building or testing the graph (`sf project deploy`,
`sf project retrieve`, `sf data ...`, `sf org ...`). The tool is
org-independent by design.

## Paste into knowledge-curator.md (step 4)

```markdown
## Structural layer: the compiled dependency graph (read it, never write it)

Beside your prose layer sits a mechanical one: `tools/kb/` compiles
`force-app/` metadata into a gitignored SQLite graph of components and
connections (WRITES / READS / FORMULA_REFERENCES / ROLLUP_OF / ...). It is
rebuilt fresh from source, deterministic and offline. You READ it; you never
maintain it, and it never writes to the second-brain.

- **Answer impact questions from the graph, not from guesses.** For "what
  writes `Field:X`" / "what breaks if I change it":
  1. Ensure a current build:
     `python3 tools/kb/build_graph.py --scope force-app`
  2. Query:
     `python3 tools/kb/query_graph.py "Field:Object.Field__c"`
     It prints where the value comes from (writers), direct connections, and
     the N-hop impact radius, each with kind + confidence. Cite the graph as
     your source. Known limit: Apex and integration writers are NOT
     extracted; check curated claims and `know-*` notes before saying
     "nothing writes this."
- **Drift reconcile includes connections.** When a `covers:` file under
  `force-app/` has a changed SHA, see what changed STRUCTURALLY:
  1. Snapshot the previous build: `cp tools/kb/_graph.sqlite /tmp/old.sqlite`
     (skip if no previous build exists).
  2. Rebuild: `python3 tools/kb/build_graph.py --scope force-app`
  3. Diff, scoped to the covered file:
     `python3 tools/kb/diff_graph.py --old /tmp/old.sqlite --new tools/kb/_graph.sqlite --file <covered path>`
     Exit 1 means differences; the output names the specific added/removed
     connections and classification changes. Reconcile the node's *why*
     against exactly those changes.
- **The disagreement report is your review queue.** Your `know-*` structural
  claims can be exported to JSON and mechanically checked against the parser:
  `python3 tools/kb/build_graph.py --scope kb-index --human-source
  know-export --know-export <claims.json> --check-report <report.md>`
  (claims format: `tools/kb/human_claims.py` docstring). Disagreements are
  candidate node fixes, not automatic errors.
```
