# The dependency edge list: what connects to what in a Salesforce org

This folder reads a Salesforce org's metadata files and writes down every
connection it can find between them: which flow reads which field, which Apex
class writes which object, which permission set grants access to what, which
layout shows which field. The result is a set of JSON files you can query.

It answers two questions:

1. **Where does this value come from?** What writes this field, or what is it
   computed from?
2. **If I rename or change this, what breaks?** Everything that names it, out to
   however many steps you ask for.

**Building the edge list never contacts a Salesforce org.** No network, no `sf`
commands, no authentication. It reads the files under `force-app/` and nothing
else.

Four files here do contact an org, and they are the optional cross-check:
`org_api.py`, `pull_org_dependencies.py`, `org_catalog.py` and
`build_org_catalog.py`. Every call any of them makes is `sf data query`, which is
a read. Nothing in this folder ever writes to an org, deploys, validates, or runs
Apex. Assume the org is production, because it usually is.

Python standard library only. There is nothing to install.

## Where the org names come from

The tool knows an org by the folder its metadata sits in. Nothing is hardcoded,
so the same code runs against one org or ten, whatever they are called.

Two layouts are understood, in this order:

1. **`sfdx-project.json` lists its `packageDirectories`.** Each one is an org,
   named by the last segment of its path, with its metadata at
   `<path>/main/default`. A project pointing at `force-app/red` and
   `force-app/blue` gets orgs called `red` and `blue`. An ordinary single-package
   project pointing at `force-app` gets one org called `force-app`.
2. **No `sfdx-project.json`**, so every folder directly under `force-app` holding
   a `main/default` is an org.

A package directory holding no metadata is skipped rather than reported as an
empty org. Naming an org that has no metadata stops with an error listing the
orgs the project does have, rather than handing back an empty answer that looks
real.

**The Salesforce CLI needs a different name.** The two scripts that contact an
org pass the org name to `sf -o`, and a CLI alias is often not the folder name.
The folder name is used as-is unless the project says otherwise in
`tools/kb/org-aliases.json` beside these files:

```json
{"red": "RED", "blue": "BLUE"}
```

`--alias <org>=<CLI target>` overrides that for one run. A project whose folder
names already match its CLI aliases needs neither.

## Build it first

Nothing the tool writes is committed. The output is rebuilt from `force-app/` on
demand, which takes roughly 25 seconds an org, so there is no stored copy that
can go out of date.

```bash
python tools/kb/build_edges.py                  # every org in the project
python tools/kb/build_edges.py --org <name>     # one named org
```

That one command writes five files per org into `tools/kb/out/`:

| File | What it holds |
| --- | --- |
| `edges-<org>.json` | Every component and every edge, with the file and element each edge came from. |
| `reverse-index-<org>.json` | What points AT each component, so "what depends on X" needs only this file. |
| `coverage-<org>.json` | Every file on disk, its metadata type, how many edges it produced, and when that count is zero, the reason. |
| `unresolved-<org>.json` | Every name that resolved to nothing, with its reason, the rule that decided, and who asked for it. |
| `reports-<org>.md` | The readable version of the last two, about 300 lines. |

Size depends on the org. In the project this was built in, one org's edge list
came to 213.6 MB and another's to 51.6 MB, with the reverse index at 36.3 MB and
8.7 MB. **Do not commit these.** GitHub warns above 50 MB a file and refuses
anything above 100 MB, so add `tools/kb/out/` to `.gitignore` and rebuild
instead.

The four JSON files are written one entry to a line, so an ordinary text search
returns one edge rather than the whole file, and each file is still a single
valid JSON document. There is no timestamp inside any of them: two builds of the
same snapshot are byte-identical, which is what lets two builds be compared.

## Ask it questions

```bash
# Where does this field come from, and what breaks if it changes?
python tools/kb/query_graph.py Case.Priority

# The same, reaching three steps out instead of two
python tools/kb/query_graph.py --org <name> "<name>:Flow:Case_Escalation" --hops 3

# A name that points at nothing: who asked for it, and why did it not resolve?
python tools/kb/query_graph.py --org <name> --unresolved npsp__Household__c

# What is in this org, ranked by how connected each thing is?
python tools/kb/query_graph.py --org <name> --map

# How does each field get its value?
python tools/kb/classify_fields.py
python tools/kb/classify_fields.py --org <name> --field Case.Priority
python tools/kb/classify_fields.py --org <name> --kind manual_only

# What changed between two builds?
python tools/kb/diff_graph.py --old before.json --new tools/kb/out/edges-<org>.json
```

`--org` can be left out when only one org has been built. `query_graph.py` takes
a component id (`<org>:CustomField:Case.Priority`), a full api name
(`Case.Priority`), or a fragment of either. A fragment matching more than one
component lists the candidates and stops rather than guessing.

## What this cannot tell you

**Read this before saying "nothing writes this field."** Every section of every
report answers "what is in this snapshot", never "what is true". An empty section
is not proof of absence.

