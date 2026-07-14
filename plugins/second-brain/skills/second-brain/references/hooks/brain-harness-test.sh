#!/usr/bin/env bash
# brain-harness-test.sh, isolated verification harness for the memory system.
#
# Rebuilds the whole pipeline in a scratch sandbox: a throwaway "app repo" with
# a local bare origin (stand-in for the GitHub app repo), a local bare memory
# remote (stand-in for the brain repo), a scratch XDG_CACHE_HOME (so the machine-
# global dir is sandboxed), and a stub `claude` CLI whose behavior each test
# controls. NOTHING here touches the real repos, remotes, or ~/.cache.
#
# Run from any checkout that has the v2 hooks:
#   bash .claude/hooks/brain-harness-test.sh
# Exit 0 = all assertions passed.
set -u

HOOKS_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SANDBOX="$(mktemp -d "${TMPDIR:-/tmp}/mem-harness.XXXXXX")" || exit 1
# BRAIN_HARNESS_KEEP=1 preserves the sandbox (logs, journal, run ledger, the two
# bare origins) so a failing assertion can actually be diagnosed instead of
# guessed at. Default stays "clean up".
if [ -n "${BRAIN_HARNESS_KEEP:-}" ]; then
  echo "sandbox kept at: $SANDBOX"
else
  trap 'rm -rf "$SANDBOX"' EXIT
fi

PASS=0; FAIL=0
ok()   { PASS=$((PASS + 1)); printf 'ok   %s\n' "$1"; }
fail() { FAIL=$((FAIL + 1)); printf 'FAIL %s\n' "$1"; }
assert() {  # $1 = description; $2... = command
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then ok "$desc"; else fail "$desc"; fi
}
# Validate JSON by feeding the file on STDIN, never as a path argument: jq and
# python3 are native binaries and cannot open an msys "/c/..." POSIX path on
# Git-for-Windows, which failed this check against a perfectly valid file.
json_ok() {  # $1 = file
  if   command -v jq      >/dev/null 2>&1; then jq -e . >/dev/null 2>&1 <"$1"
  elif command -v python3 >/dev/null 2>&1; then python3 -c 'import json,sys; json.load(sys.stdin)' <"$1" >/dev/null 2>&1
  elif command -v python  >/dev/null 2>&1; then python  -c 'import json,sys; json.load(sys.stdin)' <"$1" >/dev/null 2>&1
  else return 0; fi
}

# --- Sandbox layout -----------------------------------------------------------
export XDG_CACHE_HOME="$SANDBOX/cache"
BIN="$SANDBOX/bin"; mkdir -p "$BIN"
APP_ORIGIN="$SANDBOX/app-origin.git"   # bare: the "GitHub app repo"
BRAIN_ORIGIN="$SANDBOX/mem-origin.git"   # bare: the "brain repo"
APP="$SANDBOX/app"                     # the primary checkout
STUB_LOG="$SANDBOX/stub.log"           # one line per stub-claude invocation
STUB_MODE="$SANDBOX/stub.mode"         # ok | fail | hang | flush

# -b main is REQUIRED: without it these bare repos inherit the machine's
# init.defaultBranch, still 'master' on many installs. Their HEAD then points at
# a branch that never gets created, so `git clone` checks out nothing ("remote
# HEAD refers to nonexistent ref") and a later `push origin main` dies with
# "src refspec main does not match any". The sync itself is unaffected (it forces
# 'main' via checkout --orphan); only the harness's own scaffolding broke.
git init -q --bare -b main "$APP_ORIGIN"
git init -q --bare -b main "$BRAIN_ORIGIN"

git init -q "$APP" -b main
git -C "$APP" config user.name t; git -C "$APP" config user.email t@t
mkdir -p "$APP/.claude/hooks" "$APP/.claude/agents" "$APP/brain/sessions" "$APP/brain/_templates" "$APP/src"
cp "$HOOKS_SRC"/brain-*.sh "$HOOKS_SRC"/knowledge-drift.sh "$APP/.claude/hooks/" 2>/dev/null
printf '# app\n' >"$APP/src/App.swift"
printf '/brain/*\n!/brain/README.md\n' >"$APP/.gitignore"
printf 'signpost\n' >"$APP/brain/README.md"
printf '{"version":1,"updated":"2026-01-01","nodes":[],"edges":[]}\n' >"$APP/brain/index.json"
printf '# digest\n' >"$APP/brain/BRAIN.md"
git -C "$APP" add -A; git -C "$APP" commit -qm init
git -C "$APP" remote add origin "$APP_ORIGIN"
git -C "$APP" push -q origin main

