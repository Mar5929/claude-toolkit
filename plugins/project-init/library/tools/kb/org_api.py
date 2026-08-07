"""Read-only access to a Salesforce org's own dependency records.

Every function here runs `sf data query --use-tooling-api`, which is a read.
Nothing in this file writes to an org, deploys, validates, runs Apex, or
changes a record. Assume the org being read is production, because it usually
is: `.claude/rules/salesforce-safety-guardrails.md` governs.

The object being read is `MetadataComponentDependency`. Each row says one
component depends on another, and carries six fields plus two namespaces:

    MetadataComponentId / Name / Type / Namespace         the dependent
    RefMetadataComponentId / Name / Type / Namespace      what it depends on

What this object will and will not do, measured against a real org on 2026-08-05
rather than taken from documentation:

    COUNT()                     refused outright
    GROUP BY                    refused outright
    OFFSET                      refused outright
    LIKE on a name              refused: the name fields cannot be filtered
    > or < on an id             refused: only = and IN work on an id
    ORDER BY                    allowed
    = and IN on an id           allowed
    = on either type            allowed
    = on either namespace       allowed
    more than 2000 rows         SILENTLY TRUNCATED, and it reports done: true

That last one is the reason this file exists. An unfiltered query against the org
measured returned 1,955 rows and claimed to be complete. Slicing the same org by source
type returns 4,980 rows from seven types alone, so the unfiltered answer was
missing at least three fifths of the org and said nothing about it. Any slice
that comes back holding exactly 2000 rows has to be assumed truncated and cut
smaller, and a slice that cannot be cut any smaller is reported as incomplete
rather than counted as an answer.
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from graph import find_repo_root  # noqa: E402

# The API returns at most this many rows and does not say when it truncated.
ROW_CAP = 2000

# A slice holding this many rows or more is treated as truncated. It is the cap
# itself rather than a margin below it: the API returns exactly 2000 when it
# truncates, and a genuine 2000 is indistinguishable from a truncated one, so
# both are subdivided.
TRUNCATION_MARK = ROW_CAP

ALL_FIELDS = (
    "MetadataComponentId",
    "MetadataComponentName",
    "MetadataComponentType",
    "MetadataComponentNamespace",
    "RefMetadataComponentId",
    "RefMetadataComponentName",
    "RefMetadataComponentType",
    "RefMetadataComponentNamespace",
)


# Where an org's own answers are kept. NOT `tools/kb/out/`, which git ignores.
#
# The edge list is ignored because rebuilding it takes under a minute and needs
# nothing but Python, so a committed copy could only ever go stale. None of
# that is true here. Rebuilding one of these files means about 20 minutes of
# read-only queries against a live org, and the answer is a picture of that org
# on the day it was asked, which cannot be reproduced later at all. That is why
# these are committed, decided 2026-08-05. They are a few megabytes each,
# against GitHub's 100 MB refusal point.
ORG_ANSWERS = find_repo_root() / "org-knowledge" / "dependency-crosscheck"


# ---------------------------------------------------------------------------
# Which org the Salesforce CLI should be pointed at
# ---------------------------------------------------------------------------
#
# The tool knows an org by its metadata folder name. The Salesforce CLI knows it
# by an alias or a username, and the two are often not the same word. Nothing is
# hardcoded: the folder name is used as-is unless the project says otherwise, in
# `tools/kb/org-aliases.json` beside this file:
#
#     {"red": "RED", "blue": "BLUE"}
#
# `--alias <org>=<cli target>` overrides that for one run. A project whose folder
# names already match its CLI aliases needs neither.

ALIAS_FILE = THIS_DIR / "org-aliases.json"


def _alias_file(path=None) -> dict:
    source = Path(path) if path else ALIAS_FILE
    if not source.is_file():
        return {}
    try:
        parsed = json.loads(source.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    if not isinstance(parsed, dict):
        return {}
    return {str(k): str(v) for k, v in parsed.items()}


def parse_alias_options(values) -> dict:
    """Turn repeated `--alias org=target` values into a mapping.

    Raises ValueError naming the bad value, so a typo stops the run before it
    spends twenty minutes querying the wrong org.
    """
    mapping = {}
    for value in values or []:
        if "=" not in value:
            raise ValueError(f"--alias needs org=target, got: {value}")
        org, target = value.split("=", 1)
        org, target = org.strip(), target.strip()
        if not org or not target:
            raise ValueError(f"--alias needs org=target, got: {value}")
        mapping[org] = target
    return mapping


def cli_target(org: str, overrides=None, alias_path=None) -> str:
    """What to pass to `sf -o` for one org folder name."""
    if overrides and org in overrides:
        return overrides[org]
    return _alias_file(alias_path).get(org, org)


class QueryError(RuntimeError):
    """The org refused the query. Carries the org's own message."""


