#!/usr/bin/env bash
# brain-flush.sh, persist any pending brain/ changes to the canonical
# memory repo and push. Called by the elected curator runner after a clean
# capture pass, by a foreground REMEMBER, and usable manually:
#   bash .claude/hooks/brain-flush.sh
#
# brain/ is gitignored on every branch; brain-sync.sh mirrors it to the
# memory repo through an ISOLATED clone (never the live .git) and keeps the
# working tree untouched. This hook is just the trigger.
# Plain shell, needs no elevated permissions. Always exits 0.
set -uo pipefail
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"   # absolute: survives callers that cd
[ -n "$HOOK_DIR" ] || exit 0
source "$HOOK_DIR/brain-lib.sh" 2>/dev/null || exit 0

brain_truthy "$BRAIN_ENABLED" || exit 0
command -v git >/dev/null 2>&1 || exit 0
git -C "$BRAIN_PROJECT_DIR" rev-parse --git-dir >/dev/null 2>&1 || exit 0

# brain-sync.sh is a no-op unless autosync is on (or --force), and is safe to
# call in the foreground here. It handles commit, signing, push, races,
# cache/store-head bookkeeping and cleanup.
bash "$HOOK_DIR/brain-sync.sh" >>"$BRAIN_GLOBAL_DIR/sync.log" 2>&1 || true
exit 0
