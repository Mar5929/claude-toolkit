"""Real Codex hook verification. Requires the user's existing hook trust."""
import concurrent.futures
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "runtime"))
from voice import Voice, chat_key


def main():
    cli = shutil.which("codex.cmd") or shutil.which("codex")
    voice = Voice()
    with tempfile.TemporaryDirectory(prefix="toolkit-voice-codex-") as folder:
        def run(prompt, resume=None, fork=False):
            args = [cli, "exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check"]
            if resume:
                args += ["fork" if fork else "resume", "--json", "--skip-git-repo-check", resume]
            args.append(prompt)
            result = subprocess.run(args, cwd=folder, stdin=subprocess.DEVNULL, capture_output=True, timeout=180)
            events = [json.loads(line) for line in result.stdout.decode("utf-8").splitlines() if line.startswith("{")]
            if result.returncode or not any(e.get("type") == "turn.completed" for e in events):
                raise RuntimeError("Codex verification failed")
            return next(e["thread_id"] for e in events if e.get("type") == "thread.started")
        with concurrent.futures.ThreadPoolExecutor(2) as executor:
            a = executor.submit(run, "voice on")
            b = executor.submit(run, "Reply exactly: Voice verification.")
            a, b = a.result(), b.result()
        assert voice.state(chat_key("codex", a))["enabled"] is True
        assert voice.state(chat_key("codex", b))["enabled"] is False
        assert voice.state(chat_key("codex", b))["previous"]
        assert run("voice status", a) == a
        assert voice.state(chat_key("codex", a))["enabled"] is True
        assert run("voice read", b) == b
        assert voice.state(chat_key("codex", b))["enabled"] is False
        fresh = run("voice status")
        assert voice.state(chat_key("codex", fresh))["enabled"] is False
        fork = run("voice status", a, True)
        assert fork != a
        assert voice.state(chat_key("codex", fork))["enabled"] is False
        assert run("voice off", a) == a
        assert voice.state(chat_key("codex", a))["enabled"] is False
        print(json.dumps(dict(host="codex", concurrent=True, resumed=True, fresh_off=True,
                              fork_off=True, one_shot_stays_off=True, off=True)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
