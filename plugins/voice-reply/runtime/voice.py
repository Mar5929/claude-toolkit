"""User-local speech output. Hooks never block a written response."""
import argparse
import contextlib
import hashlib
import html
import json
import math
import os
from pathlib import Path
import re
import ssl
import subprocess
import sys
import time
import urllib.request
import uuid
import wave

VERSION = "0.1.0"
DEFAULTS = dict(provider="elevenlabs", voice_id="Fahco4VZzobUeiPqni1S",
                model="eleven_flash_v2_5", speed=1.0, stability=0.5,
                similarity_boost=0.75, style=0.0, use_speaker_boost=True)
HELP = "Voice commands: voice on | voice off | voice status | voice read. Each is a standalone chat message."


def root_path():
    return Path(os.environ.get("TOOLKIT_VOICE_HOME") or
                Path(os.environ.get("LOCALAPPDATA", Path.home())) / "ClaudeToolkit" / "voice-reply")


def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        return default


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temp.write_text(json.dumps(value, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


@contextlib.contextmanager
def locked(path, timeout=3):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as handle:
        handle.seek(0, 2)
        if not handle.tell():
            handle.write(b"0")
            handle.flush()
        deadline = time.monotonic() + timeout
        while True:
            try:
                handle.seek(0)
                if os.name == "nt":
                    import msvcrt
                    msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError:
                if time.monotonic() >= deadline:
                    raise TimeoutError("Voice state busy") from None
                time.sleep(.02)
        try:
            yield
        finally:
            handle.seek(0)
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle, fcntl.LOCK_UN)


def chat_key(host, session):
    if host not in ("codex", "claude") or not isinstance(session, str) or not session or len(session) > 256:
        raise ValueError("Missing or invalid host chat identity")
    return hashlib.sha256((host + "\0" + session).encode()).hexdigest()


def sanitize(text):
    if not isinstance(text, str):
        return ""
    lines, fence = [], None
    for line in text.splitlines():
        candidate = line
        # Markdown fences may be inside quotes or list items, including nested containers.
        while prefix := re.match(r"^\s*(?:>\s?|(?:[-+*]|\d+[.)])\s+)", candidate):
            candidate = candidate[prefix.end():]
        match = re.match(r"^\s*(`{3,}|~{3,})", candidate)
        if match:
            mark = match[1]
            if fence is None:
                fence = mark
            elif mark[0] == fence[0] and len(mark) >= len(fence):
                fence = None
            continue
        if fence or re.match(r"^( {4}|\t)", line):
            continue
        lines.append(line)
    text = "\n".join(lines)
    text = re.sub(r"!?\[([^\]]*)\]\([^\n]*?\)", r"\1", text)
    text = re.sub(r"(?m)^\s*\[[^\]]+\]:\s*\S+.*$", "", text)
    text = re.sub(r"https?://[^\s<>]+|www\.[^\s<>]+", "", text)
    text = re.sub(r"`+[^`]*`+", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"(?m)^\s{0,3}(?:#{1,6}\s*|>\s*|[-*+]\s+)", "", text)
    text = re.sub(r"[*_~|]", "", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def validate_settings(value):
    if not isinstance(value, dict) or set(value) - set(DEFAULTS):
        raise ValueError("Unsupported voice setting")
    result = DEFAULTS | value
    if result["provider"] != "elevenlabs":
        raise ValueError("Only ElevenLabs is supported")
    for name in ("voice_id", "model"):
        if not isinstance(result[name], str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", result[name]):
            raise ValueError("Invalid voice or model identifier")
    for name, low, high in [("speed", .7, 1.2), ("stability", 0, 1),
                            ("similarity_boost", 0, 1), ("style", 0, 1)]:
        v = result[name]
        if type(v) not in (int, float) or not math.isfinite(v) or not low <= v <= high:
            raise ValueError("Voice control outside supported range")
    if type(result["use_speaker_boost"]) is not bool:
        raise ValueError("Speaker boost must be true or false")
    return result


def credential():
    if os.name == "nt":
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
                value = winreg.QueryValueEx(key, "ELEVENLABS_API_KEY")[0]
                if isinstance(value, str) and value.strip():
                    return value.strip()
        except FileNotFoundError:
            pass
    value = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not value:
        raise RuntimeError("Credential unavailable")
    return value


def generate(text, settings):
    body = dict(text=text, model_id=settings["model"],
                voice_settings={k: settings[k] for k in
                                ("speed", "stability", "similarity_boost", "style", "use_speaker_boost")})
    request = urllib.request.Request(
        "https://api.elevenlabs.io/v1/text-to-speech/" + settings["voice_id"] + "?output_format=pcm_24000",
        data=json.dumps(body).encode(), method="POST",
        headers={"xi-api-key": credential(), "Content-Type": "application/json"})
    # Python loads Windows ROOT and CA stores. Never disable TLS verification.
    with urllib.request.urlopen(request, context=ssl.create_default_context(), timeout=30) as response:
        pcm = response.read(20_000_001)
    if not pcm or len(pcm) > 20_000_000 or len(pcm) % 2:
        raise ValueError("Invalid audio")
    return pcm


class Voice:
    def __init__(self, root=None, launch=None):
        self.root = Path(root) if root else root_path()
        self.launch = launch or self.spawn

    def state_path(self, key):
        if not re.fullmatch(r"[a-f0-9]{64}", key):
            raise ValueError("Invalid chat key")
        return self.root / "chats" / (key + ".json")

    def state(self, key):
        value = read_json(self.state_path(key), {})
        if not isinstance(value, dict):
            raise ValueError("Invalid state")
        return dict(enabled=False, previous="", nonce="", status="idle", control=False) | value

    def settings(self, patch=None):
        with locked(self.root / "settings.lock"):
            current = validate_settings(read_json(self.root / "settings.json", {}))
            if patch is not None:
                current = validate_settings(current | patch)
                write_json(self.root / "settings.json", current)
            return current

    def spawn(self, key, nonce):
        args = [sys.executable, str(Path(__file__).resolve()), "worker", key, nonce,
                "--root", str(self.root)]
        kwargs = dict(stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                      close_fds=True)
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS
        else:
            kwargs["start_new_session"] = True
        subprocess.Popen(args, **kwargs)

    def queue(self, key, state, text):
        if not text:
            return "No previous reply with readable text."
        if len(text) > 100_000:
            return "Reply exceeds the speech limit; written reply remains available."
        nonce = uuid.uuid4().hex
        state.update(nonce=nonce, status="queued", job=dict(text=text, settings=self.settings()))
        write_json(self.state_path(key), state)
        try:
            self.launch(key, nonce)
        except Exception:
            state.update(status="audio-failed", nonce="")
            state.pop("job", None)
            write_json(self.state_path(key), state)
            return "Audio unavailable; written reply remains available."
        return "Playback queued."

    def handle(self, host, event):
        if not isinstance(event, dict):
            return ""
        name = event.get("hook_event_name")
        if name not in ("SessionStart", "UserPromptSubmit", "Stop"):
            return ""
        key = chat_key(host, event.get("session_id"))
        with locked(self.root / "chats" / (key + ".lock")):
            state = self.state(key)
            if name == "SessionStart":
                return HELP + " Current chat voice: " + ("ON." if state["enabled"] is True else "OFF.")
            if name == "UserPromptSubmit":
                state["stop_digest"] = ""
                prompt = event.get("prompt", "")
                command = prompt.strip().lower() if isinstance(prompt, str) else ""
                match = re.fullmatch(r"(?:voice|\$toolkit-voice|/toolkit-voice) (on|off|status|read)", command)
                state["control"] = bool(match)
                message = ""
                if match:
                    action = match[1]
                    if action in ("on", "off"):
                        state["enabled"] = action == "on"
                        if action == "off":
                            state.update(nonce="", status="cancelled")
                            state.pop("job", None)
                    if action == "read":
                        message = self.queue(key, state, state["previous"])
                    else:
                        message = "Chat voice " + ("ON" if state["enabled"] is True else "OFF") + ". Audio: " + state["status"] + "."
                    message += " The voice hook already handled this command. Briefly report this result; do not call a speech tool."
                write_json(self.state_path(key), state)
                return message
            elif name == "Stop":
                if state["control"]:
                    return ""
                text = sanitize(event.get("last_assistant_message"))
                stop_digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
                if state.get("stop_digest") == stop_digest:
                    return ""
                state["stop_digest"] = stop_digest
                state["previous"] = text
                if state["enabled"] is True and text:
                    self.queue(key, state, text)
            write_json(self.state_path(key), state)
        return ""

    def active(self, key, nonce):
        return bool(nonce) and self.state(key)["nonce"] == nonce

    def finish(self, key, nonce, status):
        with locked(self.root / "chats" / (key + ".lock")):
            state = self.state(key)
            if state["nonce"] == nonce:
                state.update(status=status, nonce="")
                state.pop("job", None)
                write_json(self.state_path(key), state)

    def phase(self, key, nonce, status):
        with locked(self.root / "chats" / (key + ".lock")):
            state = self.state(key)
            if state["nonce"] != nonce:
                return False
            state["status"] = status
            write_json(self.state_path(key), state)
            return True

    def worker(self, key, nonce, synthesize=generate, player=None):
        audio_file = self.root / "audio" / (uuid.uuid4().hex + ".wav")
        try:
            if not self.active(key, nonce):
                return
            job = self.state(key)["job"]
            for i in range(0, len(job["text"]), 3500):
                if not self.phase(key, nonce, "generating"):
                    return
                pcm = synthesize(job["text"][i:i + 3500], validate_settings(job["settings"]))
                if not self.phase(key, nonce, "playing"):
                    return
                if player:
                    player(pcm, lambda: self.active(key, nonce))
                else:
                    self.play(pcm, audio_file, lambda: self.active(key, nonce))
            self.finish(key, nonce, "finished")
        except Exception:
            # Never log provider bodies, text, exception details, or credentials.
            try:
                self.finish(key, nonce, "audio-failed")
            except Exception:
                pass
        finally:
            audio_file.unlink(missing_ok=True)

    @staticmethod
    def play(pcm, path, active):
        import winsound
        path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(path), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(24000)
            output.writeframes(pcm)
        if not active():
            return
        try:
            winsound.PlaySound(str(path), winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_NODEFAULT)
            deadline = time.monotonic() + len(pcm) / 48000 + .2
            while time.monotonic() < deadline and active():
                time.sleep(.05)
        finally:
            winsound.PlaySound(None, 0)

    def cancel_all(self):
        for path in (self.root / "chats").glob("*.json"):
            with locked(path.with_suffix(".lock")):
                state = self.state(path.stem)
                state.update(nonce="", status="cancelled")
                state.pop("job", None)
                write_json(path, state)


def main():
    parser = argparse.ArgumentParser(description=HELP)
    parser.add_argument("action", choices=["hook", "worker", "settings"])
    parser.add_argument("args", nargs="*")
    parser.add_argument("--root", type=Path)
    opts = parser.parse_args()
    voice = Voice(opts.root)
    try:
        if opts.action == "hook":
            event = json.loads(sys.stdin.buffer.read(1_000_001).decode("utf-8-sig"))
            message = voice.handle(opts.args[0], event)
            if message and event.get("hook_event_name") in ("SessionStart", "UserPromptSubmit"):
                print(json.dumps({"hookSpecificOutput": {"hookEventName": event["hook_event_name"],
                                                       "additionalContext": message}}))
        elif opts.action == "worker":
            voice.worker(*opts.args)
        else:
            patch = {}
            for arg in opts.args:
                key, value = arg.split("=", 1)
                patch[key] = value if key in ("voice_id", "model", "provider") else json.loads(value)
            print(json.dumps(voice.settings(patch if patch else None), indent=2))
    except Exception:
        if opts.action != "hook":
            print("Voice action failed; check installation and supported settings.", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
