"""file_registry.py — record every file in an org's metadata tree, with its type.

WI-007 phase 1. The registry is the floor the whole edge list stands on: the
walk starts from every file that exists on disk, not from a list of folders the
parser happens to know about. A file the parser has no rule for is still
recorded here, so it can be reported rather than silently missed.

Public API:
    build_registry(force_app_root, org) -> Registry
    long_path(path) -> str          # Windows extended-length path, see below
    iter_files(root) -> iterator of (relative posix path, size in bytes)

Windows path length. Python's ordinary file walk silently skips any file whose
absolute path is longer than 260 characters, which in the two orgs this was
built against lost 4 files in one and 11 in the other (long objectTranslations
and staticresources paths). Every path this module hands to the operating system
goes through long_path() first, which adds the extended-length prefix Windows
needs to read them. Without it the counts do not match disk, so this is not a
detail.

Stdlib only. Nothing here opens a network connection or calls the Salesforce
CLI; the registry is a pure function of the files on disk.

Command line:
    python tools/kb/file_registry.py                    every org in the project
    python tools/kb/file_registry.py --org <name> --expect 8997 --verify-git
    python tools/kb/file_registry.py --org <name> --json
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from graph import select_orgs  # noqa: E402

# ---------------------------------------------------------------------------
# Windows long-path support
# ---------------------------------------------------------------------------

_LONG_PREFIX = "\\\\?\\"


def long_path(path) -> str:
    """Return an absolute path the operating system can open at any length.

    On Windows, prefix with the extended-length marker so paths over 260
    characters work. On every other platform, return the absolute path.
    """
    text = os.path.abspath(os.fspath(path))
    if os.name != "nt" or text.startswith(_LONG_PREFIX):
        return text
    if text.startswith("\\\\"):
        return _LONG_PREFIX + "UNC" + text[1:]
    return _LONG_PREFIX + text


# ---------------------------------------------------------------------------
# Type naming tables
# ---------------------------------------------------------------------------

# Metadata suffix -> Salesforce metadata type name. The suffix is the token
# before "-meta.xml" (Priority.field-meta.xml -> "field"), or the plain file
# extension for code files (Foo.cls -> "cls").
#
# This table only supplies a readable NAME. It never decides which types exist:
# that comes from walking the tree. A suffix missing from the table still
# produces a record, with type_source "suffix_derived" so the coverage report
# can flag it.
#
# Ambiguous suffixes are deliberately absent so the directory decides instead:
# "rule" (fieldRestrictionRules), "xml" (emailservices), "config"
# (notificationTypeConfig).
SUFFIX_TYPES = {
    # objects and their subfolders
    "object": "CustomObject",
    "field": "CustomField",
    "recordType": "RecordType",
    "validationRule": "ValidationRule",
    "listView": "ListView",
    "webLink": "WebLink",
    "compactLayout": "CompactLayout",
    "businessProcess": "BusinessProcess",
    "fieldSet": "FieldSet",
    "sharingReason": "SharingReason",
    "index": "Index",
    "indx": "CustomIndex",
    # translations
    "objectTranslation": "CustomObjectTranslation",
    "fieldTranslation": "CustomFieldTranslation",
    "translation": "Translations",
    # automation
    "flow": "Flow",
    "flowDefinition": "FlowDefinition",
    "processflowmigration": "ProcessFlowMigration",
    "workflow": "Workflow",
    "assignmentRules": "AssignmentRules",
    "autoResponseRules": "AutoResponseRules",
    "escalationRules": "EscalationRules",
    "duplicateRule": "DuplicateRule",
    "matchingRule": "MatchingRule",
    "approvalProcess": "ApprovalProcess",
    # code
    "cls": "ApexClass",
    "trigger": "ApexTrigger",
    "page": "ApexPage",
    "component": "ApexComponent",
    # interface
    "layout": "Layout",
    "flexipage": "FlexiPage",
    "quickAction": "QuickAction",
    "app": "CustomApplication",
    "tab": "CustomTab",
    "pathAssistant": "PathAssistant",
    "homePageLayout": "HomePageLayout",
    "homePageComponent": "HomePageComponent",
    "brandingSet": "BrandingSet",
    "lightningExperienceTheme": "LightningExperienceTheme",
    "appMenu": "AppMenu",
    "prompt": "Prompt",
    "audience": "Audience",
    "letter": "Letterhead",
    "animationRule": "AnimationRule",
    "managedContentType": "ManagedContentType",
    "recommendationStrategy": "RecommendationStrategy",
    # analytics
    "report": "Report",
    "reportFolder": "ReportFolder",
    "reportType": "ReportType",
    "dashboard": "Dashboard",
    "dashboardFolder": "DashboardFolder",
    # security and access
    "permissionset": "PermissionSet",
    "permissionsetgroup": "PermissionSetGroup",
    "profile": "Profile",
    "profilePasswordPolicy": "ProfilePasswordPolicy",
    "profileSessionSetting": "ProfileSessionSetting",
    "sharingRules": "SharingRules",
    "role": "Role",
    "group": "Group",
    "queue": "Queue",
    "delegateGroup": "DelegateGroup",
    "customPermission": "CustomPermission",
    "useraccesspolicy": "UserAccessPolicy",
    "samlssoconfig": "SamlSsoConfig",
    "authprovider": "AuthProvider",
    "transactionSecurityPolicy": "TransactionSecurityPolicy",
    "blacklistedConsumer": "BlacklistedConsumer",
    "connectedApp": "ConnectedApp",
    "ecaPlcy": "ExtlClntAppPolicy",
    "ecaOauthPlcy": "ExtlClntAppOauthPolicy",
    "crt": "Certificate",
    # integration
    "remoteSite": "RemoteSiteSetting",
    "namedCredential": "NamedCredential",
    "externalCredential": "ExternalCredential",
    "externalServiceRegistration": "ExternalServiceRegistration",
    "dataSource": "ExternalDataSource",
    "corsWhitelistOrigin": "CorsWhitelistOrigin",
    "cspTrustedSite": "CspTrustedSite",
    "iframeWhiteListUrlsSettings": "IframeWhiteListUrlsSettings",
    "iframeWhiteListUrlSettings": "IframeWhiteListUrlsSettings",
    "platformEventChannelMember": "PlatformEventChannelMember",
    "installedPackage": "InstalledPackage",
    # data and values
    "md": "CustomMetadata",
    "labels": "CustomLabels",
    "globalValueSet": "GlobalValueSet",
    "standardValueSet": "StandardValueSet",
    "settings": "Settings",
    "LeadConvertSetting": "LeadConvertSettings",
    "topicsForObjects": "TopicsForObjects",
    "campaignInfluenceModel": "CampaignInfluenceModel",
    "forecastingType": "ForecastingType",
    "cleanDataService": "CleanDataService",
    "actionableListDefinition": "ActionableListDefinition",
    "applicationSubtypeDefinition": "ApplicationSubtypeDefinition",
    "businessProcessTypeDefinition": "BusinessProcessTypeDefinition",
    "explainabilityActionDefinition": "ExplainabilityActionDefinition",
    "explainabilityActionVersion": "ExplainabilityActionVersion",
    # service
    "entitlementProcess": "EntitlementProcess",
    "milestoneType": "MilestoneType",
    "serviceChannel": "ServiceChannel",
    "servicePresenceStatus": "ServicePresenceStatus",
    "presenceUserConfig": "PresenceUserConfig",
    "queueRoutingConfig": "QueueRoutingConfig",
    "omniSupervisorConfig": "OmniSupervisorConfig",
    "recordActionDeployment": "RecordActionDeployment",
    "deployment": "RecordActionDeployment",
    "notifications": "ApexEmailNotifications",
    "site": "CustomSite",
    "community": "Community",
    "network": "Network",
}

# Directory -> type, used when the file suffix does not name the type on its
# own. The directory is the folder directly under main/default.
DIRECTORY_TYPES = {
    "emailservices": "EmailServicesFunction",
    "fieldRestrictionRules": "FieldRestrictionRule",
    "notificationTypeConfig": "NotificationTypeConfig",
    "certs": "Certificate",
    "customindex": "CustomIndex",
    "apexEmailNotifications": "ApexEmailNotifications",
    "settings": "Settings",
    "labels": "CustomLabels",
    "LeadConvertSettings": "LeadConvertSettings",
}

# Directories whose files belong to one bundle component named by the first
# folder (or file stem) inside them.
BUNDLE_TYPES = {
    "lwc": "LightningComponentBundle",
    "aura": "AuraDefinitionBundle",
    "staticresources": "StaticResource",
    "experiences": "ExperienceBundle",
    "documents": "Document",
    "email": "EmailTemplate",
    "contentassets": "ContentAsset",
    "waveTemplates": "WaveTemplateBundle",
    "siteDotComSites": "SiteDotCom",
}

# Directories whose files are grouped under a folder component (folder/name).
FOLDERED_DIRS = {"reports", "dashboards", "documents", "email"}

# Files that are not Salesforce metadata at all.
NON_METADATA_NAMES = {
    ".gitkeep": "repository placeholder file, not metadata",
    ".DS_Store": "macOS folder cache file, not metadata",
    "jsconfig.json": "editor configuration for the lwc folder, not metadata",
    ".eslintrc.json": "editor configuration, not metadata",
    ".forceignore": "Salesforce CLI configuration, not metadata",
}

# Whole directories under main/default that are not metadata.
NON_METADATA_DIRS = {
    "graphify-out": (
        "output of the graphify tool left inside the metadata tree; "
        "a build artifact, not metadata"
    ),
}


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------

@dataclass
class FileRecord:
    """One file on disk, with everything the later phases need to route it."""

    org: str
    rel_path: str            # posix, relative to force-app/<org>/main/default
    repo_path: str           # posix, relative to the repository root
    size_bytes: int
    directory: str           # folder under main/default, "" for a root file
    metadata_type: str       # Salesforce metadata type this file belongs to
    type_source: str         # how the type was decided (see below)
    role: str                # primary | sidecar | bundle_member | non_metadata
    component_name: str      # the component this file belongs to
    parent_name: str         # containing object, bundle, or folder
    note: str = ""           # why it is not metadata, or why the type is a guess

    def as_dict(self) -> dict:
        out = {
            "org": self.org,
            "rel_path": self.rel_path,
            "repo_path": self.repo_path,
            "size_bytes": self.size_bytes,
            "directory": self.directory,
            "metadata_type": self.metadata_type,
            "type_source": self.type_source,
            "role": self.role,
            "component_name": self.component_name,
            "parent_name": self.parent_name,
        }
        if self.note:
            out["note"] = self.note
        return out


# type_source values:
#   suffix_table      the file suffix is a known Salesforce metadata suffix
#   directory_table   the suffix did not name a type; the folder did
#   bundle            the file is part of a bundle folder (lwc, aura, resource)
#   suffix_derived    unknown suffix; the type name was built from the suffix
#   directory_derived unknown suffix and folder; the name came from the folder
#   non_metadata      not Salesforce metadata


@dataclass
class Registry:
    """Every file under one org's metadata tree."""

    org: str
    root: str                       # repo-relative posix path that was walked
    files: list = field(default_factory=list)
    errors: list = field(default_factory=list)

    def count(self) -> int:
        return len(self.files)

    def by_type(self) -> dict:
        counts: dict = {}
        for rec in self.files:
            counts[rec.metadata_type] = counts.get(rec.metadata_type, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))

    def by_directory(self) -> dict:
        counts: dict = {}
        for rec in self.files:
            counts[rec.directory] = counts.get(rec.directory, 0) + 1
        return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))

    def by_type_source(self) -> dict:
        counts: dict = {}
        for rec in self.files:
            counts[rec.type_source] = counts.get(rec.type_source, 0) + 1
        return dict(sorted(counts.items()))

    def rel_paths(self) -> set:
        return {rec.rel_path for rec in self.files}

    def as_dict(self) -> dict:
        return {
            "schema_version": "1.0",
            "org": self.org,
            "generated_from": self.root,
            "file_count": self.count(),
            "counts_by_type": self.by_type(),
            "counts_by_directory": self.by_directory(),
            "counts_by_type_source": self.by_type_source(),
            "errors": list(self.errors),
            "files": [rec.as_dict() for rec in self.files],
        }


