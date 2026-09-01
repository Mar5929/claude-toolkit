---
paths:
  - "force-app/**"
  - "tools/kb/**"
---
# Answer Impact Questions From the Dependency Edge List, and Keep It Fresh

This project compiles its own `force-app/` metadata into a local dependency edge
list at `tools/kb/`. It answers "what writes this field", "what reads it", and
"if I change it, what breaks N steps out" from the metadata itself rather than
from memory or a search. A Stop hook keeps it current: when a `force-app/` file
changes it rebuilds the affected orgs and, if any connections changed, writes
`tools/kb/_drift_pending.md` naming exactly which ones.

`tools/kb/README.md` is the full description, including the section "What this
cannot tell you". Read that section before relying on an empty answer.

## Rules

1. **Answer impact questions from the edge list, never from memory or a guess.**
   Make sure the build is current, then query it:

   ```
   python tools/kb/build_edges.py
   python tools/kb/query_graph.py Case.Priority
   ```

   It prints where the value comes from (writers), the direct connections, and
   the N-hop impact radius, each with its kind and confidence. Cite the edge list
   as the source. Neither command contacts a Salesforce org.

2. **Never say "nothing writes this field" from these files alone.** Four things
   are invisible or nearly so, and each of them looks exactly like an empty
   answer:

   - **Apex writes are pattern-matched against code text**, so they are
     near-complete rather than exhaustive, and every one is marked
     `confidence: low`. A field written through a variable the pattern could not
     follow shows no writer. Measured in the project this tool was built in: 374
     Apex write edges reaching 39 distinct fields, against 5,256 field files. It
     finds them. It does not find most of them.
   - **Anything built at runtime**: dynamic SOQL, a class named by
     `Type.forName`, a field name assembled inside a string.
   - **An integration writing through the API** leaves no metadata behind at all.
   - **A partial retrieve**: profiles are lossy by design, and a snapshot missing
     standard field files produces thousands of references with nothing to point
     at.

   Say which of these applies, or check a source outside the edge list, before
   stating an absence as a fact.

3. **When `tools/kb/_drift_pending.md` exists, deal with it in that session.**
   It names the connections that changed. Read the project's knowledge notes
   about that metadata, correct whatever the change contradicts, then delete the
   file. Do not let it sit across sessions.

4. **After a meaningful `force-app/` change, update the written explanation** of
   the metadata you changed, in the same session. The edge list records what
   connects to what; only a person records why.

5. **Never commit the build output.** Everything under `tools/kb/out/`, plus
   `tools/kb/_freshness_stamp.json` and `tools/kb/_drift_pending.md`, is a
   gitignored build artifact. A rebuild recreates them in well under a minute an
   org. They are also large: one org's edge list measured 213.6 MB, and GitHub
   refuses any file over 100 MB.

6. **Building and querying never contact an org.** Never run a Salesforce CLI
   command that writes to an org or retrieves from one as part of building,
   querying, or testing the edge list.

   The one exception is the optional cross-check, which asks an org what it
   thinks depends on what: `pull_org_dependencies.py`, `build_org_catalog.py`
   and `compare_dependencies.py`. Every call those make is `sf data query`,
   which is a read, and the third contacts nothing at all. They take about
   twenty minutes an org, so their answers are committed under
   `org-knowledge/dependency-crosscheck/` rather than re-asked.

7. **A confirmation rate from that cross-check measures Salesforce, not this
   tool.** "What share of what these files found did the org also report" and
   "what share of the org's own answer did these files find" are different
   numbers, usually far apart. The reports carry both. Quoting the wrong one
   makes a strong result look like a failure.

8. **Kill switch.** Set `GRAPH_FRESHNESS=0` to turn the hook off (for example
   during a bulk metadata import), and turn it back on afterwards.

## Org names are the project's, not the tool's

The tool takes org names from `packageDirectories` in `sfdx-project.json`, or
from the folders under `force-app` holding a `main/default`. Leaving `--org` out
means every org the project has. Do not add an org name to the tool's code. When
a Salesforce CLI alias differs from the folder name, that mapping belongs in
`tools/kb/org-aliases.json`.

## Related rules

- `salesforce-safety-guardrails.md`: what any agent may do against an org. Rule
  6 above is the edge-list-specific case of it.
- `deploy-hitchhiker-check.md`: the edge list is a good way to see what a
  component would drag along with it.
- `rules/general/dependency-graph.md` is a **different tool** (graphify, a
  general code-graph tool) and has nothing to do with this one.
