#!/bin/sh
# claude-toolkit:knowledge-pre-commit
#
# Git pre-commit hook from the second-brain plugin. When a commit changes
# project knowledge, it runs the knowledge checker on the staged files, so a
# badly formatted knowledge file cannot be committed from Claude Code, Codex or
# a terminal. Git never commits hooks, so knowledge-setup and project-sync
# install this file as the clone's pre-commit hook.
#
# It checks what is staged, not the working folder, so another session's
# unstaged edits can neither fail nor pass this commit. It refuses the commit
# when Node.js is missing, because an unchecked commit is what it exists to stop.

# Only commits that change a file the checker reads.
if ! git diff --cached --name-only --no-renames -z | tr '\000' '\n' \
  | grep -E '^(knowledge/|ai-external-knowledge/|SOUL\.md$|\.claude/tools/)' >/dev/null; then
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Knowledge check: Node.js was not found, so the staged knowledge files" >&2
  echo "could not be checked. Install Node.js, then commit again." >&2
  exit 1
fi

tmp=$(mktemp -d "${TMPDIR:-/tmp}/knowledge-pre-commit.XXXXXX") || exit 1
trap 'rm -rf "$tmp"' EXIT
trap 'exit 1' HUP INT TERM

# A private copy of exactly what this commit will contain.
git checkout-index -a --prefix="$tmp/" || exit 1

# A branch without project knowledge has nothing to check.
[ -d "$tmp/knowledge" ] || exit 0

checker="$tmp/.claude/tools/check-knowledge.mjs"
if [ ! -f "$checker" ]; then
  checker="$(git rev-parse --show-toplevel)/.claude/tools/check-knowledge.mjs"
fi
if [ ! -f "$checker" ]; then
  echo "Knowledge check: .claude/tools/check-knowledge.mjs is missing, so the" >&2
  echo "staged knowledge files could not be checked. Run project-sync to" >&2
  echo "restore the knowledge tools, then commit again." >&2
  exit 1
fi

if ! node "$checker" "$tmp"; then
  echo "Knowledge check: this commit was refused. Fix the files named above," >&2
  echo "stage them, and commit again. Do not skip the check with --no-verify." >&2
  exit 1
fi
