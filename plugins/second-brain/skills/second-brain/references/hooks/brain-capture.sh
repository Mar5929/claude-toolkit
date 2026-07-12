#!/usr/bin/env bash
# Stop hook, capture + (maybe) elect the ONE machine-wide curator.
#
#   1) Always: append one deterministic JSON line for this turn to the
#      MACHINE-GLOBAL journal (pure shell, cheap, lossless, no Claude).
#   2) Leader election: spawn a curator ONLY if (a) the journal has undrained
#      entries with real repo changes, (b) the machine-wide debounce interval
#      has elapsed, and (c) the global curator lock is free. Five sessions
#      stopping at once elect exactly ONE runner. The runner drains the WHOLE
#      batch (all sessions' turns since the cursor) in one pass, in the PRIMARY
#      checkout (ephemeral worktrees can vanish mid-run), then flushes to the
#      memory repo and advances the cursor. On timeout/failure the cursor stays
#      put and the batch replays on the next elected run, nothing is lost.
#
# Never blocks the main workflow; always exits 0. Recursion-guarded.
set -uo pipefail
# ABSOLUTE, or the detached runner's `cd $PRIMARY` re-resolves a relative
# ".claude/hooks" against the PRIMARY checkout and executes ITS hook versions
# (2026-07-11: the runner's flush silently ran the primary's v1 flush that way).
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
[ -n "$HOOK_DIR" ] || exit 0
source "$HOOK_DIR/brain-lib.sh" 2>/dev/null || exit 0

brain_active || exit 0                       # off, or we're inside the curator's own run
brain_truthy "$BRAIN_CAPTURE" || exit 0

P="$BRAIN_PROJECT_DIR"
mkdir -p "$BRAIN_GLOBAL_DIR" 2>/dev/null || exit 0

# --- Read Stop hook input ----------------------------------------------------
raw="$(cat 2>/dev/null)"
session=""; transcript=""
if command -v jq >/dev/null 2>&1 && [ -n "$raw" ]; then
  session="$(printf '%s' "$raw" | jq -r '.session_id // empty' 2>/dev/null)"
  transcript="$(printf '%s' "$raw" | jq -r '.transcript_path // empty' 2>/dev/null)"
fi

branch="$(git -C "$P" rev-parse --abbrev-ref HEAD 2>/dev/null)"
head="$(git -C "$P" rev-parse HEAD 2>/dev/null)"
subject="$(git -C "$P" log -1 --pretty=%s 2>/dev/null)"

# --- Did the repo actually change this turn? (per-worktree marker) ------------
marker="$BRAIN_RUNTIME/last-head"
last="$(cat "$marker" 2>/dev/null)"
changed=0
if [ -z "$last" ]; then
  changed=1
elif [ "$last" != "$head" ]; then
  if diffout="$(git -C "$P" diff --name-only "$last" "$head" -- . ':(exclude)brain' 2>/dev/null)"; then
    [ -n "$diffout" ] && changed=1
  else
    changed=1   # marker unknown (rebase/reset), be safe
  fi
fi
[ -n "$(git -C "$P" status --porcelain -- . ':(exclude)brain' 2>/dev/null)" ] && changed=1
mkdir -p "$BRAIN_RUNTIME" 2>/dev/null
printf '%s' "$head" >"$marker" 2>/dev/null || true

# --- 1) Journal the turn (append one JSON line to the GLOBAL journal) ---------
changed_list="$(git -C "$P" status --porcelain -- . ':(exclude)brain' 2>/dev/null | awk '{print $2}' | head -n 40)"
if command -v jq >/dev/null 2>&1; then
  jq -cn \
    --arg ts "$(date -u +%FT%TZ 2>/dev/null)" \
    --arg session "$session" --arg worktree "$P" --arg branch "$branch" \
    --arg head "$head" --arg subject "$subject" --arg transcript "$transcript" \
    --arg changed "$changed_list" --argjson repo_changed "$( [ "$changed" = 1 ] && echo true || echo false )" \
    '{ts:$ts,session:$session,worktree:$worktree,branch:$branch,head:$head,head_subject:$subject,transcript:$transcript,repo_changed:$repo_changed,changed:($changed|split("\n")|map(select(length>0)))}' \
    >>"$BRAIN_JOURNAL" 2>/dev/null || true
