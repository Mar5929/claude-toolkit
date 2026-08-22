# Installing the Salesforce dependency edge list

`../tools/kb/` holds a proven, self-contained Python tool that reads a Salesforce
project's `force-app/` metadata and writes down every connection it can find:
which flow reads which field, which Apex class writes which object, which
permission set grants access to what, which layout shows which field. It answers
the question a large org asks every day: "if I rename or delete this field, what
breaks, N steps out?" The project's written knowledge records WHY something
exists; this records WHAT connects to WHAT.

Python standard library only, nothing to install, and the build never contacts an
org. The output is a set of gitignored JSON files, rebuilt on demand in well
under a minute an org. The tool's own `README.md` is the full documentation and
its section "What this cannot tell you" is required reading.

Offer it for **Salesforce projects**, and press the case on an org merge or any
org large enough that field-level impact analysis is a recurring question. It is
optional the same way every other gate is: a small org is well served by search
and the deploy checks alone.

**Non-Salesforce project?** This tool cannot analyze it: the readers understand
Salesforce metadata only. Use graphify instead, the local tree-sitter code graph
that covers Swift, web, and generic repos and answers the same impact questions.
See `graphify-dependency-graph.md`. The rest of this file is the Salesforce path.

## Install the kit (four parts)

The rule without the tool is advice with no enforcement, and the tool without the
hook goes stale. Install all four or none.

1. **The tool.** Copy every file in `../tools/kb/` into the project at
   `tools/kb/`, including the `extractors/` folder and the `test_*.py` files. Do
   not drop files: the scripts import each other. Copy its `README.md` too; it is
   the tool's own documentation.

2. **The gitignore entries.** The output is a build artifact, never a commit. One
   org's edge list measured 213.6 MB, and GitHub refuses any file over 100 MB.
   Ensure the project's `.gitignore` contains:

   ```
   tools/kb/out/
   tools/kb/_freshness_stamp.json
   tools/kb/_drift_pending.md
   tools/kb/_prev-*.json
   __pycache__/
   *.pyc
   ```

3. **The rule.** Copy `../rules/salesforce/dependency-graph.md` into the
   project's `.claude/rules/`. It is what makes future sessions answer impact
   questions from the edge list instead of from memory, deal with the drift file,
   and never claim an absence the tool cannot prove.

4. **The freshness hook** (Gate 2). Merge this entry into the project's
   `.claude/settings.json` `hooks.Stop` array:

   ```json
   {
     "type": "command",
     "command": "python \"${CLAUDE_PROJECT_DIR}/tools/kb/graph_freshness_hook.py\"",
     "timeout": 60
   }
   ```

   The hook fingerprints `force-app/`, and on change rebuilds only the affected
   orgs and writes `tools/kb/_drift_pending.md` naming the changed connections.
   It is silent when nothing changed, never builds an edge list that does not
   exist yet, never blocks the session, and `GRAPH_FRESHNESS=0` disables it. Note
   the hook lives inside the tool folder, not with the project's other hooks,
   because it imports the rest of the tool.

   **Check that it is watching `force-app/` itself.** An earlier version of this
   hook watched the fixed path `force-app/main/default`, found nothing in a
   project that keeps one folder per org, and exited silently at its first check
   for as long as it was installed. A hook that never runs looks exactly like a
   hook with nothing to report.

## Org names come from the project

Nothing in the tool knows any org name. It reads them from `packageDirectories`
in `sfdx-project.json`, or from the folders under `force-app` holding a
`main/default`, so it works for a single standard project and for a merge with
several org snapshots side by side.

Two things a project may need to set:

- **`tools/kb/org-aliases.json`**, when a Salesforce CLI alias is not the folder
  name: `{"red": "RED", "blue": "BLUE"}`. Only the two scripts that contact an
  org use it.
- **Nothing else.** If the project's folder names match its CLI aliases, there is
  no configuration at all.

## Verify (do not skip)

