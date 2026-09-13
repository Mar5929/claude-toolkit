---
name: voice-setup
description: Install, update, inspect, or uninstall optional Windows or macOS voice replies for Codex and Claude Code across projects. Use when setting up speech output for the user account on Windows or macOS.
---

# Set up voice replies

Read [the voice guide](../../README.md). Use the packaged
[installer](../../runtime/install.py), first without `--apply` to inspect the
exact target paths. Honor installation approval already given in this session;
resolve actual conflicts before applying. Do not perform project setup.

Install or update using this plugin's current packaged source. The installer
copies a stable runtime and discovery skill to the user account and merges only
owned hook registrations. Run its tests before changing the shipped
implementation. Never replace the existing ElevenLabs MCP connection or write
the API key into a file, command argument, log, or documentation. Never request
the key in chat. On macOS the owner saves it themselves by running
`security add-generic-password -a "$USER" -s ELEVENLABS_API_KEY -U -w` in
Terminal, which prompts for the key.

After installation, report what was installed and what host activation was
actually tested. Codex hook trust must be reviewed through its `/hooks` UI.
Never simulate that approval by editing hashes. User commands and settings are
documented in the guide. A file installation alone does not prove voice works.