else
  printf '{"ts":"%s","session":"%s","worktree":"%s","branch":"%s","head":"%s","repo_changed":%s}\n' \
    "$(date -u +%FT%TZ 2>/dev/null)" "$session" "$P" "$branch" "$head" \
    "$( [ "$changed" = 1 ] && echo true || echo false )" >>"$BRAIN_JOURNAL" 2>/dev/null || true
fi

# --- 2) Leader election ---------------------------------------------------------
brain_truthy "$BRAIN_AUTORUN" || exit 0
command -v claude >/dev/null 2>&1 || { brain_log "AUTORUN on but 'claude' not found; journal-only"; exit 0; }

# Cheap pre-checks OUTSIDE the lock (recomputed inside it to close the race).
brain_pending() {  # sets PEND_TOTAL / PEND_CURSOR / PEND_CHANGED; rc 0 if work exists
  PEND_TOTAL="$(wc -l <"$BRAIN_JOURNAL" 2>/dev/null | tr -d '[:space:]')"
  case "$PEND_TOTAL" in ''|*[!0-9]*) PEND_TOTAL=0 ;; esac
  PEND_CURSOR="$(cat "$BRAIN_CURSOR" 2>/dev/null)"
  case "$PEND_CURSOR" in ''|*[!0-9]*) PEND_CURSOR=0 ;; esac
  [ "$PEND_CURSOR" -gt "$PEND_TOTAL" ] && PEND_CURSOR=0   # journal was rotated/reset
  [ "$PEND_TOTAL" -gt "$PEND_CURSOR" ] || return 1
  PEND_CHANGED="$(sed -n "$((PEND_CURSOR + 1)),${PEND_TOTAL}p" "$BRAIN_JOURNAL" 2>/dev/null | grep -c '"repo_changed":true')"
  [ "${PEND_CHANGED:-0}" -gt 0 ] || return 1
  return 0
}
brain_interval_elapsed() {
  local now lastrun
  now="$(date +%s 2>/dev/null || echo 0)"
  lastrun="$(cat "$BRAIN_LASTRUN" 2>/dev/null)"
  case "$lastrun" in ''|*[!0-9]*) lastrun=0 ;; esac
  [ $((now - lastrun)) -ge "$BRAIN_CURATOR_INTERVAL" ]
}

brain_pending || exit 0
brain_interval_elapsed || exit 0

# Try to become the runner. Non-blocking: if someone else holds the lock, a
# curator is already running, our journal entry is in their batch's future.
# Steal age > the WHOLE run budget (two serialized curator phases, each with
# its own timeout, plus flush overhead) so a LIVE run's lock is never stolen.
brain_lock curator 0 $((BRAIN_CURATOR_TIMEOUT * 2 + 300)) || exit 0

# Re-check inside the lock: another session may have just completed a run and
# advanced the cursor / stamped last-run between our pre-check and the acquire.
if ! brain_pending || ! brain_interval_elapsed; then
  brain_unlock curator
  exit 0
fi
date +%s >"$BRAIN_LASTRUN" 2>/dev/null || true

# Cap the batch so a huge backlog can't demand an unbounded run (the 2026-07-08
# backlog runs blew the 600s budget). The cursor advances only to the capped
# end; the remainder drains on the next elected run.
BATCH_CAP=40
if [ $((PEND_TOTAL - PEND_CURSOR)) -gt "$BATCH_CAP" ]; then
  PEND_TOTAL=$((PEND_CURSOR + BATCH_CAP))
fi

# Snapshot the batch (the journal may grow while the curator runs; the cursor
# only advances by exactly what this snapshot contains).
batch="$BRAIN_GLOBAL_DIR/batch.jsonl"
if ! sed -n "$((PEND_CURSOR + 1)),${PEND_TOTAL}p" "$BRAIN_JOURNAL" >"$batch" 2>/dev/null; then
  brain_unlock curator
  exit 0
