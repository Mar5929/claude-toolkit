---
group: Agent platform documentation
summary: Official Codex documentation for how AGENTS.md instruction files are discovered, layered and limited.
source: https://learn.chatgpt.com/docs/agent-configuration/agents-md
captured_at: 2026-09-22
---

# Codex documentation, captured

**Source:** https://learn.chatgpt.com/docs/agent-configuration/agents-md

**Captured:** 2026-09-22

**Pages:** 1

The official Codex page on `AGENTS.md`, saved here so an agent changing how
this toolkit writes instruction files can read how Codex actually loads them
instead of guessing. The rule `.claude/rules/claude-code-docs-first.md` says
when to open a captured page before building or changing an instruction file.

This is somebody else's writing. It is not this project's truth, and it is
never edited to agree with this project. When a page and this project
disagree, say so out loud rather than quietly picking one.

The file starts with a header naming the page it came from and the day it was
captured. Nothing else was changed.

## How to refresh

Fetch the source URL again and replace the file below the header:

```
curl -sL https://learn.chatgpt.com/docs/agent-configuration/agents-md.md
```

The docs site serves a Markdown version of any page when `.md` is appended to
the page URL. There is no capture script for this folder; it holds one page.

## What is here

| Page | File | What it covers |
| --- | --- | --- |
| Custom instructions with AGENTS.md | `agents-md.md` | How Codex builds its instruction chain at startup: the global file in `~/.codex`, the project files from the project root down to the working directory, `AGENTS.override.md`, `project_doc_fallback_filenames`, the shared `project_doc_max_bytes` size budget, and how to check what was loaded. |

## Facts this project relies on that the captured page does not state

Three things this toolkit depends on are true, but the captured page does not
say them. Each one is recorded here with the source it was read from.

- **Codex never reads `CLAUDE.md` natively.** The setting that would let it,
  `project_doc_fallback_filenames`, defaults to an empty list, so no fallback
  filename is tried. Source: https://learn.chatgpt.com/docs/config-file/config-reference
  (read 2026-09-21).
- **Codex expands no import syntax.** An `@path` line reaches the model as
  literal text. Source: the file `codex-rs/core/src/agents_md.rs` in
  https://github.com/openai/codex on `main` (read 2026-09-21), which has no
  import handling.
- **The `project_doc_max_bytes` budget is spent root first.** The captured
  page states the 32 KiB combined limit. It does not state the order: the code
  reads the files root first and decrements the remaining budget as each one is
  added, so a large root file can starve the nested ones. Source: the same
  file, `codex-rs/core/src/agents_md.rs` (read 2026-09-21).
