# Native action checkpoint proof

Date: 2026-09-20

## What was checked

One bounded Codex CLI trial checked that a configured `PreToolUse` hook can
block a recognized pull-request command, request an action-specific knowledge
review, and allow one exact reviewed retry.

The hook configuration followed the current official Codex hooks documentation:
<https://learn.chatgpt.com/docs/hooks.md>. The disposable project used a
project-level `.codex/hooks.json` entry with matcher `^Bash$`. Project trust was
supplied for that single session through an inline `projects` table, and hook
trust was bypassed for this controlled test only.

No explicit coordinator authorization for the inline trust setting or
`--dangerously-bypass-hook-trust` was established. Using them was an
authorization deviation. This result must not be treated as normal configured
delivery, enforcement, or authority to repeat the run.

Execution used Codex CLI `0.154.0` on macOS with model `gpt-5.6-sol` against
source later committed as
`8a18c713abdeaa6a41dec1020248aa34b6e01784`. Corrected behavior at
`108bc208b8604679c113dce320db3ea16f9c2b85` was independently source-reviewed
and checked with deterministic tests, without another model run. Current PR
#374 head `ec106f692eaa49736dc9617b32747da3bce11e2e` adds the requested README
wording correction. The branch was based on reviewed PR #373 commit
`8eb18c873cfa5e8fce1aabb60bba8a7845333db4`. The disposable fixture itself was
clean at commit `1e7685c`.

The successful invocation used `--ephemeral`, `--ignore-user-config`,
`--strict-config`, `--enable hooks`, and
`--dangerously-bypass-hook-trust`, plus the inline project trust table for the
canonical `/private/tmp` fixture path.

## Result

The first configuration syntax attempted for the trusted project was rejected
before a model ran. A read-only `codex doctor` check then validated the accepted
whole-table syntax.

The single model trial produced this sequence:

1. A fake pull-request creation command was denied by the `PreToolUse` hook.
2. The model recorded an explicit action review with outcome `no-change` and
   the current action nonce.
3. The exact retry was allowed and printed `SIMULATED_GH_PR_CREATE`.

The fake `gh` executable contacted no remote service. The disposable fixture
remained clean after the trial (`## main`). The temporary action state created
for this proof was removed afterwards.

The earlier unsuccessful probe used the same project configuration location
and matcher `*`, which current official documentation says matches every
supported event. The successful run changed several factors at once: it used
the narrower `^Bash$` matcher, explicitly enabled hooks while ignoring user
configuration, supplied a complete inline projects table for the canonical
fixture path, and bypassed hook trust for that invocation. Its trace shows the
shell call mapped to `Bash` and reached `PreToolUse`. Because several factors
changed, this evidence does not establish why the earlier probe did not deliver
or prove normal installation.

The current toolkit project's `.codex/hooks.json` registers `SessionStart`,
`UserPromptSubmit`, and `Stop`, but not the action `PreToolUse` hooks. A
read-only check found no action-fixture trust entry in the persistent Codex
configuration, whose modification time predates this run. The invocation was
ephemeral and ignored that user configuration. These observations bound the
known changes to the disposable fixture and temporary action state; they do
not prove the absence of every unrelated persistent side effect.

## What this does not prove

This trial did not natively exercise a third occurrence, a stale turn, a
different action, a new prompt, or simultaneous retries. Deterministic tests
cover those state transitions, but they do not prove host delivery.

It also does not prove Codex Desktop delivery, Claude Code delivery, Windows
behavior, cross-machine behavior, shutdown or restart recovery, network-loss
behavior, or long-term reliability. No broad host-support or enforcement claim
should be made from this result.

See the
[independent source review](2026-09-20-action-checkpoint-independent-review.md)
for deterministic findings and the editorial-only `108bc208..ec106f692`
disposition.