fi
# Recount changed turns over the CAPPED range (grep -c prints the count even
# when it's 0; normalize junk to 0 rather than ||-appending a second line).
PEND_CHANGED="$(grep -c '"repo_changed":true' "$batch" 2>/dev/null)"
case "$PEND_CHANGED" in ''|*[!0-9]*) PEND_CHANGED=0 ;; esac
# A capped batch may hold only unchanged turns (the changed ones sit beyond the
# cap). Skip the API spend: advance the cursor past this inert slice and let
# the next elected run reach the real work.
if [ "$PEND_CHANGED" -eq 0 ]; then
  printf '%s' "$PEND_TOTAL" >"$BRAIN_CURSOR" 2>/dev/null || true
  brain_unlock curator
  exit 0
fi

PRIMARY="$(brain_primary_dir)"
[ -d "$PRIMARY/brain" ] || PRIMARY="$P"

read -r -d '' CURATOR_PROMPT <<'EOF'
A batch of work turns just completed across the owner's parallel sessions in this project. Run ONE consolidated CAPTURE pass on long-term memory.

1. Read the batch journal at: __BATCH__, one JSON line per turn, possibly from several concurrent sessions/worktrees (fields: ts, session, worktree, branch, head, head_subject, transcript, repo_changed, changed[]). If useful, read a turn's transcript path for detail on what happened.
2. Extract only DURABLE, memory-worthy facts from the whole batch: decisions made, constraints learned, owner preferences, architecture/knowledge changes, milestones. Ignore transient chatter, tool mechanics, and anything already captured. Honor the exclusion list (never store secrets or clinical/medical content).
3. For each fact: check brain/index.json for an existing or near-duplicate node. If it exists, merge/refine it and bump `updated`; do NOT create a duplicate. If new, create a node from brain/_templates/memory.md with a stable id and give it at least one typed link to an existing node.
4. Keep brain/BRAIN.md tight and current, and update brain/index.json (nodes + edges) to match the files exactly. Then run `bash .claude/hooks/brain-check.sh` and fix anything it flags (duplicates, orphans, dangling links, index/file drift, the files win).
5. Leave brain/knowledge/ alone, the knowledge-curator runs after you on this same batch and owns that layer. If you spot code-knowledge facts, note them in your summary.

Write files ONLY under brain/ (excluding knowledge/). Do NOT run git or push, the hook flushes for you. If nothing is memory-worthy, make no changes and stop.
EOF
CURATOR_PROMPT="${CURATOR_PROMPT//__BATCH__/$batch}"

read -r -d '' KNOWLEDGE_PROMPT <<'EOF'
App code changed in this batch of work turns. Run your background DOCUMENT pass on the knowledge layer (see your agent instructions).

