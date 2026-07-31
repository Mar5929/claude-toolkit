"""graph_backend.py: where the built graph is stored.

There is one store: the gitignored SQLite file that build_graph.py writes.
It is deterministic, offline, and free, and it is rebuilt from the project's
own metadata whenever it is needed, so it cannot go stale.

An earlier design also offered "cloud" and "hybrid" modes that would publish
the graph to a hosted database behind a memory server. That server was retired
and the publish step was never built, so those modes are gone. This module
stays as the single place a future storage choice would be added, and as the
one line of build output that names the store.

Resolution precedence: --backend CLI flag > GRAPH_BACKEND env var > "local".
Any other value is an error rather than a silent fallback.
"""

from __future__ import annotations

import os

BACKENDS = ("local",)
DEFAULT_BACKEND = "local"


def resolve_backend(cli_value: str | None = None) -> str:
    """Resolve the backend: CLI flag > GRAPH_BACKEND env var > default."""
    value = cli_value or os.environ.get("GRAPH_BACKEND") or DEFAULT_BACKEND
    value = value.strip().lower()
    if value not in BACKENDS:
        raise SystemExit(
            f"invalid GRAPH_BACKEND {value!r}: the only supported store is "
            f"{DEFAULT_BACKEND!r} (the gitignored SQLite file this build "
            f"writes). Unset GRAPH_BACKEND or set it to 'local'."
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
    raise SystemExit(f"unknown backend: {backend!r}")