# Stub claude: logs its sanitized-env view, then acts per STUB_MODE.
cat >"$BIN/claude" <<STUB
#!/usr/bin/env bash
printf 'invoked autosync=%s branch=[%s] cwd=%s\n' \
  "\${BRAIN_AUTOSYNC:-unset}" "\${BRAIN_BRANCH-unset}" "\$(pwd)" >>"$STUB_LOG"
mode="\$(cat "$STUB_MODE" 2>/dev/null || echo ok)"
case "\$mode" in
  fail) exit 1 ;;
  hang) trap '' TERM; while :; do sleep 5; done ;;   # TERM-immune, no long-lived orphan
  flush) date > "\$(pwd)/brain/sessions/note-flush.md"
         bash "\$(pwd)/.claude/hooks/brain-flush.sh"; exit 0 ;;
  *) sleep 1; date > "\$(pwd)/brain/sessions/note-\$\$.md"; exit 0 ;;
esac
STUB
chmod +x "$BIN/claude"
export PATH="$BIN:$PATH"

# A PATH with the basics but deliberately NO `claude`, for the degradation test.
# Hardcoding "/usr/bin:/bin" also hides GIT on Git-for-Windows (git lives in
# /mingw64/bin, not /usr/bin), so capture could not read the repo and journalled
# nothing, making a working system look broken. Keep git's real dir: neither the
# stub nor a real `claude` install lives there, so the test still proves the
# no-CLI path.
GIT_BIN_DIR="$(dirname "$(command -v git)")"
NOCLAUDE_PATH="/usr/bin:/bin:$GIT_BIN_DIR"

# --- Common env: v2 config, sandboxed, fast ------------------------------------
# BRAIN_BRANCH is FORCED EMPTY: the invoking shell may carry a value
# from its own Claude session settings (exactly the ambient-env leakage the
# production guards exist for), which would silently redirect every assertion
# to the wrong branch.
run_env() {  # run "$@" with the harness env from inside the app checkout
  ( cd "$APP" && env \
      CLAUDE_PROJECT_DIR="$APP" \
      BRAIN_ENABLED=1 BRAIN_CAPTURE=1 BRAIN_AUTORUN=1 \
      BRAIN_AUTOSYNC=1 BRAIN_KNOWLEDGE=0 \
      BRAIN_REMOTE="$BRAIN_ORIGIN" BRAIN_BRANCH= \
      BRAIN_CURATOR_TIMEOUT=8 BRAIN_CURATOR_INTERVAL=0 \
      BRAIN_TIMEOUT_KILLAFTER=2 \
      "$@" )
}
global_dir() { run_env bash -c 'source .claude/hooks/brain-lib.sh; printf %s "$BRAIN_GLOBAL_DIR"'; }
GD="$(global_dir)"
wait_runner() {  # wait for the detached runner to release the curator lock
  local i=0
  while [ -e "$GD/locks/curator.lock" ] || ! [ -s "$GD/runs.jsonl" ]; do
    i=$((i + 1)); [ "$i" -gt 60 ] && return 1; sleep 1
  done
  return 0
}
stop_input() { printf '{"session_id":"s1","transcript_path":""}'; }
brain_tip() { git -C "$BRAIN_ORIGIN" rev-parse -q --verify "$1" 2>/dev/null; }

# Make a real app change so capture sees repo_changed:true.
touch_app() { date +%s%N >>"$APP/src/App.swift"; }

echo "== 1. degradation: no claude CLI -> journal-only, no election =="
rm -f "$STUB_LOG"
touch_app
( cd "$APP" && stop_input | env PATH="$NOCLAUDE_PATH" \
    CLAUDE_PROJECT_DIR="$APP" BRAIN_REMOTE="$BRAIN_ORIGIN" BRAIN_BRANCH= \
    BRAIN_CURATOR_INTERVAL=0 bash .claude/hooks/brain-capture.sh )
assert "journal captured the turn"        test -s "$GD/journal.jsonl"
assert "no curator ran without the CLI"   test ! -s "$STUB_LOG"

echo "== 2. election + publish: one clean run, cursor advances, store lands on the memory remote =="
printf 'ok' >"$STUB_MODE"; rm -f "$STUB_LOG"
touch_app
for i in 1 2 3 4 5 6 7 8 9 10; do
  ( stop_input | run_env bash .claude/hooks/brain-capture.sh ) &
