# Optional Windows voice replies

Speech output for Codex and Claude Code, installed once for the Windows user
account. Written answers stay available. Each new chat starts with speech OFF.
This plugin owns the complete voice system; it does not use microphone input.

## Use it

Enter one of these as a standalone chat message in either host:

| Command | Result |
| --- | --- |
| `voice on` | Speak subsequent final replies in this chat |
| `voice off` | Turn speech off and stop this chat's playback |
| `voice status` | Report this chat's switch and latest audio result |
| `voice read` | Read the previous non-control reply once; leave the switch alone |

Resuming a chat preserves its switch. A new, cleared, or forked chat with a new
host ID starts OFF. Other chats, including the other application, keep their
own choices. Controls do not read their acknowledgements or replace the reply
available to `voice read`.

Find the installed help skill through Codex `/skills` or `$toolkit-voice`, or
Claude Code `/toolkit-voice`. The four ordinary-text commands above are the
portable control interface. There is no custom Codex `/voice` slash command.

## Install, update, uninstall

Requires Windows, Python 3.10 or newer, and hosts supporting `SessionStart`,
`UserPromptSubmit`, and `Stop.last_assistant_message`. The versions
inspected for this implementation were Codex 0.154.0 and Claude Code 2.1.259.
Host policy can disable hooks. Review actual activation after installation.

Install the optional `voice-reply@claude-toolkit` plugin through the host's
plugin manager, then use [voice-setup](skills/voice-setup/SKILL.md).
[machine-sync](../project-init/skills/machine-sync/SKILL.md) also routes here.
A current clone can run the same installer, from the repository root:

```powershell
python plugins/voice-reply/runtime/install.py install
python plugins/voice-reply/runtime/install.py install --apply
```

The first command previews paths; the second applies. No project setup is
needed. The interpreter used to install becomes the absolute hook interpreter.
`CODEX_HOME` and `CLAUDE_CONFIG_DIR` override the normal host homes. Explicit
`--root`, `--codex-home`, and `--claude-home` support isolated verification.

The runtime lives at `%LOCALAPPDATA%/ClaudeToolkit/voice-reply/runtime/`.
The installer adds only its owned entries to Codex `hooks.json` and Claude
`settings.json`, plus a `toolkit-voice` skill in each host's user skills folder.
It records ownership locally, refuses changed/unowned destinations, and rolls
back file content if a write fails. Existing MCP connections, `notify`, rules,
permissions, and other hooks remain intact. No credential is copied.

Restart both hosts. In Codex, use `/hooks` to review and enable the user hooks.
**Installing files does not grant hook trust.** The installer never edits trust
hashes. After an update changes a hook definition, review it again if prompted.

Refresh the marketplace and installed voice plugin through the host's normal
plugin update process, then run `update --apply` from its new packaged source:

```powershell
python plugins/voice-reply/runtime/install.py update --apply
python "$env:LOCALAPPDATA/ClaudeToolkit/voice-reply/runtime/install.py" uninstall --apply
```

Uninstall removes owned registrations, runtime files, and the discovery skill.
It cancels current playback and preserves preferences and chat choices for a
later reinstall. Remove the optional plugin through the host plugin manager too.
Unrelated settings remain. To erase retained voice history after uninstall,
delete only `%LOCALAPPDATA%/ClaudeToolkit/voice-reply/` after inspecting that
resolved directory. The prior ElevenLabsMCP proof folder is independent.

## User preferences and credentials

Initial voice: Archer, Conversational (`Fahco4VZzobUeiPqni1S`), model
`eleven_flash_v2_5`, speed `1.0`, provider ElevenLabs.
Preferences live in the user runtime's parent `settings.json`; chat switches
live separately under `chats/`. Change preferences with the validated command:

```powershell
python "$env:LOCALAPPDATA/ClaudeToolkit/voice-reply/runtime/voice.py" settings
python "$env:LOCALAPPDATA/ClaudeToolkit/voice-reply/runtime/voice.py" settings speed=0.9 stability=0.5
```

