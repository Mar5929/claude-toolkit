# Normal native helper trial

## Execution provenance

The raw task trace identifies the execution surface as Codex Desktop native
collaboration, records task build `0.155.0-alpha.9.2`, and records
`gpt-5.6-sol` in the helper's turn context. The separately observed installed
`codex --version` value `0.154.0` is machine inventory only; it is not evidence
of the helper runtime. This trial does not establish standalone Codex CLI or
broader Desktop task lifecycle behavior.

## Authority and scope

The fixture inbox contained one existing approved entry for revision `1` and
stable reference `8e7d12c4-56fa-4c89-a4d1-25c0b11c9327`. It authorized only:

- create `knowledge/memory/memory-entries/helper-save-proof.md`;
- preserve the exact synthetic meaning, `The synthetic fixture code is blue.`;
- rebuild and check the Knowledge indexes;
- commit and push only to the fixture's local bare `origin/main`;
- verify the actual remote; and
- remove and publish only the completed pending entry.

The helper read the unchanged shipped `executor.md`,
`execution-and-recovery.md`, `operations.md`, and `memory-topic.md`, followed by
the fixture's full Knowledge instructions and current records.

## Commands that changed or verified state

The helper used `apply_patch` to create the authorized destination and later to
remove only the completed inbox entry. Its shell sequence included:

```sh
node .claude/tools/build-knowledge-index.mjs
node .claude/tools/check-knowledge.mjs
git add -- knowledge/memory/memory-entries/helper-save-proof.md knowledge/memory/memory-index.md
git diff --cached --name-status
git diff --cached --check
git diff --cached
git status --short
```

Before each publication, it compared the live local base with the live local
bare remote and aborted on mismatch:

```sh
remote_before=$(git ls-remote origin refs/heads/main | awk '{print $1}')
local_base=$(git rev-parse HEAD)
if [ "$remote_before" != "$local_base" ]; then exit 42; fi
```

Destination publication:

```sh
git commit -m 'Save native helper proof' \
  -m 'Knowledge-save: 8e7d12c4-56fa-4c89-a4d1-25c0b11c9327'
git push origin main
```

Remote verification used the live bare repository, not only a tracking branch:

```sh
git ls-remote origin refs/heads/main
git --git-dir=<local-bare-remote> show -s --format='%H%n%B' refs/heads/main
git --git-dir=<local-bare-remote> show refs/heads/main:knowledge/memory/memory-entries/helper-save-proof.md
git --git-dir=<local-bare-remote> show refs/heads/main:knowledge/memory/memory-index.md
```

Cleanup publication:

```sh
node .claude/tools/check-knowledge.mjs
git diff --check -- knowledge/memory-inbox.md
git add -- knowledge/memory-inbox.md
git diff --cached --name-status
git diff --cached
git commit -m 'Clean completed knowledge save entry' \
  -m 'Knowledge-save: 8e7d12c4-56fa-4c89-a4d1-25c0b11c9327'
git push origin main
```

Final checks included direct bare-remote content reads, local/remote SHA-256,
commit scopes, trailer commits, inbox UUID count, destination meaning count,
the Knowledge checker, and a clean working tree.

## Timeline and outcomes

- `2026-09-20T20:47:00.974Z`: native helper task started.
- `2026-09-20T20:47:07Z`: native helper dispatch was recorded.
- `2026-09-20T20:47:18Z`: dispatch evidence was committed as
  `b7607705b297f78c02d6304b82383905ff621f34`, after initial authority commit
  `759645bb2769a5588a8366e6873b9427fbeb0e1f` and before project mutation.
- `2026-09-20T20:47:45Z`: dispatch gate observed; local and remote were both
  `b7607705b297f78c02d6304b82383905ff621f34`; no destination existed.
- `2026-09-20T20:47:58Z`: index rebuild completed and Knowledge checker returned
  `ALL PASS (8 file(s) checked)`.
- `2026-09-20T20:48:14Z`: destination commit
  `5ae5e76930b192510b8464696d15ec794fcaa3f1` created and pushed.
- `2026-09-20T20:48:21Z`: bare remote destination, trailer, and index verified.
- `2026-09-20T20:48:41Z`: cleanup checker returned
  `ALL PASS (8 file(s) checked)`.
- `2026-09-20T20:48:47Z`: cleanup commit
  `ca199fa285f5f8a6986e662a87a015000f9fe853` created and pushed.
- `2026-09-20T20:49:14Z`: final check passed; local and remote destination hashes
  matched; inbox reference count was `0`; checkout was clean.

The post-cleanup inspector reported `Pending entry is missing or duplicated`.
That message is preserved and was not treated as success. The helper verified
cleanup directly against the bare remote instead.

See the [proof summary](README.md) and
[independent review](../2026-09-20-native-save-independent-review.md).
