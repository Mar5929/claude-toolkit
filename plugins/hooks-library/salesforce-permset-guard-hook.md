# Permission set deploy guard hook (Gate 2)

A ready-to-install PreToolUse guard for Salesforce projects that track permission
sets in git. It blocks any deploy that ships a permission set unless a fresh,
clean preflight ran for it. Offer it in Gate 2 alongside the production-org guard
whenever the owner accepts the `permissions-source-control.md` rule.

## Why it exists

A permission set deploy REPLACES the whole component: any grant missing from the
local file is switched off in the org. Neither `sf project deploy validate` nor
`sf project deploy preview` can warn about this, because both work at
whole-component level. A file missing hundreds of grants passes both and then
deletes them.

The only real check is a grant-level comparison against the target org, which is
what `permsets.py preflight` does. A rule alone is not enough, because the whole
failure mode is that the deploy looks fine. This hook makes the check
unskippable.

## What it does

Runs before every `Bash` and `PowerShell` call. If the command is a Salesforce
deploy that would ship a permission set, it looks for a preflight receipt.

- **Watches:** `sf project deploy start|quick|resume`, `sf deploy metadata`, and
  the legacy `sfdx force:source:deploy`, `force:mdapi:deploy`, `force:source:push`.
- **Detects permission sets four ways:** `-m PermissionSet:Name`, a bare
  `-m PermissionSet` (treated as broad), a `-d` path to a `.permissionset` file,
  a `-d` directory that contains any permission set, and `-x` manifests with a
  `PermissionSet` types block.
- **Action:** `deny`, with a message naming which permission sets are not cleared
  and the exact command to run. This one blocks rather than asks, because the
  damage is silent and irreversible.
- **Fast path:** anything that is not a deploy exits immediately with no file
  reads.
- **Fails open on its own errors.** A broken guard must never block unrelated
  work.

## The receipt

`permsets.py preflight` writes `.claude/.permset-preflight/<Name>.json` on every
run, recording the org, a timestamp, and whether the result was clean or the
losses were explicitly accepted with `--accept-removals`.

The hook allows the deploy only when a receipt exists, is marked clean, and is
less than 30 minutes old. Stale receipts do not count: the org drifts, and a
preflight from hours ago proves nothing about now. Change
`RECEIPT_MAX_AGE_MINUTES` at the top of the hook to adjust.

Receipts are local proof that a check ran. Add `.claude/.permset-preflight/` to
`.gitignore`; they should never be committed or shared.

## Files

- `hooks/guard-permission-set-deploy.js`: the hook. Node, so it runs
  the same under Git Bash and PowerShell. Copy to `.claude/hooks/`.
- `permsets.py`: writes the receipts. It is not in this plugin. It ships in the
  `project-init` library at `library/tools/permsets.py`, and Gate 1 copies it to
  `tools/permissions/permsets.py` in the project. **The hook is useless without
  it**, and would block every permission set deploy forever.

## Install (Gate 2)

1. Copy `guard-permission-set-deploy.js` to `.claude/hooks/`.
2. Confirm `tools/permissions/permsets.py` is already installed.
3. Add `.claude/.permset-preflight/` to `.gitignore`.
4. Register it in `.claude/settings.json`, as an additional entry in the same
   `Bash|PowerShell` PreToolUse matcher the production-org guard uses:

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
          },
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-permission-set-deploy.js\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

5. Check it works. With no receipt present, this must be denied:

```
echo '{"tool_name":"Bash","tool_input":{"command":"sf project deploy start -m PermissionSet:Anything -o SANDBOX"}}' | node .claude/hooks/guard-permission-set-deploy.js
```

Expect JSON with `"permissionDecision": "deny"`. A deploy naming only an Apex
class must produce no output at all, which means allowed.

## Known false positive

The hook scans the whole command string, so it also fires when a deploy command
merely appears as TEXT inside some other command: a commit message that quotes
one, an `echo` used to test the hook, a `grep` for it, documentation being
written. Nothing is being deployed, and the hook blocks anyway.

This is deliberate. Making the scan precise enough to tell a real deploy from a
quoted one means parsing shell quoting, and a guard that occasionally
under-blocks is worse than one that occasionally over-blocks. When it happens,
put the text in a file and pass it by path (`git commit -F message.txt`) rather
than inline, or write the command in a way that does not contain the literal
phrase. Do not disable the hook to get past it.

## What it does not do

- It does not judge whether the losses are acceptable. A preflight run with
  `--accept-removals` writes a clean receipt, so an owner who has read the list
  and chosen to proceed is not blocked twice.
- It does not check profiles. Profiles are excluded from source control by
  default, and their deploy is an overlay rather than a replace, so the failure
  mode is different.
- It does not replace reading `permissions-source-control.md`. It is a backstop
  for the one step whose omission is silent and unrecoverable.

## Related

- `salesforce-prod-guard-hook.md`: the production-org guard, which this sits
  beside in the same matcher.

These three ship in the `project-init` library, not here:

- `library/rules/salesforce/permissions-source-control.md`: the rule this
  enforces.
- `library/guides/salesforce-permissions-retrieval.md`: the process runbook.
- `library/guides/salesforce-permissions-research.md`: why the deploy is the
  dangerous half.