# ---------------------------------------------------------------------------
# The walk
# ---------------------------------------------------------------------------

def iter_files(root, errors=None):
    """Yield (relative posix path, size in bytes) for every file under root.

    Sorted, so two runs produce the same order. Directory read errors are
    appended to `errors` rather than raised, so one unreadable folder cannot
    stop the walk.
    """
    long_root = long_path(root)
    collected = [] if errors is None else errors

    def on_error(exc):
        collected.append(f"directory read error: {exc}")

    for dirpath, dirnames, filenames in os.walk(long_root, onerror=on_error):
        dirnames.sort()
        filenames.sort()
        for name in filenames:
            full = os.path.join(dirpath, name)
            rel = full[len(long_root):].lstrip("\\/").replace("\\", "/")
            try:
                size = os.path.getsize(full)
            except OSError as exc:
                collected.append(f"size read error: {rel}: {exc}")
                size = -1
            yield rel, size


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def _suffix_token(name: str) -> str:
    """The metadata suffix of a file name, or "" when it has none.

    Priority.field-meta.xml -> "field"       (XML metadata file)
    Foo.cls                 -> "cls"         (code file)
    collectors_cmp          -> ""            (no extension at all)
    """
    if name.endswith("-meta.xml"):
        base = name[: -len("-meta.xml")]
        return base.rsplit(".", 1)[-1] if "." in base else ""
    if "." in name:
        return name.rsplit(".", 1)[-1]
    return ""


