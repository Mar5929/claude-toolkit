#!/usr/bin/env bash
# brain-lib.sh, shared helpers for the second-brain memory hooks.
# Sourced by memory-inject / memory-retrieve / memory-capture / memory-sync /
# memory-flush / memory-repair / memory-hydrate. Pure functions + config.
# Never exits the caller; every function is best-effort.
#
# Owned by the brain-curator system (see .claude/agents/brain-curator.md and
# brain/ARCHITECTURE.md). Safe to read; don't wire new writers to memory here.
#
# ARCHITECTURE (v2, "journal everywhere, curate once, publish once"):
#   * Every worktree keeps a LOCAL gitignored cache at <worktree>/brain/.
#   * All cross-session coordination lives in ONE machine-global dir
#     (~/.cache/second-brain/<repo-key>/): the shared journal + cursor, the
#     curator/sync locks, the last-run stamp, the current-head marker, the
#     single hidden sync clone, and the logs. Per-worktree .runtime/ can never
#     coordinate across worktrees, this dir is what does.
#   * The canonical store is the dedicated memory repo (BRAIN_REMOTE,
#     normally a dedicated private sibling repo). When unset, falls back
#     to the legacy orphan 'second-brain' branch of the app repo's origin, so
#     the system keeps working before/without the migration.

# --- Resolve project + memory dirs -------------------------------------------
if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ -d "${CLAUDE_PROJECT_DIR:-}" ]; then
  BRAIN_PROJECT_DIR="$CLAUDE_PROJECT_DIR"
else
  BRAIN_PROJECT_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel 2>/dev/null)"
  if [ -z "$BRAIN_PROJECT_DIR" ]; then
    BRAIN_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)"
  fi
fi
BRAIN_DIR="$BRAIN_PROJECT_DIR/brain"
BRAIN_RUNTIME="$BRAIN_DIR/.runtime"

# --- Config (env overrides; sensible defaults) -------------------------------
: "${BRAIN_ENABLED:=1}"     # master switch
: "${BRAIN_INJECT:=1}"      # inject digest at SessionStart
: "${BRAIN_RETRIEVE:=1}"    # surface relevant nodes on UserPromptSubmit
: "${BRAIN_CAPTURE:=1}"     # journal on Stop (+ leader election)
: "${BRAIN_AUTORUN:=1}"     # allow spawning the curator (vs journal-only)
: "${BRAIN_AUTOSYNC:=0}"    # allow the curator's flush to push
: "${BRAIN_REMOTE:=}"       # git URL of the dedicated brain repo;
                                    # empty -> legacy: app origin + orphan branch
: "${BRAIN_BRANCH:=}"       # branch in the memory repo (empty -> main, or
                                    # second-brain in legacy mode)
: "${BRAIN_MODEL:=sonnet}"  # model for the background curator
: "${BRAIN_KNOWLEDGE:=1}"   # phase-2 knowledge-curator when app code changed
: "${BRAIN_CODE_PATH_REGEX:=}"  # ERE over changed[] paths that counts as "app code"
                            # (e.g. "src/|lib/|app/"); empty = any change counts
: "${BRAIN_CURATOR_TIMEOUT:=1200}"  # seconds ONE curator phase may take
: "${BRAIN_CURATOR_INTERVAL:=900}"  # min seconds between curator runs (machine-wide)

# Never let a backgrounded/detached git op block on a credential/terminal prompt
# (it would hold the sync lock until the stale-steal). Fail fast.
export GIT_TERMINAL_PROMPT=0

brain_truthy() { case "${1:-}" in 1|true|TRUE|yes|YES|on|ON) return 0 ;; *) return 1 ;; esac; }

# System on? (master switch AND not inside a curator's own run, recursion guard)
brain_active() {
  brain_truthy "$BRAIN_ENABLED" || return 1
  [ -n "${BRAIN_CURATOR_ACTIVE:-}" ] && return 1
  [ -d "$BRAIN_DIR" ] || return 1
  return 0
}

# --- Canonical store target ---------------------------------------------------
brain_remote_url() {
  if [ -n "$BRAIN_REMOTE" ]; then printf '%s' "$BRAIN_REMOTE"
  else git -C "$BRAIN_PROJECT_DIR" remote get-url origin 2>/dev/null; fi
}
brain_target_branch() {
  if   [ -n "$BRAIN_BRANCH" ]; then printf '%s' "$BRAIN_BRANCH"
  elif [ -n "$BRAIN_REMOTE" ]; then printf 'main'
  else printf 'second-brain'; fi
}

