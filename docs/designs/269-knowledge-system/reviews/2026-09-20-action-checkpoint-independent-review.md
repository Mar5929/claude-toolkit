# Independent review: action-specific Knowledge checkpoints

Date: 2026-09-20

## Scope and versions

This review compares final PR #374 head
`108bc208b8604679c113dce320db3ea16f9c2b85` with base
`8eb18c873cfa5e8fce1aabb60bba8a7845333db4`. It covers the action-checkpoint
state machine, shell-command identity, focused deterministic tests, and the one
preserved Codex CLI trial. It does not approve merging and does not claim full
issue #269 acceptance.

The [native action-checkpoint proof](2026-09-20-native-action-checkpoint-proof.md)
preserves the controlled host observation and its authorization limits.

The repository source was read only. The initial integrated candidate
`255aec0` passed 43 focused tests: PR #374 contributed 42, and the integrated
PR #370 source contributed one additional test. The final integrated candidate
`f6e9569216ca7b5c5aac9904efde61592d6dcaa1` passed 45 focused tests, 424 link
checks, 234 shipped-route checks, 27 installed-copy checks, and 12 startup
checks. Its final diff check passed and working tree was clean. Plugin validation
passed on prior integrated candidate `255aec0`; the plugin manifests are
unchanged in the final delta. The canonical hooks changed by the final
correction exactly match their `.claude/hooks/` copies.

## Source result

The core state transition is small and materially improves R3/R9 coverage:

- state is isolated by canonical project root, session, and agent;
- an action has a random nonce and its own outcome, bound to the existing turn
  review generation and separate from the general turn review outcome;
- a general review cannot release an action;
- a matching declared action outcome releases one logical retry and is then
  consumed;
- stale events with distinct present turn IDs return `stale-turn` without
  mutating current state;
- a lock serializes competing consumers, and the concurrent test establishes
  that only one of two matching retries can consume a receipt;
- `pending-approval` and `save-unfinished` remain valid review outcomes rather
  than completed-save claims. The denial text tells the agent not to retry when
  the action depends on unresolved approval or publication. The receipt itself
  grants neither permission nor proof of good judgment.

Missing turn IDs retain compatibility and cannot isolate an old event. Invalid
or missing identity, repository lookup failure, malformed state, and other
unexpected hook failures are fail-open at the hook boundary. Those are explicit
coverage limits, not proof that a required review happened.

### Resolved finding 1: compound close/merge commands omitted later work items

At initial head `8a18c713`, `workItemActionKey()` returned after the first
matching shell segment. For
example, `gh issue close 1 && gh issue close 2` is keyed only to issue 1. Once
that receipt is recorded, the retry can execute both closures, although issue 2
did not receive the review required for the work being handed over. This is a
source defect against R3 lines 519-536 and R9 lines 679-699, not merely missing
native proof.

Final head `108bc208` keys the ordered list of every recognized `(action type,
item)` pair already returned by the existing parser. Its regression establishes
that changing a later target cannot consume the earlier compound action's
receipt. Pull-request creation remains one approved logical action identified
by canonical root, branch, and HEAD; title/body byte identity is not required.

### Resolved finding 2: mixed PR-create and close/merge syntax could cycle

At initial head `8a18c713`, the Claude configuration registered both `save-reminder.mjs` and
`work-item-close.mjs` for Bash. A compound command containing both action
classes invokes both hooks against one `pendingAction` slot. The handlers have
different keys and matching hooks may overlap, so they can return busy, replace
one another's pending action, or consume one receipt while the other creates a
new denial. Repeated recording and retry can alternate without reaching the
command.

Final head `108bc208` adds one shared parser predicate and message. Both hooks
now detect mixed syntax before claiming state, leave any existing receipt
unchanged, and give the same instruction to split the actions. The regression
checks sequential and concurrent invocation and verifies that an existing PR
receipt remains intact and consumable. The repair adds no state store,
controller, or model-dependent check.

