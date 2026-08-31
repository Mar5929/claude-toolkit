# Output styles library

Reusable `.claude/output-styles/` files that set the voice Claude answers in.
`project-init` Gate 5 copies the selected file into the project and switches it
on; `project-sync` adds it to a project that predates it.

## What an output style is, and why it is not just another rule

A rule file in `.claude/rules/` is loaded as a message near the start of a
session. An output style is added to the system prompt instead, and the harness
re-reminds the session about it as the conversation runs. That difference is the
entire reason this folder exists.

**This is now the only home for voice.** The four rules that used to hold it,
`writing-and-language.md`, `how-to-reply.md`, `treat-owner-as-non-technical.md`,
and `define-your-terms.md`, were all deleted. Do not put a voice rule back in
`../rules/general/`. That folder is for how Claude *works*; this one is for how it
*talks*.

Two hooks used to reinforce the style from the `hooks-library` plugin:
`style-reminder`, which re-stated the style on every message, and
`writing-guard`, which blocked a finished reply containing an em dash or a
section sign. The owner removed both in August 2026: the reminder cost tokens on
every message for an instruction the harness already re-delivers, and the guard
forced a rewrite the owner had to read twice. Do not reintroduce per-message
voice enforcement without the owner asking for it.

One cost of a style-only setup is real and stays handled a different way:

- **A helper agent never sees a style.** An output style is delivered in the
  main conversation's system prompt only. It is handled in two places instead.
  The `follow-the-output-style.md` rule in `../rules/general/` tells a helper
  agent to go read the style file before writing a commit message, pull request
  text, or a document. An agent that writes something the owner reads carries
  the rules in its own definition; see the `handoff-verifier` agent in the
  `handoff` plugin for an example.

## What ships today

| File | What it does |
|---|---|
| `plain-language.md` | The owner is not technical, reads the answer once, and wants the point in one pass with no clutter. Every fact kept while the wording is simplified. Real names only and never one Claude invented, no figures of speech, no jargon the owner did not use first, no em dashes, no section signs, quiet between tool calls, and the owner's actions at the end. Also controls length on Claude Opus 5, which talks more than earlier models: caveats stay to a line, an explanation defaults to the high-level version, commentary during a long task drops to one sentence up front and the outcome at the end, and a closing `tone_preference` reminder repeats the brevity instruction where the system prompt ends. Sets `keep-coding-instructions: true`, so normal coding behavior is untouched. |

**Written as goal then rules.** The goal says who the reply is for and what they
need out of it. The rules underneath are the ones that do not follow from
knowing the reader.

It carried a middle section of worked examples until 09f28ab, four real misses
next to their fixes. That section came out of the #102 interview, where the
owner asked for "a goal the model works toward, not a pile of hard-coded rules",
and it was there because an example the model can copy carries the rules that
resist being stated, "no invented names" being the clearest case. The owner
removed it when he shortened the file. If examples ever go back, keep them real:
every pair has to be something an agent actually wrote and the owner actually
objected to.

**Keep it short.** A style sits in the system prompt for the whole session, so
every line in it competes with every other line. **50 lines is the working
ceiling**, and that is a decision made in #102, not a limit imposed by anything.
Nothing breaks at 51. The number exists so the next person to add a line has to
take one out. **The file is at 183 lines and the ceiling is not being kept.**
Worked examples went back in after #102 and the Opus 5 length instructions were
added in #241 without a matching cut. Trimming it back is open work, not a
settled state. Detailed procedure (how to write a numbered instruction list, when
to use the question box) belongs in a rule in `../rules/general/`, which is
about working rather than talking.

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

3. Tell the owner it takes effect on their next session, not the current one.
   The system prompt is read once at session start, so an already-open session
   keeps the old voice until it restarts.

## Installing one for the whole machine

A style can also live at `~/.claude/output-styles/<name>.md`, with `outputStyle`
set in `~/.claude/settings.json`. Then every project gets it, including ones that
were never set up with this toolkit, and a repo the owner just cloned.

Do both when the owner wants it everywhere. The project copy is committed, so it
travels to other machines and to anyone else working on that repo. The machine
copy covers everything else the owner opens.

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

Keep it to directives. A style is the canonical home for voice, so there is no
longer a rule file behind it to hold the reasoning, which makes it tempting to
grow the file into one. Resist that. Write the operative instruction, not the
argument for it. Anything that needs a page of reasoning is procedure, and
procedure belongs in `../rules/general/`.
