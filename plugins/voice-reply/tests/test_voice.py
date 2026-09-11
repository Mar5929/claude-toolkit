import concurrent.futures
import copy
import json
import os
from pathlib import Path
import subprocess
import ssl
import sys
import tempfile
import threading
import unittest
import urllib.error
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SOURCE / "runtime"))
from voice import Voice, DEFAULTS, chat_key, sanitize, validate_settings, generate
from install import install, merge_hooks


class VoiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "voice"
        self.jobs = []
        self.voice = Voice(self.root, lambda key, nonce: self.jobs.append((key, nonce)))

    def event(self, name, session="a", host="codex", **fields):
        return self.voice.handle(host, dict(hook_event_name=name, session_id=session, **fields))

    def prompt(self, text, **kw):
        return self.event("UserPromptSubmit", prompt=text, **kw)

    def reply(self, text="Written answer.", **kw):
        self.prompt("Please answer", **kw)
        return self.event("Stop", last_assistant_message=text, **kw)

    def test_fresh_resume_clear_and_cross_host_isolation(self):
        for host in ("claude", "codex"):
            self.assertIn("OFF", self.event("SessionStart", host=host))
            self.prompt("voice on", host=host)
            self.assertIn("ON", self.event("SessionStart", host=host, source="resume"))
            self.assertIn("OFF", self.event("SessionStart", host=host, session="new", source="clear"))
        self.prompt("voice off", host="codex")
        self.assertTrue(self.voice.state(chat_key("claude", "a"))["enabled"])
        self.assertFalse(self.voice.state(chat_key("codex", "a"))["enabled"])

    def test_only_final_reply_and_one_time_read(self):
        self.event("PostToolUse", last_assistant_message="Tool secret")
        self.event("SubagentStop", last_assistant_message="Helper progress")
        self.reply("Final prose.\n```py\nprint('code')\n```\nhttps://example.org/long/path")
        self.assertEqual(self.jobs, [])
        self.assertIn("queued", self.prompt("voice read"))
        self.assertEqual(len(self.jobs), 1)
        state = self.voice.state(chat_key("codex", "a"))
        self.assertFalse(state["enabled"])
        self.assertEqual(state["job"]["text"], "Final prose.")
        self.event("Stop", last_assistant_message="Acknowledgement")
        self.assertEqual(self.voice.state(chat_key("codex", "a"))["previous"], "Final prose.")
        self.assertEqual(len(self.jobs), 1)

    def test_control_matching_does_not_execute_quoted_instructions(self):
        for text in ['Explain voice on', 'Example: voice on', 'voice on\nthen do work', '"voice on"']:
            self.prompt(text)
            self.assertFalse(self.voice.state(chat_key("codex", "a"))["enabled"])
        self.prompt(" VOICE ON ")
        self.assertTrue(self.voice.state(chat_key("codex", "a"))["enabled"])

    def test_repeated_stop_event_speaks_once_but_next_turn_can_repeat(self):
        self.prompt("voice on")
        self.reply("Same answer")
        self.event("Stop", last_assistant_message="Same answer")
        self.assertEqual(len(self.jobs), 1)
        self.reply("Same answer")
        self.assertEqual(len(self.jobs), 2)

    def test_session_exit_allows_final_reply_to_finish(self):
        self.prompt("voice on")
        self.reply()
        job = self.jobs[-1]
        self.event("SessionEnd")
        self.assertTrue(self.voice.active(*job))
        self.assertTrue(self.voice.state(job[0])["enabled"])

    def test_settings_apply_next_job_and_do_not_change_chat_switch(self):
        self.prompt("voice on")
        self.reply()
        first = copy.deepcopy(self.voice.state(self.jobs[-1][0])["job"])
        self.voice.settings(dict(speed=.8, voice_id="OtherVoice", model="eleven_multilingual_v2", style=.2))
        self.assertEqual(first["settings"]["speed"], 1.0)
        self.reply()
        self.assertEqual(self.voice.state(self.jobs[-1][0])["job"]["settings"]["speed"], .8)
        self.assertFalse(self.voice.state(chat_key("claude", "a"))["enabled"])
        for patch_value in [dict(speed=2), dict(speed=True), dict(speed=float("nan")),
                            dict(api_key="secret"), dict(use_speaker_boost="false")]:
            with self.assertRaises(ValueError):
                self.voice.settings(patch_value)

    def test_cancellation_during_generation_drops_late_audio(self):
        self.prompt("voice on")
        self.reply()
        played = []
        def synth(text, settings):
            self.prompt("voice off")
            return b"\0\0" * 2400
        self.voice.worker(*self.jobs[-1], synthesize=synth, player=lambda *a: played.append(a))
        self.assertEqual(played, [])
        self.assertEqual(self.voice.state(self.jobs[-1][0])["status"], "cancelled")

    def test_cancel_playback_keeps_other_host_running(self):
        for host in ("codex", "claude"):
            self.prompt("voice on", host=host)
            self.reply(host=host)
        other = self.jobs[-1]
        def player(pcm, active):
            self.assertTrue(active())
            self.prompt("voice off", host="codex")
            self.assertFalse(active())
            self.assertTrue(self.voice.active(*other))
        self.voice.worker(*self.jobs[0], synthesize=lambda *a: b"\0\0", player=player)

    def test_newer_job_rejects_old_worker_and_failure_is_private(self):
        self.prompt("voice on")
        self.reply()
        old = self.jobs[-1]
        self.reply("Second")
        self.voice.worker(*old, synthesize=lambda *a: self.fail("Stale generation"))
        def fail(*args):
            raise RuntimeError("provider-key-and-text-must-not-leak")
        self.voice.worker(*self.jobs[-1], synthesize=fail)
        state = self.voice.state(self.jobs[-1][0])
        self.assertEqual(state["status"], "audio-failed")
        self.assertTrue(state["enabled"])
        self.assertNotIn("provider-key", json.dumps(state))

    def test_parallel_chats_and_atomic_state(self):
        def run(n):
            for _ in range(8):
                self.prompt("voice on" if n % 2 else "voice off", session=str(n))
                self.reply(session=str(n))
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            list(executor.map(run, range(4)))
        for n in range(4):
            self.assertEqual(self.voice.state(chat_key("codex", str(n)))["enabled"], bool(n % 2))

    def test_sanitation_fences_links_and_unclosed_code(self):
        self.assertEqual(sanitize("# Hello\n~~~js\nsecret\n~~~\n[Docs](https://x/y) &amp; `inline`"), "Hello Docs &")
        self.assertEqual(sanitize("Before\n```\nnever speak"), "Before")
        self.assertEqual(sanitize("Before\n    code\nAfter"), "Before After")
        self.assertEqual(sanitize("Before\n> ~~~python\n> print(123)\n> ~~~\nAfter"), "Before After")
        self.assertEqual(sanitize("Before\n- ~~~python\n  print(123)\n  ~~~\nAfter"), "Before After")
        self.assertEqual(sanitize("Before\n1. >```py\n> secret\n>```\nAfter"), "Before After")

    def test_hook_process_fails_open_without_secret_output(self):
        for payload in ["{", '[]', '{"hook_event_name":"Stop","session_id":""}']:
            result = subprocess.run([sys.executable, str(SOURCE / "runtime/voice.py"), "hook", "codex", "--root", str(self.root)],
                                    input=payload, text=True, capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stdout + result.stderr, "")

    def test_provider_request_and_failures(self):
        class Response:
            def __enter__(self): return self
            def __exit__(self, *a): pass
            def read(self, n): return b"\0\0"
        with patch("voice.credential", return_value="local-test-credential"), patch("voice.urllib.request.urlopen", return_value=Response()) as fetch:
            self.assertEqual(generate("hello", DEFAULTS), b"\0\0")
            request = fetch.call_args.args[0]
            body = json.loads(request.data)
            self.assertEqual(body["voice_settings"]["speed"], 1.0)
            self.assertIn("pcm_24000", request.full_url)
            self.assertEqual(fetch.call_args.kwargs["timeout"], 30)
            self.assertTrue(fetch.call_args.kwargs["context"].check_hostname)

    def test_provider_network_tls_timeout_and_credential_fail_open(self):
        failures = [urllib.error.HTTPError("https://api.elevenlabs.io", 401, "private-body", {}, None),
                    urllib.error.URLError("private-host-detail"), ssl.SSLCertVerificationError("private-cert"),
                    TimeoutError("private-timeout"), RuntimeError("Credential unavailable")]
        for failure in failures:
            self.prompt("voice on")
            self.reply("Still written")
            def fail(*args):
                raise failure
            self.voice.worker(*self.jobs[-1], synthesize=fail)
            state = self.voice.state(self.jobs[-1][0])
            self.assertEqual(state["status"], "audio-failed")
            self.assertEqual(state["previous"], "Still written")
            self.assertNotIn("private-", json.dumps(state))

    def test_unicode_host_payload_is_utf8(self):
        text = "Caf\u00e9, \u65e5\u672c\u8a9e, \U0001f60a."
        data = json.dumps(dict(hook_event_name="Stop", session_id="unicode", last_assistant_message=text), ensure_ascii=False).encode("utf-8")
        result = subprocess.run([sys.executable, str(SOURCE / "runtime/voice.py"), "hook", "claude", "--root", str(self.root)],
                                input=data, capture_output=True, timeout=10)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(self.voice.state(chat_key("claude", "unicode"))["previous"], text)


