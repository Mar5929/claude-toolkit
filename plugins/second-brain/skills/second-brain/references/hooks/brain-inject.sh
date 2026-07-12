#!/usr/bin/env bash
# SessionStart hook, inject the project's curated memory digest so a new session
# starts already knowing the project. Read-only; prints to stdout (which the
# harness adds to context); always exits 0.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/brain-lib.sh" 2>/dev/null || exit 0

brain_active || exit 0
brain_truthy "$BRAIN_INJECT" || exit 0
[ -f "$BRAIN_DIR/BRAIN.md" ] || exit 0

echo "=================================================================="
echo " 🧠 SECOND BRAIN, curated context (long-term memory)"
echo "=================================================================="
echo "The brain-curator has loaded what we already know. This is durable"
echo "cross-session memory; treat it as continuity, and read individual nodes"
echo "from brain/ (via index.json) when you need the full detail."
echo

# The digest itself.
cat "$BRAIN_DIR/BRAIN.md"

# A one-line pointer to the graph so the agent knows retrieval is available.
if [ -f "$BRAIN_DIR/index.json" ]; then
  echo
  echo "------------------------------------------------------------------"
  n="$(grep -c '"id":' "$BRAIN_DIR/index.json" 2>/dev/null || echo '?')"
  echo " Memory graph: ${n} nodes in brain/index.json (typed links between them)."
  echo " To recall more: read a node by its path, or ask the brain-curator"
  echo " (Task tool, subagent_type: brain-curator) e.g. \"what do we know about X?\"."
  echo " To remember something new: let the Stop hook capture it, or delegate to"
  echo " the brain-curator. Do NOT hand-edit brain/ yourself."
  echo "------------------------------------------------------------------"
fi

# Pipeline health, one glance. Every hook exits 0 by design, so a wedged
# pipeline (expired creds, dead curator) would otherwise freeze memory
# SILENTLY, this line is where a human or agent notices.
total="$(wc -l <"$BRAIN_JOURNAL" 2>/dev/null | tr -d '[:space:]')"; : "${total:=0}"
cursor="$(cat "$BRAIN_CURSOR" 2>/dev/null)"; case "$cursor" in ''|*[!0-9]*) cursor=0 ;; esac
case "$total" in ''|*[!0-9]*) total=0 ;; esac
backlog=$(( total > cursor ? total - cursor : 0 ))
lastrun="$(cat "$BRAIN_LASTRUN" 2>/dev/null)"
if [ -n "$lastrun" ] && [ "$lastrun" -gt 0 ] 2>/dev/null; then
  age_min=$(( ( $(date +%s) - lastrun ) / 60 ))
  lastrun_h="${age_min}m ago"
else
  lastrun_h="never"
fi
lastline="$(grep -E 'curator (completed|exited)|sync: (pushed|STOP|store looks|index.json is not)' "$BRAIN_LOG" 2>/dev/null | tail -1)"
echo " Memory health: journal backlog ${backlog} turn(s) · last curator run ${lastrun_h}"
[ -n "$lastline" ] && echo "   last event: ${lastline}"
if [ "$backlog" -gt 60 ]; then
  echo "   ⚠️  Backlog is unusually large, the curator may be failing. Check $BRAIN_LOG"
fi

exit 0
