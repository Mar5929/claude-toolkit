---
name: second-brain
description: >-
  Set up, adopt, detect, convert, explain, or maintain the toolkit's portable
  project knowledge system. Use for project memory, knowledge, specifications,
  SOUL.md, Obsidian-vault setup, converting a project off an older knowledge
  layout, or explaining how the system works. Markdown and Git stay
  authoritative. Never guess what an old file meant, and never convert without
  showing the owner what changed.
---

# Project knowledge system

The project brain lives under `knowledge/`, plus `SOUL.md` at the root. Obsidian
may open the folder as a vault, but ordinary Markdown and Git are the source of
truth.

`knowledge/specs/knowledge-system.md` in the toolkit repository is the design
authority. It is not installed into projects. The managed
`knowledge/README.md` template is the portable operating manual.

## What gets installed

```text
SOUL.md                            who the agent is here
knowledge/
  README.md                        managed operating manual
  project.md                       what the project is and where work is tracked
  current.md                       short-term working memory, overwritten
  memory/
    memory-index.md                generated, one line per file
  specs/
    spec-index.md                  generated, one line per file
  brainstorms/                     raw exploration, never current truth
  .obsidian/app.json               minimal vault settings
.claude/
  tools/build-knowledge-index.mjs
  tools/check-knowledge.mjs
  tools/frontmatter.mjs
  hooks/knowledge-session-start.mjs
  hooks/save-reminder.mjs
  hooks/work-item-close.mjs
```

`knowledge/memory/` and `knowledge/specs/` are **flat**. One file per topic, no
subfolders by type. Tags are free-form with no vocabulary file.

## Work out what shape the project is in

Look before doing anything. There is no detector script: read the folder.

| What you see | What it is |
|---|---|
| No `knowledge/` folder | **New.** Offer the full setup. |
| `knowledge/README.md` starts with `<!-- claude-toolkit:knowledge-manual -->`, both flat folders and indexes exist, and any saved files use current frontmatter | **Current.** This includes a fresh setup with no saved files. Audit what is missing, convert nothing. |
| The flat folders and indexes have current signatures, but the managed manual is missing | **Partial current.** Offer to restore the manual; do not convert approved files. |
| `knowledge/memory/` with subfolders like `context/`, `decisions/`, `domain/` | **Older layout.** Offer the conversion below. |
| `knowledge/memory/tags.md`, or frontmatter with `source: owner-paraphrase` and `session:` | **Older layout.** Same. |
| A `memory/` or `specs/` folder with none of those signs | **Not this system.** Say so and ask. Folder names alone prove nothing. |
| Signs of more than one shape at once | **Stop.** Name exactly what you found and ask. Do not move anything. |

## New project setup

1. Show the tree above and get approval for the whole thing before writing.
2. Copy `references/templates/` into place. `knowledge/README.md` is a managed
   exact copy, not project-authored knowledge.
3. Write the real `SOUL.md` and `knowledge/project.md` with the owner. What the
   project is, why it exists, what finished looks like, its boundaries, who is
   involved, and where active work is tracked. The templates are prompts, not
   finished truth: never leave the placeholder wording in place.
4. Copy `build-knowledge-index.mjs`, `check-knowledge.mjs`, and
   `frontmatter.mjs` from this plugin's `tools/` into `.claude/tools/`.
5. Copy all four hooks from `hooks/` into `.claude/hooks/`.
6. Register them: the startup loader under Claude `SessionStart`, the save
   reminder under `PreToolUse` with the `Bash` matcher, the work-item hook where
   the project's tracker signals a close. Where native Codex hooks exist,
   register the same fail-open startup loader with at least 5,000 tokens of
   additional context so the manual and map are not cut off.
7. Add the same short startup and fallback route to root `CLAUDE.md` and
   `AGENTS.md`. It points to the manual and map without copying policy. Register
   the native Codex hook where available; the root route remains the fallback.
8. Set `CLAUDE_CODE_DISABLE_AUTO_MEMORY` to `1` and enable
   `second-brain@claude-toolkit` in the project's settings.
9. Run `node .claude/tools/build-knowledge-index.mjs` and then
   `node .claude/tools/check-knowledge.mjs`. Both must pass.

A new project starts with no tags and no memories. Never copy another project's
content or tags in.

## Converting a project off an older layout

The older layout put memory in seven subfolders by type, restricted tags to a
list in `knowledge/memory/tags.md`, and used a different frontmatter shape.

**This is the one place approval comes after the write rather than before**, and
only because every one of those files was already approved once, in its old
shape. Everything else in this system shows the owner the words first.

1. **Count first.** List every file that will convert, grouped by its current
   subfolder, and show the owner the count before starting.
2. **Convert in batches he can actually read.** Ten files at a time, not all of
   them at once.
3. **Map the old fields to the new ones:**

   | Old | New |
   |---|---|
   | `source: owner-quote` or `owner-paraphrase` | `confidence: reported`, and `source` says the owner said it |
   | `source: read-from-file` plus `source-file:` | `confidence: observed`, `source` is that path |
   | `source: agent-observed` | `confidence: observed` |
   | `source: agent-conclusion-unchecked` | `confidence: inferred` |
   | `date:` | `created_at:` |
   | `superseded-by:` | `superseded_by:`, and `status: superseded` |
   | the containing subfolder | `type:`, chosen from fact, decision, event, context, constraint |
   | `tags:` from the fixed list | `tags:`, unchanged, now free-form |
   | `session:` | dropped |

   `summary` is written from the file's existing first sentence. `approved_by`
   and `approval_date` record the original approval where the file says it, and
   the conversion date where it does not, with that noted.

4. **Never guess at meaning.** The words in the body carry over unchanged. If a
   file will not map cleanly, stop on it, name it, and ask. Do not invent a
   `type` or a `confidence` to make a file fit.
5. **Flatten.** Every file moves up into `knowledge/memory/`. Delete the empty
   subfolders and `knowledge/memory/tags.md`.
6. **Repair links.** Every relative path that changed gets fixed in the same
   change.
7. **Show each batch** and take his answer by number: keep, change, or revert.
8. **Rebuild and check.** Run the index builder and the checker. Both must pass
   before the conversion is called done.
9. **Remove the old machinery** if the project still has it: the old memory rule,
   any verifier agent, `knowledge-health.mjs`, `knowledge-layout.mjs`, and the
   old harnesses. Record what was removed in the project's sync record.

No fact is lost. A file that says something before says the same thing after.

## Git boundary

Everything stays in the requesting session's worktree. This plugin never
commits, pushes, opens or merges pull requests, or deletes branches. The
project's Git workflow owns all of that.

## Hard boundaries

- Do not write anything while detecting or planning.
- Do not treat an ordinary `memory/`, `specs/`, or `knowledge/` folder as this
  system without its signatures.
- Do not follow a symlink outside the repository.
- Do not overwrite an existing file or merge two candidate project overviews.
- Do not restore retired machinery: the verifier, the health tool, the layout
  tool, the always-loaded memory rule, per-folder indexes, background curation,
  or automatic capture.
- Do not commit a generated report. The indexes are the only generated files
  that belong in Git.
- Do not create per-folder README files or a nested instruction file inside
  `knowledge/`, except the managed root `knowledge/README.md` manual.