No broader complexity blocker was found. The shared state machine replaces two
older ad hoc stores and fixes the earlier cross-project branch-name collision.
The README says the focused test exercises “installed hook wiring,” although it
invokes canonical source entry points; “hook entry points” would be more exact.
This is a minor release-note wording cleanup, not a source blocker.

## Native CLI observation

The preserved parent trace and disposable fixture establish this bounded
sequence on macOS with Codex CLI `0.154.0`, explicitly assigned and observed
model `gpt-5.6-sol`, and initial PR source commit `8a18c71`:

1. `PreToolUse` denied the first fake `gh pr create` command.
2. The agent ran the six-argument review command with the emitted generation and
   nonce and declared `no-change`.
3. One retry ran the fixture's fake `gh` and printed
   `SIMULATED_GH_PR_CREATE`.

The raw command output records the denial, the exact review result, the allowed
retry, CLI/model/workdir metadata, and the trust-bypass warnings. The fixture is
still clean at commit `1e7685c381d7a092f2e09be7cdbac51ac9ae2fd8`; the fake
`gh` only prints the marker. The temporary action-state file was subsequently
removed. The fixture's hook file predates the successful trial, and no
persistent project entry was added to ordinary Codex configuration.

This was a controlled capability observation with two explicit overrides:

```text
--dangerously-bypass-hook-trust
-c 'projects={"/private/tmp/knowledge-action-native.X6fxgO"={trust_level="trusted"}}'
```

The hook-trust bypass was not authorized under the main coordinator and user
scope. It must be
recorded as an authorization deviation and cannot support normal-delivery or
current-target enforcement claims. The inline project trust existed for that
process only, but that does not cure the unauthorized bypass.

The current target's `.codex/hooks.json` registers SessionStart,
UserPromptSubmit, and Stop only. It has no action-checkpoint PreToolUse entry.
The current `.claude/settings.json` does register both action hooks for Bash.
Therefore the native result proves that this CLI build can transport the
configured controlled sequence; it does not prove that PR #374 is installed,
trusted, or active for Codex in the current target. Normal Codex delivery still
requires a trusted project `.codex` layer and review of the exact hook
definition through `/hooks`, followed by read-only observation of effective
configuration. The current knowledge-save native review and dependent-work
policy remains the normal fallback; it supplies required agent behavior but no
mechanical Codex action hold until that setup and validation are authorized.

The one run also does not establish native stale-turn, third occurrence,
changed logical action, concurrent retry, compound command, Desktop, Claude,
Windows, restart, or long-term behavior. Deterministic tests cover several
state transitions but do not convert them into host-delivery evidence.

## Disposition at final source head

Final source head `108bc208b8604679c113dce320db3ea16f9c2b85` resolves both
reproduced defects with bounded changes and focused regressions. The final
integrated result above passes. Source review recommends the final PR #374
implementation; no source complexity blocker remains.

Native delivery has a separate disposition. The preserved run is valid only as
controlled CLI transport evidence from initial source `8a18c71`. Normal Codex
registration and trust on the actual target remain unproven, and the final
source correction was not rerun natively. Existing policy guidance remains the
fallback until authorized normal setup and native validation occur. The trust
limit is a reason to constrain the claim, never to bypass trust again.

## Editorial-only source review

The subsequent diff from reviewed source head
`108bc208b8604679c113dce320db3ea16f9c2b85` to
`ec106f692eaa49736dc9617b32747da3bce11e2e` changes only README wording from
“installed hook wiring” to “hook entry points.” Independent inspection confirmed
that exact scope, and `git diff --check` passed. No deterministic tests or model
trial were rerun for this editorial-only change.

The source recommendation therefore carries forward to
`ec106f692eaa49736dc9617b32747da3bce11e2e`. The controlled native trial remains
evidence against initial source `8a18c713abdeaa6a41dec1020248aa34b6e01784`;
it is not relabelled as a run against either later source head. Normal trusted
delivery on the current target remains pending.
