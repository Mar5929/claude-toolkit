"""Exercise actual final replies through native hooks, ElevenLabs, and Windows audio."""
import json
import os
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import tempfile
import threading
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "runtime"))
from voice import Voice, chat_key


def wait_for_audio(host, session):
    voice = Voice()
    deadline = time.monotonic() + 50
    while time.monotonic() < deadline:
        state = voice.state(chat_key(host, session))
        if state["status"] == "finished":
            assert "Automatic voice verification" in state["previous"]
            return
        if state["status"] in ("audio-failed", "cancelled"):
            raise RuntimeError(host + " audio did not complete: " + state["status"])
        time.sleep(.1)
    raise TimeoutError(host + " audio completion")


def main():
    with tempfile.TemporaryDirectory(prefix="toolkit-voice-completion-") as directory:
        codex = shutil.which("codex.cmd") or shutil.which("codex")
        def codex_turn(prompt, session=None):
            args = [codex, "exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check"]
            if session:
                args += ["resume", "--json", "--skip-git-repo-check", session]
            result = subprocess.run(args + [prompt], cwd=directory, stdin=subprocess.DEVNULL,
                                    capture_output=True, timeout=180)
            events = [json.loads(line) for line in result.stdout.decode("utf-8").splitlines() if line.startswith("{")]
            assert result.returncode == 0
            return next(e["thread_id"] for e in events if e.get("type") == "thread.started")
        session = codex_turn("voice on")
        codex_turn("Reply exactly: Automatic voice verification.", session)
        wait_for_audio("codex", session)
        codex_turn("voice off", session)
        print(json.dumps(dict(host="codex", native_final_reply_audio="finished")), flush=True)

        claude = shutil.which("claude.cmd") or shutil.which("claude")
        home = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude"))
        settings = json.loads((home / "settings.json").read_text(encoding="utf-8-sig"))
        hooks = {event: [group for group in groups if any("voice.py" in str(h) for h in group.get("hooks", []))]
                 for event, groups in settings["hooks"].items()}
        config = Path(directory) / "hooks-settings.json"
        config.write_text(json.dumps(dict(hooks=hooks)))
        args = [claude, "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
                "--tools", "", "--setting-sources", "", "--settings", str(config), "--disable-slash-commands",
                "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}']
        process = subprocess.Popen(args, cwd=directory, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
        results = queue.Queue()
        def read_results():
            for line in process.stdout:
                try:
                    event = json.loads(line)
                    if event.get("type") == "result":
                        results.put(event)
                except ValueError:
                    pass
        reader = threading.Thread(target=read_results, daemon=True)
        reader.start()
        def claude_turn(prompt):
            process.stdin.write((json.dumps(dict(type="user", message=dict(role="user", content=prompt))) + "\n").encode())
            process.stdin.flush()
            result = results.get(timeout=90)
            assert not result.get("is_error")
            return result["session_id"]
        try:
            session = claude_turn("voice on")
            assert claude_turn("Reply exactly: Automatic voice verification.") == session
            wait_for_audio("claude", session)
            claude_turn("voice off")
            print(json.dumps(dict(host="claude", native_final_reply_audio="finished")), flush=True)
        finally:
            process.stdin.close()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.terminate()
                process.wait(timeout=5)
            reader.join(timeout=2)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
