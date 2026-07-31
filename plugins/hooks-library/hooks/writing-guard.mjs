#!/usr/bin/env node
/**
 * writing-guard: a Stop hook that checks the assistant's final reply against
 * the writing rules a machine can check without interpreting anything.
 *
 * Why this exists. Measuring real session transcripts showed the writing rules
 * are stated clearly, in several places, and broken constantly anyway: em
 * dashes appeared in 57% of assistant messages in one project and 25% in
 * another, against a rule that says "No em dashes" in four words. Instructions
 * do not hold a per-message style rule across a long session. A check does.
 *
 * What it checks. Only violations with no judgement in them:
 *
 *   em-dash       a literal em dash. writing-and-language.md: "No em dashes."
 *   section-sign  a literal section sign. Same rule: write "section 7".
 *   filler-opener the final reply starts with "Sure", "Let me", "Great
 *                 question", and friends. how-to-reply.md: lead with the
 *                 answer, cut preamble.
 *
 * Deliberately NOT checked: whether a question was asked in prose rather than
 * the question box. That one needs to know whether the agent actually needed a
 * decision, and a wrong block costs the owner a wasted turn. Measurement put it
 * at 2.6% in the project with the most data, so the noise would outweigh it.
 *
 * How it blocks. Exit 2 with the violations on stderr, which Claude Code feeds
 * back to the agent so it rewrites before the owner sees the reply. Exit 0
 * means clean.
 *
 * Loop safety, three layers, because a hook that can force another turn must
 * never be able to force them forever:
 *   1. honor `stop_hook_active` when the harness sets it;
 *   2. never block twice on identical text (the agent cannot fix it, so let it
 *      through rather than spin);
 *   3. a hard cap of MAX_BLOCKS per session.
 *
 * Fails open. Any unexpected error exits 0. A broken guard must never wedge a
 * session.
 *
 * Config, all optional, from .claude/writing-guard.json in the project root:
 *   { "checks": { "em-dash": true, "section-sign": true, "filler-opener": false },
 *     "maxBlocks": 3 }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const MAX_BLOCKS_DEFAULT = 3;

const CHECKS = [
  {
    id: 'em-dash',
    test: (text) => countOf(text, '—'),
    label: 'em dash',
    fix: 'Use a comma, colon, parentheses, or a new sentence.',
    rule: 'writing-and-language.md',
  },
  {
    id: 'section-sign',
    test: (text) => countOf(text, '§'),
    label: 'section sign',
    fix: 'Write "section 7" instead.',
    rule: 'writing-and-language.md',
  },
  {
    id: 'filler-opener',
    test: (text) => (FILLER_OPENER.test(text) ? 1 : 0),
    label: 'filler opener',
    fix: 'Delete the opener and start with the answer or the action.',
    rule: 'how-to-reply.md',
  },
];

// The trailing lookahead is load-bearing. Without it "great" matches the start
// of "Greatly improved throughput" and "perfect" matches "Perfectly reasonable",
// so the guard blocks a perfectly good reply. A false positive costs the owner a
// wasted turn, which is worse than missing one opener.
const FILLER_OPENER =
  /^\s*(?:sure(?:\s+thing)?|of course|certainly|absolutely|great(?:\s+question)?|perfect|excellent|got it|understood|happy to|i'll go ahead|let me|i'm going to|now let me|i will now|thanks for asking)(?![a-z])/i;

function countOf(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function bail() {
  process.exit(0);
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** Text blocks of the last assistant message, which is the final reply. */
function finalReplyText(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return '';
  let lines;
  try {
    lines = readFileSync(transcriptPath, 'utf8').split('\n');
  } catch {
    return '';
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line || !line.includes('"assistant"')) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (row.type !== 'assistant') continue;
    const content = row.message?.content;
    if (!Array.isArray(content)) continue;
    const text = content
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (text) return text;
  }
  return '';
}

function loadConfig(projectDir) {
  const defaults = { checks: {}, maxBlocks: MAX_BLOCKS_DEFAULT };
  if (!projectDir) return defaults;
  const path = join(projectDir, '.claude', 'writing-guard.json');
  if (!existsSync(path)) return defaults;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return {
      checks: parsed.checks && typeof parsed.checks === 'object' ? parsed.checks : {},
      maxBlocks: Number.isInteger(parsed.maxBlocks) ? parsed.maxBlocks : MAX_BLOCKS_DEFAULT,
    };
  } catch {
    return defaults;
  }
}

function stateFile(sessionId) {
  const dir = join(tmpdir(), 'claude-writing-guard');
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return null;
  }
  const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '');
  return join(dir, `${safe || 'unknown'}.json`);
}

function readState(path) {
  if (!path || !existsSync(path)) return { blocks: 0, lastHash: '' };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return {
      blocks: Number.isInteger(parsed.blocks) ? parsed.blocks : 0,
      lastHash: typeof parsed.lastHash === 'string' ? parsed.lastHash : '',
    };
  } catch {
    return { blocks: 0, lastHash: '' };
  }
}

function writeState(path, state) {
  if (!path) return;
  try {
    writeFileSync(path, JSON.stringify(state));
  } catch {
    /* state is an optimization, not a requirement */
  }
}

/** Exported for the test harness. Pure: text in, violations out. */
export function findViolations(text, enabled = {}) {
  const out = [];
  for (const check of CHECKS) {
    if (enabled[check.id] === false) continue;
    const count = check.test(text);
    if (count > 0) out.push({ ...check, count });
  }
  return out;
}

export function buildMessage(violations) {
  const lines = ['Your reply breaks writing rules this project enforces:', ''];
  for (const v of violations) {
    const times = v.count === 1 ? '1 time' : `${v.count} times`;
    lines.push(`  - ${v.label} (${times}). ${v.fix}  [${v.rule}]`);
  }
  lines.push('', 'Rewrite the reply without them. Do not explain the fix, just send the corrected reply.');
  return lines.join('\n');
}

function main() {
  const raw = readStdin();
  let payload = {};
  try {
    payload = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    bail();
  }

  // Layer 1: the harness already told us it re-ran us after a block.
  if (payload.stop_hook_active) bail();

  const text = finalReplyText(payload.transcript_path);
  if (!text) bail();

  const config = loadConfig(payload.cwd || process.env.CLAUDE_PROJECT_DIR || '');
  const violations = findViolations(text, config.checks);
  if (violations.length === 0) bail();

  const path = stateFile(payload.session_id);
  const state = readState(path);
  const hash = createHash('sha256').update(text).digest('hex').slice(0, 16);

  // Layer 2: identical text means the agent could not fix it. Let it through.
  // Layer 3: hard cap per session.
  if (state.lastHash === hash || state.blocks >= config.maxBlocks) bail();

  writeState(path, { blocks: state.blocks + 1, lastHash: hash });
  process.stderr.write(buildMessage(violations) + '\n');
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('writing-guard.mjs')) {
  try {
    main();
  } catch {
    bail();
  }
}
