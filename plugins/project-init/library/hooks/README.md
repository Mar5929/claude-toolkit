# Toolkit orientation hook

`toolkit-session-start.mjs` belongs to project-init's delivery package. Copy it
to `.claude/hooks/toolkit-session-start.mjs` together with
`library/templates/toolkit-manual.md` at `knowledge/toolkit-manual.md`. It needs
no optional plugin and writes no files or acknowledgment state.

The setup/sync procedure is
[toolkit-manual-delivery.md](../../skills/project-init/references/toolkit-manual-delivery.md).
Preserve other hook handlers; replace only an existing registration for this
same script. Install one handler for each event, not one per repeated sync.

## Claude Code

Merge these groups into `.claude/settings.json`:

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
    }],
    "UserPromptSubmit": [{
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

Merge these groups into `.codex/hooks.json`:

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
    }],
    "UserPromptSubmit": [{
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

Use the chosen host's normal trust process. Do not alter trust or disable
protections merely to make a verification run pass. Without hooks, the root
complete-read instruction remains the fallback. For a project without Git,
resolve the hook's project-root path during setup instead of using `git
rev-parse`; record and verify that actual command. The Windows command explicitly
selects PowerShell and still requires host verification on Windows.

## Output and recovery

SessionStart returns only root/manual read instructions and bounded missing-file
diagnostics. The agent reads all required content, continues in chunks after a
shortened tool result, and acknowledges only after reading. Resume, clear and
compact receive the same route. UserPromptSubmit returns a shorter reminder and
does not request another acknowledgment on every message.

The script checks file availability, not understanding or compliance. It never
copies manual bodies into hook output and does not enforce approval policy.
Check actual model-visible output and reads in each host; a direct invocation
proves only script behavior. See `tests/toolkit-startup.test.mjs` in the toolkit
repository for copied-bundle, missing-file and alias regression tests.