def _strip_suffix(name: str) -> str:
    """The component name a file name carries, with its metadata suffix removed."""
    if name.endswith("-meta.xml"):
        base = name[: -len("-meta.xml")]
        return base.rsplit(".", 1)[0] if "." in base else base
    if "." in name:
        return name.rsplit(".", 1)[0]
    return name


def _derived_type_name(token: str) -> str:
    """Build a readable type name from an unknown suffix token."""
    if not token:
        return "Unknown"
    return token[0].upper() + token[1:]


def classify(rel_path: str, dir_set: set, file_set: set) -> dict:
    """Decide the metadata type, role, and owning component for one file.

    `dir_set` and `file_set` hold every directory and file path in the tree,
    relative to the walk root. They are what makes the sidecar test exact: a
    file ending in -meta.xml is a sidecar only when the thing it describes
    (Foo.cls, or the folder Foo/) is really there.
    """
    parts = rel_path.split("/")
    name = parts[-1]
    top = parts[0] if len(parts) > 1 else ""

    # 1. Files that are not metadata.
    if name in NON_METADATA_NAMES:
        return {
            "metadata_type": "NotMetadata",
            "type_source": "non_metadata",
            "role": "non_metadata",
            "component_name": "",
            "parent_name": "",
            "note": NON_METADATA_NAMES[name],
        }
    if top in NON_METADATA_DIRS:
        return {
            "metadata_type": "NotMetadata",
            "type_source": "non_metadata",
            "role": "non_metadata",
            "component_name": "",
            "parent_name": "",
            "note": NON_METADATA_DIRS[top],
        }

    token = _suffix_token(name)

    # Is this file the sidecar of another file or folder? Strip -meta.xml and
    # look for what is left.
    role = "primary"
    if name.endswith("-meta.xml"):
        described = rel_path[: -len("-meta.xml")]
        described_stem = described.rsplit(".", 1)[0] if "." in described.rsplit("/", 1)[-1] else described
        if described in file_set or described in dir_set or described_stem in dir_set:
            role = "sidecar"

    # 2. Bundle folders: lwc, aura, staticresources and friends. Every file
    #    inside one belongs to a single component named by the folder.
    if top in BUNDLE_TYPES:
        mtype = BUNDLE_TYPES[top]
        if len(parts) > 2:
            component = parts[1]
            if role != "sidecar":
                role = "bundle_member"
        else:
            component = _strip_suffix(name)
        return {
            "metadata_type": mtype,
            "type_source": "bundle",
            "role": role,
            "component_name": component,
            "parent_name": parts[1] if len(parts) > 2 else "",
            "note": "",
        }

    # 3. Name the type: file suffix first, then the folder.
    note = ""
    if token in SUFFIX_TYPES:
        mtype = SUFFIX_TYPES[token]
        type_source = "suffix_table"
    elif top in DIRECTORY_TYPES:
        mtype = DIRECTORY_TYPES[top]
        type_source = "directory_table"
    elif token:
        mtype = _derived_type_name(token)
        type_source = "suffix_derived"
        note = (
            f"metadata suffix '{token}' is not in the known-suffix table; "
            "the type name was built from the suffix"
        )
    elif top:
        mtype = _derived_type_name(top)
        type_source = "directory_derived"
        note = (
            f"file has no metadata suffix; the type name was built from the "
            f"folder '{top}'"
        )
    else:
        mtype = "Unknown"
        type_source = "directory_derived"
        note = "file has no metadata suffix and sits at the root of the tree"

    # 4. Which component does it belong to, and what contains it?
    local = _strip_suffix(name)
    parent = ""
    component = local
    if top == "objects" and len(parts) >= 3:
        parent = parts[1]
        component = local if local == parent else f"{parent}.{local}"
    elif top == "objectTranslations" and len(parts) >= 3:
        parent = parts[1]
        component = local if local == parent else f"{parent}.{local}"
    elif top in FOLDERED_DIRS and len(parts) >= 3:
        parent = parts[1]
        component = f"{parent}.{local}"

    return {
        "metadata_type": mtype,
        "type_source": type_source,
        "role": role,
        "component_name": component,
        "parent_name": parent,
        "note": note,
    }