@dataclass
class QueryStats:
    """How much this run asked the org for, so the cost is reportable."""

    queries: int = 0
    rows: int = 0
    seconds: float = 0.0
    errors: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "queries": self.queries,
            "rows_returned": self.rows,
            "seconds": round(self.seconds, 1),
            "errors": self.errors,
        }


def run_query(soql: str, org: str, stats: QueryStats | None = None,
              retries: int = 3, tooling: bool = True) -> list[dict]:
    """Run one read-only query and return its rows.

    Tooling by default, because that is where `MetadataComponentDependency` and
    the definition objects live. `tooling=False` uses the ordinary query
    endpoint, which is where `ListView` lives. Both are reads.

    Retries a failed call, because a long pull meets transient network and
    session errors and losing an hour of work to one of them is not acceptable.
    A refusal the org states plainly (an unsupported operator, a bad type name)
    is not retried: it will fail the same way every time.
    """
    started = time.monotonic()
    last_message = ""
    command = ["sf", "data", "query"]
    if tooling:
        command.append("--use-tooling-api")
    command += ["-o", org, "-q", soql, "--json"]
    for attempt in range(retries):
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            shell=(sys.platform == "win32"),
        )
        try:
            payload = json.loads(completed.stdout)
        except json.JSONDecodeError:
            last_message = (completed.stderr or completed.stdout or "")[:400]
            time.sleep(2 * (attempt + 1))
            continue

        if payload.get("status") == 0:
            if stats is not None:
                stats.queries += 1
                stats.seconds += time.monotonic() - started
            rows = payload.get("result", {}).get("records", []) or []
            if stats is not None:
                stats.rows += len(rows)
            return [_strip(row) for row in rows]

        last_message = str(payload.get("message", ""))
        code = str(payload.get("data", {}).get("errorCode", ""))
        if code == "DEPENDENCY_API_UNSUPPORTED_EXCEPTION" or "unknown" in last_message.lower():
            break
        time.sleep(2 * (attempt + 1))

    if stats is not None:
        stats.queries += 1
        stats.seconds += time.monotonic() - started
        stats.errors.append(f"{soql[:120]} :: {last_message[:200]}")
    raise QueryError(last_message)


def run_many(queries: list[tuple], org: str, stats: QueryStats,
             workers: int = 4) -> list[tuple]:
    """Run independent queries side by side and return (label, rows, error).

    One `sf data query` call costs about 12 seconds against these orgs, almost
    all of it the command line tool starting up rather than the org answering.
    A few hundred of them one after another is over an hour of waiting for
    nothing. Four at a time cuts that to a quarter with no extra load worth
    speaking of: every one is still the same read-only query, and a few hundred
    queries is a rounding error against a production org's daily API allowance.

    Failures come back in the tuple rather than raising, so one refused query
    cannot lose the rest of the run.
    """
    from concurrent.futures import ThreadPoolExecutor

    results: list[tuple] = []
    lock = _Lock()

    def one(item):
        label, soql = item
        local = QueryStats()
        try:
            rows = run_query(soql, org, local)
            error = ""
        except QueryError as problem:
            rows, error = [], str(problem)
        with lock:
            stats.queries += local.queries or 1
            stats.rows += local.rows
            stats.seconds += local.seconds
            stats.errors.extend(local.errors)
        return (label, rows, error)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        for outcome in pool.map(one, queries):
            results.append(outcome)
    return results


