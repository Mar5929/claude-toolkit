# Prompts

Reusable prompt templates for Claude Code. Copy the relevant block into your conversation or
into a project's `CLAUDE.md` to guide Claude's behaviour.

## Index

| File | Purpose |
|------|---------|
| [code-review.md](./code-review.md) | Review a diff or file for correctness, style, and security |
| [debugging.md](./debugging.md) | Methodically diagnose and fix a bug |
| [refactoring.md](./refactoring.md) | Improve code structure without changing behaviour |
| [test-generation.md](./test-generation.md) | Generate comprehensive unit or integration tests |
| [documentation.md](./documentation.md) | Write or improve inline and reference documentation |

## Usage

### In a one-off conversation
Paste the prompt text directly into your chat with Claude.

### In a project CLAUDE.md
Add the relevant prompt under a **Common Tasks for Claude** section so that Claude applies
it automatically whenever the task comes up.

### With Claude Code slash commands
Save a prompt file and reference it with `/file prompts/<name>.md` at the start of a task.
