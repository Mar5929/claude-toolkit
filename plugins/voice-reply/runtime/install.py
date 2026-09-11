"""Repeatable user installation; owns no project files or credentials."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import sys
import time

from voice import VERSION, Voice, locked, read_json, root_path, write_json

# SessionEnd remains in the ownership merge to remove the early preview handler.
EVENTS = ("SessionStart", "UserPromptSubmit", "Stop", "SessionEnd")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def registrations(host, runtime, python):
    args = [str(runtime / "voice.py"), "hook", host, "--root", str(runtime.parent)]
    if host == "claude":
        handler = dict(type="command", command=str(python), args=args, timeout=5)
    else:
        # Codex executes the Windows override through PowerShell. Quote as literals.
        literal = lambda s: "'" + str(s).replace("'", "''") + "'"
        command = "& " + " ".join(literal(p) for p in [python] + args)
        handler = dict(type="command", command=command, commandWindows=command, timeout=5)
    result = {}
    for event in EVENTS:
        if event == "SessionEnd":
            continue
        item = copy.deepcopy(handler)
        result[event] = dict(hooks=[item])
    return result


def merge_hooks(document, old, new):
    result = copy.deepcopy(document)
    if not isinstance(result, dict) or not isinstance(result.get("hooks", {}), dict):
        raise ValueError("Invalid host hook configuration")
    hooks = result.setdefault("hooks", {})
    for event in EVENTS:
        entries = hooks.get(event, [])
        if not isinstance(entries, list):
            raise ValueError("Invalid host hook event")
        # Exact ownership only. A changed old handler is a conflict, not permission to delete it.
        if event in old and old[event] not in entries:
            raise ValueError("Owned hook changed or missing; repair it before updating")
        entries = [entry for entry in entries if entry != old.get(event)]
        if event in new:
            if new[event] in entries and event not in old:
                raise ValueError("Unowned matching hook; inspect before adoption")
            entries.append(new[event])
        if entries:
            hooks[event] = entries
        else:
            hooks.pop(event, None)
    if not hooks:
        result.pop("hooks", None)
    return result


def install(action, source, root, codex, claude, python, apply=False):
    source, root, codex, claude = map(lambda p: Path(p).resolve(), (source, root, codex, claude))
    manifest_path = root / "installation.json"
    manifest_bytes = manifest_path.read_bytes() if manifest_path.exists() else None
    manifest = json.loads(manifest_bytes.decode("utf-8-sig")) if manifest_bytes else {}
    removing = action == "uninstall"
    if removing and not manifest:
        return {"status": "not installed"}
    targets = {"codex": codex / "hooks.json", "claude": claude / "settings.json"}
    if manifest and manifest.get("targets") != {h: str(p) for h, p in targets.items()}:
        raise ValueError("Host folders differ from existing installation")
    changes, hooks, before = {}, {}, {}
    for host, target in targets.items():
        original = target.read_bytes() if target.exists() else None
        current = json.loads(original.decode("utf-8-sig")) if original else {}
        hooks[host] = {} if removing else registrations(host, root / "runtime", python)
        updated = merge_hooks(current, manifest.get("hooks", {}).get(host, {}), hooks[host])
        if updated != current:
            before[target] = original
            changes[target] = (json.dumps(updated, indent=2) + "\n").encode()
    files = {}
    for filename in ("voice.py", "install.py"):
        files[root / "runtime" / filename] = b"" if removing else (source / "runtime" / filename).read_bytes()
    skill = b"" if removing else (source / "templates" / "toolkit-voice" / "SKILL.md").read_bytes()
    files[codex / "skills" / "toolkit-voice" / "SKILL.md"] = skill
    files[claude / "skills" / "toolkit-voice" / "SKILL.md"] = skill
    for target, content in files.items():
        original = target.read_bytes() if target.exists() else None
        if original is not None:
            expected = manifest.get("files", {}).get(str(target))
            if not expected or digest(original) != expected:
                raise ValueError("Owned destination has local changes or is unowned")
        elif str(target) in manifest.get("files", {}):
            raise ValueError("Owned file missing; repair installation before update")
        before[target] = original
        changes[target] = None if removing else content
    report = {"action": action, "version": VERSION, "root": str(root),
              "paths": [str(p) for p in changes], "applied": False,
              "next": "Review Codex user hooks in /hooks; restart both hosts. Trust is never edited by this installer."}
    if not apply:
        return report
    if os.name != "nt":
        raise ValueError("Live installation requires Windows")
    # Preflight all destinations before writing. Roll back content on any write failure.
    before[manifest_path] = manifest_bytes
    with locked(root / "installation.lock"):
        for p, original in before.items():
            if (p.read_bytes() if p.exists() else None) != original:
                raise ValueError("Installation changed during preflight; retry")
        Voice(root).cancel_all()
        time.sleep(.15)
        try:
            # Install runtime before registrations; remove registrations before runtime.
            ordered = list(changes) if removing else sorted(changes, key=lambda p: p in targets.values())
            for p in ordered:
                content = changes[p]
                if content is None:
                    p.unlink(missing_ok=True)
                elif not p.exists() or p.read_bytes() != content:
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_bytes(content)
            if removing:
                manifest_path.unlink(missing_ok=True)
            else:
                Voice(root).settings({})
                write_json(manifest_path, dict(version=VERSION, targets={h: str(p) for h, p in targets.items()},
                                               hooks=hooks, files={str(p): digest(b) for p, b in files.items()}))
        except Exception:
            for p, content in before.items():
                if content is None:
                    p.unlink(missing_ok=True)
                else:
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_bytes(content)
            raise
    report["applied"] = True
    if removing:
        report["next"] = "Hooks and runtime removed. Preferences and chat choices retained. Restart both hosts."
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["install", "update", "uninstall"])
    parser.add_argument("--apply", action="store_true", help="Default is a read-only preview")
    parser.add_argument("--root", type=Path, default=root_path())
    parser.add_argument("--codex-home", type=Path, default=Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")))
    parser.add_argument("--claude-home", type=Path, default=Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude")))
    opts = parser.parse_args()
    try:
        print(json.dumps(install(opts.action, Path(__file__).resolve().parent.parent, opts.root,
                                 opts.codex_home, opts.claude_home, Path(sys.executable), opts.apply), indent=2))
    except Exception as exc:
        # Error messages are fixed installer diagnostics, never host config contents.
        print("Voice installation failed: " + (str(exc) if isinstance(exc, ValueError) else type(exc).__name__), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
