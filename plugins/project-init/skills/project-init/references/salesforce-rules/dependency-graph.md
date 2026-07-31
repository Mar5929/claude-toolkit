# Answer Impact Questions From the Dependency Graph, and Keep It Fresh

This project compiles its own `force-app/` metadata into a local dependency
graph at `tools/kb/`. It answers "what writes this field", "what reads it", and
"if I change it, what breaks N steps out" from the metadata itself rather than
from memory or a search. A Stop hook keeps it current: when a `force-app/` file
changes it rebuilds the graph and, if any connections changed, writes
`tools/kb/_drift_pending.md` naming exactly which ones.

## Rules

1. **Answer impact questions from the graph, never from memory or a guess.**
   Make sure the build is current, then query it:

   ```
   python3 tools/kb/build_graph.py --scope force-app
   python3 tools/kb/query_graph.py "Field:Object.Field__c"
   ```

   It prints where the value comes from (writers), the direct connections, and
   the N-hop impact radius, each with its kind and confidence. Cite the graph as
   the source.
2. **State the graph's blind spot every time it matters.** The parser extracts
   flow and workflow writers, NOT Apex or integration writers. A field written
   only by Apex shows no writer. Check the project's own knowledge notes before
   ever saying "nothing writes this".
3. **When `tools/kb/_drift_pending.md` exists, deal with it in that session.**
   It names the connections that changed. Read the project's knowledge notes
   about that metadata, correct whatever the change contradicts, then delete the
   file. Do not let it sit across sessions.
4. **After a meaningful `force-app/` change, update the written explanation** of
   the metadata you changed, in the same session. The graph records what
   connects to what; only a person records why.
5. **Never commit graph artifacts.** `_graph.sqlite`, `_graph_prev.sqlite`,
   `_freshness_stamp.json`, and `_drift_pending.md` are gitignored build
   artifacts. A rebuild recreates them.
6. **The graph is built only from local files.** Never run a Salesforce CLI
   command that writes to an org or retrieves from one as part of building,
   querying, or testing the graph (`sf project deploy`, `sf project retrieve`,
   `sf data ...`, `sf org ...`). The tool is org-independent by design, which is
   what makes it safe to run at any time.
7. **Kill switch.** Set `GRAPH_FRESHNESS=0` to turn the hook off (for example
   during a bulk metadata import), and turn it back on afterwards.

## Related rules

- `salesforce-safety-guardrails.md`: what any agent may do against an org. Rule
  6 above is the graph-specific case of it.
- `deploy-hitchhiker-check.md`: the graph is a good way to see what a component
  would drag along with it.