@unittest.skipUnless(os.name == "nt", "Installer live writes target Windows")
class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root, self.codex, self.claude = [self.base / name for name in ("voice", "codex", "claude")]
        self.claude.mkdir()
        self.original = dict(permissions={"allow": ["Read"]}, hooks={"Stop": [dict(hooks=[dict(type="command", command="existing-hook")])]})
        (self.claude / "settings.json").write_text(json.dumps(self.original))

    def run_install(self, action, apply=True):
        return install(action, SOURCE, self.root, self.codex, self.claude, Path(sys.executable), apply)

    def test_preview_repeat_update_uninstall_preserve_unrelated_and_settings(self):
        self.run_install("install", False)
        self.assertFalse(self.root.exists())
        self.run_install("install")
        self.run_install("install")
        Voice(self.root).settings(dict(speed=.8))
        self.run_install("update")
        value = json.loads((self.claude / "settings.json").read_text())
        self.assertEqual(len(value["hooks"]["Stop"]), 2)
        self.run_install("uninstall")
        self.assertEqual(json.loads((self.claude / "settings.json").read_text()), self.original)
        self.assertEqual(Voice(self.root).settings()["speed"], .8)
        self.assertFalse((self.root / "runtime/voice.py").exists())
        self.assertEqual(self.run_install("uninstall")["status"], "not installed")

    def test_preflight_conflict_writes_nothing(self):
        self.run_install("install")
        destination = self.codex / "skills/toolkit-voice/SKILL.md"
        destination.write_text("user changed this")
        before = (self.claude / "settings.json").read_bytes()
        with self.assertRaises(ValueError):
            self.run_install("update")
        self.assertEqual((self.claude / "settings.json").read_bytes(), before)
        self.assertEqual(destination.read_text(), "user changed this")

    def test_installed_uninstaller_has_no_source_dependency(self):
        self.run_install("install")
        result = subprocess.run([sys.executable, str(self.root / "runtime/install.py"), "uninstall", "--apply",
                                 "--root", str(self.root), "--codex-home", str(self.codex), "--claude-home", str(self.claude)],
                                capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.root / "runtime/voice.py").exists())

    def test_invalid_host_config_prevents_partial_install(self):
        self.codex.mkdir()
        (self.codex / "hooks.json").write_text('{"hooks":[]}')
        with self.assertRaises(ValueError):
            self.run_install("install")
        self.assertFalse(self.root.exists())

    def test_concurrent_config_edit_is_preserved(self):
        target = self.claude / "settings.json"
        changed = self.original | {"user_change": True}
        original_merge = merge_hooks
        def race(current, old, new):
            result = original_merge(current, old, new)
            if "permissions" in current:
                target.write_text(json.dumps(changed))
            return result
        with patch("install.merge_hooks", side_effect=race), self.assertRaises(ValueError):
            self.run_install("install")
        self.assertEqual(json.loads(target.read_text()), changed)
        self.assertFalse((self.root / "runtime/voice.py").exists())

    def test_failed_write_rolls_back_runtime_and_host_files(self):
        target = self.claude / "settings.json"
        original_write = Path.write_bytes
        failed = False
        def write(path, data):
            nonlocal failed
            if path.resolve() == target.resolve() and not failed:
                failed = True
                raise OSError("simulated disk failure")
            return original_write(path, data)
        with patch.object(Path, "write_bytes", write), self.assertRaises(OSError):
            self.run_install("install")
        self.assertEqual(json.loads(target.read_text()), self.original)
        self.assertFalse((self.root / "runtime/voice.py").exists())
        self.assertFalse((self.codex / "hooks.json").exists())


if __name__ == "__main__":
    unittest.main()
