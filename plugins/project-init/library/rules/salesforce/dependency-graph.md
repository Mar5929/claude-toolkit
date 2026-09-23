---
paths:
  - "force-app/**"
  - "tools/kb/**"
---
# Dependency Edge List

- Answer "what writes, reads, or breaks if this changes" from the edge list, never from memory. Run `python tools/kb/build_edges.py`, then `python tools/kb/query_graph.py <Object.Field>`. Cite it.
- Never say "nothing writes this field" from the edge list alone. It misses most Apex writes (marked `confidence: low`), runtime-built references, API integrations, and partial retrieves. Name the gap or check another source.
- If `tools/kb/_drift_pending.md` exists, handle it this session: correct the affected project notes, then delete the file. When those notes are in `knowledge/`, open `knowledge-save` to change them.
- After a meaningful `force-app/` change, update the written explanation of that metadata in the same session. When it is in `knowledge/`, open `knowledge-save`.
- Never commit `tools/kb/out/`, `tools/kb/_freshness_stamp.json`, or `tools/kb/_drift_pending.md`.
- Building and querying never contact an org. Only `pull_org_dependencies.py`, `build_org_catalog.py`, and `compare_dependencies.py` may run, and only `sf data query`.
- Report both confirmation rates from the cross-check. They measure Salesforce, not this tool.
- Never add an org name to the tool's code. Map aliases in `tools/kb/org-aliases.json`.
- `GRAPH_FRESHNESS=0` turns the Stop hook off. Turn it back on afterwards.

Details and limits: `tools/kb/README.md`, section "What this cannot tell you".
