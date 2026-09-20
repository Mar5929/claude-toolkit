# Independent native Knowledge save review

Reviewed 2026-09-20 against the unchanged Knowledge save instructions at source head `fe04387171699f79dfdd37f334d2ed037f0a609e`. The coordinator independently confirmed the complete `knowledge-save` skill tree is unchanged between that source head and integrated candidate `4317289a94af45896325a7d5b578a5ae346aabc1`.

This review examined the disposable writer and recovery checkouts, their local bare remote, commit contents and ancestry, current files and hashes, Knowledge checker results, and native task event traces. It did not run another model trial or change source, authentication, trust, settings, or an external remote.

The [retained proof summary](native-save-helper-proof/README.md) links the normal
save and recovery trial records used by this review.

## Result

The evidence supports a bounded R9/R28 pass for the observed Codex Desktop-host native collaboration-helper path on macOS:

- A native helper running `gpt-5.6-sol` completed one authorized Knowledge save while its parent continued unrelated read-only work, then returned its result.
- The helper preserved the approved UUID, revision, destination, exact meaning, publication target, validation steps and cleanup scope.
- It created and published the destination exactly once, verified the actual local bare remote, removed only the completed inbox entry, published that cleanup, and left local and remote state clean and identical.
- A separate recovery helper running `gpt-5.6-sol` received no earlier helper result. Starting from a stale checkout with the same UUID and authority, it inspected the actual remote, found the completed save and cleanup, fast-forwarded, checked the result, and made no duplicate destination commit or push.

No executor, service, polling controller, or other new mechanism is supported by these two trials.

## Authority and final state

The initial fixture commit `759645bb2769a5588a8366e6873b9427fbeb0e1f` recorded the authority before helper dispatch. Commit `b7607705b297f78c02d6304b82383905ff621f34` then added dispatch evidence at `2026-09-20T20:47:18Z`, after the native helper task started at `20:47:00Z` but before the helper observed its gate or changed project state at `20:47:45Z`. The pending entry recorded:

- reference `8e7d12c4-56fa-4c89-a4d1-25c0b11c9327`;
- approved revision `1`;
- operation `create`;
- destination `knowledge/memory/memory-entries/helper-save-proof.md`;
- exact durable meaning `The synthetic fixture code is blue.`;
- permission to rebuild/check indexes, commit and push only to the fixture's local bare `origin/main`, verify that remote, and remove only this completed entry after verification; and
- explicit exclusion of other repositories, remotes, authentication, trust and settings.

The observed remote history is:

1. fixture initialization and initial authority `759645bb2769a5588a8366e6873b9427fbeb0e1f`;
2. dispatch-evidence update `b7607705b297f78c02d6304b82383905ff621f34` before helper mutation;
3. destination publication `5ae5e76930b192510b8464696d15ec794fcaa3f1`; and
4. cleanup publication and final tip `ca199fa285f5f8a6986e662a87a015000f9fe853`.

The destination commit changes only the new memory and generated memory index. The cleanup commit changes only `knowledge/memory-inbox.md`. Exactly two commits carry the stable-reference trailer: the destination publication and cleanup publication. The destination path changed in one commit only.

At final tip:

- the destination contains the approved meaning and required metadata;
- destination SHA-256 is `c90eb2cad8ebf27e0cd44bbf523bb8066cc18ee169c256a4ea3da8ca326c4610`;
- the generated memory index contains one link to the destination;
- the pending inbox contains zero UUID occurrences;
- writer and recovery checkouts both match the live bare remote tip and are clean; and
- the installed Knowledge checker returns `ALL PASS (8 file(s) checked)` in both checkouts.

These results were independently reproduced by read-only Git and checker commands against the retained fixture after the owner report was written.

## Native overlap and result return

Native events show the helper task started at `2026-09-20T20:47:00.974Z`. Its observed turn context records model `gpt-5.6-sol` with medium reasoning effort.

While the helper remained active, the parent ran an unrelated read-only timezone command at `2026-09-20T20:47:38.957Z`. It returned `America/New_York` and `EDT` to the parent turn. The helper subsequently verified the destination remote at `20:48:21Z`, completed final verification at `20:49:14Z`, and its native task completion/result arrived at `20:49:33.943Z`.

This proves parent work and helper execution overlapped, and that the helper result returned later while the parent task remained active. It does not prove helper survival after the parent finishes, terminates, disconnects, or shuts down.

## Recovery behavior

The recovery checkout deliberately remained at authority commit `b7607705b297f78c02d6304b82383905ff621f34`, with the same pending UUID and exact scope, while the actual bare remote already contained destination and cleanup at `ca199fa285f5f8a6986e662a87a015000f9fe853`.

The recovery helper's observed turn context records model `gpt-5.6-sol` with medium reasoning effort. Before replay, it ran the shipped inspector against the stale checkout and live remote, fetched the remote, proved the stale head was an ancestor, inspected the destination, index, inbox, trailers and commit diffs, then used a fast-forward-only merge. It rebuilt the index, ran the checker, and verified local and remote heads, hashes, ancestry, UUID count, destination count, staged and unstaged state.

No new destination, commit or push was produced. Post-fast-forward inspector calls reported the pending entry was missing, which is expected after verified cleanup. The trial did not count that message as a successful inspection; direct Git and bare-remote evidence established the completed state.

This is a simulated lost-result recovery from durable files and Git state. It proves idempotent discovery and reconciliation in that starting condition. It is not evidence of an actual network interruption, app restart, process crash, host failure, parent termination, or cross-computer reconnect.

## Host attribution

Both normal and recovery task metadata identify the originator as Codex Desktop on macOS. Their actual turn contexts record `gpt-5.6-sol`. The task-host build identifies itself as `0.155.0-alpha.9.2`.

The machine's installed `codex --version` reported `codex-cli 0.154.0`; that is environment inventory, not proof that the native collaboration tasks executed through the standalone CLI. The supported claim is therefore Codex Desktop-host native collaboration-helper behavior on this macOS host. It does not establish standalone Codex CLI behavior or broader Desktop task lifecycle behavior.

## Evidence limits

This is one normal save and one deliberately constructed recovery case. It does not establish a reliability rate or support claims about:

- parent finalization, interruption or termination;
- app or host shutdown and restart;
- network loss or a real remote service;
- another computer or cross-machine recovery;
- Codex standalone CLI execution;
- Claude Code;
- Windows;
- helpers or save destinations outside the tested authority; or
- concurrent writers and changed-meaning conflicts.

The retained local summaries were corrected after independent review. They now distinguish installed `codex-cli 0.154.0` inventory from the observed Codex Desktop-host task build and state the bounded Desktop-host collaboration-helper result and unsupported lifecycle surfaces consistently. This provenance correction changed the evidence description only; it did not change the fixture, executor instructions, or observed result.

R3/R9 action-review freshness remains open and is outside these helper trials.
