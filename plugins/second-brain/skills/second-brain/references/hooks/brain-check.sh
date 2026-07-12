#!/usr/bin/env bash
# brain-check.sh, mechanical integrity check of the memory store. Read-only.
# The curator's invariants (index matches files, no dangling edges, no orphans,
# no duplicate ids) are otherwise enforced only by LLM diligence inside a
# timeout; this script makes them computable. Analogous to a compiled-index
# self-check: files are the source of truth, the index must agree with them.
#
#   bash .claude/hooks/brain-check.sh          # human report; exit 1 on problems
#   bash .claude/hooks/brain-check.sh --quiet  # exit code only
#
# Run by the curator in its hygiene pass, by the test harness, and by hand.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/brain-lib.sh" 2>/dev/null || exit 0

quiet=0; [ "${1:-}" = "--quiet" ] && quiet=1
say() { [ "$quiet" = 1 ] || echo "$@"; }

IDX="$BRAIN_DIR/index.json"
[ -d "$BRAIN_DIR" ] || { say "memory-check: no store at $BRAIN_DIR"; exit 0; }
command -v jq >/dev/null 2>&1 || { say "memory-check: jq not available, skipping"; exit 0; }

problems=0
flag() { problems=$((problems + 1)); say "  ✗ $1"; }

# 1) Index parses.
if [ ! -f "$IDX" ]; then flag "index.json missing"; echo; exit 1; fi
jq -e . "$IDX" >/dev/null 2>&1 || { flag "index.json is not valid JSON"; exit 1; }

# 2) Collect ids: from the index, and from the node files themselves.
idx_ids="$(jq -r '.nodes[].id' "$IDX" 2>/dev/null | sort)"
file_ids=""
for d in decisions knowledge preferences sessions glossary; do
  [ -d "$BRAIN_DIR/$d" ] || continue
  file_ids="$file_ids
$(grep -m1 -h '^id:' "$BRAIN_DIR/$d"/*.md 2>/dev/null | sed 's/^id:[[:space:]]*//')"
done
file_ids="$(printf '%s\n' "$file_ids" | sed '/^$/d' | sort)"

# 3) Duplicate ids across files (two files claiming one id).
dups="$(printf '%s\n' "$file_ids" | uniq -d)"
[ -n "$dups" ] && while IFS= read -r i; do flag "duplicate id in files: $i"; done <<<"$dups"

# 4) Index ↔ files agreement (files win; a mismatch means rebuild the index).
only_idx="$(comm -23 <(printf '%s\n' "$idx_ids" | uniq) <(printf '%s\n' "$file_ids" | uniq))"
only_files="$(comm -13 <(printf '%s\n' "$idx_ids" | uniq) <(printf '%s\n' "$file_ids" | uniq))"
[ -n "$only_idx" ]   && while IFS= read -r i; do [ -n "$i" ] && flag "in index but no file: $i"; done <<<"$only_idx"
[ -n "$only_files" ] && while IFS= read -r i; do [ -n "$i" ] && flag "file exists but not indexed: $i"; done <<<"$only_files"

# 5) Every indexed path exists.
while IFS= read -r p; do
  [ -n "$p" ] && [ ! -f "$BRAIN_DIR/$p" ] && flag "indexed path missing on disk: $p"
done <<<"$(jq -r '.nodes[].path' "$IDX" 2>/dev/null)"

# 6) Dangling edges (either endpoint not a known node id).
while IFS= read -r e; do
  [ -n "$e" ] && flag "dangling edge: $e"
done <<<"$(jq -r --argjson ids "$(jq '[.nodes[].id]' "$IDX")" \
  '.edges[] | select((.from as $f | $ids | index($f) | not) or (.to as $t | $ids | index($t) | not)) | "\(.from) -\(.type)-> \(.to)"' \
  "$IDX" 2>/dev/null)"

# 7) Orphan nodes (no edge in either direction), a smell, not fatal.
orphans="$(jq -r '
  ([.edges[].from] + [.edges[].to]) as $touched
  | .nodes[] | select(.id as $i | $touched | index($i) | not) | .id' "$IDX" 2>/dev/null)"
[ -n "$orphans" ] && while IFS= read -r i; do [ -n "$i" ] && flag "orphan node (no edges): $i"; done <<<"$orphans"

if [ "$problems" -eq 0 ]; then
  say "memory-check: OK ($(printf '%s\n' "$file_ids" | sed '/^$/d' | wc -l | tr -d ' ') nodes, index consistent)"
  exit 0
else
  say "memory-check: $problems problem(s), the curator should rebuild index.json from the files (files win)"
  exit 1
fi