# --- Machine-global coordination dir ------------------------------------------
# Keyed by the APP repo's origin URL so every worktree/clone of this project on
# this machine shares one journal, one lock, one clone. (Falls back to the
# project path when there is no origin, solo/offline still works, per-dir.)
brain_repo_key() {
  local url
  url="$(git -C "$BRAIN_PROJECT_DIR" remote get-url origin 2>/dev/null)"
  [ -n "$url" ] || url="$BRAIN_PROJECT_DIR"
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$url" | shasum -a 256 2>/dev/null | cut -c1-16
  elif command -v sha256sum >/dev/null 2>&1; then
    printf '%s' "$url" | sha256sum 2>/dev/null | cut -c1-16
  else
    printf '%s' "$url" | cksum 2>/dev/null | tr ' \t' '--'
  fi
}
BRAIN_GLOBAL_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/second-brain/$(brain_repo_key)"
BRAIN_JOURNAL="$BRAIN_GLOBAL_DIR/journal.jsonl"      # every session appends; one line per turn
BRAIN_CURSOR="$BRAIN_GLOBAL_DIR/journal.cursor"      # lines already drained by a clean curator run
BRAIN_LASTRUN="$BRAIN_GLOBAL_DIR/last-run"           # epoch of the last curator start (debounce)
BRAIN_CURRENT_HEAD="$BRAIN_GLOBAL_DIR/current-head"  # memory-repo HEAD the machine last saw/pushed
BRAIN_LOG="$BRAIN_GLOBAL_DIR/hook.log"

brain_log() {
  mkdir -p "$BRAIN_GLOBAL_DIR" 2>/dev/null || return 0
  printf '%s %s\n' "$(date -u +%FT%TZ 2>/dev/null)" "$*" >>"$BRAIN_LOG" 2>/dev/null || true
}

# --- Machine-global mkdir lock (best-effort, self-healing) --------------------
# $1 name; $2 wait seconds (0 = single non-blocking attempt); $3 stale-steal age
# in seconds (default 300, pass a larger value for locks held across a long
# curator run, or a live run gets its lock stolen out from under it).
brain_lock() {
  local name="${1:-mem}" timeout="${2:-20}" steal="${3:-300}" waited=0
  local d="$BRAIN_GLOBAL_DIR/locks/$name.lock"
  mkdir -p "$BRAIN_GLOBAL_DIR/locks" 2>/dev/null || return 1
  while ! mkdir "$d" 2>/dev/null; do
    if [ -d "$d" ]; then
      local age
      age="$(( $(date +%s 2>/dev/null || echo 0) - $(stat -c %Y "$d" 2>/dev/null || stat -f %m "$d" 2>/dev/null || echo 0) ))"
      if [ "$age" -gt "$steal" ] 2>/dev/null; then
        # Steal by ATOMIC RENAME, not rm -rf: with two contenders, only one mv
        # succeeds, the loser re-loops and races mkdir fairly. A bare rm -rf
        # here could delete a FRESH lock the winner just recreated (both saw
        # the stale dir, one stole+relocked, the other's rm then killed it →
        # two concurrent curators). The age re-stat just before mv shrinks the
        # replaced-underneath window to microseconds.
        age="$(( $(date +%s 2>/dev/null || echo 0) - $(stat -c %Y "$d" 2>/dev/null || stat -f %m "$d" 2>/dev/null || echo 0) ))"
        if [ "$age" -gt "$steal" ] 2>/dev/null && mv "$d" "$d.reaped.$$" 2>/dev/null; then
          rm -rf "$d.reaped.$$" 2>/dev/null
          brain_log "lock $name: reaped stale lock (age ${age}s > ${steal}s)"
        fi
        continue
      fi
    fi
    waited=$((waited + 1)); [ "$waited" -gt "$timeout" ] && return 1
    sleep 1
  done
  printf '%s' "$$" >"$d/pid" 2>/dev/null || true
  return 0
}
brain_unlock() { rm -rf "$BRAIN_GLOBAL_DIR/locks/${1:-mem}.lock" 2>/dev/null || true; }

