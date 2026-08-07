"""Build the id-to-name catalog an org needs before its dependencies can be read.

Read-only. Every call is `sf data query --use-tooling-api`.

    python tools/kb/build_org_catalog.py --org <name>
    python tools/kb/build_org_catalog.py --org <name> --alias <name>=<CLI target>

Writes `org-knowledge/dependency-crosscheck/org-catalog-<org>.json`, committed
beside the pull it explains. Run `pull_org_dependencies.py` first: the catalog is built for the
objects those rows mention, plus every object the local snapshot holds, so it
does not have to ask the org about the several thousand entities that could
never match anything.

`org_catalog.py` explains what each lookup is for and why matching on a name
alone gives wrong answers.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import graph  # noqa: E402
from org_api import cli_target, parse_alias_options, read_rows  # noqa: E402
from org_catalog import ANSWERS_DIR, Catalog, short_id  # noqa: E402

# The id prefixes that say what a record is. Salesforce fixes these, so an id
# alone identifies its kind without asking the org.
OBJECT_PREFIX = "01I"
FIELD_PREFIX = "00N"


def local_object_names(org: str) -> list[str]:
    """Every object the local snapshot defines, standard and custom alike."""
    components = graph.load_components(graph.edges_path(org))
    return sorted({
        comp["api_name"] for comp in components.values()
        if comp["type"] == "CustomObject"
    })


def object_ids_in_rows(rows: list[dict]) -> list[str]:
    """Every object record id either end of any dependency row names."""
    found: set[str] = set()
    for row in rows:
        for key, type_key in (("MetadataComponentId", "MetadataComponentType"),
                              ("RefMetadataComponentId", "RefMetadataComponentType")):
            value = row.get(key) or ""
            if value.startswith(OBJECT_PREFIX):
                found.add(short_id(value))
    return sorted(found)


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
        target = cli_target(org, overrides)
        print(f"\n=== building the {org} catalog ({target}), read-only ===",
              flush=True)
        started = time.monotonic()

        pull_path = ANSWERS_DIR / f"org-dependencies-{org}.json"
        if not pull_path.exists():
            raise SystemExit(
                f"no dependency pull for {org}: {pull_path}\npull it first:\n"
                f"  python tools/kb/pull_org_dependencies.py --org {org}")
        rows = read_rows(pull_path)["rows"]
        print(f"  {len(rows):,} dependency rows to name", flush=True)

        catalog = Catalog(org, target, verbose=not args.quiet)
        names = local_object_names(org)
        ids = object_ids_in_rows(rows)
        print(f"  {len(names)} objects in the snapshot, "
              f"{len(ids)} object ids in the rows", flush=True)
        catalog.load_objects(names, ids)

        # Ask for the fields of every object we could name, whichever side it
        # came from. An object neither the snapshot nor the rows mention cannot
        # hold a field either side of the comparison cares about.
        catalog.load_fields(sorted(catalog.objects))
        catalog.load_layouts()
        catalog.load_validation_rules()
        catalog.load_quick_actions()
        catalog.load_workflow_alerts()
        catalog.load_web_links()
        catalog.load_field_sets()
        catalog.load_list_views()
        catalog.load_flows()
        catalog.load_flexipages()

        path = catalog.save()
        elapsed = time.monotonic() - started
        counts = catalog.as_dict()["counts"]
        print("\n  " + ", ".join(
            f"{label} {counts[key]}" for label, key in (
                ("objects", "objects"), ("fields", "fields"),
                ("layouts", "layouts"), ("validation rules", "validation_rules"),
                ("quick actions", "quick_actions"),
                ("workflow alerts", "workflow_alerts"), ("web links", "web_links"),
                ("list views", "list_views"), ("field sets", "field_sets"),
                ("flow versions", "flows"), ("Lightning pages", "flexipages"))),
            flush=True)
        print(f"  {counts['queries']:,} queries, {elapsed / 60:.1f} minutes", flush=True)
        print(f"  wrote {path} ({path.stat().st_size / (1024 * 1024):.1f} MB)", flush=True)

        unmapped = count_unmapped_fields(rows, catalog)
        if unmapped:
            print(f"  {unmapped:,} field id(s) in the rows are still unnamed; the "
                  "comparison reports them unmapped rather than guessing", flush=True)

    return 0


def count_unmapped_fields(rows: list[dict], catalog: Catalog) -> int:
    missing: set[str] = set()
    for row in rows:
        for key in ("MetadataComponentId", "RefMetadataComponentId"):
            value = row.get(key) or ""
            if value.startswith(FIELD_PREFIX) and short_id(value) not in catalog.fields:
                missing.add(short_id(value))
    return len(missing)


if __name__ == "__main__":
    raise SystemExit(main())