1. Every test file ends `OK`:

   ```
   python tools/kb/test_file_registry.py
   python tools/kb/test_extractors.py
   python tools/kb/test_resolver.py
   python tools/kb/test_edge_list.py
   python tools/kb/test_reports.py
   python tools/kb/test_graph_tools.py
   python tools/kb/test_org_crosscheck.py
   ```

   Expect skips. The tests that need real metadata skip when there is none, and a
   few that check numbers measured in the project this tool was built in skip
   unless those org names are present. `OK (skipped=N)` is a pass.

2. `python tools/kb/build_edges.py` completes and every acceptance check prints
   `PASS`. On a project whose `force-app/` is still empty it stops with a message
   saying where it looked, which is the expected result rather than a failure.

3. If the project has metadata: pick one field and run
   `python tools/kb/query_graph.py <Object>.<Field>`; it must return the
   writers, direct connections, and impact radius sections.

## Writing up an org that already has metadata

A project that adopts the edge list with a large existing org gets an immediate
second use out of it: it is the worklist for writing down what the org actually
does.

1. **The map.** Build it, then run `python tools/kb/query_graph.py --map`. It
   prints objects, flows, and Apex classes ranked by how connected they are,
   which is a good proxy for how much each one matters.
2. **Work the list in batches, busiest first.** Five to ten subsystems at a time,
   never the whole org in one pass. Batches can span sessions.
3. **Feed each subsystem its factual skeleton:**
   `python tools/kb/query_graph.py "<component>"` gives the writers, direct
   connections, and impact radius. That is the WHAT. Read the metadata and add
   the WHY.
4. **Aim for rough, real coverage, not polish.** A thin note per subsystem beats
   a perfect note for three of them. The freshness hook keeps it honest from then
   on.

Where those notes live is the project's own choice:
`knowledge/memory/` when project knowledge is installed, otherwise
`docs/`.

## Known limits (say these out loud; do not oversell)

The tool's `README.md` carries all eight under "What this cannot tell you". The
four that get an agent into trouble:

- **Apex writes are pattern-matched against code text**, so they are
  near-complete rather than exhaustive, and every one is marked
  `confidence: low`. Measured in the project this was built in: 374 Apex write
  edges reaching 39 distinct fields, against 5,256 field files. Never say
  "nothing writes this" on the edge list's word alone.
- **Anything built at runtime is largely invisible**: dynamic SOQL, a class named
  by `Type.forName`, a field name assembled in a string.
- **An integration writing through the API leaves nothing behind**, so the field
  it fills looks untouched.
- **A partial retrieve looks like a missing connection.** Profiles are lossy by
  design, and a snapshot missing standard field files produces thousands of
  references with nothing to point at. Check the resolution rate before reading
  anything into a gap.

Every connection carries its own source, resolution and confidence. Trust it per
edge, not per file.

## The optional org cross-check

Three more scripts ask an org what it thinks depends on what, through
`MetadataComponentDependency` in the Tooling API, and compare that with the local
answer. Every call is `sf data query`, which is a read.

```
python tools/kb/pull_org_dependencies.py --org <name>    # ask the org
python tools/kb/build_org_catalog.py --org <name>        # ask what its ids are called
python tools/kb/compare_dependencies.py --org <name>     # compare; contacts nothing
```

The first two take about twenty minutes an org, so commit their answers under
`org-knowledge/dependency-crosscheck/`: re-asking returns a different org,
because the org moved on.

**Read a confirmation rate carefully.** "What share of what these files found did
the org also report" and "what share of the org's own answer did these files
find" are different numbers, usually far apart. The reports carry both. In the
project this was built in, reading the wrong one made layouts look like the
weakest thing the tool did, when in one org it had found every single
layout-to-field connection the org reported.

Also: the Dependency API refuses many metadata types outright, including
`Workflow`, `SharingRules`, `CustomLabels` and `Settings`, and returns nothing at
all for most component pairs, including every profile and permission set grant.
For those the local files are the only source there is, so there is no second
opinion to be had.

## Hard rule to carry into the project

Building and querying the edge list use ONLY local `force-app/` files already on
disk. Never run any Salesforce CLI command that writes to an org or retrieves
components from one as part of building, querying, or testing it (`sf project
deploy`, `sf project retrieve`, `sf data create/update/delete`, `sf org ...`).
The only permitted org contact is the read-only cross-check above. The rule in
step 3 carries this into the project.
