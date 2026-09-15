# Every Subagent Runs on Opus

Any agent this session starts runs on Opus. Not the session's own model, and
never a more expensive one. The owner set this on 2026-09-15 because the main
session may run on a model that costs far more per token than Opus, and a
subagent that inherits it spends that price on file reading and summarizing.

## How it is enforced

`.claude/settings.json` sets two environment variables:

```json
"CLAUDE_CODE_SUBAGENT_MODEL": "opus",
"CLAUDE_CODE_SUBAGENT_MODEL_FORCE": "1"
```

With both set, Claude Code runs every subagent on Opus and ignores the `model`
field in agent definitions and any model passed when an agent is started. That
covers the built-in Explore and Plan agents, project agents, teammates, and
workflow agents. Two things still inherit the session's model: a fork of the
current conversation, and a skill that runs in a subagent with `model: inherit`.
Do not use either for delegated work here.

## What the agent still does

- Pass `model: opus` when starting an agent anyway, so the intent is visible in
  the call and holds on a machine where the settings did not load.
- Check with `/tasks` when unsure. The agent's row names the model it runs on.
- A `model:` line in a project agent definition under `.claude/agents/` says
  `opus`, so the file and the setting agree.

The captured page is `ai-external-knowledge/claude-code/sub-agents.md`, section
"Run every subagent on one model". It requires Claude Code 2.1.257 or later.
