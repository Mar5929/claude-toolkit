# Lost-response recovery trial

## Execution provenance

The raw task trace identifies the execution surface as Codex Desktop native
collaboration, records task build `0.155.0-alpha.9.2`, and records
`gpt-5.6-sol` in the recovery helper's turn context. The separately observed
installed `codex --version` value `0.154.0` is machine inventory only; it is not
evidence of the helper runtime. This trial does not establish standalone Codex
CLI or broader Desktop task lifecycle behavior.

## Starting condition

A separate stale worktree started at
`b7607705b297f78c02d6304b82383905ff621f34`. Its inbox still contained the same
approved UUID and exact authority. The live local bare `origin/main` was already
at `ca199fa285f5f8a6986e662a87a015000f9fe853`. The fresh recovery helper received
no prior helper result.

The helper read the unchanged shipped `executor.md`,
`execution-and-recovery.md`, and `operations.md`, followed by all fixture
instructions and current records.

## Commands and evidence

Before any replay, at `2026-09-20T20:51:07Z`:

```sh
node .claude/tools/inspect-knowledge-save.mjs \
  <recovery-root> \
  8e7d12c4-56fa-4c89-a4d1-25c0b11c9327 \
  origin main \
  knowledge/memory/memory-entries/helper-save-proof.md
```

It then fetched and proved the stale checkout was an ancestor of the remote:

```sh
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/main
git fetch origin main
git merge-base --is-ancestor HEAD FETCH_HEAD
git log --format=fuller --decorate --stat HEAD..FETCH_HEAD
```

It read the remote destination, generated index, inbox, exact trailer commits,
and both commit diffs before reconciling. At `2026-09-20T20:51:46Z` it used:

```sh
git merge --ff-only origin/main
node .claude/tools/build-knowledge-index.mjs
node .claude/tools/check-knowledge.mjs
```

Final verification included live local/remote heads, exact trailer count,
destination occurrences, destination path count, inbox UUID occurrences, commit
ancestry, file hashes, unstaged diff, staged diff, and clean status.

## Outcome

- Inspector found the authorized destination on verified remote commit
  `ca199fa285f5f8a6986e662a87a015000f9fe853`.
- Destination commit was exactly
  `5ae5e76930b192510b8464696d15ec794fcaa3f1`.
- Cleanup commit was exactly
  `ca199fa285f5f8a6986e662a87a015000f9fe853`.
- Exactly two stable-reference trailers existed: one destination commit and one
  cleanup commit.
- Only the destination commit changed the destination.
- Destination SHA-256 was
  `c90eb2cad8ebf27e0cd44bbf523bb8066cc18ee169c256a4ea3da8ca326c4610`.
- The destination existed once and stated the approved meaning exactly.
- The inbox had no remaining UUID entry.
- The Knowledge checker returned `ALL PASS (8 file(s) checked)`.
- Local `HEAD`, local `origin/main`, and live remote `main` all matched.
- No destination, commit, or push was replayed.

The post-fast-forward inspector again reported the expected missing-entry
condition after cleanup. It was preserved as a limitation and not counted as a
successful inspection.

See the [proof summary](README.md) and
[independent review](../2026-09-20-native-save-independent-review.md).