The batch journal is at: __BATCH__ (one JSON line per turn; `changed[]` lists each turn's touched paths; `transcript` points at the conversation if you need the intent behind a change).

1. Run `bash .claude/hooks/knowledge-drift.sh --stale` and reconcile every flagged node: re-read the covered file(s), fix the node's WHY if it moved, then re-anchor the sha and bump `updated`, never re-anchor without re-reading.
2. For subsystems this batch changed or created: refresh their covering knowledge node, or write a new `know-*` node (with `covers:` pins and typed links) when a future agent would otherwise have to guess the code's reason for existing.
3. Run `bash .claude/hooks/brain-check.sh` and fix anything involving your nodes/edges.

Write ONLY under brain/knowledge/ (plus your index.json entries). Do NOT run git or push. If nothing needs documenting, change nothing and stop.
EOF
KNOWLEDGE_PROMPT="${KNOWLEDGE_PROMPT//__BATCH__/$batch}"

# Spawn the single runner, detached. It curates in the PRIMARY checkout, then
# flushes (sync to the memory repo) and advances the cursor, only on a clean
# exit, so a killed/errored half-pass is replayed instead of published.
(
  cd "$PRIMARY" 2>/dev/null || { brain_unlock curator; exit 0; }
  export CLAUDE_PROJECT_DIR="$PRIMARY"
  export BRAIN_CURATOR_ACTIVE=1
  run_start="$(date +%s 2>/dev/null || echo 0)"
  # The curator processes run with a SANITIZED memory env: AUTOSYNC off and no
  # branch override. Publishing is the WRAPPER's job (the flush below), if the
  # agent shells out to any memory-flush/memory-sync (its own contract's
  # REMEMBER-mode habit, or an older script version found in the primary
  # checkout during a hooks transition), that call must be a structural no-op.
  # This is the second guard from the 2026-07-08 main-push incident: the first
  # is brain-sync.sh's app-repo branch refusal.
  brain_run_with_timeout "$BRAIN_CURATOR_TIMEOUT" \
    env BRAIN_AUTOSYNC=0 BRAIN_BRANCH= \
    claude -p "$CURATOR_PROMPT" \
      --agent brain-curator \
      --model "$BRAIN_MODEL" \
      --permission-mode acceptEdits >>"$BRAIN_GLOBAL_DIR/curator.log" 2>&1
  crc=$?
  # Phase 2, the knowledge specialist. Runs only after a clean memory pass,
  # only when the batch actually touched app code, under the SAME lock (the
  # two writers are serialized by construction, never concurrent). Its failure
  # never blocks publishing phase 1's work: knowledge writes are additive
  # nodes, the publish guards catch a torn index, and drift replays via its
  # own --stale queue rather than the journal cursor.
  krc="null"
  # "Touched app code" = a changed[] path matches BRAIN_CODE_PATH_REGEX (an
  # extended regex, e.g. "src/|lib/|Tests/"). Empty regex = any changed turn
  # counts as code, so phase 2 runs on every drained batch with real changes.
  brain_code_touched() {
    [ -z "$BRAIN_CODE_PATH_REGEX" ] && return 0
    grep -qE '"changed":\[[^]]*"('"$BRAIN_CODE_PATH_REGEX"')' "$batch" 2>/dev/null
  }
  if [ "$crc" -eq 0 ] && brain_truthy "$BRAIN_KNOWLEDGE" && brain_code_touched; then
    brain_run_with_timeout "$BRAIN_CURATOR_TIMEOUT" \
      env BRAIN_AUTOSYNC=0 BRAIN_BRANCH= \
      claude -p "$KNOWLEDGE_PROMPT" \
        --agent knowledge-curator \
        --model "$BRAIN_MODEL" \
        --permission-mode acceptEdits >>"$BRAIN_GLOBAL_DIR/curator.log" 2>&1
    krc=$?
  fi
  # One structured row per run (build_runs-style ledger): regressions like
  # "every run times out" or "runs succeed but never create nodes" become a
  # one-liner to spot instead of an archaeology dig through hook.log.
  printf '{"ts":"%s","rc":%d,"knowledge_rc":%s,"batch_start":%d,"batch_end":%d,"changed_turns":%d,"duration_s":%d}\n' \
    "$(date -u +%FT%TZ 2>/dev/null)" "$crc" "$krc" "$((PEND_CURSOR + 1))" "$PEND_TOTAL" \
    "$PEND_CHANGED" "$(( $(date +%s 2>/dev/null || echo 0) - run_start ))" \
    >>"$BRAIN_GLOBAL_DIR/runs.jsonl" 2>/dev/null || true
  if [ "$crc" -eq 0 ]; then
    printf '%s' "$PEND_TOTAL" >"$BRAIN_CURSOR" 2>/dev/null || true
    unset BRAIN_CURATOR_ACTIVE
    # Flush publishes both phases and stamps the primary cache current (sync
    # owns the store-head bookkeeping).
    bash "$HOOK_DIR/brain-flush.sh" >>"$BRAIN_GLOBAL_DIR/curator.log" 2>&1
    brain_log "curator completed: drained journal $((PEND_CURSOR + 1))..$PEND_TOTAL ($PEND_CHANGED changed turns, knowledge_rc=$krc); cursor -> $PEND_TOTAL"
  else
    brain_log "curator exited $crc (timeout/error), cursor NOT advanced; batch replays after the interval"
  fi
  brain_unlock curator
) >/dev/null 2>&1 &
disown 2>/dev/null || true
brain_log "elected curator runner (model=$BRAIN_MODEL, batch=$((PEND_CURSOR + 1))..$PEND_TOTAL, primary=$PRIMARY)"

exit 0
