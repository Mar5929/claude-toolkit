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

So voice is delivered at three levels, and they are complements:

| Level | Mechanism | Does |
|---|---|---|
| Output style (this folder) | Added to the system prompt at session start | Sets the voice for the whole session |
| `style-reminder` hook | Re-states the style on every message the owner sends | Stops it going stale hours into a long session |
| `writing-guard` hook | Reads the finished reply and blocks on an em dash or a section sign | Catches the two misses a script can see with no judgement |

**This is now the only home for voice.** The four rules that used to hold it,
`writing-and-language.md`, `how-to-reply.md`, `treat-owner-as-non-technical.md`,
and `define-your-terms.md`, were all deleted. Do not put a voice rule back in
`../rules/general/`. That folder is for how Claude *works*; this one is for how it
*talks*.

Two costs were accepted when those files went. One has since been paid, the
other is now handled a different way:

- **Nothing checked a finished reply.** That was the accepted cost of deleting
  `writing-guard` in #101, with a stated condition: if em dashes climbed back
  toward the rate in the table above, bring the check back rather than write the
  rule down again. #102 brought it back, deliberately narrowed to the em dash and
  the section sign. Everything with judgement in it (word choice, invented
  labels, answer-first, list versus sentences) stays with the style, because a
  wrong block costs the owner a turn.
- **A helper agent never sees a style.** Still true, and unfixable at this
  level: an output style is delivered in the main conversation's system prompt
  only. It is handled in two places instead. The `follow-the-output-style.md`
  rule in `../rules/general/` tells a helper agent to go read the style file before
  writing a commit message, pull request text, or a document. An agent that
  writes durable files carries the rules in its own definition; see the "How to
  write" section in `second-brain/agents/memory-librarian.md`.

## What ships today

| File | What it does |
|---|---|
| `plain-language.md` | The owner is not technical. Real names only and never one Claude invented, no figures of speech, common words, the answer first, a shape that matches the content, every fact kept, no filler, no em dashes, no section signs, quiet between tool calls, and the owner's actions at the end. Sets `keep-coding-instructions: true`, so normal coding behavior is untouched. |

**Written as goal, example, rules, in that order.** The goal says what a reply
is for. The example shows four real misses next to their fixes. The rules are
the checklist underneath. That order came out of the #102 interview: the owner
asked for "a goal the model works toward, not a pile of hard-coded rules", and
what #101 shipped was ten bullets with no goal and no example. An example the
model can copy carries the rules that resist being stated, and "no invented
names" is the clearest case. Keep the examples real. Every pair in the file is
something an agent actually wrote and the owner actually objected to.

**Keep it short.** A style is re-read by the agent constantly, so every line in
it competes with every other line, and the `style-reminder` hook re-sends the
whole file on every message. **50 lines is the working ceiling**, and that is a
decision made in #102, not a limit imposed by anything. Nothing breaks at 51;
the hook's own guard is a 4,000 character ceiling, which is far higher. The
number exists so the next person to add a line has to take one out. Detailed
procedure (how to write a numbered instruction list, when to use the question
box) belongs in a rule in `../rules/general/`, which is about working rather than
talking.

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

3. Install both hooks from the `hooks-library` plugin. `style-reminder`
   re-states this file on every message; `writing-guard` checks the finished
   reply for an em dash or a section sign. The style works without them, but
   only from that one delivery at session start, and nothing catches a slip.
4. Tell the owner it takes effect on their next session, not the current one.
   The system prompt is read once at session start, so an already-open session
   keeps the old voice until it restarts.

## Installing one for the whole machine

A style can also live at `~/.claude/output-styles/<name>.md`, with `outputStyle`
set in `~/.claude/settings.json`. Then every project gets it, including ones that
were never set up with this toolkit, and a repo the owner just cloned.

The `style-reminder` hook understands this. It looks for the style file in the
project first and falls back to the home folder, and it resolves the style name
from the project's local settings, then the project's committed settings, then
the machine's. A project that installs its own style still wins; the machine
copy is the floor, not an override.

Do both when the owner wants it everywhere. The project copy is committed, so it
travels to other machines and to anyone else working on that repo. The machine
copy covers everything else the owner opens.

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
procedure belongs in `../rules/general/`.
