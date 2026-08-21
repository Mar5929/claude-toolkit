---
name: session-search
description: >-
  Search locally saved Claude Code CLI conversations. This is tier 5 of the find
  ladder, reached only when short-term memory, rules, skills, and long-term
  memory have all come up empty, or when the owner asks to find an earlier
  session. Search read-only transcript history by project, repository worktrees,
  words or topic, and date. Every result comes back flagged as possibly out of
  date. Never treat a past session as current truth, copy it into project
  knowledge, or silently search every project on the machine.
---

# session search

## Where this sits

This is **tier 5 of the find ladder**, the lowest tier. Not a last-ditch effort:
a real place to look, reached in order.

1. `knowledge/current.md`, short-term memory.
2. `.claude/rules/`, in case it is a standing instruction.
3. Skills, in case it is a procedure rather than a fact.
4. `knowledge/memory/` and `knowledge/specs/`, long-term memory.
5. Here.

`recall` walks tiers 1 to 4. Invoke this skill only when those left a real gap,
or when the owner asks for an earlier session directly.

## Offer it, never take it silently

Before searching, say what the earlier tiers found and ask:

> I cannot find it. Do you want me to search past sessions?

The owner may say yes, or you may use your own judgment and search. Either way
it is offered or announced first. Never search past sessions silently and
present the result as though it came from the project.

## Search the smallest scope

Choose two to four distinctive words, a quoted phrase, or a known session title.
Run the bundled read-only script:

```text
node "${CLAUDE_SKILL_DIR}/scripts/search-sessions.mjs" \
  --query "distinctive words" \
  --project "${CLAUDE_PROJECT_DIR}"
```

The default `project` scope searches sessions tied to the current project only.
If that scope does not answer and another worktree of the same repository is
relevant, add `--scope repository`.

Use `--since YYYY-MM-DD` and `--until YYYY-MM-DD` when the likely date is known.
Use `--limit N` only when the default five matches are not enough.

Never search unrelated projects without the owner's explicit permission. After
permission, use both `--scope all` and `--allow-all-projects`. The script refuses
an all-project search without that second flag.

## Read results as history

The script returns JSON for the agent. Keep raw matches in tool context by
default. Each first-pass result contains at most 500 characters, the project,
session, matching-message time, session start and last activity, role, exact
resume command, and the identifiers needed to expand one result.

If one excerpt is promising but incomplete, expand only that result:

```text
node "${CLAUDE_SKILL_DIR}/scripts/search-sessions.mjs" \
  --project "${CLAUDE_PROJECT_DIR}" \
  --session <session-id> \
  --message <message-id> \
  --expand message
```

Use `--expand turn` only when the matching message and its reply are both
needed. Reuse the original `--scope` and all-project permission flag.

## Flag every result, every time

A past session is a record of what was said once. It is not current truth, and
it may have been overtaken by everything that happened since.

So every answer that leans on a session match comes back with the flag attached:

> I found this in a previous session. Is this still accurate?

That is not optional and it is not reserved for uncertain cases. The owner is
the only one who knows whether something said weeks ago still holds.

Name the session and its date alongside the flag, so he can judge how old it is.

Current project files win when they answer. If a session match conflicts with a
current file, show the conflict and treat the session as historical evidence
only.

Do not paste raw matches unless the owner asks or the passage is needed to
explain uncertainty. If the owner wants the full conversation, use the returned
session ID with Claude Code's `/resume` picker or `claude --resume <session-id>`.

## Keep the boundary

- Search Claude Code CLI history only. Desktop, editor, web, and Codex histories
  are separate capabilities.
- Never edit, move, copy, index, or archive a transcript.
- Never write a result into `knowledge/` or a tracker on the strength of having
  found it here. If it turns out to still be true, it goes through `remember`
  like anything else, with its own approval.
- Never return tool results, hidden thinking, or metadata-only records as
  conversation matches.
- Unknown JSONL records are skipped because Claude Code's internal transcript
  shape may change.
- If history is disabled, expired, removed, missing, or unreadable, report that
  possibility without claiming no discussion happened.
