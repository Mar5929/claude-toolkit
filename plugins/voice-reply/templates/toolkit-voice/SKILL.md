---
name: toolkit-voice
description: Explain and control optional spoken replies in this chat. Use for voice on, voice off, voice status, reading the previous reply aloud once, or voice settings. Speech output only.
---

# Voice replies

The installed user hooks handle these exact standalone chat messages:

- `voice on`: enable automatic speech for this chat.
- `voice off`: disable it and cancel playback for this chat.
- `voice status`: show this chat's choice and latest audio status.
- `voice read`: read the previous non-control reply once without changing the choice.

When a hook supplies a result, briefly report it. Do not generate audio yourself,
copy the reply to a tool, guess a chat ID, or claim a setting changed without a
hook result. For a paraphrase, explain the exact command to enter next.

New chats start OFF. Resume preserves the choice. Both hosts keep written
answers. Voice/model/speed controls are shared user preferences; on/off is per
host and chat. Settings are shown or changed with the installed runtime:

```powershell
python "$env:LOCALAPPDATA/ClaudeToolkit/voice-reply/runtime/voice.py" settings
python "$env:LOCALAPPDATA/ClaudeToolkit/voice-reply/runtime/voice.py" settings speed=1.0
```

Supported settings: `voice_id`, `model`, `speed` (0.7 through 1.2), `stability`,
`similarity_boost`, `style` (each 0 through 1), `use_speaker_boost` (true/false).
Apply settings only when requested; the next queued reply uses them.

If the hook result is missing, report that voice activation is unverified.
Codex users review user hooks through `/hooks`. Never change hook trust or
credentials. Do not promise `/voice`: Codex uses `/skills` or `$toolkit-voice`
for discovery; Claude Code exposes the installed `/toolkit-voice` skill.
