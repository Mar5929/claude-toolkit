"""Verify per-process Windows playback cancellation with two quiet test tones."""
import array
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "runtime"))
from voice import Voice, chat_key


def main():
    if len(sys.argv) > 1:
        root, key, nonce = sys.argv[1:]
        pcm = array.array("h", [int(500 * math.sin(2 * math.pi * 330 * i / 24000)) for i in range(24000 * 4)]).tobytes()
        Voice(Path(root)).worker(key, nonce, synthesize=lambda *args: pcm)
        return 0
    with tempfile.TemporaryDirectory(prefix="toolkit-voice-playback-") as directory:
        jobs = []
        voice = Voice(Path(directory), lambda key, nonce: jobs.append((key, nonce)))
        processes = []
        try:
            for host in ("codex", "claude"):
                for event in [dict(hook_event_name="UserPromptSubmit", prompt="voice on"),
                              dict(hook_event_name="UserPromptSubmit", prompt="Test"),
                              dict(hook_event_name="Stop", last_assistant_message="Test")]:
                    voice.handle(host, dict(session_id="playback", **event))
                processes.append(subprocess.Popen([sys.executable, str(Path(__file__).resolve()), directory, *jobs[-1]],
                                                  creationflags=subprocess.CREATE_NO_WINDOW))
            deadline = time.monotonic() + 10
            while not all(voice.state(key)["status"] == "playing" for key, _ in jobs):
                if time.monotonic() > deadline:
                    raise RuntimeError("Playback failed to start")
                time.sleep(.03)
            start = time.monotonic()
            voice.handle("codex", dict(hook_event_name="UserPromptSubmit", session_id="playback", prompt="voice off"))
            processes[0].wait(timeout=2)
            stopped_in = time.monotonic() - start
            assert processes[1].poll() is None, "Other chat playback stopped"
            processes[1].wait(timeout=7)
            assert voice.state(jobs[1][0])["status"] == "finished"
            print(json.dumps(dict(cancelled_chat_exit_seconds=round(stopped_in, 3), other_chat_finished=True)))
        finally:
            voice.cancel_all()
            for process in processes:
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.terminate()
                    process.wait(timeout=3)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
