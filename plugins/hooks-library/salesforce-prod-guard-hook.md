# Salesforce production-org guard hook (Gate 2)

A ready-to-install PreToolUse guard for Salesforce projects. It confirms before
any Salesforce CLI command that changes an org runs against a production org,
so a wrong target never overwrites or wipes live data by accident. It also
confirms before a sandbox deploy or data write, because the safety rule allows
those only after the owner says yes. Offer it in
Gate 2 whenever the stack is Salesforce or SFDX. It is optional and is tuned by
a plain JSON file, so it needs no code changes to adjust.

## What it does

Runs before every `Bash` and `PowerShell` tool call. If the command invokes a
guarded `sf`/`sfdx` verb, the hook finds the target org and asks for
confirmation when that org is production.

- **Watches**, in six categories that the message names:
  - `deploy`: `sf project deploy start|quick|resume`, `force:source:deploy`,
    `force:mdapi:deploy`.
  - `validate`: `sf project deploy validate`. It is not a read: it uploads the
    package and runs Apex tests in the target org.
  - `dataWrite`: `sf data create record|file`, `data update record`,
    `data upsert bulk|resume`, `data import tree|bulk|resume`,
    `data delete record|bulk|resume`, and the `force:data:*` equivalents.
  - `apex`: `sf apex run`, `force:apex:execute`.
  - `metadataDelete`: `sf project delete source`, `force:source:delete`.
  - `orgDelete`: `sf org delete scratch|sandbox`, `force:org:delete`.
- **Protects:** any org that classifies as production. Classification uses
  `sf org list --json --skip-connection-status`, which reads the local auth
  store with no network call. An org is production when it is not a scratch org,
  not a sandbox, and its URL is not a sandbox or `test.salesforce.com` login.
- **Action:** confirm (`ask`). It does not hard-block by default; the policy
  file can switch to a block.
- **Sandboxes and scratch orgs:** every category except `validate` confirms
  there too (`sandboxAction`), because the safety rule allows a sandbox deploy,
  data write, or Apex run only after the owner says yes. A `validate` on a
  sandbox passes silently. This stays a confirm even when `action` is `deny`.
  When a command names a sandbox and a production org, the production decision
  wins.
- **Also:** any `org delete` confirms even for a scratch org or sandbox, because
  it cannot be undone.
- **Fast path:** commands that do not run a guarded verb exit immediately with
  no subprocess, so normal shell calls are not slowed.
- **Does not check:** `sf apex test run`, which the safety rule allows in any
  org, or any read. It matches the command text, so the same words inside a
  longer command, such as a script that writes documentation about `sf` verbs,
  also trigger it.
- **Applies to subagents:** a PreToolUse hook runs for every tool call in the
  session, so starting a subagent does not get around it.

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
               "timeout": 90
             }
           ]
         }
       ]
     }
   }
   ```

   Keep `timeout` at 90 or more. The hook can call `sf` twice, once for the
   default org and once for the org list, and waits up to 30 seconds for each.
   A PreToolUse command hook that runs out of time lets the tool call
   continue, so a timeout shorter than the hook's own wait turns a slow `sf`
   into a silent pass.

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
| `sandboxAction` | What to do when any category but `validate` targets a sandbox or scratch org: `ask` (default, matches the safety rule) or `allow` (silent). A missing field means `ask`. |
| `confirmOrgDeleteAlways` | `true` makes any `org delete` confirm even for scratch/sandbox, since it is irreversible. |
| `alwaysProtect` | Org aliases or usernames to always confirm, even if detected as sandbox or scratch. |
| `neverProtect` | Org aliases or usernames to never confirm. Escape hatch for a known throwaway org. Wins over every other rule. |

## Match the rule to the hook

The `salesforce-safety-guardrails.md` rule has an Enforcement paragraph that
describes this hook. Keep it true for the project:

- Never let a project rule claim more enforcement than the installed hook
  gives. If a rule names a guard hook (or a file such as `sf_guard.py`) as
  enforcing it, check that the hook exists and does what the rule says,
  including whether it blocks or only asks on production.
- If the project's rule says an agent may never deploy to production, set
  `"action": "deny"`. Then the hook blocks instead of asking.
- To stop confirmations for a known throwaway org, add both its username and
  its CLI alias, lowercased, to `neverProtect`, then re-run the check under
  "Verify it fires". Never add a production username or alias.
- If a command the agent needs is blocked, the agent must not rewrite it to get
  past the hook. A data change or production action goes to the owner. A rule
  the owner thinks is wrong is changed by the owner, not by weakening the hook.

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
  scratch orgs classify, and only a `validate` against them passes without a
  prompt, unless `sandboxAction` is `allow`.
- Tests: `node plugins/hooks-library/tests/guard-protected-orgs.test.mjs` in
  the toolkit runs the hook against a fake `sf` with one production org, one
  sandbox, and one scratch org. It touches no real org.
