"""Explicit real Claude Code hook smoke test; uses account inference credits."""
import concurrent.futures
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "runtime"))
from voice import Voice, chat_key


def main():
    cli = shutil.which("claude.cmd") or shutil.which("claude")
    voice = Voice()
    home = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude"))
    config = json.loads((home / "settings.json").read_text(encoding="utf-8-sig"))
    # Keep the installed voice handlers, without unrelated plugin prompt overhead.
    hooks = {event: [group for group in groups if any("voice.py" in str(h) for h in group.get("hooks", []))]
             for event, groups in config["hooks"].items()}
    with tempfile.TemporaryDirectory(prefix="toolkit-voice-host-") as folder:
        settings = Path(folder) / "settings.json"
        settings.write_text(json.dumps(dict(hooks=hooks)))
        def run(prompt, resume=None, fork=False):
            args = [cli, "-p", prompt, "--output-format", "json", "--tools", "", "--max-turns", "1",
                    "--setting-sources", "", "--settings", str(settings), "--disable-slash-commands",
                    "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}']
            if resume:
                args += ["--resume", resume]
            if fork:
                args += ["--fork-session"]
            result = subprocess.run(args, cwd=folder, capture_output=True, timeout=90)
            data = json.loads(result.stdout.decode("utf-8"))
            if result.returncode or data.get("is_error"):
                raise RuntimeError("Host verification failed")
            return data["session_id"]
        with concurrent.futures.ThreadPoolExecutor(2) as executor:
            a = executor.submit(run, "voice on")
            b = executor.submit(run, "Reply exactly: Voice verification.")
            a, b = a.result(), b.result()
        assert voice.state(chat_key("claude", a))["enabled"] is True
        assert voice.state(chat_key("claude", b))["enabled"] is False
        assert voice.state(chat_key("claude", b))["previous"]
        assert run("voice status", a) == a
        assert voice.state(chat_key("claude", a))["enabled"] is True
        assert run("voice read", b) == b
        assert voice.state(chat_key("claude", b))["enabled"] is False
        fresh = run("voice status")
        assert voice.state(chat_key("claude", fresh))["enabled"] is False
        fork = run("voice status", a, True)
        assert fork != a
        assert voice.state(chat_key("claude", fork))["enabled"] is False
        assert run("voice off", a) == a
        assert voice.state(chat_key("claude", a))["enabled"] is False
        print(json.dumps(dict(host="claude", concurrent=True, resumed=True, fresh_off=True,
                              fork_off=True, one_shot_stays_off=True, off=True)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