done
wait
assert "runner finished"                     wait_runner
assert "exactly ONE curator was elected"     test "$(grep -c invoked "$STUB_LOG")" = 1
assert "memory remote got the store"         test -n "$(brain_tip main)"
# Drain whatever landed AFTER the winner snapshotted its batch. The lock winner
# snapshots the journal at election time, so with N concurrent captures the
# siblings that are still appending legitimately fall outside that first batch.
# On fast native fork they all land first and the cursor happens to reach the
# journal end; on slower fork emulation (msys/Git-for-Windows) they do not, and
# the old strict equality flagged a correct cursor as a failure. One more SERIAL
# election drains the remainder deterministically on every platform.
rm -f "$GD/last-run"
( stop_input | run_env bash .claude/hooks/brain-capture.sh )
wait_runner
assert "cursor advanced to the journal end"  test "$(cat "$GD/journal.cursor")" = "$(wc -l <"$GD/journal.jsonl" | tr -d ' ')"
assert "run ledger recorded rc 0"            grep -q '"rc":0' "$GD/runs.jsonl"

echo "== 3. curator env is sanitized; agent-invoked flush is a no-op =="
assert "stub saw AUTOSYNC=0"                 grep -q 'autosync=0' "$STUB_LOG"
assert "stub saw empty BRANCH override"      grep -q 'branch=\[\]' "$STUB_LOG"
tip_before="$(brain_tip main)"
printf 'flush' >"$STUB_MODE"; rm -f "$GD/runs.jsonl"
touch_app
( stop_input | run_env bash .claude/hooks/brain-capture.sh )
wait_runner
if [ -n "$tip_before" ]; then
  commits="$(git -C "$BRAIN_ORIGIN" rev-list --count "$tip_before"..main 2>/dev/null)"
else
  commits="$(git -C "$BRAIN_ORIGIN" rev-list --count main 2>/dev/null)"
fi
assert "one publish total (wrapper's), not two" test "${commits:-9}" -le 1

echo "== 4. failure holds the cursor; nothing published =="
printf 'fail' >"$STUB_MODE"; rm -f "$GD/runs.jsonl"
cur_before="$(cat "$GD/journal.cursor")"; tip_before="$(brain_tip main)"
touch_app
( stop_input | run_env bash .claude/hooks/brain-capture.sh )
wait_runner
assert "cursor did NOT advance on rc!=0"     test "$(cat "$GD/journal.cursor")" = "$cur_before"
assert "no publish on rc!=0"                 test "$(brain_tip main)" = "$tip_before"
assert "ledger recorded the failure"         grep -q '"rc":1' "$GD/runs.jsonl"

echo "== 5. timeout: TERM-immune curator still dies inside budget+killafter; cursor holds =="
printf 'hang' >"$STUB_MODE"; rm -f "$GD/runs.jsonl"
cur_before="$(cat "$GD/journal.cursor")"
touch_app
t0="$(date +%s)"
( stop_input | run_env bash .claude/hooks/brain-capture.sh )
wait_runner
t1="$(date +%s)"
assert "run was killed (rc 124/137 in ledger)"  grep -qE '"rc":(124|137)' "$GD/runs.jsonl"
# Budget 8s + killafter 2s = 10s in theory. The bound only has to prove the run is
# BOUNDED (an unkilled hang stub runs forever and wait_runner gives up at 60s), so
# leave real headroom: fork emulation on Git-for-Windows plus the 1s polling
# granularity pushed this past a 25s bound intermittently, failing a working kill.
assert "killed within budget+killafter+slack"   test $((t1 - t0)) -le 45
assert "cursor held on timeout"                 test "$(cat "$GD/journal.cursor")" = "$cur_before"

echo "== 6. watchdog fallback (no timeout binary) escalates TERM -> KILL =="
# The sleeper loop must be child-free-ish and redirected: an orphaned long
# `sleep` inheriting our stdout pipe would hold it open and hang the harness.
wd_rc="$(run_env bash -c '
  source .claude/hooks/brain-lib.sh
  brain_timeout_bin() { return 1; }
  brain_run_with_timeout 2 bash -c "trap \"\" TERM; while :; do sleep 1; done" >/dev/null 2>&1
  echo $?' | tail -1)"
assert "fallback watchdog returned 124"      test "$wd_rc" = "124"

