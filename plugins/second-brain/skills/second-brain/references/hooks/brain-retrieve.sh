#!/usr/bin/env bash
# UserPromptSubmit hook, surface memory nodes relevant to the current prompt as
# lightweight pointers (titles + ids + paths), so the agent pulls the right
# context at the right time. Bounded & quiet: only fires on real keyword hits,
# caps results, prints nothing when there's no match. Always exit 0.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/brain-lib.sh" 2>/dev/null || exit 0

brain_active || exit 0
brain_truthy "$BRAIN_RETRIEVE" || exit 0

# Freshness: if the machine has seen a newer store head than this worktree's
# cache, fold it in before searching (fast path = two file reads; overlay only
# when actually behind, never during a curator pass). Long-lived sessions thus
# converge mid-session instead of staying frozen at their start-of-session view.
brain_refresh

# --- Read the prompt from stdin JSON ----------------------------------------
raw="$(cat 2>/dev/null)"
[ -n "$raw" ] || exit 0
if command -v jq >/dev/null 2>&1; then
  prompt="$(printf '%s' "$raw" | jq -r '.prompt // empty' 2>/dev/null)"
else
  prompt="$raw"
fi
prompt="$(printf '%s' "$prompt" | head -c 2000)"
[ -n "$prompt" ] || exit 0

# --- Tokenize: lowercase, alnum words >=3 chars, drop stopwords, unique -------
# 3-char minimum (not 4): the project's load-bearing acronyms are 3 chars
# (MEV/MAV/MRV, set, rep) and a 4-char floor silently dropped them from every
# retrieval. The stoplist absorbs the common-word noise this admits.
stop=" the and for with that this have what when which about would should could from your their them then than into over under while there here been being does done make made just like also more most only some such very much many will yours memory but was are has had can may its use all any how now new old our out per too two via way yet who why did get got she him her his say says said each same both few lot off own so far "
tokens="$(printf '%s' "$prompt" \
  | tr '[:upper:]' '[:lower:]' \
  | tr -c 'a-z0-9' ' ' \
  | tr -s ' ' '\n' \
  | awk 'length($0) >= 3' \
  | sort -u)"
[ -n "$tokens" ] || exit 0

# Search only the node folders (not digests/templates/runtime).
dirs=""
for d in decisions knowledge preferences sessions glossary; do
  [ -d "$BRAIN_DIR/$d" ] && dirs="$dirs $BRAIN_DIR/$d"
done
[ -n "$dirs" ] || exit 0

# Score = number of distinct keywords a file matches. Portable (no bash-4
# associative arrays, stock macOS ships bash 3.2): one line per (keyword,file)
# hit, then count per file.
hits="$(mktemp "${TMPDIR:-/tmp}/mem-retrieve.XXXXXX" 2>/dev/null)" || exit 0
while IFS= read -r kw; do
  [ -z "$kw" ] && continue
  case "$stop" in *" $kw "*) continue ;; esac
  # files (of type .md) containing this keyword, case-insensitive, whole-ish match
  grep -rilw --include='*.md' -e "$kw" $dirs 2>/dev/null >>"$hits"
done <<< "$tokens"

[ -s "$hits" ] || { rm -f "$hits"; exit 0; }

# --- Rank; keep top 5 with >=2 distinct keyword hits ------------------------
ranked="$(sort "$hits" | uniq -c | sort -rn | head -n 8 \
  | sed -E 's/^[[:space:]]*([0-9]+)[[:space:]]+/\1'"$(printf '\t')"'/')"
rm -f "$hits"

out=""
count=0
while IFS=$'\t' read -r s f; do
  [ -n "$f" ] || continue
  [ "$s" -ge 2 ] 2>/dev/null || continue          # need at least 2 distinct keyword hits
  [ "$count" -ge 5 ] && break
  # Retired nodes stay in the store for history but must not outrank (or even
  # join) live guidance in per-prompt surfacing.
  case "$(grep -m1 '^status:' "$f" 2>/dev/null)" in *superseded*|*deprecated*) continue ;; esac
  id="$(grep -m1 '^id:' "$f" 2>/dev/null | sed 's/^id:[[:space:]]*//')"
  title="$(grep -m1 '^title:' "$f" 2>/dev/null | sed 's/^title:[[:space:]]*//')"
  rel="${f#"$BRAIN_DIR"/}"
  [ -n "$id" ] || id="(node)"
  out="$out  • [$id] ${title:-untitled}, brain/$rel"$'\n'
  count=$((count + 1))
done <<< "$ranked"

[ "$count" -eq 0 ] && exit 0

echo "🧠 Possibly-relevant memory (read the node if useful; ignore if not):"
printf '%s' "$out"
exit 0
