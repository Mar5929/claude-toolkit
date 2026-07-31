#!/usr/bin/env python3
"""Safe handling of Salesforce permission set metadata.

Five subcommands, each mapping to one step of the process in the project's
permission set runbook:

    verify      Compare a local permission set file against what the org holds.
                Proves the file is complete before it is trusted.
    check       Lint a local file for the hand-editing mistakes that either
                fail a deploy or silently do nothing.
    tidy        Rewrite a file in canonical order so git diffs stay readable.
    fetch       Retrieve permission sets from an org, verify, tidy, and place
                them in the package directory. Refuses on a failed verify.
    preflight   Before a deploy: compare the local file against the target org
                and list every grant the deploy would REMOVE. Exits non-zero
                when removals are found unless they are explicitly accepted.

Read-only against the org in every subcommand. This tool never deploys.
Standard library only. Python 3.10 or later.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

NS = "http://soap.sforce.com/2006/04/metadata"
ET.register_namespace("", NS)

# On Windows the Salesforce CLI is a .cmd shim, which subprocess will not find
# from the bare name "sf". Resolve it once here.
SF = shutil.which("sf") or "sf"


def find_project_root(start: Path | None = None) -> Path:
    """Walk up from this script until sfdx-project.json appears."""
    here = (start or Path(__file__).resolve()).resolve()
    for candidate in [here, *here.parents]:
        if (candidate / "sfdx-project.json").is_file():
            return candidate
    # No project file found; fall back to two levels up from tools/permissions/.
    return Path(__file__).resolve().parents[2]


REPO_ROOT = find_project_root()


def package_directories() -> list[Path]:
    """Package directories from sfdx-project.json, default one first."""
    project_file = REPO_ROOT / "sfdx-project.json"
    if not project_file.is_file():
        return [REPO_ROOT / "force-app" / "main" / "default"]
    try:
        entries = json.loads(project_file.read_text(encoding="utf-8"))["packageDirectories"]
    except (json.JSONDecodeError, KeyError):
        return [REPO_ROOT / "force-app" / "main" / "default"]
    ordered = sorted(entries, key=lambda e: not e.get("default", False))
    return [REPO_ROOT / e["path"] / "main" / "default" for e in ordered if e.get("path")]


def default_permissionsets_dir() -> Path:
    """Where fetched permission sets land: the default package directory."""
    dirs = package_directories()
    return (dirs[0] if dirs else REPO_ROOT / "force-app" / "main" / "default") / "permissionsets"

# The key child element that identifies each repeatable grant block. Used for
# canonical sorting and for the semantic diff.
GRANT_KEYS = {
    "agentAccesses": "agentName",
    "applicationVisibilities": "application",
    "classAccesses": "apexClass",
    "customMetadataTypeAccesses": "name",
    "customPermissions": "name",
    "customSettingAccesses": "name",
    "emailRoutingAddressAccesses": "name",
    "externalCredentialPrincipalAccesses": "externalCredentialPrincipal",
    "externalDataSourceAccesses": "externalDataSource",
    "fieldPermissions": "field",
    "flowAccesses": "flow",
    "objectPermissions": "object",
    "pageAccesses": "apexPage",
    "recordTypeVisibilities": "recordType",
    "servicePresenceStatusAccesses": "servicePresenceStatus",
    "tabSettings": "tab",
    "userPermissions": "name",
}

# Scalar elements, written before the grant blocks in canonical order.
SCALARS = ["label", "description", "license", "hasActivationRequired"]

# Permissions the Metadata API is known NOT to return on retrieve. They must be
# re-added by hand after every fetch or a deploy will destroy them.
# ManagePackageLicenses: forcedotcom/cli issue 2578, open since 2023-11-23.
RETRIEVE_BLIND_SPOTS = ["ManagePackageLicenses"]

# SetupEntityAccess.SetupEntityType -> the element it appears as in the file.
# Only unambiguous mappings are compared; the rest are reported for information.
SETUP_ENTITY_MAP = {
    "ApexClass": "classAccesses",
    "ApexPage": "pageAccesses",
    "CustomPermission": "customPermissions",
    "FlowDefinition": "flowAccesses",
}



def resolve_package_dirs(flag_values: list[str] | None) -> list[Path]:
    """Package directories to read field definitions from."""
    if flag_values:
        return [Path(v) if Path(v).is_absolute() else REPO_ROOT / v for v in flag_values]
    return package_directories()


class Problem:
    """One finding. Errors block; warnings are reported and allowed."""

    def __init__(self, level: str, message: str) -> None:
        self.level = level
        self.message = message

    def __str__(self) -> str:
        return f"  [{self.level.upper():5}] {self.message}"


# --------------------------------------------------------------------------
# org access (read-only)
# --------------------------------------------------------------------------


def soql(org: str, query: str) -> list[dict]:
    """Run one SOQL query and return its records. Read-only."""
    proc = subprocess.run(
        [SF, "data", "query", "-o", org, "-q", query, "--json"],
        capture_output=True,
        text=True,
    )
    # The CLI prints an update-available warning on stderr; stdout stays clean.
    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError:
        sys.exit(f"Could not read the org's reply to a query.\n{proc.stdout}\n{proc.stderr}")
    if payload.get("status") != 0:
        sys.exit(f"Query failed: {payload.get('message', proc.stderr)}")
    return payload["result"]["records"]


def org_is_sandbox(org: str) -> bool:
    """True only when the org is confirmed to be a sandbox."""
    proc = subprocess.run(
        [SF, "org", "display", "-o", org, "--json"], capture_output=True, text=True
    )
    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return False
    return bool(payload.get("result", {}).get("isSandbox"))


def org_grant_counts(org: str, name: str) -> dict[str, int]:
    """What the org actually holds for this permission set, by element name."""
    esc = name.replace("'", r"\'")
    counts: dict[str, int] = {}

    field_rows = soql(org, f"SELECT COUNT(Id) c FROM FieldPermissions WHERE Parent.Name = '{esc}'")
    counts["fieldPermissions"] = field_rows[0]["c"] if field_rows else 0

    obj_rows = soql(org, f"SELECT COUNT(Id) c FROM ObjectPermissions WHERE Parent.Name = '{esc}'")
    counts["objectPermissions"] = obj_rows[0]["c"] if obj_rows else 0

    setup_rows = soql(
        org,
        "SELECT SetupEntityType, COUNT(Id) c FROM SetupEntityAccess "
        f"WHERE Parent.Name = '{esc}' GROUP BY SetupEntityType",
    )
    for row in setup_rows:
        element = SETUP_ENTITY_MAP.get(row["SetupEntityType"])
        if element:
            counts[element] = row["c"]
        else:
            counts[f"?{row['SetupEntityType']}"] = row["c"]
    return counts


def org_enabled_user_permissions(org: str, name: str) -> set[str]:
    """The Permissions* fields the org reports as true for this permission set."""
    esc = name.replace("'", r"\'")
    describe = subprocess.run(
        [SF, "sobject", "describe", "-s", "PermissionSet", "-o", org, "--json"],
        capture_output=True,
        text=True,
    )
    try:
        fields = json.loads(describe.stdout)["result"]["fields"]
    except (json.JSONDecodeError, KeyError):
        return set()
    perm_fields = [f["name"] for f in fields if f["name"].startswith("Permissions")]
    if not perm_fields:
        return set()

    enabled: set[str] = set()
    # Query in batches; a describe can return several hundred permission fields.
    for start in range(0, len(perm_fields), 100):
        batch = perm_fields[start : start + 100]
        rows = soql(org, f"SELECT {', '.join(batch)} FROM PermissionSet WHERE Name = '{esc}'")
        if not rows:
            return set()
        for key, value in rows[0].items():
            if key.startswith("Permissions") and value is True:
                enabled.add(key[len("Permissions") :])
    return enabled


# --------------------------------------------------------------------------
# file parsing
# --------------------------------------------------------------------------


def load(path: Path) -> ET.Element:
    try:
        return ET.parse(path).getroot()
    except ET.ParseError as exc:
        sys.exit(f"{path.name} is not valid XML: {exc}")


def tag_of(element: ET.Element) -> str:
    return element.tag.split("}")[-1]


def child_text(element: ET.Element, name: str) -> str:
    found = element.find(f"{{{NS}}}{name}")
    return (found.text or "").strip() if found is not None else ""


def file_grant_counts(root: ET.Element) -> dict[str, int]:
    counts: dict[str, int] = {}
    for child in root:
        name = tag_of(child)
        if name in GRANT_KEYS:
            counts[name] = counts.get(name, 0) + 1
    return counts


def grant_map(root: ET.Element) -> dict[tuple[str, str], dict[str, str]]:
    """Every grant in the file, keyed by (element, its identifying value)."""
    grants: dict[tuple[str, str], dict[str, str]] = {}
    for child in root:
        name = tag_of(child)
        key_field = GRANT_KEYS.get(name)
        if not key_field:
            continue
        key = child_text(child, key_field)
        values = {
            tag_of(sub): (sub.text or "").strip() for sub in child if tag_of(sub) != key_field
        }
        grants[(name, key)] = values
    return grants


def enabled_user_permissions(root: ET.Element) -> set[str]:
    names = set()
    for child in root:
        if tag_of(child) == "userPermissions" and child_text(child, "enabled") == "true":
            names.add(child_text(child, "name"))
    return names


# --------------------------------------------------------------------------
# tidy
# --------------------------------------------------------------------------


def canonical(root: ET.Element) -> ET.Element:
    """Rebuild the element in a stable order: scalars, then grants sorted by key.

    Element order carries no meaning to Salesforce for these types, but an
    unstable order makes every diff unreadable, and blocks of the same element
    name must stay contiguous or the deploy fails.
    """
    new = ET.Element(f"{{{NS}}}PermissionSet")

    for name in SCALARS:
        for child in root:
            if tag_of(child) == name:
                new.append(child)

    handled = set(SCALARS)
    for name in sorted(GRANT_KEYS):
        blocks = [c for c in root if tag_of(c) == name]
        if not blocks:
            continue
        blocks.sort(key=lambda b: child_text(b, GRANT_KEYS[name]).lower())
        for block in blocks:
            new.append(block)
        handled.add(name)

    # Anything the tool does not know about is preserved at the end rather than
    # silently dropped. A new Salesforce release will land here first.
    for child in root:
        if tag_of(child) not in handled:
            new.append(child)
    return new


def write(root: ET.Element, path: Path) -> None:
    ET.indent(root, space="    ")
    xml = ET.tostring(root, encoding="unicode")
    path.write_text('<?xml version="1.0" encoding="UTF-8"?>\n' + xml + "\n", encoding="utf-8")


# --------------------------------------------------------------------------
# check (lint)
# --------------------------------------------------------------------------


def read_only_field_names(package_dirs: list[Path]) -> set[str]:
    """Fields that can never be editable: formula, roll-up summary, autonumber."""
    read_only: set[str] = set()
    for package_dir in package_dirs:
        objects_dir = package_dir / "objects"
        if not objects_dir.is_dir():
            continue
        for field_file in objects_dir.glob("*/fields/*.field-meta.xml"):
            text = field_file.read_text(encoding="utf-8", errors="replace")
            calculated = (
                "<formula>" in text
                or "<summaryOperation>" in text
                or "<type>AutoNumber</type>" in text
            )
            if calculated:
                object_name = field_file.parent.parent.name
                read_only.add(f"{object_name}.{field_file.name.split('.')[0]}")
    return read_only


def check_file(path: Path, package_dirs: list[Path]) -> list[Problem]:
    root = load(path)
    problems: list[Problem] = []

    if tag_of(root) != "PermissionSet":
        problems.append(Problem("error", f"root element is <{tag_of(root)}>, expected PermissionSet"))
        return problems

    if not child_text(root, "label"):
        problems.append(Problem("error", "<label> is required and is missing or empty"))

    # Same-name blocks must be contiguous or the deploy fails.
    seen_runs: list[str] = []
    for child in root:
        name = tag_of(child)
        if not seen_runs or seen_runs[-1] != name:
            if name in seen_runs:
                problems.append(
                    Problem(
                        "error",
                        f"<{name}> blocks are split apart in the file; all blocks of one "
                        "element must sit together. Run: permsets.py tidy",
                    )
                )
            seen_runs.append(name)

    read_only = read_only_field_names(package_dirs)
    all_false = 0

    for child in root:
        name = tag_of(child)
        if name == "fieldPermissions":
            field = child_text(child, "field")
            editable = child_text(child, "editable") == "true"
            readable = child_text(child, "readable") == "true"

            if editable and not readable:
                problems.append(
                    Problem("error", f"{field}: editable is true but readable is not. A field "
                                     "must be readable to be editable; this fails the deploy.")
                )
            if editable and field in read_only:
                problems.append(
                    Problem("error", f"{field}: editable is true on a formula, roll-up summary, "
                                     "or autonumber field. Those can never be edited. Set "
                                     "editable to false.")
                )
            if not editable and not readable:
                all_false += 1
            if field.startswith("Activity."):
                problems.append(
                    Problem("error", f"{field}: Activity is not a real object here. Use Task. or "
                                     "Event.; the Activity form is tied to an unresolved "
                                     "permission-toggling bug (cli issue 2583).")
                )

        elif name == "objectPermissions":
            obj = child_text(child, "object")
            if child_text(child, "viewAllFields") == "true":
                problems.append(
                    Problem("warn", f"{obj}: View All Fields is on, so Salesforce returns no "
                                    "individual field permissions for this object. Do not remove "
                                    "View All Fields without first rebuilding the per-field "
                                    "grants from the org.")
                )
            if child_text(child, "allowRead") != "true" and any(
                child_text(child, flag) == "true"
                for flag in ("allowCreate", "allowEdit", "allowDelete", "viewAllRecords", "modifyAllRecords")
            ):
                problems.append(
                    Problem("error", f"{obj}: a write or view-all flag is on while allowRead is "
                                     "off. Read is required for the others.")
                )

        elif name == "fieldPermissions" or name in GRANT_KEYS:
            pass

    if all_false:
        problems.append(
            Problem("warn", f"{all_false} field permission blocks grant nothing (both readable "
                            "and editable are false). They carry no meaning and only add diff "
                            "noise. Run: permsets.py tidy --strip-empty")
        )

    return problems


# --------------------------------------------------------------------------
# subcommands
# --------------------------------------------------------------------------


def cmd_check(args) -> int:
    package_dirs = resolve_package_dirs(args.package_dir)
    failed = False
    for raw in args.files:
        path = Path(raw)
        problems = check_file(path, package_dirs)
        errors = [p for p in problems if p.level == "error"]
        print(f"\n{path.name}: {len(errors)} error(s), {len(problems) - len(errors)} warning(s)")
        for problem in problems:
            print(problem)
        if errors:
            failed = True
    print()
    return 1 if failed else 0


def cmd_tidy(args) -> int:
    for raw in args.files:
        path = Path(raw)
        root = load(path)
        if args.strip_empty:
            for child in list(root):
                if tag_of(child) == "fieldPermissions":
                    if child_text(child, "readable") != "true" and child_text(child, "editable") != "true":
                        root.remove(child)
        write(canonical(root), path)
        print(f"tidied {path.name}")
    return 0


def report_counts(name: str, org_counts: dict[str, int], local_counts: dict[str, int]) -> bool:
    """Print the count comparison. True when the local file matches the org."""
    complete = True
    elements = sorted(set(org_counts) | set(local_counts))
    print(f"\n{name}")
    print(f"  {'element':<32} {'org':>6} {'file':>6}   verdict")
    for element in elements:
        if element.startswith("?"):
            print(f"  {element:<32} {org_counts[element]:>6} {'-':>6}   not compared")
            continue
        in_org = org_counts.get(element, 0)
        in_file = local_counts.get(element, 0)
        if in_org == in_file:
            verdict = "match"
        else:
            verdict = "MISMATCH"
            complete = False
        print(f"  {element:<32} {in_org:>6} {in_file:>6}   {verdict}")
    return complete


def cmd_verify(args) -> int:
    path = Path(args.file)
    name = args.name or path.name.split(".")[0]
    root = load(path)

    org_counts = org_grant_counts(args.org, name)
    local_counts = file_grant_counts(root)
    complete = report_counts(name, org_counts, local_counts)

    if not args.skip_user_permissions:
        org_perms = org_enabled_user_permissions(args.org, name)
        file_perms = enabled_user_permissions(root)
        missing = sorted(org_perms - file_perms)
        extra = sorted(file_perms - org_perms)
        print(f"\n  user permissions: {len(org_perms)} in org, {len(file_perms)} in file")
        if missing:
            complete = False
            print(f"  MISSING from the file ({len(missing)}): {', '.join(missing)}")
            for blind in RETRIEVE_BLIND_SPOTS:
                if blind in missing:
                    print(
                        f"  note: {blind} is a known retrieve blind spot. The org has it, the "
                        "Metadata API will not return it, and a deploy without it destroys it. "
                        "Add it to the file by hand."
                    )
        if extra:
            print(f"  in the file but NOT the org ({len(extra)}): {', '.join(extra)}")

    if complete:
        print("\nVERIFIED: the file matches the org.\n")
        return 0
    print(
        "\nNOT VERIFIED: the file does not match the org. Do not commit it and do not "
        "deploy it. Re-fetch, or account for every difference above.\n"
    )
    return 1


def fetch_to_temp(org: str, names: list[str], workdir: Path) -> dict[str, Path]:
    """Retrieve permission sets standalone into workdir. Read-only against the org."""
    metadata: list[str] = []
    for name in names:
        metadata += ["--metadata", f"PermissionSet:{name}"]
    proc = subprocess.run(
        [SF, "project", "retrieve", "start", "-o", org, *metadata,
         "--target-metadata-dir", str(workdir), "--unzip"],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    if proc.returncode != 0:
        sys.exit(f"Retrieve failed.\n{proc.stdout}\n{proc.stderr}")
    found = {p.name.split(".")[0]: p for p in workdir.rglob("*.permissionset")}
    for name in names:
        if name not in found:
            sys.exit(f"The org did not return a permission set named {name}.")
    return found


def cmd_fetch(args) -> int:
    target_dir = Path(args.output_dir) if args.output_dir else default_permissionsets_dir()
    target_dir.mkdir(parents=True, exist_ok=True)
    package_dirs = resolve_package_dirs(args.package_dir)
    exit_code = 0

    with tempfile.TemporaryDirectory(prefix="permsets-fetch-") as tmp:
        workdir = Path(tmp)
        retrieved = fetch_to_temp(args.org, args.names, workdir)

        for name, source in retrieved.items():
            root = canonical(load(source))
            staged = workdir / f"{name}.staged.xml"
            write(root, staged)

            org_counts = org_grant_counts(args.org, name)
            complete = report_counts(name, org_counts, file_grant_counts(root))
            problems = check_file(staged, package_dirs)
            errors = [p for p in problems if p.level == "error"]
            for problem in problems:
                print(problem)

            if not complete or errors:
                print(f"\n  REFUSED to place {name}: it did not verify clean.\n")
                exit_code = 1
                continue

            destination = target_dir / f"{name}.permissionset-meta.xml"
            shutil.copyfile(staged, destination)
            print(f"\n  placed {destination.relative_to(REPO_ROOT)}")
            print(
                "  reminder: re-add any known retrieve blind spot by hand "
                f"({', '.join(RETRIEVE_BLIND_SPOTS)}) if the org has it.\n"
            )

    return exit_code


def write_receipt(name: str, org: str, clean: bool, accepted: int = 0) -> None:
    """Record that a preflight ran, so the deploy guard hook can see it.

    The hook at .claude/hooks/guard-permission-set-deploy.js blocks a deploy
    whose permission set has no fresh clean receipt. Writing this is what lets a
    checked deploy through. A stale receipt does not count: the org drifts, so a
    preflight from hours ago proves nothing about now.
    """
    receipt_dir = REPO_ROOT / ".claude" / ".permset-preflight"
    try:
        receipt_dir.mkdir(parents=True, exist_ok=True)
        (receipt_dir / f"{name}.json").write_text(
            json.dumps(
                {
                    "permissionSet": name,
                    "org": org,
                    "checkedAt": datetime.now(timezone.utc).isoformat(),
                    "clean": clean,
                    "acceptedLosses": accepted,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
    except OSError as exc:
        # Never fail a read-only check because a receipt could not be written.
        print(f"  note: could not write the preflight receipt ({exc}).")


def cmd_preflight(args) -> int:
    path = Path(args.file)
    name = args.name or path.name.split(".")[0]

    if not org_is_sandbox(args.org) and not args.allow_non_sandbox:
        sys.exit(
            f"{args.org} is not confirmed to be a sandbox. This project never deploys to "
            "production; the owner runs those deploys. Stopping."
        )

    local = grant_map(load(path))
    with tempfile.TemporaryDirectory(prefix="permsets-preflight-") as tmp:
        workdir = Path(tmp)
        retrieved = fetch_to_temp(args.org, [name], workdir)
        target = grant_map(load(retrieved[name]))

    removed = sorted(key for key in target if key not in local)
    changed = sorted(
        key for key in target if key in local and target[key] != local[key]
    )
    added = sorted(key for key in local if key not in target)

    print(f"\nDeploying {path.name} to {args.org} would:")
    print(f"  add     {len(added):>5} grant blocks")
    print(f"  change  {len(changed):>5} grant blocks")
    print(f"  REMOVE  {len(removed):>5} grant blocks")

    weakened = []
    for element, key in changed:
        before, after = target[(element, key)], local[(element, key)]
        lost = [f for f, v in before.items() if v == "true" and after.get(f) != "true"]
        if lost:
            weakened.append((element, key, lost))

    if removed:
        print("\n  These grants exist in the org and are NOT in your file. A deploy")
        print("  DELETES them, because a permission set deploy replaces the whole")
        print("  component:")
        for element, key in removed:
            print(f"    - {element}: {key}")

    if weakened:
        print("\n  These grants stay but lose something:")
        for element, key, lost in weakened:
            print(f"    ~ {element}: {key}  turns off {', '.join(lost)}")

    if not removed and not weakened:
        write_receipt(name, args.org, clean=True)
        print("\n  Nothing would be lost. Safe to deploy.\n")
        return 0

    if args.accept_removals:
        write_receipt(name, args.org, clean=True, accepted=len(removed) + len(weakened))
        print("\n  Removals accepted on the command line. Proceed.\n")
        return 0

    write_receipt(name, args.org, clean=False)
    print(
        "\n  BLOCKED. Nothing has been deployed. If every loss above is intended, "
        "re-run with --accept-removals. If not, fix the file first.\n"
    )
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)

    def add_package_dirs(p):
        p.add_argument(
            "--package-dir",
            action="append",
            help="package directory to read field definitions from (repeatable). Default: every packageDirectories entry in sfdx-project.json.",
        )

    p_check = sub.add_parser("check", help="lint local permission set files")
    p_check.add_argument("files", nargs="+")
    add_package_dirs(p_check)
    p_check.set_defaults(func=cmd_check)

    p_tidy = sub.add_parser("tidy", help="rewrite files in canonical order")
    p_tidy.add_argument("files", nargs="+")
    p_tidy.add_argument(
        "--strip-empty",
        action="store_true",
        help="drop field permission blocks that grant nothing",
    )
    p_tidy.set_defaults(func=cmd_tidy)

    p_verify = sub.add_parser("verify", help="compare a local file against the org")
    p_verify.add_argument("file")
    p_verify.add_argument("--org", required=True)
    p_verify.add_argument("--name", help="permission set API name, if not the file name")
    p_verify.add_argument(
        "--skip-user-permissions",
        action="store_true",
        help="skip the system permission comparison, which needs a describe call",
    )
    p_verify.set_defaults(func=cmd_verify)

    p_fetch = sub.add_parser("fetch", help="retrieve, verify, tidy, and place permission sets")
    p_fetch.add_argument("names", nargs="+")
    p_fetch.add_argument("--org", required=True)
    p_fetch.add_argument("--output-dir", help="default: the permissionsets folder of the default package directory")
    add_package_dirs(p_fetch)
    p_fetch.set_defaults(func=cmd_fetch)

    p_pre = sub.add_parser("preflight", help="list what a deploy would remove, then block")
    p_pre.add_argument("file")
    p_pre.add_argument("--org", required=True)
    p_pre.add_argument("--name", help="permission set API name, if not the file name")
    p_pre.add_argument(
        "--accept-removals",
        action="store_true",
        help="proceed even though grants would be removed",
    )
    p_pre.add_argument(
        "--allow-non-sandbox",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    p_pre.set_defaults(func=cmd_preflight)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