1. **Apex writes are found by matching patterns against code text, so they are
   near-complete rather than exhaustive.** The reader recognises assignments, DML
   calls and SOQL select lists in `.cls` and `.trigger` files, and marks every one
   of them `confidence: low` for that reason. A field written only through a
   variable the pattern could not follow shows no writer at all. How weak this is
   in practice: in the two orgs this was built against, the reader found 374 Apex
   write edges reaching 39 distinct fields, against 5,256 field files. It does
   find them. It does not find most of them.

2. **Anything built at runtime is largely invisible.** Dynamic SOQL, a class named
   by `Type.forName`, a field name assembled inside a string, a merge field in an
   email template body. What can be seen is emitted and marked
   `unresolved_dynamic`, and that count understates the real number rather than
   measuring it.

3. **An integration writing through the API leaves nothing behind.** No metadata
   file records that an outside system fills a field, so such a field looks
   untouched.

4. **Profiles are partial evidence by design.** A profile retrieve is lossy: only
   user permissions, login hours and login IP ranges always come back, and
   everything else appears only when the matching component was named in the same
   retrieve. Permission sets do not have this problem and are complete.

5. **A partial retrieve looks like a missing connection.** An org whose snapshot
   is missing standard field files resolves far worse than one with a complete
   retrieve, because its profiles grant access to fields that have no file to
   point at. In the pair this was built against, one org resolved 89.6 per cent
   and the other 66.0, and the whole difference was the retrieve rather than the
   reader. Check the resolution rate before reading anything into a gap.

6. **Managed-package contents are not in the snapshot.** A reference to
   `npsp__Household__c` is emitted, marked `unresolved_managed_package`, and
   named with its namespace, but nothing behind that namespace can be followed.

7. **A metadata type the retrieve never brought back produces nothing.** If no
   Report files were retrieved, every dashboard-to-report reference resolves to
   nothing, and that says something about the retrieve rather than the org.

8. **It is a picture of one moment.** A production org changes daily, and a
   component renamed between two snapshots is a different component, on purpose.
   Which snapshot this was built from is answered by the `force-app/` tree in git,
   not by a timestamp in the file.

Every edge carries its own `confidence` and its own `resolution`, so trust it per
edge rather than per file. `unresolved_unknown`, meaning no rule recognised the
string at all, is the one value worth investigating when it grows.

### Checking it against the org's own answer

The org will say what it thinks depends on what, through
`MetadataComponentDependency` in the Tooling API. Three scripts ask it and
compare. Read-only, and only the third is safe to re-run freely: the first two ask
a live org and take about 20 minutes each.

```bash
python tools/kb/pull_org_dependencies.py --org <name>    # ask the org
python tools/kb/build_org_catalog.py --org <name>        # ask what its ids are called
python tools/kb/compare_dependencies.py --org <name>     # compare; contacts nothing
```

They write into `org-knowledge/dependency-crosscheck/`. Commit those answers:
re-asking costs twenty minutes and returns a different org, because the org moved
on. Two things learned from running this that change how a comparison should be
read:

- **A confirmation rate measures Salesforce, not this tool.** "What share of what
  these files found did the org also report" and "what share of the org's own
  answer did these files find" are different numbers, usually far apart. The
  reports carry both side by side. Confusing them makes a strong result look like
  a weak one.
- **There is no second opinion available on most of it.** The Dependency API
  refuses many metadata types outright, including `Workflow`, `SharingRules`,
  `CustomLabels` and `Settings`, and returns nothing at all for most component
  pairs, including every profile and permission set grant. For those, these files
  are the only source there is.

## The automatic freshness check

`graph_freshness_hook.py` runs as a Claude Code Stop hook, at the end of each
turn, when registered in `.claude/settings.json`. It fingerprints every file
under `force-app/`, and when nothing changed it exits at once, which is the
common case and costs a fraction of a second.

When files did change, it rebuilds only the orgs those files belong to, compares
the new edge list against the old one scoped to the changed files, and when
connections moved it writes `tools/kb/_drift_pending.md` naming them. That file
carries its own instructions and nothing deletes it but a person.

Three things it will not do. It never builds an edge list that does not already
exist, so a fresh checkout with no `out/` folder just records the fingerprint and
waits. It builds into a temporary folder and moves the finished files into place,
so a hook killed part-way through cannot leave a half-written edge list behind.
And it always exits 0, because a freshness check must never block a session.
`GRAPH_FRESHNESS=0` switches it off.

Watch `force-app/` itself, never `force-app/main/default`. An earlier version of
this hook watched the fixed path, found nothing in a project that keeps one
folder per org, and exited silently at its first check for as long as it was
installed.

## How it is built, and how to check it

Five stages, each with its own tests and its own report. Run any of them alone.

