"""graph_backend.py — per-project storage-backend selector (WI-003 Phase 5).

Storage is a per-project choice, asked once at project setup and recorded as
the GRAPH_BACKEND environment variable (DragonFly: `.claude/settings.json`
env block, mirroring WI-002's BRAIN_BACKEND pattern):

- local   (default): the gitignored SQLite file built by build_graph.py IS the
          store. Deterministic, offline, free. Nothing is published anywhere.
- cloud   : after the local build, publish the graph content to the project's
          Neon database behind the second-brain MCP server, so cloud sessions
          can query connections without a local checkout.
- hybrid  : local build (source of truth) AND the cloud publish.

In every mode the LOCAL BUILD IS THE DETERMINISTIC SOURCE OF TRUTH; cloud and
hybrid only add a publish step on top. The publish never feeds anything back
into the build (that would break the rebuild-from-source guarantee).

Resolution precedence: --backend CLI flag > GRAPH_BACKEND env var > "local".

## The cloud interface (documented now, implemented on first adoption)

Per the confirmed WI-003 build-scope call (2026-07-18): the local backend is
built fully; the cloud publish and its MCP query tools get IMPLEMENTED the
first time a project actually chooses cloud or hybrid. Until then, choosing
cloud/hybrid stops the build with a clear message pointing here. When a
project first adopts it, implement exactly this contract:

1. `publish_cloud(db_path, project_id)` reads the finished local build and
   replaces that project's rows in Neon tables `graph_components`,
   `graph_relationships`, and `graph_field_classification` (same columns as
   the local schema plus a `project_id` column; one transaction; full
   replace-by-project so the publish is idempotent).
2. It records one row in `graph_builds` (project_id, content_hash over the
   sorted content dump excluding build_runs, scope, built_at) so a cloud
   session can tell which build it is querying.
3. The second-brain MCP server gains two read-only query tools over those
   tables: `graph_writers(component_id)` (incoming WRITES + formula/rollup
   inputs) and `graph_impact(component_id, hops)` (the N-hop radius), the
   MCP twins of query_graph.py's sections.
4. Auth and per-project routing reuse the existing second-brain server
   pattern (one Neon database per project, grants table, GitHub OAuth) —
   see memory-mcp/IMPLEMENTATION.md.
"""

from __future__ import annotations

import os

BACKENDS = ("local", "cloud", "hybrid")
DEFAULT_BACKEND = "local"

_NOT_IMPLEMENTED_MSG = (
    "GRAPH_BACKEND={backend!r}: the cloud publish step is designed but not "
    "built yet. Per the WI-003 build-scope call it gets implemented the "
    "first time a project actually chooses cloud/hybrid — see the cloud "
    "interface contract in tools/kb/graph_backend.py. The local build "
    "finished normally and remains the source of truth; set "
    "GRAPH_BACKEND=local (or drop --backend) to silence this."
)


def resolve_backend(cli_value: str | None = None) -> str:
    """Resolve the backend: CLI flag > GRAPH_BACKEND env var > default."""
    value = cli_value or os.environ.get("GRAPH_BACKEND") or DEFAULT_BACKEND
    value = value.strip().lower()
    if value not in BACKENDS:
        raise SystemExit(
            f"invalid GRAPH_BACKEND {value!r}: use one of {', '.join(BACKENDS)}"
        )
    return value


def publish(db_path: str, backend: str) -> dict:
    """Run the backend's post-build step. Local is a no-op by design."""
    if backend == "local":
        return {
            "backend": "local",
            "published": False,
            "note": "local SQLite build is the store; nothing to publish",
        }
    if backend in ("cloud", "hybrid"):
        raise SystemExit(_NOT_IMPLEMENTED_MSG.format(backend=backend))
    raise SystemExit(f"unknown backend: {backend!r}")
