# Read the Claude Code Documentation Before Building a Claude Code Thing

This repository builds things that plug into Claude Code: hooks, skills,
plugins, agents, slash commands, output styles, settings, and the processes
built on top of them. The official documentation for all of it is already in
this repository, at `ai-external-knowledge/claude-code/`.

Read the page first. Not after the thing fails to work.

## When this applies

Before writing or changing any of these, open the page that covers it:

- a hook, or anything about a hook event, its input, or its exit codes
- a skill, or a skill's frontmatter
- a plugin, a plugin manifest, or a marketplace entry
- a subagent or an agent definition
- a slash command
- an output style
- a settings key, a permission rule, or an environment variable
- a CLAUDE.md convention, an MCP server, or anything the CLI does

`ai-external-knowledge/claude-code/README.md` is the index. It lists every
page, what it covers, and the file it sits in. Start there when you do not
already know which page you want.

One page is usually enough. Read the one that answers the question rather than
the whole folder.

## Why this is a rule

Claude Code changes fast, and it is the subject an agent is most likely to be
both confident and wrong about. A hook event that was renamed, a manifest field
that never existed, a settings key that moved: each one produces something that
reads correctly and does nothing. The captured page is one file read away and
costs far less than the debugging that follows a guess.

## What the captured pages are, and are not

They are Anthropic's writing, saved as published. They are not this project's
decisions.

- Never edit a captured page. Refresh the whole capture instead, by running
  `node .claude/tools/capture-claude-code-docs.mjs`.
- When a page and this repository disagree, say so out loud rather than quietly
  picking one. This repository's own decisions win on how this repository
  works. The page wins on how Claude Code works.
- Check the capture date in a file's header. When the answer matters and the
  capture is old, refresh it or check the live page before relying on it.

`ai-external-knowledge.md` is the general rule about that folder, and it says
nothing reads the folder unless a rule points at it. This is that pointer.
