#!/usr/bin/env bash
# brain-sync.sh, persist brain/ to the canonical memory repo (normally the
# private sibling repo set in BRAIN_REMOTE; legacy fallback: the orphan
# 'second-brain' branch of the app repo's origin), through a SEPARATE clone
# that shares nothing with the app repo's .git. It can never lock or dirty the
# agent's index/refs, even mid-turn.
#
# Called by the curator's flush (after a clean capture pass), by a foreground
# REMEMBER, or manually with --force. NOT called per-turn, per-Stop autosync
# was removed because concurrent stale caches took turns republishing their own
# digests over each other (last-writer-wins ping-pong). One writer -> one
# publisher.
#
# Opt-in: does nothing unless BRAIN_AUTOSYNC is truthy OR called with
# --force. Non-fast-forward -> refetch/reset the clone and retry; branch
# protection -> STOP (never force-push). Always exits 0.
set -uo pipefail
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"   # absolute: survives callers that cd
[ -n "$HOOK_DIR" ] || exit 0
source "$HOOK_DIR/brain-lib.sh" 2>/dev/null || exit 0

force=0; [ "${1:-}" = "--force" ] && force=1
if ! brain_truthy "$BRAIN_AUTOSYNC" && [ "$force" != 1 ]; then exit 0; fi

command -v git >/dev/null 2>&1 || exit 0
P="$BRAIN_PROJECT_DIR"
git -C "$P" rev-parse --git-dir >/dev/null 2>&1 || exit 0
[ -n "$(brain_remote_url)" ] || { brain_log "sync: no memory remote configured"; exit 0; }
[ -d "$BRAIN_DIR" ] || exit 0

SYNC_LOG="$BRAIN_GLOBAL_DIR/sync.log"

# Safety: NEVER mirror/push an empty or half-gutted store over the canonical
# branch. The store can be transiently gutted (e.g. a fresh clone before
# hydrate). Mirror semantics would faithfully push that emptiness and clobber
# the good branch. If index.json/BRAIN.md are absent, skip, a refresh refills
# the cache, and a later sync then captures the real content.
if [ ! -f "$BRAIN_DIR/index.json" ] || [ ! -f "$BRAIN_DIR/BRAIN.md" ]; then
  brain_log "sync: store looks empty/gutted (missing index.json or BRAIN.md), skipping to avoid clobbering the branch"
  exit 0
fi
# index.json must be parseable, never publish a torn/truncated index (e.g. from a
# curator killed mid-write) as the canonical baseline every future refresh builds on.
#
# Feed the file on STDIN, never as a PATH argument: jq and python3 are NATIVE
# binaries, and on Git-for-Windows they cannot open an msys "/c/..." POSIX path.
# Handing them the path made a perfectly good index.json look torn, which
# silently skipped EVERY publish (a fail-closed guard turning into a permanent
# outage). The shell does the redirection, so the path resolves on every platform.
brain_json_valid() {  # $1 = file
  if   command -v jq      >/dev/null 2>&1; then jq -e . >/dev/null 2>&1 <"$1"
  elif command -v python3 >/dev/null 2>&1; then python3 -c 'import json,sys; json.load(sys.stdin)' <"$1" >/dev/null 2>&1
  elif command -v python  >/dev/null 2>&1; then python  -c 'import json,sys; json.load(sys.stdin)' <"$1" >/dev/null 2>&1
  else return 0; fi   # no validator on this box: don't block the publish
}
brain_json_valid "$BRAIN_DIR/index.json" \
  || { brain_log "sync: index.json is not valid JSON, skipping to avoid publishing a torn store"; exit 0; }

B="$(brain_target_branch)"

# Safety: NEVER push memory to a CODE branch of the APP repo. The canonical
# store is either the dedicated memory repo (BRAIN_REMOTE) or, in
# legacy mode, a dedicated orphan branch of the app's origin, never main.
# This is the structural guard against the 2026-07-08 incident: a v1 sync
# script inherited BRAIN_BRANCH=main from a v2 session's environment
# and pushed the whole store to the public app repo's main branch (42d1f26).
app_url="$(git -C "$P" remote get-url origin 2>/dev/null)"
if [ -n "$app_url" ] && [ "$(brain_remote_url)" = "$app_url" ]; then
  app_default="$(git -C "$P" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)"
  app_default="${app_default#origin/}"
  case "$B" in
    main|master|"${app_default:-main}")
      brain_log "sync: REFUSING to push memory to app-repo branch '$B', memory never lands on a code branch (set BRAIN_REMOTE or a dedicated branch)"
      exit 0 ;;
  esac