# ---------------------------------------------------------------------------
# Building the registry
# ---------------------------------------------------------------------------

def _repo_relative(root: Path) -> str:
    """Best-effort repo-relative posix path of the walked root."""
    parts = root.resolve().parts
    if "force-app" in parts:
        idx = len(parts) - 1 - parts[::-1].index("force-app")
        return "/".join(parts[idx:])
    return root.as_posix()


def build_registry(force_app_root, org: str) -> Registry:
    """Walk one org's metadata tree and record every file in it."""
    root = Path(force_app_root)
    registry = Registry(org=org, root=_repo_relative(root))
    if not root.exists():
        registry.errors.append(f"metadata root not found: {root}")
        return registry

    walked = list(iter_files(root, registry.errors))
    file_set = {rel for rel, _size in walked}
    dir_set = set()
    for rel in file_set:
        parts = rel.split("/")
        for i in range(1, len(parts)):
            dir_set.add("/".join(parts[:i]))

    repo_prefix = registry.root
    for rel, size in walked:
        info = classify(rel, dir_set, file_set)
        parts = rel.split("/")
        registry.files.append(FileRecord(
            org=org,
            rel_path=rel,
            repo_path=f"{repo_prefix}/{rel}",
            size_bytes=size,
            directory=parts[0] if len(parts) > 1 else "",
            metadata_type=info["metadata_type"],
            type_source=info["type_source"],
            role=info["role"],
            component_name=info["component_name"],
            parent_name=info["parent_name"],
            note=info["note"],
        ))
    return registry


