# Native Knowledge save helper proof

Date: 2026-09-20

The [independent review](../2026-09-20-native-save-independent-review.md)
corroborates this summary against the retained fixture and task evidence.

## Result

One bounded Codex Desktop native collaboration-helper save and one lost-response
recovery trial passed. Both helper traces recorded `gpt-5.6-sol`. The test used
only a disposable Git repository and a local bare remote. It did not change the
toolkit repository, an external remote, authentication, trust, or settings.

The normal helper created exactly one authorized memory, rebuilt the index,
passed the Knowledge checker, committed and published the destination, verified
the bare remote, removed only its pending inbox entry, published that cleanup,
and returned its result. While the helper was still reported running, the parent
answered an unrelated read-only timezone request. The helper result arrived
after that response.

The recovery helper received no prior result. It started from a stale checkout
whose inbox still contained the same approved UUID, inspected the actual remote,
found the completed save and cleanup, fast-forwarded safely, and made no new
commit or push.

## Environment

- Execution surface: Codex Desktop native collaboration helper
- Desktop task build recorded in session metadata: `0.155.0-alpha.9.2`
- Helper model recorded in turn context: `gpt-5.6-sol`
- Installed `codex --version`: `0.154.0` (inventory only; not evidence of the helper runtime)
- Node.js: `v25.8.1`
- Git: `2.54.0 (Apple Git-157)`
- Host: macOS `26.6.2` build `25G83`
- Fixture remote: local bare Git repository only
- Stable synthetic reference: `8e7d12c4-56fa-4c89-a4d1-25c0b11c9327`
- Approved revision: `1`

Host, user, task, and conversation identifiers are omitted. The UUID and content
are synthetic test data, not private project information.

## Verified artifacts

- Initial authority commit: `759645bb2769a5588a8366e6873b9427fbeb0e1f`
- Subsequent dispatch-evidence commit: `b7607705b297f78c02d6304b82383905ff621f34`
- Destination commit: `5ae5e76930b192510b8464696d15ec794fcaa3f1`
- Cleanup commit and final remote tip: `ca199fa285f5f8a6986e662a87a015000f9fe853`
- Destination: `knowledge/memory/memory-entries/helper-save-proof.md`
- Destination SHA-256: `c90eb2cad8ebf27e0cd44bbf523bb8066cc18ee169c256a4ea3da8ca326c4610`
- Final Knowledge check: `ALL PASS (8 file(s) checked)`
- Final inbox: only `# Pending knowledge saves`; UUID occurrence count `0`
- Final destination occurrence count: `1`
- Final local and remote state: identical and clean

The destination commit changed only the destination and generated memory index.
The cleanup commit changed only the inbox. Exactly two commits carry the stable
reference trailer: the destination publication and its cleanup publication.

## Concurrent parent request

- Native helper task started: `2026-09-20T20:47:00.974Z`
- Native helper dispatch recorded: `2026-09-20T20:47:07Z`
- Dispatch evidence committed: `2026-09-20T20:47:18Z`
- Parent confirmed helper status `running`, then answered the unrelated request
  at `2026-09-20T20:47:38Z`.
- Answer: configured timezone `America/New_York`; current abbreviation `EDT`.
- The helper first observed its dispatch gate at `2026-09-20T20:47:45Z` after
  completing its required instruction reads.
- Destination remote verification completed at `2026-09-20T20:48:21Z`.
- Final helper verification completed at `2026-09-20T20:49:14Z`, after the
  unrelated parent response.

This directly demonstrates concurrent native helper execution, an unrelated
parent response while the helper was active, and later helper result delivery in
this Codex Desktop collaboration host. It does not prove standalone Codex CLI
behavior, broader Desktop task lifecycle behavior, or survival across app
shutdown, host restart, network loss, parent-task termination, another operating
system, or another Codex Desktop build.

## Inspector behavior

The recovery helper correctly ran `inspect-knowledge-save.mjs` before replay,
while the stale inbox entry still existed. After cleanup was verified and the
stale checkout was fast-forwarded, later inspector calls reported that the
pending entry was missing. That post-cleanup message was preserved as an
expected limitation of an inbox-based inspector, not counted as a passing
inspection. Direct Git and bare-remote checks established the final state.

## Conclusion

The shipped executor and recovery instructions were sufficient for this bounded
Codex Desktop build `0.155.0-alpha.9.2`/macOS native collaboration-helper path.
No new executor, service, polling controller, or repository correction is
supported by these two trials.

Detailed records: [normal save trial](normal-trial.md) and
[lost-response recovery trial](recovery-trial.md).

This is one normal trial and one recovery trial only. It does not establish
reliability rates, standalone Codex CLI behavior, Claude behavior, broader
Desktop task lifecycle behavior, Windows behavior, cross-machine recovery, or
worker survival after host termination.