| Setting | Supported values |
| --- | --- |
| `voice_id`, `model` | ElevenLabs IDs accessible to your account |
| `speed` | 0.7 through 1.2 |
| `stability`, `similarity_boost`, `style` | 0 through 1 |
| `use_speaker_boost` | `true` or `false` |

Settings affect the next queued reply across both hosts, without changing any
chat switch. A queued reply keeps its settings snapshot. Model availability
and support for individual controls are ultimately checked by ElevenLabs.

Keep `ELEVENLABS_API_KEY` in the Windows user environment. The runtime reads it
at generation time, so a newly saved user key works without copying it into a
repository or restarting the parent host. Process environment is a fallback.
Python's verified TLS context uses Windows certificate stores; install required
corporate certificates there. Never disable certificate checks. The earlier
proof used a separate CA bundle; that file and its old connector stay untouched.

## What code enforces

The host supplies the chat ID and completed response to hooks. Code enforces
OFF by default, host/chat isolation, resume persistence, exact controls,
one-time reads, validated preferences, and cancellation. It handles only
`Stop.last_assistant_message`, never tool output or progress events. It removes
fenced/indented code, inline code, markup, and URLs before speech. It chunks
long replies; replies over 100,000 readable characters are not generated.

Generation runs in a separate hidden process with a 30-second network timeout.
Playback uses Windows PCM audio, bypassing the official connector's stalled
playback tool. OFF invalidates the chat's job; playback polls every 50 ms and
late generation results are discarded. Each worker stops only its own sound.
The final audio can finish after the host process exits, including short-lived
headless sessions. Use `voice off` in the resumed chat to cancel it.

Hook errors return success without blocking the answer. Provider failures are
reported as `audio-failed` on the next `voice status`; raw exceptions and
provider bodies are never logged. The previous sanitized reply is retained
locally for one-time playback. Temporary WAV files are removed after playback;
an abruptly terminated worker may leave a WAV in the local `audio/` folder.

Discovering help, interpreting paraphrases, and wording acknowledgements still
depend on the assistant. If hooks are disabled or untrusted, commands cannot
be guaranteed. Another Stop hook may request continuation after a response
has already reached the voice hook. These are host boundaries, not speech
state guarantees. Desktop/IDE surfaces need their own activation verification.
Multiple clients submitting overlapping turns to the very same chat ID are
not covered by the independent-chat tests.

## Maintenance and evidence

- [Runtime](runtime/voice.py): settings, chat state, hook input, generation, playback.
- [Installer](runtime/install.py): preview, install, update, and uninstall.
- [User skill template](templates/toolkit-voice/SKILL.md): copied to both hosts.
- [Tests](tests/test_voice.py): isolated runtime and installer regression checks.
- [Live smoke test](tests/live_smoke.py): two real provider requests and separate Windows playback workers.
- [Live Claude Code test](tests/live_claude.py): concurrent, resumed, fresh, forked, and one-time-read chats.
- [Live Codex test](tests/live_codex.py): the same chat checks using existing user hook trust.
- [Windows playback test](tests/windows_playback.py): cancel one sound while another process continues.
- [Native completion test](tests/live_completion.py): actual enabled replies through both hosts to real generated audio.
- [Verification record](tests/VERIFICATION.md): actual checks and remaining limits.
- [Issue design](../../docs/designs/313-windows-voice.md): requirement mapping and ownership decisions for this release.

Run `python -B -m unittest discover -s plugins/voice-reply/tests -v` from the
repository root. Live provider tests incur normal ElevenLabs usage and need
the local credential. Unit tests use a fake provider and never send chat text.

Host contracts: [Codex hooks](https://learn.chatgpt.com/docs/hooks),
[Codex skills](https://learn.chatgpt.com/docs/build-skills),
[Claude Code hooks](https://code.claude.com/docs/en/hooks),
[Claude Code skills](https://code.claude.com/docs/en/skills), and
[ElevenLabs speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
