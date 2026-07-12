#!/usr/bin/env bash
# brain-hydrate.sh, SessionStart. Converge this worktree's brain/ cache
# with the canonical memory repo: an empty cache (fresh clone / fresh Claude-
# desktop worktree) is filled; a stale cache (the machine has seen a newer
# store head) is additively overlaid, local-only files are never deleted.
# Fetches the remote first (cross-machine freshness), offline-safe; always
# exits 0. Runs BEFORE brain-inject.sh so the digest exists to inject.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/brain-lib.sh" 2>/dev/null || exit 0
brain_truthy "$BRAIN_ENABLED" || exit 0
[ -n "${BRAIN_CURATOR_ACTIVE:-}" ] && exit 0
brain_refresh --fetch
exit 0
