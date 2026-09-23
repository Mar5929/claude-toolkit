# Toolkit orientation hook

`toolkit-session-start.mjs` belongs to project-init's delivery package. Copy it
to `.claude/hooks/toolkit-session-start.mjs` together with
`library/templates/toolkit-manual.md` at `knowledge/toolkit-manual.md`, or at
`docs/toolkit-manual.md` when `.toolkit-memory.json` says `"memory": "external"`. It needs
no optional plugin and writes no files.

The setup and sync procedure is
[toolkit-manual-delivery.md](../../skills/project-init/references/toolkit-manual-delivery.md).
Preserve other hook handlers. Replace only an existing registration for this
same script. Register it once, for SessionStart only.

## Claude Code

Merge this group into `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "startup|resume|clear|compact",
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/toolkit-session-start.mjs\"",
        "timeout": 10
      }]
    }]
  }
}
```

## Codex

Merge this group into `.codex/hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "startup|resume|clear|compact",
      "hooks": [{
        "type": "command",
        "command": "node \"$(git rev-parse --show-toplevel)/.claude/hooks/toolkit-session-start.mjs\"",
        "commandWindows": "powershell.exe -NoProfile -Command \"$projectRoot = git rev-parse --show-toplevel; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node (Join-Path $projectRoot '.claude/hooks/toolkit-session-start.mjs')\"",
        "timeout": 10,
        "additionalContextLimit": 1000,
        "statusMessage": "Reading Toolkit orientation route"
      }]
    }]
  }
}
```

An older install also registered this script for UserPromptSubmit. Remove that
registration during sync. The hook no longer runs on every message.

Use the host's normal trust process. Do not change trust or disable protections
to make a verification run pass. For a project without Git, resolve the
project-root path during setup instead of using `git rev-parse`, and record the
actual command. The Windows command selects PowerShell and still needs a test
on Windows.

## Output

- One header line: paths resolve from the project root.
- The `## Summary` section of `knowledge/toolkit-manual.md`, cut at 120 words.
  In the `external` memory mode it prints the `## Summary for the external
  memory mode` section of `docs/toolkit-manual.md` instead. A missing or
  invalid `.toolkit-memory.json` means `files` mode. Without the section, the
  script prints its built-in default, which matches the template's section.
- One line per gap: a missing, empty, or unreadable manual; missing root
  instructions; a `CLAUDE.md` that is not the single `@AGENTS.md` line.

It never prints the manual body. It asks for no read of the whole manual and no
acknowledgment. It checks that files exist, not that the agent follows them.
See `tests/toolkit-startup.test.mjs` in the toolkit repository for the
regression tests.
