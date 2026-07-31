# Salesforce dependency graph

Reads a Salesforce project's `force-app/` metadata files and compiles them into
a queryable SQLite graph of components (objects, fields, flows, Apex classes,
permission sets, and more) and the connections between them (WRITES, READS,
FORMULA_REFERENCES, ROLLUP_OF, TRIGGERS_ON, INVOKES, REFERENCES, GRANTS_*,
CONTAINS). It answers field-level impact questions mechanically: "if I rename
this field, what reads it, writes it, or references it, out to N steps?"

It is the mechanical companion to the project's written knowledge: the notes
record WHY something exists, this graph records WHAT connects to WHAT. The
graph is rebuilt fresh from the files each time, so it cannot go stale, and it
never calls any service (no network, no auth, no `sf` commands; org-independent
by design).

Install and use are documented in the toolkit at
`plugins/project-init/skills/project-init/references/salesforce-dependency-graph.md`.

## Quickstart

```bash
# Build the graph from this project's force-app (writes tools/kb/_graph.sqlite)
python3 tools/kb/build_graph.py --scope force-app

# ...or point it at any project's metadata and any output path
python3 tools/kb/build_graph.py --scope force-app \
    --force-app path/to/force-app/main/default --db /tmp/graph.sqlite

# Impact query: where does this value come from; what breaks if I rename it?
python3 tools/kb/query_graph.py "Field:Contact.Events__c" --db /tmp/graph.sqlite

# Near-duplicate field clusters (needs the yamls scope, below)
python3 tools/kb/query_graph.py --group "CRD" --db /tmp/graph.sqlite

# What changed structurally between two builds (drift signal)
python3 tools/kb/diff_graph.py --old before.sqlite --new after.sqlite \
    --file flows/Some_Flow.flow-meta.xml

# Tests
python3 tools/kb/test_catalog.py
```

The SQLite file is gitignored. Always rebuild; never commit `_graph.sqlite`.
The core build is Python-stdlib-only; only the `yamls` overlay scope needs
`pip install -r tools/kb/requirements.txt` (PyYAML).

## Build scopes

| Scope | What it loads |
|---|---|
| `force-app` | The parser walk: every component and connection extracted from metadata XML and Apex. The deterministic core. |
| `kb-index` | Human-claim edges from a pluggable source: `--human-source kb-index` (curated markdown under `<kb-root>/engagement/knowledge-base/`) or `--human-source know-export --know-export claims.json` (a JSON export of the project's own knowledge notes; format in `human_claims.py`). Runs the parser-versus-human self-check; `--check-report out.md` writes the disagreement report. |
| `yamls` | Curated overlays from `<kb-root>/engagement/knowledge-base/`: `_field_groups.yaml` (near-duplicate field clusters), `_glossary.yaml`, `_processes.yaml`, `_client_lexicon.yaml`. |
| `all` | All of the above. |
| `flows`, `ApexClass`, `ApexClass:<Name>` | Scoped partial rebuilds. |

## Where the graph is stored

There is one store: the gitignored SQLite file the build writes. It is
deterministic, offline, and free, and it is rebuilt from the project's own
metadata whenever it is needed.

`graph_backend.py` names that store in one line of build output and is the
single place a future storage choice would be added. `GRAPH_BACKEND` and
`--backend` accept only `local`; any other value is an error rather than a
silent fallback. An earlier design offered `cloud` and `hybrid` modes that
would publish the graph to a hosted database behind a memory server. That
server was retired and the publish step was never built, so those modes are
gone.

## Determinism (the guarantee that it cannot rot)

The build is a pure function of the repo at the CONTENT level: build twice and
a sorted dump of `components` plus `relationships` plus `field_classification`
is byte-identical (same hash). The raw `.sqlite` file is NOT byte-identical,
because every build stamps a wall-clock time into the `build_runs` audit
table; any determinism check must compare the sorted content dump and exclude
`build_runs`.

## Ongoing freshness and the one-time write-up

- **Freshness (automatic):** `graph_freshness_hook.py` runs as a Claude Code
  Stop hook. When `force-app/` files change it rebuilds the graph and, if any
  connections changed, writes `tools/kb/_drift_pending.md` naming them; the
  project rule says to review the knowledge notes about that metadata, update
  whatever the change contradicts, then delete the file. First run just records
  a fingerprint stamp; unchanged turns are silent; `GRAPH_FRESHNESS=0` disables
  it. It never builds a graph that does not already exist.
- **One-time write-up:** bringing a project that already has lots of metadata
  into written knowledge starts from `query_graph.py --map`: the subsystem
  worklist (objects, flows, Apex ranked by connectedness). Cover the busiest
  subsystems first, in batches, using each subsystem's graph connections as the
  factual skeleton.

## Known limits (state these; do not oversell)

- The parser extracts flow and workflow writers only, NOT Apex or integration
  writers. An Apex-only-written field classifies as `manual_only` and shows no
  writer; curated claims (kb-index or know-export) are the compensating source,
  and the self-check disagreement report surfaces exactly those gaps.
- Apex READ edges are regex-derived and lossy (`confidence='low'`): near
  complete, not exhaustive.
- Every connection carries its own `source` and `confidence`; trust per edge,
  not per graph.

## File map

| File | Role |
|---|---|
| `build_graph.py` | Orchestrator: clears scope, parses, classifies, self-checks, records the run, runs the storage step. |
| `parse_force_app.py` | The parser: walks metadata XML and Apex, emits components and connections. Generic Salesforce; no client specifics. |
| `models.py` | Component and Edge contract plus id builders (language-agnostic). |
| `classify_fields.py` | Per-field "how populated" label (formula / rollup / flow / workflow / manual_only and so on). |
| `schema.sql` | The database shape. |
| `query_graph.py` | Impact queries: writers, direct connections, N-hop radius; `--group` for field clusters; `--map` for the subsystem worklist. |
| `diff_graph.py` | Connection diff between two builds; the drift signal (`--file` scopes to a covered path; exit 1 = differences). |
| `self_check.py` | Parser-versus-human comparison; each disagreement names the connection and both claims. |
| `human_claims.py` | Pluggable human-claim providers (kb-index markdown, know-export JSON). |
| `parse_kb_indexes.py` | The kb-index provider's markdown reader. |
| `load_yaml.py` | The yamls-scope overlay loader (PyYAML). |
| `graph_backend.py` | Names the store and rejects any value but `local`. |
| `graph_freshness_hook.py` | Stop hook: rebuild on force-app change, surface drift. |
| `test_catalog.py` | The unit-test suite. |
| `requirements.txt` | PyYAML, needed only by the `yamls` overlay scope. |

## Provenance

Ported and generalized from the davis-advisors engagement's proven tool
(2026-07-18 and 2026-07-19): byte-identical content against the original tool's
build on a populated org project (3,252 components / 5,300 relationships /
2,680 field classifications on the original corpus), plus the pluggable
human-claim source, disagreement report, connection diff, storage selector,
and field-group query added and proven against the same corpus.
