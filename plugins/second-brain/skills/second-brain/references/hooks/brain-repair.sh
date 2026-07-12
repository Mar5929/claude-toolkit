#!/usr/bin/env bash
# brain-repair.sh, SessionStart guard. Clears any lingering legacy "shield"
# state (skip-worktree bits on brain/, a '/brain/' line in info/exclude)
# so a session can NEVER start with foreground git stuck, and any clone still
# carrying old state self-heals. Runs even when the memory system is disabled,
# repair is a pure safety net. Never fights a foreground op (bails on index.lock).
# Read-mostly; always exits 0. Also runnable manually.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/brain-lib.sh" 2>/dev/null || exit 0
brain_repair
exit 0
