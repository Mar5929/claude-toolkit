# Compiled metadata dependency graph (structural layer)

Reads a Salesforce project's `force-app/` metadata files and compiles them into
a queryable SQLite graph of components (objects, fields, flows, Apex classes,
permission sets, ...) and the connections between them (WRITES, READS,
FORMULA_REFERENCES, ROLLUP_OF, TRIGGERS_ON, INVOKES, REFERENCES, GRANTS_*,
CONTAINS). It answers field-level impact questions mechanically: "if I rename
this field, what reads it, writes it, or references it, out to N steps?"

It is the structural companion to the second-brain knowledge layer: the
`know-*` prose records WHY code exists; this graph records WHAT connects to
WHAT. The graph is rebuilt fresh from the files each time, so it cannot go
stale, and it never calls any service (no network, no auth, no `sf` commands;
org-independent by design).

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
| `force-app` | The parser walk: every component + connection extracted from metadata XML and Apex. The deterministic core. |
| `kb-index` | Human-claim edges from a pluggable source: `--human-source kb-index` (curated markdown under `<kb-root>/engagement/knowledge-base/`) or `--human-source know-export --know-export claims.json` (a JSON export of second-brain `know-*` claims; format in `human_claims.py`). Runs the parser-vs-human self-check; `--check-report out.md` writes the disagreement report. |
| `yamls` | Curated overlays from `<kb-root>/engagement/knowledge-base/`: `_field_groups.yaml` (near-duplicate field clusters), `_glossary.yaml`, `_processes.yaml`, `_client_lexicon.yaml`. |
| `all` | All of the above. |
| `flows`, `ApexClass`, `ApexClass:<Name>` | Scoped partial rebuilds. |

## Storage backend (GRAPH_BACKEND)

Storage is a per-project choice, asked once at project setup and recorded as
the `GRAPH_BACKEND` environment variable (in the project's
`.claude/settings.json` env block, mirroring `BRAIN_BACKEND`). Resolution:
`--backend` flag > `GRAPH_BACKEND` env var > `local`.

| Backend | What it means |
|---|---|
| `local` (default) | The gitignored SQLite file IS the store. Deterministic, offline, free. |
| `cloud` | After the local build, publish the content to the project's Neon database behind the second-brain MCP server, so cloud sessions can query connections. |
| `hybrid` | Local build (source of truth) plus the cloud publish. |

In every mode the local build stays the deterministic source of truth; cloud
and hybrid only add a publish step. The publish step and its MCP query tools
are designed but deliberately NOT built yet: they get implemented the first
time a project actually chooses cloud/hybrid. Until then, selecting them stops
with a message pointing at the documented contract in `graph_backend.py`.

## Determinism (the guarantee that it cannot rot)

The build is a pure function of the repo at the CONTENT level: build twice and
a sorted dump of `components` + `relationships` + `field_classification` is
byte-identical (same hash). The raw `.sqlite` file is NOT byte-identical,
because every build stamps a wall-clock time into the `build_runs` audit
table; any determinism check must compare the sorted content dump and exclude
`build_runs`.

## Ongoing freshness and the one-time backfill

- **Freshness (automatic):** `graph_freshness_hook.py` runs as a Claude Code
  Stop hook. When `force-app/` files change it rebuilds the graph and, if any
  connections changed, writes `tools/kb/_drift_pending.md` naming them; the
  project rule says to dispatch the knowledge-curator on that file, then
  delete it. First run just records a fingerprint stamp; unchanged turns are
  silent; `GRAPH_FRESHNESS=0` disables it. It never builds a graph that does
  not already exist.
- **Backfill (one-time):** onboarding the knowledge layer onto a project that
  already has lots of code starts from `query_graph.py --map`: the subsystem
  worklist (objects, flows, Apex ranked by connectedness). Seed `know-*`
  coverage for the busiest subsystems first, in batches, using each
  subsystem's graph connections as the factual skeleton.

## Known limits (state these; do not oversell)

- The parser extracts flow and workflow writers only, NOT Apex or integration
  writers. An Apex-only-written field classifies as `manual_only` and shows no
  writer; curated claims (kb-index / know-export) are the compensating source,
  and the self-check disagreement report surfaces exactly those gaps.
- Apex READ edges are regex-derived and lossy (`confidence='low'`): near
  complete, not exhaustive.
- Every connection carries its own `source` and `confidence`; trust per edge,
  not per graph.

## File map

| File | Role |
|---|---|
| `build_graph.py` | Orchestrator: clears scope, parses, classifies, self-checks, records the run, runs the storage step. |
| `parse_force_app.py` | The parser: walks metadata XML + Apex, emits components and connections. Generic Salesforce; no client specifics. |
| `models.py` | Component/Edge contract + id builders (language-agnostic). |
| `classify_fields.py` | Per-field "how populated" label (formula / rollup / flow / workflow / manual_only / ...). |
| `schema.sql` | The database shape. |
| `query_graph.py` | Impact queries: writers, direct connections, N-hop radius; `--group` for field clusters. |
| `diff_graph.py` | Connection diff between two builds; the drift signal (`--file` scopes to a covered path; exit 1 = differences). |
| `self_check.py` | Parser-vs-human comparison; each disagreement names the connection and both claims. |
| `human_claims.py` | Pluggable human-claim providers (kb-index markdown, know-export JSON). |
| `parse_kb_indexes.py` | The kb-index provider's markdown reader. |
| `load_yaml.py` | The yamls-scope overlay loader (PyYAML). |
| `graph_backend.py` | `GRAPH_BACKEND` selector + the documented cloud contract. |
| `graph_freshness_hook.py` | Stop hook: rebuild on force-app change, surface drift. |
| `test_catalog.py` | The unit-test suite. |

## Provenance

Ported and generalized from the davis-advisors engagement's proven tool
(WI-003, 2026-07-18/19): byte-identical content against the original tool's
build on a populated org project (3,252 components / 5,300 relationships /
2,680 field classifications on the original corpus), plus the pluggable
human-claim source, disagreement report, connection diff, storage selector,
and field-group query added and proven against the same corpus.
