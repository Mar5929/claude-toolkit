# Output styles library

The toolkit ships two Claude Code output styles: `Plain English` and `Terse`.
`project-init` Gate 5 installs and selects `Plain English` by default.
`project-sync` checks its file, selected name, and guidance, then applies
approved fixes. A deliberate owner choice of another style is preserved.

## What ships today

| File | What it does | Default |
|---|---|---|
| `plain-english.md` | Clear, natural replies that are easy to skim or scan: the answer first, only the detail the user asked for, exact status verbs, ordinary words, and no figurative language or reply-length limit. Keeps Claude Code's software engineering instructions. | ON for toolkit project setup. |
| `terse.md` | Short replies for quick scanning, written at the level of the user's role read from the project's `SOUL.md` and project description. Keeps Claude Code's software engineering instructions. | OFF. The owner selects it per project. |

## Toolkit style and host options

`Concise` is a built-in Claude Code style. It is not shipped by this toolkit
and is not the toolkit default. A project selects one style or none.
The toolkit's selection is `"outputStyle": "Plain English"`, with the matching
style file installed. Setting the name alone is not installation.

The older `plain-language.md` style was removed in issue #245. Issue #271
introduced `plain-english.md` as an optional style; Plain English is now the
standard toolkit selection. Those older defaults do not govern current setup.

## How Claude Code delivers an output style

Claude Code sends the active style's instructions with every request. When the
selected style is not `Default`, Claude Code also reminds the main conversation
about it as the conversation continues. This changes how Claude responds, not
what it knows.

**This folder is the only home for voice.** Do not put a voice rule in
`../rules/general/`. That folder is for how Claude *works*; this one is for how
it *talks*.

The style reaches the main conversation and a fork, which inherits the main
conversation's system prompt. Other subagents use their own system prompts and
do not receive the style. Give an owner-facing helper the applicable writing
guidance in its own agent definition.

These delivery details come from Claude Code's official
[Output styles documentation](https://code.claude.com/docs/en/output-styles),
verified on 2026-09-22 against the repository's
[captured source](https://github.com/Mar5929/claude-toolkit/blob/main/ai-external-knowledge/claude-code/output-styles.md).

## The silent style read stays

The hooks library's `style-handshake` asks the main conversation to read the
whole selected style file silently on every user message. The owner chose to
keep this read because style adherence can weaken in long conversations. It
supplements Claude Code's built-in delivery. Do not replace the read with
injected style text.

The hook does not announce the read, judge the reply with another model, impose
a word count, or block a finished reply. It asks for a fresh read even when the
file was read earlier, then a silent style check before sending the reply.
It does not verify either action or the resulting prose.
Its setup and limits remain in the
[hooks library README](https://github.com/Mar5929/claude-toolkit/blob/main/plugins/hooks-library/README.md#style-handshake).

## Installing one

1. Copy the file to `.claude/output-styles/<name>.md` in the project.
2. Set the style in the project's committed `.claude/settings.json`, so every
   machine and every session on the project picks it up:

   ```json
   {
     "outputStyle": "Plain English"
   }
   ```

   The value is the style's name, which is the `name` field at the top of the
   file, and only falls back to the file name when the file sets no `name`.
   `plain-english.md` sets `name: Plain English`, so the value is
   `Plain English`.

   Claude Code matches that text exactly and takes a value that matches
   nothing as no style at all: it falls back to the default, reports no error,
   and writes nothing to the log. A wrong value here does not look like a
   mistake, it looks like the style quietly doing nothing. Check it with
   `/context` after restarting, or pick the style from the `/config` menu,
   which writes the correct value for you.
3. Select a different loaded style through `/config`, or with
   `/output-style <style>` on Claude Code 2.1.269 or later. Switching styles
   mid-session applies to the next user message.
   If a custom style file is created or edited while the terminal session is
   running, restart Claude Code so it reads the changed file.

## Installing one for the whole machine

A style can also live at `~/.claude/output-styles/<name>.md`, with `outputStyle`
set in `~/.claude/settings.json`. Then every project gets it, including ones
never set up with this toolkit.

Do both when the owner wants it everywhere. The project copy is committed, so it
travels to other machines and to anyone else on that repo. The machine copy
covers everything else the owner opens.

To switch styles by hand later, run `/config` and choose under **Output style**.
Claude Code 2.1.269 and later also support `/output-style <style>`.

## Adding a style here

Same bar as the rules library: plain language, "owner" rather than a personal
name, and no project-specific paths, so the file stays reusable. Add a row to
the table above and say whether it is default ON.

Set `keep-coding-instructions: true` unless the style is genuinely for
non-engineering work. Without it, Claude Code drops its built-in software
engineering instructions, which is almost never what a coding project wants.

**Keep it short.** A style sits in the system prompt for the whole session, so
every line competes with every other line. 50 lines is the working ceiling,
decided in issue #102. Nothing breaks at 51; the number exists so the next
person to add a line has to take one out. The style this folder lost to #245
died at 183 lines.

Keep it to directives. Write the operative instruction, not the argument for it.
Anything needing a page of reasoning is procedure, and procedure belongs in
`../rules/general/`.