```bash
# What files are in the org, and what type is each one?
python tools/kb/file_registry.py --verify-git

# What came out of every file, and what did the reader NOT recognise?
python tools/kb/extract.py --prove-gaps
python tools/kb/extract.py --org <name> --census 40

# What did each reference turn out to point at, and by which rule?
python tools/kb/resolve.py --without-profiles
python tools/kb/resolve.py --org <name> --show-rule legacy_token

# Prove a rebuild is a pure function of the files on disk
python tools/kb/build_edges.py --org <name> --check-only --prove-deterministic

# Tests
python tools/kb/test_file_registry.py
python tools/kb/test_extractors.py
python tools/kb/test_resolver.py
python tools/kb/test_edge_list.py
python tools/kb/test_reports.py
python tools/kb/test_graph_tools.py
python tools/kb/test_org_crosscheck.py
```

Two of those are worth knowing about specifically. `--prove-gaps` checks, one by
one, every connection type a weaker parser is known to miss: lookups and
master-detail relationships, flow subflows and action calls, permission set object
and Apex class access, formulas reaching standard fields, Apex writes, list views,
web links, layouts, Lightning pages and profiles. `--census` prints the elements
the generic reader met and did not treat as a reference, which is how the
reference table grows from evidence rather than guesswork.

The coverage report is where "every file accounted for" becomes checkable rather
than asserted. Every file has a row whether it was opened or not, and any file
that produced no edge carries the reason. The edge count on each row is counted
again from the finished edges rather than copied from the reader's own tally, and
the two are compared file by file.

**About the tests.** Most run anywhere against small metadata trees built in a
temporary folder. The rest run against whatever real metadata the project holds
and skip when there is none. A few check exact numbers measured in the project
this tool was built in; those sit in `MEASURED_` constants at the top of their
file and skip unless those org names are present. Adopting the tool in a new
project means either leaving them skipped or replacing the numbers with that
project's own.

## File map

| File | Role |
| --- | --- |
| `file_registry.py` | Walks an org's tree and records every file with its metadata type. |
| `extractors/` | Turns those files into components and raw references: one generic pass over any metadata XML plus deep readers for the types carrying the real connections. |
| `extractors/__init__.py`, `extractors/_kbpath.py` | Package boundary and path setup shared by extractor tests and command-line entry points. |
| `extractors/interface.py`, `extractors/contracts.py`, `extractors/names.py` | Shared extractor contracts, result shapes, and canonical component names. |
| `extractors/driver.py`, `extractors/generic.py`, `extractors/xmlutil.py` | Dispatch, generic XML extraction, and safe XML helpers used by every metadata reader. |
| `extractors/analytics.py`, `extractors/apex.py`, `extractors/automation.py`, `extractors/data.py`, `extractors/flows.py`, `extractors/objects.py`, `extractors/security.py` | Deep readers for metadata families whose connections need type-specific handling. |
| `extract.py` | Runs the extractors over an org and prints the coverage report. |
| `resolver.py` | Turns each raw reference string into a real component id in the same org, or records why it could not. |
| `resolve.py` | Runs the resolver over an org and prints the resolution report. |
| `edge_list.py` | Zips references and resolutions into finished edges plus the reverse index. |
| `reports.py` | The coverage report and the unresolved-reference report. |
| `build_edges.py` | The one build command. Writes all five files and runs the acceptance checks. |
| `graph.py` | The shared reader the query tools use, plus org discovery. Streams the edge list a line at a time rather than loading hundreds of megabytes into memory. |
| `query_graph.py` | Impact queries: where a value comes from, what names a component, the N-hop radius, the subsystem map. |
| `classify_fields.py` | The per-field "how does this get its value" label. |
| `diff_graph.py` | What connections changed between two builds. |
| `graph_freshness_hook.py` | The Stop hook: rebuild when `force-app/` changes, and say what moved. |
| `org_api.py` | The read-only query layer, the org-name-to-CLI-alias mapping, and what `MetadataComponentDependency` will and will not do. The only file that runs an `sf` command. |
| `pull_org_dependencies.py` | Asks an org for every dependency it will report, cutting the question into slices small enough to get under the API's silent 2000-row cap. |
| `org_catalog.py`, `build_org_catalog.py` | Eleven id-to-name lookups built from the org's own definition objects, which is what makes a dependency row readable. |
| `compare_dependencies.py` | The comparison and both cross-check reports. Contacts no org. |
| `test_*.py` | The tests, one file per stage. |

## Installing it in a project

1. Copy this folder to `tools/kb/` in the project.
2. Add `tools/kb/out/`, `tools/kb/_freshness_stamp.json` and
   `tools/kb/_drift_pending.md` to `.gitignore`.
3. If the project's Salesforce CLI aliases are not its folder names, write
   `tools/kb/org-aliases.json`.
4. Run `python tools/kb/build_edges.py`, then the tests.
5. Optional: register `graph_freshness_hook.py` as a Stop hook in
   `.claude/settings.json`.

The guide at `guides/salesforce-dependency-graph.md` covers what to do with the
answers. The rule at `rules/salesforce/dependency-graph.md` covers when an agent
must consult it and what it must never claim from it.
