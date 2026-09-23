# git-workflows plugin

Four git lifecycle skills that are safe to run when other agent sessions may
share the same repo. They look before they act and stop rather than clobber
another session's in-flight work. Install on any project; not stack-specific.

**Setup: install and go.** Install once per machine. It needs a git repository,
but nothing has to be set up inside it.

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

- **publish-docs** (`/publish-docs`): saves an authorized documentation-only
  change from an isolated, sparse worktree straight to the default branch:
  check, stage by name, commit, push, and verify the remote. Its script creates
  a separate staging area for each save. It holds the steps the
  path-scoped `knowledge-direct-commit.md` rule points to. Rules, skills,
  hooks, settings, and code still use a worktree and pull request.

## How it relates to the rest of the toolkit

- These skills operationalize the stance in the `parallel-agent-sessions.md` general
  rule ("assume other Claude sessions share the repo") at the level of concrete
  git commands. The rule is the behavior; these are the safe commands. Not
  redundant with each other: pull-latest gets current, reset-to-remote
  deliberately discards local state, merge-and-clean-up lands approved work
  before removing only its finished workspace, and publish-docs lands a
  documentation save without a pull request or a shared staging area.

## Maintaining this plugin

Run `node --test plugins/git-workflows/tests/publish-docs.test.mjs` after
changing the save helper. Its local Git fixtures cover separate staging areas,
remote advances, path limits, and knowledge checks in a sparse worktree.

A content change here bumps both plugin manifests and `metadata.version` in the
repo's `.claude-plugin/marketplace.json`. Keep this README, the top-level README,
and `docs/toolkit-map.md` current when the skills change.