echo "== 7. batch cap: 50 pending -> 40 drained, remainder next run =="
printf 'ok' >"$STUB_MODE"
: >"$GD/journal.jsonl"; printf '0' >"$GD/journal.cursor"
for i in $(seq 1 50); do
  printf '{"ts":"t","session":"s","worktree":"%s","branch":"main","head":"h%s","repo_changed":true,"changed":["src/app.txt"]}\n' "$APP" "$i" >>"$GD/journal.jsonl"
done
rm -f "$GD/runs.jsonl" "$GD/last-run"
( stop_input | run_env bash .claude/hooks/brain-capture.sh )
wait_runner
assert "cursor stopped at the 40-line cap"   test "$(cat "$GD/journal.cursor")" = "40"
assert "batch file holds exactly 40 lines"   test "$(wc -l <"$GD/batch.jsonl" | tr -d ' ')" = "40"
rm -f "$GD/runs.jsonl" "$GD/last-run"
( stop_input | run_env bash .claude/hooks/brain-capture.sh )
wait_runner
assert "second run drained the remainder"    test "$(cat "$GD/journal.cursor")" -ge 50

echo "== 8. inert capped slice: cursor skips it with NO curator spend =="
: >"$GD/journal.jsonl"; printf '0' >"$GD/journal.cursor"
for i in $(seq 1 40); do
  printf '{"ts":"t","repo_changed":false}\n' >>"$GD/journal.jsonl"
done
printf '{"ts":"t","worktree":"%s","repo_changed":true,"changed":["src/app.txt"]}\n' "$APP" >>"$GD/journal.jsonl"
rm -f "$GD/last-run" "$STUB_LOG"
( stop_input | run_env bash .claude/hooks/brain-capture.sh )
sleep 2
assert "inert slice skipped without claude"  test ! -s "$STUB_LOG"
assert "cursor hopped the inert slice"       test "$(cat "$GD/journal.cursor")" = "40"

echo "== 9. sync guard: legacy mode may NEVER target an app code branch =="
app_tip="$(git -C "$APP_ORIGIN" rev-parse main)"
( cd "$APP" && env CLAUDE_PROJECT_DIR="$APP" BRAIN_REMOTE= BRAIN_BRANCH=main \
    bash .claude/hooks/brain-sync.sh --force )
assert "push to app main REFUSED"            test "$(git -C "$APP_ORIGIN" rev-parse main)" = "$app_tip"
assert "refusal logged"                      grep -q 'REFUSING to push memory to app-repo branch' "$GD/hook.log"
( cd "$APP" && env CLAUDE_PROJECT_DIR="$APP" BRAIN_REMOTE= BRAIN_BRANCH=master \
    bash .claude/hooks/brain-sync.sh --force )
assert "push to app master REFUSED"          test -z "$(git -C "$APP_ORIGIN" rev-parse -q --verify master)"
( cd "$APP" && env CLAUDE_PROJECT_DIR="$APP" BRAIN_REMOTE= BRAIN_BRANCH=second-brain \
    bash .claude/hooks/brain-sync.sh --force )
assert "dedicated orphan branch still allowed (legacy mode)" test -n "$(git -C "$APP_ORIGIN" rev-parse -q --verify second-brain)"
assert "app main untouched by legacy sync"   test "$(git -C "$APP_ORIGIN" rev-parse main)" = "$app_tip"

echo "== 10. additive union: a node only on the remote survives a stale-cache sync =="
UC="$SANDBOX/union-clone"
git clone -q "$BRAIN_ORIGIN" "$UC"
git -C "$UC" config user.name t; git -C "$UC" config user.email t@t
mkdir -p "$UC/sessions"; printf 'other machine\n' >"$UC/sessions/note-other-machine.md"
git -C "$UC" add -A; git -C "$UC" commit -qm other; git -C "$UC" push -q origin main
rm -rf "$GD/sync-repo"
( cd "$APP" && run_env bash .claude/hooks/brain-sync.sh --force )
git -C "$UC" pull -q
assert "remote-only node survived the sync"  test -f "$UC/sessions/note-other-machine.md"

echo "== 11. publish guards: gutted or torn store never publishes =="
tip_before="$(brain_tip main)"
mv "$APP/brain/index.json" "$APP/brain/index.json.bak"
( cd "$APP" && run_env bash .claude/hooks/brain-sync.sh --force )
assert "gutted store (no index.json) not pushed" test "$(brain_tip main)" = "$tip_before"
printf '{"broken":' >"$APP/brain/index.json"
( cd "$APP" && run_env bash .claude/hooks/brain-sync.sh --force )
assert "torn store (invalid JSON) not pushed"    test "$(brain_tip main)" = "$tip_before"
mv "$APP/brain/index.json.bak" "$APP/brain/index.json"

