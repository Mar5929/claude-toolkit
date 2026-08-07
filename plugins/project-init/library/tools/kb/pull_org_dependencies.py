"""Pull every dependency row an org will report about itself, and save it to disk.

Read-only. Every call is `sf data query --use-tooling-api`, which is a read and
is allowed against a production org. Nothing here writes, deploys, validates or
runs code. `.claude/rules/salesforce-safety-guardrails.md` governs.

    python tools/kb/pull_org_dependencies.py --org <name>
    python tools/kb/pull_org_dependencies.py --org <name> --alias <name>=<CLI target>

Writes `org-knowledge/dependency-crosscheck/org-dependencies-<org>.json`, which
IS committed. That folder is not `tools/kb/out/`: the edge list there is ignored
because rebuilding it takes well under a minute, and none of that applies to an
answer that costs 20 minutes of read-only queries against a production org and
records one moment in that org's life.

## Why this is not one query

`MetadataComponentDependency` returns at most 2000 rows and does not say when
it stopped. In the org this was measured against, an unfiltered query returned
1,955 rows reporting `done: true`; slicing the same org by source type returned
4,980 from seven types alone. So a single query is not a small answer, it is a
wrong one.

It also refuses COUNT(), GROUP BY, OFFSET, LIKE, and every operator except `=`
and `IN`. There is no way to ask how many rows exist, no way to page, and no
way to walk ids in order. The only thing left is to cut the org into slices
small enough that each one comes back under the cap.

## How the cutting works

Three levels, each used only when the one before it did not get under the cap:

1. **By source type.** One query per metadata type.
2. **By source type and target type.** For a type that came back at the cap.
3. **By source component id, in batches.** For a pair still at the cap. The
   ids come from what levels 1 and 2 already returned, so this level can only
   ask about components already seen at least once.

Level 3 is the one that can be incomplete, and the report says so rather than
implying otherwise: a source component whose rows were all cut off at level 2,
and which appears nowhere in any returned row, cannot be asked about because
nothing knows it exists. Any slice still at the cap after level 3 is written
into `incomplete_slices` in the output file and named in the report.

## Discovering which types exist

There is no GROUP BY, so the type list cannot be asked for. It is probed
instead: a candidate list is queried one type at a time, and a type returning
no rows is absent. The candidates are the union of every metadata type in the
two local snapshots, plus the names the Dependency API uses that no local
folder does (`StandardEntity`, `WorkflowRule`, `EmailTemplate`, `Report` and
the rest). A type present in the org but on nobody's list is invisible to this
method, so the run also collects every type name it sees inside returned rows
and probes any that were not already on the list, until nothing new turns up.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from graph import find_repo_root  # noqa: E402
from org_api import (  # noqa: E402
    ALL_FIELDS,
    ORG_ANSWERS,
    QueryError,
    QueryStats,
    TRUNCATION_MARK,
    build_soql,
    cli_target,
    parse_alias_options,
    row_key,
    run_many,
    run_query,
    write_rows,
)

REPO_ROOT = find_repo_root()
BUILD_DIR = Path(__file__).resolve().parent / "out"   # the local edge list, gitignored
ANSWERS_DIR = ORG_ANSWERS                               # what the orgs said, committed

# Names the Dependency API uses that never appear as a folder in a snapshot,
# so they would be missed if the candidate list came from the local files only.
API_ONLY_TYPES = [
    "StandardEntity",
    "CustomEntityDefinition",
    "WorkflowRule",
    "WorkflowFieldUpdate",
    "WorkflowAlert",
    "WorkflowTask",
    "WorkflowOutboundMessage",
    "EmailTemplate",
    "Report",
    "Dashboard",
    "CustomLabel",
    "AuraDefinitionBundle",
    "LightningComponentBundle",
    "ApexTrigger",
    "CustomPermission",
    "NamedCredential",
    "ExternalDataSource",
    "CustomSetting",
    "CustomNotificationType",
    "PlatformEventChannel",
    "Territory2Model",
    "Territory2Rule",
    "SiteDotCom",
    "Network",
    "Audience",
    "ContentAsset",
    "ExperienceBundle",
    "NavigationMenu",
    "PlatformCachePartition",
    "StandardAction",
    "GlobalPicklist",
]

# The id batch size for level 3. Small enough that a batch cannot itself be
# truncated in the common case, and large enough that a type with hundreds of
# components does not cost hundreds of queries.
ID_BATCH = 25


def local_types() -> list[str]:
    """Every metadata type any built snapshot holds, from the coverage reports.

    Every org that has been built counts, not a fixed pair: a type present in one
    org and absent from another still has to be asked about.
    """
    names: set[str] = set()
    for path in sorted(BUILD_DIR.glob("coverage-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for row in data.get("by_metadata_type", []):
            name = row.get("metadata_type", "")
            if name and name != "NotMetadata":
                names.add(name)
    return sorted(names)


class Puller:
    """Pulls one org, cutting slices until each is under the cap."""

    def __init__(self, org: str, verbose: bool = True, alias: str | None = None):
        self.org = org
        self.alias = alias or cli_target(org)
        self.verbose = verbose
        self.stats = QueryStats()
        self.rows: dict[tuple, dict] = {}
        self.incomplete: list[dict] = []
        self.probed: set[str] = set()
        self.cut_pairs: set[tuple[str, str]] = set()
        self.tried_pairs: set[tuple[str, str]] = set()
        self.slice_log: list[dict] = []

    def say(self, message: str) -> None:
        if self.verbose:
            print(message, flush=True)

    def ask(self, where: dict | None = None, ids: tuple | None = None) -> list[dict]:
        soql = build_soql(where=where, fields=ALL_FIELDS, ids=ids)
        try:
            return run_query(soql, self.alias, self.stats)
        except QueryError as problem:
            self.incomplete.append({
                "slice": where or {},
                "reason": f"the org refused the query: {problem}"[:300],
            })
            return []

    def ask_many(self, wheres: list[dict]) -> list[tuple[dict, list[dict]]]:
        """Run a batch of independent slice queries side by side."""
        queries = [(index, build_soql(where=where, fields=ALL_FIELDS))
                   for index, where in enumerate(wheres)]
        outcomes = run_many(queries, self.alias, self.stats)
        answers: list[tuple[dict, list[dict]]] = []
        for index, rows, error in sorted(outcomes, key=lambda item: item[0]):
            where = wheres[index]
            if error:
                self.incomplete.append({
                    "slice": where,
                    "cut_further": False,
                    "reason": f"the org refused the query: {error}"[:300],
                })
                continue
            answers.append((where, rows))
        return answers

    def keep(self, rows: list[dict]) -> int:
        """Add rows, returning how many were new."""
        before = len(self.rows)
        for row in rows:
            self.rows[row_key(row)] = row
        return len(self.rows) - before

    def seen_types(self) -> set[str]:
        """Every type name appearing anywhere in the rows collected so far."""
        found: set[str] = set()
        for row in self.rows.values():
            found.add(row.get("MetadataComponentType") or "")
            found.add(row.get("RefMetadataComponentType") or "")
        found.discard("")
        return found

    def pull(self) -> None:
        candidates = sorted(set(local_types()) | set(API_ONLY_TYPES))
        self.say(f"  probing {len(candidates)} candidate source types")
        self.probe_round(candidates)

        # A type nobody listed can still show up inside a returned row. Probe
        # whatever turned up and repeat until a round finds nothing new.
        for _ in range(5):
            fresh = sorted(self.seen_types() - self.probed)
            if not fresh:
                break
            self.say(f"  {len(fresh)} type(s) appeared in the rows and were never probed; probing them")
            self.probe_round(fresh)

        # The source-side probe can only find a type somebody named. A type
        # present in the org, absent from the candidate list, and never sitting
        # on the target side of a row already collected would stay invisible.
        # Asking the same question down the target axis finds it, because every
        # row carries its source type whichever way it was asked for.
        self.reverse_probe()
        for _ in range(5):
            fresh = sorted(self.seen_types() - self.probed)
            if not fresh:
                break
            self.say(f"  the target-side sweep turned up {len(fresh)} unprobed source type(s)")
            self.probe_round(fresh)

    def reverse_probe(self) -> None:
        """Ask down the target axis, to catch a source type nobody named."""
        targets = sorted(set(local_types()) | set(API_ONLY_TYPES) | self.seen_types())
        self.say(f"  sweeping {len(targets)} target types to check nothing was missed")
        capped: list[str] = []
        for where, rows in self.ask_many([{"RefMetadataComponentType": name}
                                          for name in targets]):
            if not rows:
                continue
            name = where["RefMetadataComponentType"]
            added = self.keep(rows)
            if added:
                self.say(f"    -> {name}: {len(rows)} rows, {added} the source-side probe never saw")
            if len(rows) >= TRUNCATION_MARK:
                capped.append(name)
        for name in capped:
            self.reverse_cut(name)

    def reverse_cut(self, target_type: str) -> None:
        """A capped target-side slice, cut by source type."""
        sources = sorted(self.seen_types())
        wheres = [{"MetadataComponentType": source,
                   "RefMetadataComponentType": target_type}
                  for source in sources
                  if (source, target_type) not in self.tried_pairs]
        if not wheres:
            return
        self.tried_pairs.update(
            (where["MetadataComponentType"], target_type) for where in wheres)
        for where, rows in self.ask_many(wheres):
            if not rows:
                continue
            self.keep(rows)
            if len(rows) >= TRUNCATION_MARK:
                self.cut_by_id(where["MetadataComponentType"], target_type)

    def probe_round(self, types: list[str]) -> None:
        fresh = [name for name in types if name not in self.probed]
        if not fresh:
            return
        self.probed.update(fresh)
        capped: list[str] = []
        for where, rows in self.ask_many([{"MetadataComponentType": name}
                                          for name in fresh]):
            name = where["MetadataComponentType"]
            if not rows:
                continue
            added = self.keep(rows)
            at_cap = len(rows) >= TRUNCATION_MARK
            self.slice_log.append({
                "type": name, "rows": len(rows),
                "cut": "by target type" if at_cap else "none needed",
            })
            if at_cap:
                self.say(f"    {name}: {len(rows)} rows, AT THE CAP, will cut by target type")
                capped.append(name)
            else:
                self.say(f"    {name}: {len(rows)} rows ({added} new)")
        for name in capped:
            self.cut_by_target(name)

    def cut_by_target(self, source_type: str) -> None:
        for attempt in range(2):
            targets = sorted(self.seen_types())
            wheres = [{"MetadataComponentType": source_type,
                       "RefMetadataComponentType": target}
                      for target in targets
                      if (source_type, target) not in self.tried_pairs]
            if not wheres:
                return
            self.tried_pairs.update(
                (source_type, where["RefMetadataComponentType"]) for where in wheres)
            for where, rows in self.ask_many(wheres):
                if not rows:
                    continue
                self.keep(rows)
                if len(rows) >= TRUNCATION_MARK:
                    target = where["RefMetadataComponentType"]
                    self.say(f"      {source_type} -> {target}: {len(rows)}, AT THE CAP, "
                             "cutting by component id")
                    self.cut_by_id(source_type, target)
            # A target type nobody had seen when the batch was built could not
            # be asked for. One more round picks up whatever the batch revealed.

    def cut_by_id(self, source_type: str, target_type: str) -> None:
        """Ask about each known source component of this type, in batches.

        This is the last cut available, and the only one that can leave
        something out. It can only name ids it has already seen, so a component
        whose every row was truncated away and which appears in no other slice
        is not on the list and cannot be asked about.
        """
        pair = (source_type, target_type)
        if pair in self.cut_pairs:
            return
        self.cut_pairs.add(pair)

        ids = sorted({
            row["MetadataComponentId"]
            for row in self.rows.values()
            if row.get("MetadataComponentType") == source_type
            and row.get("MetadataComponentId")
        })
        if not ids:
            self.incomplete.append({
                "slice": {"MetadataComponentType": source_type,
                          "RefMetadataComponentType": target_type},
                "cut_further": False,
                "reason": "came back at the 2000-row cap and no component id of this type "
                          "is known, so it could not be cut any smaller. Rows are missing "
                          "and there is no way to say how many.",
            })
            return

        batches = [tuple(ids[start:start + ID_BATCH])
                   for start in range(0, len(ids), ID_BATCH)]
        queries = [(batch, build_soql({"RefMetadataComponentType": target_type},
                                      fields=ALL_FIELDS, ids=batch))
                   for batch in batches]
        capped_batches: list[tuple] = []
        for batch, rows, error in run_many(queries, self.alias, self.stats):
            if error:
                self.stats.errors.append(f"id batch of {len(batch)} :: {error}"[:200])
                continue
            self.keep(rows)
            if len(rows) >= TRUNCATION_MARK:
                capped_batches.append(batch)

        still_capped: list[str] = []
        singles = [(one, build_soql({"RefMetadataComponentType": target_type},
                                    fields=ALL_FIELDS, ids=(one,)))
                   for batch in capped_batches for one in batch]
        for one, rows, error in run_many(singles, self.alias, self.stats):
            if error:
                continue
            self.keep(rows)
            if len(rows) >= TRUNCATION_MARK:
                still_capped.append(one)

        self.incomplete.append({
            "slice": {"MetadataComponentType": source_type,
                      "RefMetadataComponentType": target_type},
            "cut_further": True,
            "known_ids_asked": len(ids),
            "ids_still_at_the_cap": still_capped,
            "reason": f"came back at the 2000-row cap, so it was asked again one component "
                      f"id at a time across the {len(ids)} ids of this type already seen. "
                      "A component of this type whose rows were all truncated away, and "
                      "which appears in no other slice, is not on that list and its rows "
                      "are missing."
                      + (f" {len(still_capped)} single component(s) are themselves at the "
                         "cap and cannot be cut further." if still_capped else ""),
        })


def notes_for(org: str, puller: Puller) -> list[str]:
    return [
        f"Every dependency the {org} org reports through the Tooling API object "
        "MetadataComponentDependency, pulled read-only on 2026-08-05.",
        "The API returns at most 2000 rows per query and reports done: true when it "
        "truncates, so this was pulled as many small slices rather than one query. "
        "An unfiltered query against Blue returns 1,955 rows and claims to be complete; "
        "seven source types alone hold 4,980.",
        "It also refuses COUNT(), GROUP BY, OFFSET, LIKE, and every operator except = "
        "and IN, so there is no way to ask how many rows exist and no way to page.",
        "incomplete_slices names every slice that could not be cut under the cap. An "
        "empty list means every slice came back complete; it does not mean the API "
        "reported every dependency the org has, which is a separate question this file "
        "cannot answer.",
        "The API's own coverage gaps are the subject of the comparison report. This file "
        "is what the org said, not what is true.",
        f"Rows are sorted by (source id, source type, target id, target type). "
        f"{len(puller.rows)} distinct rows came from {puller.stats.queries} queries.",
    ]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--org", action="append", dest="orgs", required=True,
                        help="org folder name (repeatable)")
    parser.add_argument("--alias", action="append", default=None,
                        help="org=<Salesforce CLI target>, when the CLI alias is "
                             "not the folder name (repeatable)")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv)

    try:
        overrides = parse_alias_options(args.alias)
    except ValueError as problem:
        print(problem)
        return 2

    for org in args.orgs:
        alias = cli_target(org, overrides)
        print(f"\n=== pulling {org} ({alias}), read-only ===", flush=True)
        started = time.monotonic()
        puller = Puller(org, verbose=not args.quiet, alias=alias)
        puller.pull()
        elapsed = time.monotonic() - started

        path = ANSWERS_DIR / f"org-dependencies-{org}.json"
        write_rows(list(puller.rows.values()), path, org,
                   notes_for(org, puller), puller.stats, puller.incomplete)

        print(f"\n  {len(puller.rows):,} distinct rows", flush=True)
        print(f"  {puller.stats.queries:,} queries, {puller.stats.rows:,} rows returned "
              f"(the difference is slices overlapping)", flush=True)
        print(f"  {elapsed / 60:.1f} minutes", flush=True)
        if puller.stats.errors:
            print(f"  {len(puller.stats.errors)} query error(s):", flush=True)
            for line in puller.stats.errors[:10]:
                print(f"    {line}", flush=True)
        if puller.incomplete:
            print(f"  {len(puller.incomplete)} slice(s) could not be cut under the cap; "
                  "see incomplete_slices in the file", flush=True)
        size = path.stat().st_size / (1024 * 1024)
        print(f"  wrote {path} ({size:.1f} MB)", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