# ---------------------------------------------------------------------------
# Command line
# ---------------------------------------------------------------------------

def _git_tracked(repo_root: Path, rel_root: str) -> set:
    """Every file git has under rel_root, as paths relative to rel_root.

    Git's index is an independent count of the same tree, so comparing the
    registry against it proves the walk missed nothing. Local git only; this
    never contacts an org.
    """
    proc = subprocess.run(
        ["git", "ls-files", "--", rel_root],
        cwd=str(repo_root), capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"git ls-files failed: {proc.stderr.strip()}")
    prefix = rel_root.rstrip("/") + "/"
    out = set()
    for line in proc.stdout.splitlines():
        line = line.strip()
        if line.startswith(prefix):
            out.add(line[len(prefix):])
    return out


def _find_repo_root(start: Path) -> Path:
    cur = start.resolve()
    for candidate in [cur] + list(cur.parents):
        if (candidate / ".git").exists():
            return candidate
    return cur


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Record every file in an org's metadata tree, with its type.",
    )
    parser.add_argument("--org", action="append", default=None,
                        help="org folder under force-app (repeatable)")
    parser.add_argument("--force-app", default=None,
                        help="path to the force-app folder (default: repo force-app)")
    parser.add_argument("--repo-root", default=None,
                        help="repository root (default: found from this file)")
    parser.add_argument("--expect", action="append", default=None,
                        help="expected file count for the matching --org, in order")
    parser.add_argument("--verify-git", action="store_true",
                        help="compare the walk against git's own file list")
    parser.add_argument("--json", action="store_true",
                        help="write tools/kb/out/registry-<org>.json")
    parser.add_argument("--out-dir", default=None,
                        help="where --json writes (default: tools/kb/out)")
    parser.add_argument("--limit-unknown", type=int, default=20,
                        help="how many unknown-type files to list (default 20)")
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root) if args.repo_root else _find_repo_root(Path(__file__).parent)
    roots, problem = select_orgs(args.org, force_app=args.force_app,
                                 repo_root=repo_root)
    if problem:
        print(problem)
        return 1
    orgs = list(roots)
    expects = args.expect or []
    out_dir = Path(args.out_dir) if args.out_dir else Path(__file__).resolve().parent / "out"

    failures = []
    for i, org in enumerate(orgs):
        root = roots[org]
        registry = build_registry(root, org)
        print(f"=== {org}: {registry.count()} files under {registry.root} ===")

        if registry.errors:
            print(f"  errors: {len(registry.errors)}")
            for err in registry.errors[:10]:
                print(f"    {err}")
            failures.append(f"{org}: {len(registry.errors)} walk errors")

        print("  by metadata type:")
        for mtype, count in registry.by_type().items():
            print(f"    {count:6d}  {mtype}")

        print("  by how the type was decided:")
        for source, count in registry.by_type_source().items():
            print(f"    {count:6d}  {source}")

        unknown = [r for r in registry.files
                   if r.type_source in ("suffix_derived", "directory_derived")]
        if unknown:
            print(f"  files whose type was guessed, not looked up: {len(unknown)}")
            for rec in unknown[:args.limit_unknown]:
                print(f"    {rec.rel_path}  -> {rec.metadata_type}")
            if len(unknown) > args.limit_unknown:
                print(f"    ... {len(unknown) - args.limit_unknown} more")

        non_meta = [r for r in registry.files if r.role == "non_metadata"]
        if non_meta:
            print(f"  files recorded as not metadata: {len(non_meta)}")
            for rec in non_meta[:args.limit_unknown]:
                print(f"    {rec.rel_path}  ({rec.note})")

        if i < len(expects):
            want = int(expects[i])
            if registry.count() == want:
                print(f"  count check: {registry.count()} == {want} expected  PASS")
            else:
                print(f"  count check: {registry.count()} != {want} expected  FAIL")
                failures.append(f"{org}: walked {registry.count()}, expected {want}")

        if args.verify_git:
            try:
                tracked = _git_tracked(repo_root, registry.root)
            except RuntimeError as exc:
                print(f"  git check: could not run ({exc})")
                failures.append(f"{org}: git check failed")
            else:
                walked = registry.rel_paths()
                missing = sorted(tracked - walked)
                extra = sorted(walked - tracked)
                if not missing and not extra:
                    print(f"  git check: {len(tracked)} files in git, all {len(walked)} match  PASS")
                else:
                    print(f"  git check: {len(missing)} in git but not walked, "
                          f"{len(extra)} walked but not in git  FAIL")
                    for path in missing[:10]:
                        print(f"    missing: {path}")
                    for path in extra[:10]:
                        print(f"    extra:   {path}")
                    failures.append(f"{org}: git comparison found differences")

        if args.json:
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"registry-{org}.json"
            out_path.write_text(
                json.dumps(registry.as_dict(), indent=2) + "\n", encoding="utf-8",
            )
            print(f"  wrote {out_path}")
        print()

    if failures:
        print("FAILED:")
        for line in failures:
            print(f"  {line}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