# --- Timeout wrapper (PATH-proof) ---------------------------------------------
# Hook subprocesses don't get the interactive shell's PATH; Homebrew coreutils
# may be installed but invisible. Resolve a binary explicitly; fall back to a
# pure-shell watchdog so a runaway curator can NEVER run unbounded.
brain_timeout_bin() {
  local c
  for c in timeout gtimeout /opt/homebrew/bin/timeout /opt/homebrew/bin/gtimeout \
           /usr/local/bin/timeout /usr/local/bin/gtimeout; do
    command -v "$c" >/dev/null 2>&1 && { printf '%s' "$c"; return 0; }
  done
  return 1
}
brain_run_with_timeout() {  # $1 = seconds; rest = command. rc, or 124 if killed.
  local secs="$1"; shift
  local tb ka="${BRAIN_TIMEOUT_KILLAFTER:-30}"
  # -k: escalate to SIGKILL if the command survives SIGTERM (a node process can
  # trap/ignore TERM; the run ledger once recorded a 1033s run under a 600s
  # budget). The shell watchdog below escalates the same way.
  if tb="$(brain_timeout_bin)"; then "$tb" -k "$ka" "$secs" "$@"; return $?; fi
  "$@" &
  local cpid=$!
  ( sleep "$secs"; kill "$cpid" 2>/dev/null; sleep "$ka"; kill -9 "$cpid" 2>/dev/null ) &
  local wpid=$!
  local rc; wait "$cpid"; rc=$?
  kill "$wpid" 2>/dev/null; wait "$wpid" 2>/dev/null
  [ "$rc" -ge 128 ] && rc=124   # signal-death (incl. our watchdog) counts as timeout
  return "$rc"
}

