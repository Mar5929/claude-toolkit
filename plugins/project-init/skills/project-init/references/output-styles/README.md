# Output styles library

Reusable `.claude/output-styles/` files that set the voice Claude answers in.
`project-init` Gate 5 copies the selected file into the project and switches it
on; `project-sync` adds it to a project that predates it.

## What an output style is, and why it is not just another rule

A rule file in `.claude/rules/` is loaded as a message near the start of a
session. An output style is added to the system prompt instead, and the harness
re-reminds the session about it as the conversation runs. That difference is the
entire reason this folder exists.

`hooks-library/README.md` measured the problem. The four-word rule "no em
dashes" is carried by every project and broken as often as once every 1.8
assistant messages. The split it names is **once per decision** versus **once
per message**. "Never commit a secret" fires at one point and holds. A voice
rule fires on every sentence, thousands of tokens after it was last read.

So the toolkit now covers voice at three levels, and they are complements, not
duplicates:

| Level | Mechanism | Catches |
|---|---|---|
| Rules (`general-rules/`) | Loaded as a message; canonical wording; read by subagents too | The full reasoning, the edge cases, the tension between rules |
| Output style (this folder) | Added to the system prompt, with automatic reminders each turn | Drift over a long session, on the main conversation |
| `writing-guard` hook | Checks the finished reply and blocks on a hit | The literal misses: em dashes, section signs, filler openers |

Keep the rule files. An output style applies to the main conversation only; a
subagent runs its own system prompt and never sees it. Drop the rules and every
subagent loses the guidance.

## What ships today

| File | What it does |
|---|---|
| `plain-language.md` | Lead with the answer, cut what the owner would not act on, never cut a fact, no filler, assume no technical background, and put their next action last. The short operative form of `general-rules/writing-and-language.md`, `how-to-reply.md`, and `treat-owner-as-non-technical.md`. Sets `keep-coding-instructions: true`, so normal coding behavior is untouched. |

**Two things that file does on purpose.** It stays short, because every line in
it is a line that can fall out of step with the rule it came from, and it names
the rules as canonical in its last paragraph, so a session that spots a conflict
resolves it the right way. It also states outright that explaining clearly
outranks being brief. A style is re-stated to the session every turn while the
rules are read once, so "be brief" would otherwise get the louder voice and
crowd out the non-technical owner's explanation. That would trade a real problem
for a worse one.

## Default ON

`plain-language.md` goes into every project unless the owner opts that project
out. Turn it off for a project whose owner is comfortable with the stack and
wants the denser default voice; the rule files still carry the intent.

## Installing one

1. Copy the file to `.claude/output-styles/<name>.md` in the project.
2. Set the style in the project's `.claude/settings.json`, which is committed, so
   every machine and every session on the project picks it up:

   ```json
   {
     "outputStyle": "plain-language"
   }
   ```

3. Tell the owner it takes effect on their next session, not the current one.
   The system prompt is read once at session start, so an already-open session
   keeps the old voice until it restarts.

To switch styles by hand later, run `/config` and choose under **Output style**.
The standalone `/output-style` command was removed in Claude Code v2.1.91.

## Adding a style here

Same bar as the rules library: plain language, no em dashes, no section signs,
"owner" rather than a personal name, and no project-specific paths, so the file
stays reusable. Add a row to the table above and say whether it is default ON.

Set `keep-coding-instructions: true` unless the style is genuinely for
non-engineering work. Without it, Claude Code drops its built-in software
engineering instructions (how to scope changes, write comments, verify work),
which is almost never what a coding project wants.

A style must not restate a rule's reasoning at length. It carries the short,
operative form of rules that already exist; `general-rules/` stays the canonical
home for the full version. If a new voice instruction has no rule behind it,
write the rule first.
