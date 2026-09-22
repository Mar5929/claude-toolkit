# Output styles library

The toolkit ships two Claude Code output styles: `Plain English` and `Terse`.
`project-init` Gate 5 installs and selects `Plain English` by default.
`project-sync` checks its file, selected name, and guidance, then applies
approved fixes. A deliberate owner choice of another style is preserved.

## What ships today

| File | What it does | Default |
|---|---|---|
| `plain-english.md` | Short replies written to be skimmed or scanned, for a reader who is not a developer: the answer first, status first in a list, the user's own names for things, exact verbs, plain words, no figurative language, no reply-length limit. Keeps Claude Code's software engineering instructions. | ON for toolkit project setup. |
| `terse.md` | The same shape, written at the level of the user's role read from the project's `SOUL.md` and project description instead of for a non-developer. Keeps Claude Code's software engineering instructions. | OFF. The owner selects it per project. |

## Toolkit style and host options

`Concise` is a built-in Claude Code style. It is not shipped by this toolkit
and is not the toolkit default. A project selects one style or none.
The toolkit's selection is `"outputStyle": "Plain English"`, with the matching
style file installed. Setting the name alone is not installation.

The older `plain-language.md` style was removed in issue #245. Issue #271
introduced `plain-english.md` as an optional style; Plain English is now the
standard toolkit selection. Those older defaults do not govern current setup.

## What an output style is, and why it is not a rule

A rule file in `.claude/rules/` is loaded as a message near the start of a
session. An output style is added to the system prompt instead, and the harness
re-reminds the session about it as the conversation runs.

**This folder is the only home for voice.** Do not put a voice rule in
`../rules/general/`. That folder is for how Claude *works*; this one is for how
it *talks*.

## What a style cannot reach, and what to do about it

**A helper agent never sees a style.** An output style is delivered in the main
conversation's system prompt only. A helper agent runs its own prompt, and
helper agents are what write commit messages, pull request text, and documents
that land in the repo.

One thing covers that gap: a helper-agent definition that writes owner-facing
prose carries the writing rules in its own text. See the `handoff-verifier`
agent in `session-skills`.

A rule used to cover it too. `follow-the-output-style.md` in `../rules/general/`
sent a helper agent to read the active style file first. The owner removed it on
2026-09-02, so an agent definition carrying its own writing rules is now the
only cover there is.

## Per-message reminders are not the answer, and the toolkit stopped trying

Three attempts to enforce voice on every turn have now been removed.

- `style-reminder`, a hook that resolved the active style and re-sent the whole
  file, up to 4000 characters, every turn. Removed in August 2026 as
  per-message overhead for an instruction the harness already re-delivers.
- `writing-guard`, a hook that refused a finished reply containing an em dash or
  a section sign. Removed the same month: the refused reply was already on the
  owner's screen, so he read the same answer twice.
- `explain-simply-reminder`, a `UserPromptSubmit` hook shipped in issue #258
  carrying a fixed six-line plain-language reminder, roughly 90 tokens a
  message. Removed in issue #271 and replaced by `plain-english.md`.

The tradeoff the owner accepted in #271 is worth stating plainly, because it is
the exact one #258 decided the other way. A hook fires on every turn and never
goes stale. A style is delivered once at session start, so in a long session it
is the oldest instruction in the window. The owner chose the style anyway: one
short file, no per-message cost, and one place to change the voice.

Do not ship a fourth per-message voice reminder without the owner asking for it
in his own words.

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
3. Tell the owner it takes effect on their next session, not the current one.
   The system prompt is read once at session start, so an already-open session
   keeps the old voice until it restarts.

## Installing one for the whole machine

A style can also live at `~/.claude/output-styles/<name>.md`, with `outputStyle`
set in `~/.claude/settings.json`. Then every project gets it, including ones
never set up with this toolkit.

Do both when the owner wants it everywhere. The project copy is committed, so it
travels to other machines and to anyone else on that repo. The machine copy
covers everything else the owner opens.

To switch styles by hand later, run `/config` and choose under **Output style**.
The standalone `/output-style` command was removed in Claude Code v2.1.91.

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