def _Lock():
    import threading
    return threading.Lock()


def _strip(row: dict) -> dict:
    """Drop the `attributes` block the API adds to every row.

    Its `url` is the same placeholder id on every single row
    (`.../MetadataComponentDependency/000000000000000AAA`), so it carries no
    information and would trible the size of the saved file.
    """
    return {key: value for key, value in row.items() if key != "attributes"}


def build_soql(where: dict[str, str] | None = None,
               fields: tuple[str, ...] = ALL_FIELDS,
               ids: tuple[str, ...] | None = None,
               id_field: str = "MetadataComponentId") -> str:
    """Assemble one query. `where` is field to exact value; `ids` becomes IN."""
    clauses = []
    for name, value in sorted((where or {}).items()):
        clauses.append(f"{name} = '{_escape(value)}'")
    if ids:
        quoted = ", ".join(f"'{_escape(one)}'" for one in ids)
        clauses.append(f"{id_field} IN ({quoted})")
    soql = f"SELECT {', '.join(fields)} FROM MetadataComponentDependency"
    if clauses:
        soql += " WHERE " + " AND ".join(clauses)
    return soql


def _escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def row_key(row: dict) -> tuple:
    """What makes one dependency row distinct.

    Slices overlap: the same row arrives once per slice that contains it, and
    the id-batch fallback deliberately re-reads rows already seen. Both ends
    plus both types is the whole content of a row, so two rows with the same
    key are the same fact and one copy is kept.
    """
    return (
        row.get("MetadataComponentId", ""),
        row.get("MetadataComponentType", ""),
        row.get("RefMetadataComponentId", ""),
        row.get("RefMetadataComponentType", ""),
    )


def write_rows(rows: list[dict], path: Path, org: str, notes: list[str],
               stats: QueryStats, incomplete: list[dict]) -> None:
    """Write the pull one row to a line, matching how phase 4 writes edges.

    A single long line cannot be searched, because a text search returns the
    whole file. One row to a line keeps an ordinary search useful and the file
    is still one valid JSON document.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    ordered = sorted(rows, key=row_key)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write("{\n")
        handle.write('"schema_version": "1.0",\n')
        handle.write(f'"org": {json.dumps(org)},\n')
        handle.write('"source": "MetadataComponentDependency, Tooling API, read-only",\n')
        handle.write(f'"notes": {json.dumps(notes)},\n')
        handle.write(f'"query_stats": {json.dumps(stats.as_dict())},\n')
        handle.write(f'"incomplete_slices": {json.dumps(incomplete)},\n')
        handle.write(f'"counts": {json.dumps({"rows": len(ordered)})},\n')
        handle.write('"rows": [\n')
        for index, row in enumerate(ordered):
            comma = "," if index < len(ordered) - 1 else ""
            handle.write(json.dumps(row, sort_keys=True) + comma + "\n")
        handle.write("]\n}\n")


def read_rows(path: Path) -> dict:
    """Read a saved pull back. Small enough to load whole, unlike the edges."""
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def refused_types(pull: dict) -> list[str]:
    """The metadata types the org refuses to discuss at all.

    Asking for a type this object does not track does not return an empty
    answer. It fails outright, with the org's own words:

        The MetadataComponentType value SharingRules is not a supported type.

    That is the strongest possible evidence of what the Dependency API covers,
    because it is the org saying so rather than an absence being read as one.
    Nineteen types come back this way in Blue, including SharingRules, Workflow,
    CustomLabels, Settings and StandardEntity.

    The refusals are recovered from the saved error list rather than stored
    separately, so a pull taken before this function existed still answers.
    """
    import re

    found: set[str] = set()
    pattern = re.compile(
        r"The (?:Ref)?MetadataComponentType value (\S+) is not a supported type")
    for line in pull.get("query_stats", {}).get("errors", []):
        match = pattern.search(line)
        if match:
            found.add(match.group(1))
    return sorted(found)
