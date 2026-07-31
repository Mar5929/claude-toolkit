# git-workflows plugin

Three git lifecycle skills that are safe to run when other agent sessions may
share the same repo. They look before they act and stop rather than clobber
another session's in-flight work. Install on any project; not stack-specific.

## Install

```
/plugin install git-workflows
```

## Skills

- **pull-latest** (`/pull-latest`): brings a checkout up to date with its remote
  WITHOUT rewriting or discarding anything. It fetches and fast-forwards, or does
  a merge pull; it never rebases, resets, or pushes, and it stops rather than
  touch a dirty tree or another session's uncommitted work. The everyday,
  non-destructive "get current".

- **reset-to-remote** (`/reset-to-remote`): the destructive counterpart. It
  hard-resets the repo to exactly mirror the remote, the safe alternative to
  deleting and re-cloning. It is gated behind a preflight check and an explicit
  confirmation, because it throws away local changes.

- **merge-and-clean-up** (`/merge-and-clean-up`): verifies one exact pull
  request, merges it only with clear approval, updates the base checkout, and
  removes only that PR's clean branch and worktree. It proves the merge before
  deletion and handles squash merges without force-deleting unrelated work.

## How it relates to the rest of the toolkit

- These skills operationalize the stance in the `parallel-agent-sessions.md` general
  rule ("assume other Claude sessions share the repo") at the level of concrete
  git commands. The rule is the behavior; these are the safe commands. Not
  redundant with each other: pull-latest gets current, reset-to-remote
  deliberately discards local state, and merge-and-clean-up lands approved work
  before removing only its finished workspace.

## Maintaining this plugin

A content change here bumps both plugin manifests and `metadata.version` in the
repo's `.claude-plugin/marketplace.json`. Keep this README, the top-level README,
and `docs/toolkit-map.md` current when the skills change.
