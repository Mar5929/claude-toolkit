#!/usr/bin/env node
/**
 * explain-simply-reminder: a UserPromptSubmit hook that asks, on every message
 * the owner sends, for an answer a five-year-old could follow.
 *
 * Why this exists. The `explain-simply` skill says exactly the right thing, but
 * only when the owner invokes it, one answer at a time. An output style says it
 * once, in the system prompt at session start, and thousands of tokens later it
 * is the oldest instruction in the window. Neither reaches the agent on the turn
 * where the owner has just asked something and the answer is about to be
 * written. A UserPromptSubmit hook does.
 *
 * Know the history before touching this. The toolkit shipped a hook shaped like
 * this once, `style-reminder`, and removed it in August 2026 as per-message
 * overhead. That one resolved the active output style and re-sent the whole
 * style file, up to 4000 characters, every single turn. This one is the fixed
 * string below and nothing else: no file read, no settings lookup, no config,
 * no state. The cost that killed the old hook is not the cost of this one. The
 * owner made that call knowing the history, and `README.md` records it as the
 * one named exception to the three jobs a hook is normally for.
 *
 * What it is NOT. A reminder, not a check. It reads nothing the agent wrote and
 * blocks nothing. It cannot catch a complicated answer; it only lowers the odds
 * of one.
 *
 * Why the text is fixed and not read from a style file. A reminder that pointed
 * at another file would be a second copy to keep in step, and would go silent in
 * any project that does not have that file. The whole instruction is six lines,
 * so it is cheaper to carry than to look up.
 *
 * Why it fires every time. There is no per-session throttle on purpose. The
 * failure it exists for is the instruction going stale, which is exactly what a
 * throttle would reintroduce.
 *
 * How it delivers. Exit 0 with the reminder on stdout, which Claude Code adds to
 * the session context for that turn.
 *
 * Fails open and quiet. Any unexpected error exits 0 with nothing written. A
 * broken reminder must never block the owner's message.
 */

import { readFileSync } from 'node:fs';

const REMINDER = [
  'Answer the message you just received as if the reader is five years old.',
  '',
  '- Plain everyday words. No jargon the owner did not use first.',
  '- Bullet points. One idea per bullet, one line per bullet.',
  '- Keep it short.',
  '- Simplify the wording, never the facts. Numbers, names, file paths, costs,',
  '  and anything that cannot be undone all stay in.',
  '- Say plainly when something is unknown, unchecked, or failed.',
].join('\n');

/**
 * Drain stdin so the host is never left writing into a closed pipe. Nothing in
 * the payload changes the reminder, so a read that fails is not a reason to stay
 * quiet.
 */
try {
  readFileSync(0, 'utf8');
} catch {
  // Nothing to do. The reminder does not depend on the payload.
}

try {
  process.stdout.write(REMINDER + '\n');
} catch {
  // A reminder that cannot be written is not worth failing the owner's message.
}

process.exit(0);
