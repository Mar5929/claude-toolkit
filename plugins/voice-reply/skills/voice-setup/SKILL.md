---
name: voice-setup
description: Install, update, inspect, or uninstall optional Windows voice replies for Codex and Claude Code across projects. Use when setting up speech output for the Windows user account.
---

# Set up voice replies

Read [the voice guide](../../README.md). Use the packaged
[installer](../../runtime/install.py), first without `--apply` to inspect the
exact target paths. Honor installation approval already given in this session;
resolve actual conflicts before applying. Do not perform project setup.

Install or update using this plugin's current packaged source. The installer
copies a stable runtime and discovery skill to the Windows user account and
merges only owned hook registrations. Run its tests before changing the shipped
implementation. Never replace the existing ElevenLabs MCP connection or write
the API key into a file, command argument, log, or documentation.

After installation, report what was installed and what host activation was
actually tested. Codex hook trust must be reviewed through its `/hooks` UI.
Never simulate that approval by editing hashes. User commands and settings are
documented in the guide. A file installation alone does not prove voice works.
