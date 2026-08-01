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

So voice is now delivered at two levels, and they are complements:

| Level | Mechanism | Does |
|---|---|---|
| Output style (this folder) | Added to the system prompt at session start | Sets the voice for the whole session |
| `style-reminder` hook | Re-states the style on every message the owner sends | Stops it going stale hours into a long session |

**This is now the only home for voice.** The three rules that used to hold it,
`writing-and-language.md`, `how-to-reply.md`, and
`treat-owner-as-non-technical.md`, were deleted, and the `writing-guard` hook
that enforced them went with them. Do not put a voice rule back in
`general-rules/`. That folder is for how Claude *works*; this one is for how it
*talks*.

Two costs were accepted knowingly when those files went:

- **Subagents get nothing.** An output style applies to the main conversation
  only; a helper agent runs its own system prompt and never sees one.
- **Nothing checks a finished reply.** The style lowers the odds of a miss; the
  guard used to catch them. If em dashes climb back toward the rate in the table
  above, the answer is to bring a check back, not to write the rule down again.

## What ships today

| File | What it does |
|---|---|
| `plain-language.md` | The owner is not technical, no undefined jargon, plain and simple language, no em dashes, no section signs, no filler, visually clear replies built from lists, quiet between tool calls, and the owner's actions at the end. Sets `keep-coding-instructions: true`, so normal coding behavior is untouched. |

**Keep it short.** A style is re-read by the agent constantly, so every line in
it competes with every other line. It should carry the directives that shape
every reply and stop. Detailed procedure (how to write a numbered instruction
list, when to use the question box) belongs in a rule in `general-rules/`, which
is about working rather than talking.

## Default ON

`plain-language.md` goes into every project unless the owner opts that project
out. Turn it off for a project whose owner is comfortable with the stack and
wants the denser default voice.

## Installing one

1. Copy the file to `.claude/output-styles/<name>.md` in the project.
2. Set the style in the project's `.claude/settings.json`, which is committed, so
   every machine and every session on the project picks it up:

   ```json
   {
     "outputStyle": "plain-language"
   }
   ```

3. Install the `style-reminder` hook from the `hooks-library` plugin, which
   re-states this file on every message. The style works without it, but only
   from that one delivery at session start.
4. Tell the owner it takes effect on their next session, not the current one.
   The system prompt is read once at session start, so an already-open session
   keeps the old voice until it restarts.

To switch styles by hand later, run `/config` and choose under **Output style**.
The standalone `/output-style` command was removed in Claude Code v2.1.91.
The hook follows that choice: it reads whichever style is selected, and stays
silent for a built-in style, which has no file in the project.

## Adding a style here

Same bar as the rules library: plain language, no em dashes, no section signs,
"owner" rather than a personal name, and no project-specific paths, so the file
stays reusable. Add a row to the table above and say whether it is default ON.

Set `keep-coding-instructions: true` unless the style is genuinely for
non-engineering work. Without it, Claude Code drops its built-in software
engineering instructions (how to scope changes, write comments, verify work),
which is almost never what a coding project wants.

Keep it to directives. A style is the canonical home for voice, so there is no
longer a rule file behind it to hold the reasoning, which makes it tempting to
grow the file into one. Resist that. Write the operative instruction, not the
argument for it. Anything that needs a page of reasoning is procedure, and
procedure belongs in `general-rules/`.
