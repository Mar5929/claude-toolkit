"""Explicit paid ElevenLabs/Windows playback smoke test, using synthetic replies."""
import json
from pathlib import Path
import sys
import tempfile
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "runtime"))
from voice import Voice, chat_key


def main():
    with tempfile.TemporaryDirectory(prefix="toolkit-voice-live-") as directory:
        voice = Voice(Path(directory))
        def event(host, kind, **kw):
            return voice.handle(host, dict(session_id="live-verification", hook_event_name=kind, **kw))
        for host in ("codex", "claude"):
            voice.settings(dict(speed=1.0 if host == "codex" else .9))
            event(host, "UserPromptSubmit", prompt="voice on")
            event(host, "UserPromptSubmit", prompt="Test")
            event(host, "Stop", last_assistant_message="Windows voice output test for " + host + ".")
        deadline = time.monotonic() + 50
        while time.monotonic() < deadline:
            states = {host: voice.state(chat_key(host, "live-verification"))["status"] for host in ("codex", "claude")}
            if all(status not in ("queued", "generating", "playing") for status in states.values()):
                print(json.dumps(dict(status=states, settings_speeds=[1.0, .9])))
                return 0 if all(status == "finished" for status in states.values()) else 1
            time.sleep(.2)
        voice.cancel_all()
        time.sleep(1)
        print("Voice smoke test timed out; jobs cancelled.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
