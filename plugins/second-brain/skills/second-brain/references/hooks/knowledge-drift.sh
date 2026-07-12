#!/usr/bin/env bash
# knowledge-drift.sh, knowledge-layer drift checker + reverse lookup.
#
# Part of the second-brain knowledge layer (raw code -> business context/why).
# A knowledge node under brain/ may pin the source files it explains with a
# `covers:` block in its YAML frontmatter, one entry per line in flow style:
#
#   covers:
#     - { path: src/pricing/engine.ts, sha: <git-blob-sha> }
#
# Each entry records the git blob SHA the node was last curated against. This
# tool recomputes `git hash-object` for every covered file and reports which
# nodes have DRIFTED (a covered file's content moved) so the brain-curator can
# refresh them. A stale node thus announces itself instead of silently misleading.
#
# It is strictly READ-ONLY over brain/, the brain-curator is the only writer
# (see brain/ARCHITECTURE.md, dec-0100). This script never edits a node.
#
# Modes:
#   (default)      Human report of every covered node: fresh / STALE / MISSING.
#                  Exit 1 if anything drifted, 0 if all fresh.
#   --stale        Machine list, TSV "<node-id>\t<path>\t<reason>", drifted only.
#                  Exit 1 if anything drifted. (What the curator consumes.)
#   --for <path>   Reverse lookup: print the knowledge node id(s) that cover
#                  <path>, i.e. "where's the WHY for this file?". Exit 0.
#   -h | --help    This help.
#
# Env overrides (tests / auditing another checkout): KD_BRAIN_DIR sets where nodes
# live; KD_PROJECT_DIR sets where `git hash-object` resolves covered paths.
set -uo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Reuse the memory system's project/mem dir resolution (read-only use here).
if ! source "$HOOK_DIR/brain-lib.sh" 2>/dev/null; then
  BRAIN_PROJECT_DIR="$(git -C "$HOOK_DIR" rev-parse --show-toplevel 2>/dev/null)"
  [ -n "${BRAIN_PROJECT_DIR:-}" ] || BRAIN_PROJECT_DIR="$(cd "$HOOK_DIR/../.." && pwd)"
  BRAIN_DIR="$BRAIN_PROJECT_DIR/brain"
fi
# Optional overrides, separate "where nodes live" from "where code + git live".
[ -n "${KD_PROJECT_DIR:-}" ] && BRAIN_PROJECT_DIR="$KD_PROJECT_DIR"
[ -n "${KD_BRAIN_DIR:-}" ] && BRAIN_DIR="$KD_BRAIN_DIR"

usage() {
  sed -n 's/^# \{0,1\}//p' "${BASH_SOURCE[0]}" | sed -n '2,30p'
}

[ -d "${BRAIN_DIR:-}" ] || { echo "knowledge-drift: no brain/ dir at ${BRAIN_DIR:-?}" >&2; exit 0; }

# --- Parse mode --------------------------------------------------------------
mode="report"; query=""
case "${1:-}" in
  ""        ) mode="report" ;;
  --stale   ) mode="stale" ;;
  --for     ) mode="for"; query="${2:-}"; [ -n "$query" ] || { echo "usage: knowledge-drift.sh --for <path>" >&2; exit 2; } ;;
  -h|--help ) usage; exit 0 ;;
  *         ) echo "knowledge-drift: unknown argument '$1'" >&2; usage >&2; exit 2 ;;
esac

# --- Collect covers entries from every node's frontmatter --------------------
# Emits TSV "<node-id>\t<path>\t<sha>", one line per covers entry. Frontmatter is
# only honored when a file's first line is '---', so body '---' rules (e.g. in
# BRAIN.md) can never be mistaken for frontmatter.
collect() {
  find "$BRAIN_DIR" -type f -name '*.md' -not -path '*/_templates/*' -print0 2>/dev/null \
  | xargs -0 -r awk '
      FNR==1 { fm = ($0 == "---") ? 1 : 2; id = "" }
      fm==1 && FNR>1 && $0=="---" { fm = 2; next }
      fm==1 {
        if ($0 ~ /^id:[ \t]*/) {
          id = $0; sub(/^id:[ \t]*/, "", id); sub(/[ \t]*$/, "", id)
        } else if ($0 ~ /path:[ \t]*.*sha:[ \t]*/) {
          p = $0; sub(/^.*path:[ \t]*/, "", p); sub(/[ \t]*,.*$/, "", p)
          s = $0; sub(/^.*sha:[ \t]*/, "", s); sub(/[ \t}].*$/, "", s)
          if (id != "" && p != "" && s != "") printf "%s\t%s\t%s\n", id, p, s
        }
      }
    '
}

data="$(collect | sort -u)"

# --- Reverse lookup ----------------------------------------------------------
if [ "$mode" = "for" ]; then
  q="${query#"$BRAIN_PROJECT_DIR"/}"; q="${q#./}"
  found=0
  while IFS=$'\t' read -r id path _sha; do
    [ -n "$id" ] || continue
    if [ "$path" = "$q" ] || { [ "$q" = "${q##*/}" ] && [ "${path##*/}" = "$q" ]; }; then
      echo "$id"; found=1
    fi
  done <<< "$data"
  [ "$found" = 1 ] || echo "(no knowledge node covers: $q)" >&2
  exit 0
fi

# --- Drift report / stale list ----------------------------------------------
if [ -z "$data" ]; then
  echo "(no knowledge nodes declare a covers: block yet)"
  exit 0
fi

any_drift=0
prev=""
while IFS=$'\t' read -r id path sha; do
  [ -n "$id" ] || continue
  cur="$(git -C "$BRAIN_PROJECT_DIR" hash-object -- "$path" 2>/dev/null || true)"
  if [ -z "$cur" ]; then
    state="MISSING"; any_drift=1
  elif [ "$cur" != "$sha" ]; then
    state="STALE"; any_drift=1
  else
    state="fresh"
  fi

  if [ "$mode" = "stale" ]; then
    [ "$state" != "fresh" ] && printf '%s\t%s\t%s\n' "$id" "$path" "$state"
    continue
  fi

  if [ "$id" != "$prev" ]; then
    [ -n "$prev" ] && echo
    echo "$id"
    prev="$id"
  fi
  printf '    [%s] %s\n' "$state" "$path"
done <<< "$data"

if [ "$mode" = "report" ]; then
  echo
  if [ "$any_drift" = 1 ]; then
    echo "drift detected, ask the brain-curator to refresh the STALE/MISSING node(s)."
  else
    echo "all covered knowledge nodes are fresh."
  fi
fi

exit "$any_drift"
