# Every Claude Code Subagent Runs on Opus

Any Claude Code agent this session starts runs on Opus. Not the session's own
model, and never a more expensive one. The owner set this on 2026-09-15 because
the main session may run on a model that costs far more per token than Opus, and
a subagent that inherits it spends that price on file reading and summarizing.

## Claude Code enforcement

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

Pass `model: opus` when starting a Claude Code agent anyway, so the intent is
visible in the call and holds on a machine where the settings did not load.
Check with `/tasks` when unsure. The agent's row names the model it runs on.

The captured page is `ai-external-knowledge/claude-code/sub-agents.md`, section
"Run every subagent on one model". It requires Claude Code 2.1.257 or later.

## Codex model selection

This Claude Code setting does not apply to Codex. For Codex helper agents and
separately created Codex tasks, choose a model the current host offers. Use an
economical adequate model by default. Reserve the most capable available model
for genuinely complex intellectual work: difficult novel reasoning,
high-stakes judgment, or deep synthesis across several interacting systems.
Do not use it for routine reading, searching, summarizing, or bounded
mechanical work.

Use the Codex agent or task tool's model argument when it is available. Respect
the host's available models, reasoning-level limits, and higher-priority model
restrictions. Do not invent a Codex settings key or assume a Claude Code model
name is available in Codex.