echo "== 12. app-git corruption loop: checkout/reset never errors while a sync runs =="
git -C "$APP" checkout -qb feature
date >>"$APP/brain/BRAIN.md"
loop_ok=1
for i in 1 2 3 4 5; do
  ( cd "$APP" && run_env bash .claude/hooks/brain-sync.sh --force >/dev/null 2>&1 ) &
  git -C "$APP" checkout -q main    || loop_ok=0
  git -C "$APP" checkout -q feature || loop_ok=0
  git -C "$APP" reset -q --hard HEAD || loop_ok=0
done
wait
assert "checkout/reset loop stayed clean under sync" test "$loop_ok" = 1

echo "== 13. settings.json: valid JSON, no branch override, 1200s budget =="
# In a real install the hooks live at .claude/hooks/, so ../settings.json is
# the project's .claude/settings.json. Skipped when absent (e.g. running the
# harness straight from the toolkit's references copy).
SET="$HOOKS_SRC/../settings.json"
if [ -f "$SET" ]; then
  assert "settings.json is valid JSON"     json_ok "$SET"
  assert "no BRAIN_BRANCH in settings"     bash -c "! grep -q BRAIN_BRANCH '$SET'"
  assert "curator budget is 1200"          grep -q '"BRAIN_CURATOR_TIMEOUT": "1200"' "$SET"
else
  echo "skip: no settings.json next to the hooks dir (reference-copy run)"
fi

echo "== 14. version pinning: a worktree-elected runner must use ITS OWN hooks, never the primary's =="
# Reproduces the 2026-07-11 incident shape: the primary checkout carries OLDER
# hook versions (sentinel here); the session runs in a worktree with current
# hooks. The runner cds into the primary to curate, its flush must still be
# the WORKTREE's (absolute HOOK_DIR), or version skew executes foreign code.
git -C "$APP" worktree add -q "$SANDBOX/wt" -b wt-branch
printf '#!/usr/bin/env bash\ntouch "%s/V1-FLUSH-RAN"\nexit 0\n' "$SANDBOX" >"$APP/.claude/hooks/brain-flush.sh"
printf 'ok' >"$STUB_MODE"; rm -f "$GD/last-run" "$GD/runs.jsonl"
tip_before="$(brain_tip main)"
date +%s%N >>"$SANDBOX/wt/src/app.txt"
( cd "$SANDBOX/wt" && stop_input | env \
    CLAUDE_PROJECT_DIR="$SANDBOX/wt" \
    BRAIN_ENABLED=1 BRAIN_CAPTURE=1 BRAIN_AUTORUN=1 \
    BRAIN_AUTOSYNC=1 BRAIN_KNOWLEDGE=0 \
    BRAIN_REMOTE="$BRAIN_ORIGIN" BRAIN_BRANCH= \
    BRAIN_CURATOR_TIMEOUT=8 BRAIN_CURATOR_INTERVAL=0 \
    BRAIN_TIMEOUT_KILLAFTER=2 \
    bash .claude/hooks/brain-capture.sh )
wait_runner
# Pinpoint assertion for the resolution step itself, so a regression here reads as
# "the worktree thinks it is the primary" instead of the vaguer "nothing published".
# Git-for-Windows returns "C:/repo/.git" from --git-common-dir; a POSIX-only "/*"
# absolute test misread that as relative and fell back to the worktree itself.
# Compare by IDENTITY (-ef: same device + inode), never by string. brain_primary_dir
# emits a NATIVE path ("C:/...AppData/Local/Temp/x/app") while the harness's own
# paths are msys ("/tmp/x/app"), and Git Bash ALIASES /tmp onto the Windows temp
# dir. The same directory therefore has two spellings that `cd && pwd` does not
# reconcile, so a string compare fails on a system that is working correctly.
prim_raw="$(CLAUDE_PROJECT_DIR="$SANDBOX/wt" bash -c 'cd "$0"; source .claude/hooks/brain-lib.sh; brain_primary_dir' "$SANDBOX/wt")"
assert "worktree resolves the PRIMARY checkout, not itself" test "$prim_raw" -ef "$APP"
assert "primary's (older) flush was NEVER executed"  test ! -e "$SANDBOX/V1-FLUSH-RAN"
assert "worktree-elected run still published"        test "$(brain_tip main)" != "$tip_before"

echo
echo "================================"
echo "PASS: $PASS   FAIL: $FAIL"
echo "================================"
[ "$FAIL" -eq 0 ]
