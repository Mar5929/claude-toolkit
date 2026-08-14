---
name: braindump
description: Play back a pasted brain dump in very simple language and confirm the understanding before doing any work. Use when the owner types /braindump after or alongside a loose spoken-style dump of what they want, or says "play that back", "tell me what you heard", "make sure you understood that before you start", or "here's a brain dump" followed by a request to confirm understanding first.
---

# Brain dump playback

The owner pasted a loose, spoken-style dump of what they want. Before any work
starts, say back what you understood, in words a five year old could follow,
and wait for their yes.

## The hard rule

**Do no work until the owner confirms the playback.** No files read beyond what
the dump names, no files written, no commands run, no plans executed. The
playback and the questions are the entire first turn.

## What to play back

The brain dump is whatever the owner pasted or spoke in this message or the
messages just before the command. If there is no brain dump to be found, say so
in one line and ask for it. Do not treat an ordinary short request as a dump.

## The shape of the playback

1. **The big idea, first.** One or two sentences: what the owner is really
   after, underneath the words.
2. **The steps or pieces, as a short numbered list.** If the dump holds several
   separate asks, list each one on its own so none is silently merged or
   dropped.
3. **What you are NOT sure about.** Every guess, gap, and thing that could be
   read two ways, said plainly as "I think you mean X, but you might mean Y."
4. **Questions, then stop.** End with the questions the owner must answer
   before work can start, as a short list, with a recommended answer for each
   where you have one. If there are none, end with one line asking for a yes.

## The words

- Explain it like the owner is five years old: short sentences, everyday words,
  no jargon the owner did not use first.
- Simplify the wording, never the facts. Every number, name, file path, and
  system the dump mentioned survives into the playback.
- A technical name that cannot be avoided keeps its exact spelling and gets a
  few plain words right after it saying what it is.
- No em dashes. No section signs; write "section 7".

## After the owner answers

- If they confirm, start the work. The confirmed playback is the agreed scope;
  do not quietly expand past it.
- If they correct something, play back only the corrected part in one or two
  lines, then confirm again. Do not replay the whole thing.
- If the confirmed work is real project work, the project's own rules
  (tickets, specs, worktrees) apply from that point as normal. This skill only
  owns the moment before work starts.

## Voice

Read the project's active output style before writing, so this matches the rest
of the project instead of drifting. Find it at
`.claude/output-styles/<name>.md`, where `<name>` is the `outputStyle` value in
`.claude/settings.local.json`, then `.claude/settings.json`, then
`~/.claude/settings.json`. If there is no such file, the rules above are enough
on their own.
