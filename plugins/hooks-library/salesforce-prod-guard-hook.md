# Salesforce production-org guard hook (Gate 2)

A ready-to-install PreToolUse guard for Salesforce projects. It confirms before
any Salesforce CLI deploy or destructive command runs against a production org,
so a wrong target never overwrites or wipes live data by accident. Offer it in
Gate 2 whenever the stack is Salesforce or SFDX. It is optional and is tuned by
a plain JSON file, so it needs no code changes to adjust.

## What it does

Runs before every `Bash` and `PowerShell` tool call. If the command invokes a
guarded `sf`/`sfdx` verb, the hook finds the target org and asks for
confirmation when that org is production.

- **Watches:** `sf project deploy start|quick|resume`, `project delete source`,
  `data delete record|bulk|resume`, `apex run`, `org delete scratch|sandbox`,
  and the legacy `sfdx force:*` equivalents.
- **Protects:** any org that classifies as production. Classification uses
  `sf org list --json --skip-connection-status`, which reads the local auth
  store with no network call. An org is production when it is not a scratch org,
  not a sandbox, and its URL is not a sandbox or `test.salesforce.com` login.
- **Action:** confirm (`ask`). It does not hard-block by default; the policy
  file can switch to a block.
- **Also:** any `org delete` confirms even for a scratch org or sandbox, because
  it cannot be undone.
- **Fast path:** commands that do not run a guarded verb exit immediately with
  no subprocess, so normal shell calls are not slowed.

## Files (both ship ready to copy)

- `hooks/guard-protected-orgs.js`: the hook. Written in Node so it
  runs the same under Git Bash and PowerShell. Copy to the project's
  `.claude/hooks/`.
- `templates/protected-orgs.json`: the policy. Copy to the project's
  `.claude/` (one level above `hooks/`). The hook reads it by relative path, so
  keep that layout.

## Install (Gate 2)

1. Copy `guard-protected-orgs.js` to `.claude/hooks/`.
2. Copy `protected-orgs.json` to `.claude/`.
3. Register the hook in `.claude/settings.json` under `PreToolUse`, matching
   both shells. Merge into any existing `hooks` block; do not overwrite it:

   ```json
   {
     "hooks": {
       "PreToolUse": [
         {
           "matcher": "Bash|PowerShell",
           "hooks": [
             {
               "type": "command",
               "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-protected-orgs.js\"",
               "timeout": 30
             }
           ]
         }
       ]
     }
   }
   ```

4. Tell the owner how the target org is found and how to verify it fires (below).

## How it picks the target org

Explicit `-o` / `--target-org` / `-u` / `--targetusername` first. Otherwise the
default target org from `sf config get target-org`, or the `SF_TARGET_ORG` /
`SFDX_DEFAULTUSERNAME` env vars. If no target resolves, or an org is not
authenticated yet, it confirms to be safe (`unknownOrgAction`).

## Policy file

`protected-orgs.json` tunes behavior with no code change:

| Field | What it does |
|---|---|
| `action` | `ask` (confirm) or `deny` (hard block). Default `ask`. |
| `unknownOrgAction` | What to do when an org cannot be classified (not authenticated, or `sf` unavailable): `ask` (safe default) or `allow`. |
| `confirmOrgDeleteAlways` | `true` makes any `org delete` confirm even for scratch/sandbox, since it is irreversible. |
| `alwaysProtect` | Org aliases or usernames to always confirm, even if detected as sandbox or scratch. |
| `neverProtect` | Org aliases or usernames to never confirm. Escape hatch for a known throwaway org. Wins over every other rule. |

## Verify it fires

```
node .claude/hooks/guard-protected-orgs.js
# then paste on stdin (Ctrl+Z, Enter on Windows to end input):
{"tool_name":"Bash","tool_input":{"command":"sf project deploy start -o PROD"}}
```

Expect JSON with `"permissionDecision":"ask"` when `PROD` is production or
unknown. A plain `sf org list` or a non-Salesforce command prints nothing and
exits 0 (allowed).

## Notes

- Node is required; it ships with the Salesforce CLI. The hook shells out to
  `sf` to classify orgs. If `sf` is missing, every guarded command falls back to
  confirm.
- The hook never re-triggers itself: it calls `sf org list` directly, not
  through the Bash tool.
- Contract verified against the Claude Code hooks reference: a PreToolUse hook
  reads JSON on stdin and returns `hookSpecificOutput.permissionDecision` of
  `allow`, `ask`, or `deny`.
- On a fresh machine with no orgs authenticated, everything classifies as
  unknown and therefore confirms. Once the orgs are authenticated, sandboxes and
  scratch orgs classify and pass through without a prompt.