# --- Absolute-path test (POSIX *and* Windows drive-letter) --------------------
# Git-for-Windows returns drive-letter paths from rev-parse ("C:/repo/.git"), which
# a bare `case $p in /*)` test misreads as RELATIVE. Every git-path resolution must
# accept BOTH forms, or it silently builds a bogus path like
# "<worktree>/C:/repo/.git", fails the cd, and takes the fallback branch.
# That is exactly what made a linked worktree resolve as its OWN primary checkout:
# the curator then ran against the worktree's brain/, which holds only the
# gitignored README signpost, so every publish was skipped as a "gutted store" and
# memory silently never persisted from any worktree session on Windows.
brain_is_abs() {
  case "${1:-}" in
    /*|[A-Za-z]:/*|[A-Za-z]:\\*) return 0 ;;
    *) return 1 ;;
  esac
}

# --- Primary checkout (always exists; ephemeral worktrees may not) -------------
brain_primary_dir() {
  local cdir
  cdir="$(git -C "$BRAIN_PROJECT_DIR" rev-parse --git-common-dir 2>/dev/null)"
  [ -n "$cdir" ] || { printf '%s' "$BRAIN_PROJECT_DIR"; return 0; }
  brain_is_abs "$cdir" || cdir="$BRAIN_PROJECT_DIR/$cdir"
  # Emit a NATIVE path on Windows (`pwd -W` -> "C:/repo"), never the msys form
  # ("/c/repo"). This value is exported as CLAUDE_PROJECT_DIR for the spawned
  # curator, and native binaries cannot open an msys path: node's
  # existsSync("/c/...") is literally false, so the curator's own hooks (e.g. a
  # settings.json entry running `node "$CLAUDE_PROJECT_DIR/.claude/hooks/x.js"`)
  # would break. `pwd -W` is an msys extension: it fails on Linux/macOS, where
  # plain `pwd` is already correct, so the fallback keeps those unchanged.
  ( cd "$(dirname "$cdir")" 2>/dev/null && { pwd -W 2>/dev/null || pwd; } ) \
    || printf '%s' "$BRAIN_PROJECT_DIR"
}

# --- Commit identity + signing -----------------------------------------------
brain_git_identity() {
  export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-Claude}"
  export GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-noreply@anthropic.com}"
  export GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-$GIT_AUTHOR_NAME}"
  export GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-$GIT_AUTHOR_EMAIL}"
}
brain_sign_flag() {  # $1 = repo/worktree dir (default project dir). Echoes "-S" or "".
  local dir="${1:-$BRAIN_PROJECT_DIR}"
  if [ -n "$(git -C "$dir" config --get user.signingkey 2>/dev/null)" ]; then
    printf -- '-S'
  fi
}
# Copy the signing-relevant config from the main repo into an isolated clone so
# signed commits keep working there. No-op for keys that aren't set.
brain_copy_signing_config() {  # $1 = target repo dir
  local sr="$1" P="$BRAIN_PROJECT_DIR" k v
  for k in commit.gpgsign gpg.format user.signingkey gpg.ssh.program gpg.ssh.allowedSignersFile tag.gpgsign; do
    v="$(git -C "$P" config --get "$k" 2>/dev/null)"
    [ -n "$v" ] && git -C "$sr" config "$k" "$v" 2>/dev/null || true
  done
}

# --- Isolated sync clone (own .git, never touches the app repo's) ----------
# ONE per machine, in the global dir (per-worktree clones caused divergent
# caches + digest ping-pong). All access serialized by the global 'sync' lock.
brain_sync_repo_dir() { printf '%s' "$BRAIN_GLOBAL_DIR/sync-repo"; }

# Ensure the isolated clone exists and is positioned on the target branch
# (fresh from the memory remote), OR prepared as an unborn orphan if the branch
# is absent. Returns 0 ready, 1 on failure. Touches ONLY the global sync-repo.
brain_sync_repo_prepare() {
  local sr B url
  sr="$(brain_sync_repo_dir)"
  B="$(brain_target_branch)"
  command -v git >/dev/null 2>&1 || return 1
  url="$(brain_remote_url)"
  [ -n "$url" ] || return 1

  if [ ! -d "$sr/.git" ]; then
    rm -rf "$sr" 2>/dev/null; mkdir -p "$sr" 2>/dev/null || return 1
    git -C "$sr" init -q 2>/dev/null || return 1
  fi
  git -C "$sr" remote add origin "$url" 2>/dev/null \
    || git -C "$sr" remote set-url origin "$url" 2>/dev/null
  git -C "$sr" config user.name  "Claude"                2>/dev/null || true
  git -C "$sr" config user.email "noreply@anthropic.com" 2>/dev/null || true
  brain_copy_signing_config "$sr"

  git -C "$sr" fetch --quiet origin "$B" 2>/dev/null || true
  if git -C "$sr" show-ref --verify --quiet "refs/remotes/origin/$B" 2>/dev/null; then
    if ! git -C "$sr" checkout -q -B "$B" "refs/remotes/origin/$B" 2>/dev/null \
       || ! git -C "$sr" reset -q --hard "refs/remotes/origin/$B" 2>/dev/null; then
      rm -rf "$sr" 2>/dev/null; return 1     # nuke so the next attempt reinits clean
    fi
  else
    # Branch absent on the remote, prepare an unborn orphan to seed it.
    git -C "$sr" checkout -q --orphan "$B" 2>/dev/null || { rm -rf "$sr" 2>/dev/null; return 1; }
    git -C "$sr" rm -rfq --cached . 2>/dev/null || true
    find "$sr" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} + 2>/dev/null || true
  fi
  return 0
}

# Copy the live store into $1, excluding runtime/journal/README. Portable (tar).
brain_mirror_store() {  # $1 = destination dir (already positioned on the branch)
  local dest="$1"
  [ -d "$BRAIN_DIR" ] || return 1
  ( cd "$BRAIN_DIR" 2>/dev/null \
      && tar cf - --exclude='./.runtime' --exclude='./sessions/_journal.jsonl' \
                  --exclude='./README.md' . 2>/dev/null ) \
    | ( cd "$dest" 2>/dev/null && tar xf - 2>/dev/null ) || return 1
  return 0
}

# Overlay the sync clone's content ONTO the local cache (additive: adds/updates
# files, never deletes local-only ones; excludes the clone's .git).
brain_overlay_from_clone() {
  local sr; sr="$(brain_sync_repo_dir)"
  [ -d "$sr/.git" ] || return 1
  git -C "$sr" rev-parse -q --verify HEAD >/dev/null 2>&1 || return 1
  ( cd "$sr" 2>/dev/null && tar cf - --exclude='./.git' . 2>/dev/null ) \
    | ( cd "$BRAIN_DIR" 2>/dev/null && tar xf - 2>/dev/null ) || return 1
  return 0
}

# --- Refresh: keep this worktree's cache converged with the canonical store ---
# Replaces the old fill-only hydrate. Two modes:
#   brain_refresh --fetch   SessionStart: refresh the clone from the remote first
#                         (pulls cross-machine updates; offline-safe), then
#                         reconcile the cache.
#   brain_refresh           per-prompt cheap path: reconcile the cache with the
#                         LOCAL clone only (two file reads on the fast path,
#                         no network, no locks unless an overlay is needed).
# Never runs while a curator holds the global lock (its half-written cache must
# not be mixed with an overlay mid-pass).
brain_refresh() {
  local fetch=0; [ "${1:-}" = "--fetch" ] && fetch=1
  mkdir -p "$BRAIN_DIR" 2>/dev/null
  command -v git >/dev/null 2>&1 || return 0
  [ -n "$(brain_remote_url)" ] || return 0
  [ -d "$BRAIN_GLOBAL_DIR/locks/curator.lock" ] && return 0

  local sr head mine
  sr="$(brain_sync_repo_dir)"
  if [ "$fetch" = 1 ] || [ ! -d "$sr/.git" ]; then
    brain_lock sync 20 || return 0
    if brain_sync_repo_prepare && git -C "$sr" rev-parse -q --verify HEAD >/dev/null 2>&1; then
      git -C "$sr" rev-parse HEAD >"$BRAIN_CURRENT_HEAD" 2>/dev/null || true
    fi
    brain_unlock sync
  fi

  head="$(cat "$BRAIN_CURRENT_HEAD" 2>/dev/null)"
  [ -n "$head" ] || return 0
  mine="$(cat "$BRAIN_RUNTIME/store-head" 2>/dev/null)"
  if [ ! -f "$BRAIN_DIR/index.json" ] || [ "$head" != "$mine" ]; then
    brain_lock sync 20 || return 0
    if [ "$(git -C "$sr" rev-parse HEAD 2>/dev/null)" = "$head" ] && brain_overlay_from_clone; then
      mkdir -p "$BRAIN_RUNTIME" 2>/dev/null
      printf '%s' "$head" >"$BRAIN_RUNTIME/store-head" 2>/dev/null || true
      brain_log "refresh: cache at $BRAIN_DIR updated to $head"
    fi
    brain_unlock sync
  fi
  return 0
}

# --- Repair: clear ANY legacy state; never fight a foreground op --------------
# Encodes the documented manual recovery, idempotently. Safe to run any time;
# after migration there are no tracked brain/ paths so the skip-worktree
# sweep is a no-op. Works inside a linked worktree (shared info/exclude).
brain_repair() {
  local P="$BRAIN_PROJECT_DIR" gd cdir ex
  command -v git >/dev/null 2>&1 || return 0
  git -C "$P" rev-parse --git-dir >/dev/null 2>&1 || return 0

  gd="$(git -C "$P" rev-parse --git-dir 2>/dev/null)"
  brain_is_abs "$gd" || gd="$P/$gd"
  if [ -e "$gd/index.lock" ]; then brain_log "repair: index.lock present, skipping"; return 0; fi

  # 1) Clear lingering --skip-worktree bits on any tracked brain/ path.
  git -C "$P" ls-files -v -- brain 2>/dev/null \
    | awk '/^S/ { sub(/^S[[:space:]]+/, ""); print }' \
    | tr '\n' '\0' \
    | xargs -0 git -C "$P" update-index --no-skip-worktree -- 2>/dev/null || true

  # 2) Drop the '/brain/' line from the SHARED info/exclude.
  cdir="$(git -C "$P" rev-parse --git-common-dir 2>/dev/null)"
  brain_is_abs "$cdir" || cdir="$P/$cdir"
  ex="$cdir/info/exclude"
  if [ -f "$ex" ] && grep -qxF '/brain/' "$ex" 2>/dev/null; then
    # grep -v exits 1 when it selects ZERO lines (i.e. the file was ONLY the
    # /brain/ line). That is success here (result = empty file), not failure,
    # so gate on the exit code, not its truthiness, or the line never gets removed.
    grep -vxF '/brain/' "$ex" >"$ex.mem.tmp" 2>/dev/null; local grc=$?
    if [ "$grc" -le 1 ]; then
      mv "$ex.mem.tmp" "$ex" 2>/dev/null || rm -f "$ex.mem.tmp" 2>/dev/null
    else
      rm -f "$ex.mem.tmp" 2>/dev/null
    fi
  fi

  # 3) Retire legacy PER-WORKTREE coordination state (v1): the old hidden clone
  # and lock dir now live machine-globally. Only this worktree's own retired
  # hooks ever used these paths, so removing them is safe post-upgrade.
  rm -rf "$BRAIN_RUNTIME/sync-repo" "$BRAIN_RUNTIME/locks" 2>/dev/null || true
  return 0
}

# --- JSON string escape (for journal writing without jq dependency) ----------
brain_json_escape() {
  if command -v jq >/dev/null 2>&1; then
    jq -Rs '.' | sed 's/^"//; s/"$//'
  else
    python3 -c 'import json,sys; s=sys.stdin.read(); print(json.dumps(s)[1:-1])' 2>/dev/null \
      || sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e ':a;N;$!ba;s/\n/\\n/g'
  fi
}