fi

# Classify a push result. returns 0 pushed, 3 branch-protection (STOP), 1/2 retry.
push_classify() {  # $1 = repo dir; remaining args -> `git push`
  local dir="$1"; shift
  local out
  if out="$(git -C "$dir" push "$@" 2>&1)"; then
    printf '%s\n' "$out" >>"$SYNC_LOG"; return 0
  fi
  printf '%s\n' "$out" >>"$SYNC_LOG"
  if printf '%s' "$out" | grep -qiE 'protected branch|GH006|refusing to allow|push declined|repository rule|required status check|not allowed to (update|push)|protected'; then
    return 3
  fi
  if printf '%s' "$out" | grep -qiE 'non-fast-forward|fetch first|tip of your (current )?branch is behind|Updates were rejected'; then
    return 2
  fi
  return 1
}

# On success the clone sits at the (possibly new) canonical head, and, because
# the sync is additive-union, that head is a SUPERSET of this cache. Record it
# machine-wide and fold the union back into this cache so it also gains any
# nodes other machines pushed, then stamp the cache current.
sync_note_success() {
  local sr="$1" newhead
  newhead="$(git -C "$sr" rev-parse HEAD 2>/dev/null)"
  [ -n "$newhead" ] || return 0
  printf '%s' "$newhead" >"$BRAIN_CURRENT_HEAD" 2>/dev/null || true
  if brain_overlay_from_clone; then
    mkdir -p "$BRAIN_RUNTIME" 2>/dev/null
    printf '%s' "$newhead" >"$BRAIN_RUNTIME/store-head" 2>/dev/null || true
  fi
  return 0
}

if ! brain_lock sync 30; then brain_log "sync: busy, skipping"; exit 0; fi
brain_git_identity

attempt=0; max=5; delay=2; result=1
while [ "$attempt" -lt "$max" ]; do
  attempt=$((attempt + 1))
  if ! brain_sync_repo_prepare; then
    brain_log "sync: prepare failed for $B (attempt $attempt)"; sleep "$delay"; delay=$((delay * 2)); continue
  fi
  sr="$(brain_sync_repo_dir)"
  # ADDITIVE UNION (not mirror): overlay the live store ONTO the fresh
  # canonical checkout WITHOUT wiping it first. Nodes another worktree or
  # machine pushed since we last refreshed stay present, so a stale local cache
  # can never delete them (mirror = wipe+copy would). `git add -A` then stages
  # only our adds/updates; remote-only nodes are untouched. Trade-off: node
  # DELETIONS don't propagate, acceptable, since the curator supersedes rather
  # than deletes and rebuilds index.json from the files, healing any transient
  # index/file drift.
  if ! brain_mirror_store "$sr"; then
    brain_log "sync: overlay failed (attempt $attempt)"; sleep "$delay"; delay=$((delay * 2)); continue
  fi
  git -C "$sr" add -A 2>/dev/null
  if git -C "$sr" diff --cached --quiet 2>/dev/null; then
    brain_log "sync: $B already up to date"; sync_note_success "$sr"; result=0; break
  fi
  if ! git -C "$sr" commit $(brain_sign_flag "$sr") --no-verify \
        -m "memory: sync $(date -u +%FT%TZ 2>/dev/null)" >>"$SYNC_LOG" 2>&1; then
    brain_log "sync: commit failed on $B (attempt $attempt)"; sleep "$delay"; delay=$((delay * 2)); continue
  fi
  push_classify "$sr" origin "$B"; pc=$?
  case "$pc" in
    0) brain_log "sync: pushed brain/ to $B"; sync_note_success "$sr"; result=0; break ;;
    3) brain_log "sync: STOP, $B rejected the push (branch protection). Not forcing. See $SYNC_LOG"; result=3; break ;;
    2) brain_log "sync: non-fast-forward on $B (attempt $attempt), refetch + retry in ${delay}s" ;;
    *) brain_log "sync: push failed on $B (attempt $attempt), retry in ${delay}s" ;;
  esac
  sleep "$delay"; delay=$((delay * 2))
done

brain_unlock sync
exit 0
