#!/usr/bin/env node
/**
 * Tests for writing-guard. Run: node plugins/hooks-library/tests/writing-guard-harness.mjs
 *
 * Covers the two things that matter: it catches what it should, and it never
 * blocks on text that is fine. A guard with false positives costs the owner a
 * wasted turn every time it fires, so the clean cases carry as much weight as
 * the dirty ones.
 */

import { findViolations, buildMessage } from '../hooks/writing-guard.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'hooks', 'writing-guard.mjs');

let pass = 0;
let fail = 0;

function ok(condition, message) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL: ${message}`);
  }
}

function ids(text, enabled) {
  return findViolations(text, enabled)
    .map((v) => v.id)
    .sort();
}

// --- catches what it should ---------------------------------------------

ok(ids('The result is clear — it works.').includes('em-dash'), 'catches an em dash');
ok(ids('See § 7 for details.').includes('section-sign'), 'catches a section sign');
ok(ids('Let me check that for you.').includes('filler-opener'), 'catches "Let me"');
ok(ids('Sure! Here is the answer.').includes('filler-opener'), 'catches "Sure"');
ok(ids('Great question. The answer is 4.').includes('filler-opener'), 'catches "Great question"');
ok(ids("I'll go ahead and run it.").includes('filler-opener'), 'catches "I\'ll go ahead"');
ok(ids('  \n  Of course. Done.').includes('filler-opener'), 'catches an opener after whitespace');

const multi = findViolations('A — B — C — D');
ok(multi[0].count === 3, 'counts repeated em dashes');

// --- never blocks on clean text ------------------------------------------

const clean = [
  'Merged. All four suites pass.',
  'The build failed: three tests error on a null id. Fix is in src/parse.js:41.',
  'Use a comma, colon, or parentheses instead.',
  'Done. Nothing needed from you.',
  'Greatly improved throughput, up 40 percent.',
  'The certainly-not-broken flag is still set.',
  'Understanding the parser matters here.',
  'A hyphen - and an en dash – are both fine.',
  'Section 7 covers it.',
  'Perfectly reasonable to skip that step.',
];
for (const text of clean) {
  ok(findViolations(text).length === 0, `clean text must not trip: ${JSON.stringify(text.slice(0, 44))}`);
}

// --- config disables a check ---------------------------------------------

ok(ids('Let me check.', { 'filler-opener': false }).length === 0, 'config can disable filler-opener');
ok(ids('A — B', { 'em-dash': false }).length === 0, 'config can disable em-dash');
ok(ids('A — B', { 'filler-opener': false }).includes('em-dash'), 'disabling one check leaves the others');

// --- message names the violation and the fix -----------------------------

const msg = buildMessage(findViolations('Let me explain — briefly.'));
ok(msg.includes('em dash'), 'message names the em dash');
ok(msg.includes('filler opener'), 'message names the filler opener');
ok(msg.includes('writing-and-language.md'), 'message cites the rule');
ok(msg.includes('Rewrite'), 'message says what to do');

// --- end to end through the real hook ------------------------------------

function runHook(payload) {
  try {
    execFileSync('node', [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' });
    return { code: 0, stderr: '' };
  } catch (err) {
    return { code: err.status, stderr: err.stderr || '' };
  }
}

// Session ids must be unique per RUN. The hook keeps loop-guard state in a temp
// file keyed by session id, so reusing a fixed id makes the second run of this
// harness see "already blocked on identical text" and skip the block. That is
// the hook working correctly and the test lying.
const RUN = `${process.pid}-${process.hrtime.bigint()}`;

function transcriptWith(text) {
  const dir = mkdtempSync(join(tmpdir(), 'wg-test-'));
  const path = join(dir, 'transcript.jsonl');
  writeFileSync(
    path,
    [
      JSON.stringify({ type: 'user', message: { content: 'do the thing' } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text }] } }),
    ].join('\n'),
  );
  return path;
}

const dirty = runHook({
  transcript_path: transcriptWith('It works — mostly.'),
  session_id: `test-dirty-${RUN}`,
});
ok(dirty.code === 2, 'hook exits 2 on a violation');
ok(dirty.stderr.includes('em dash'), 'hook explains the violation on stderr');

const fine = runHook({
  transcript_path: transcriptWith('It works. Nothing needed from you.'),
  session_id: `test-clean-${RUN}`,
});
ok(fine.code === 0, 'hook exits 0 on clean text');

const active = runHook({
  transcript_path: transcriptWith('It works — mostly.'),
  session_id: `test-active-${RUN}`,
  stop_hook_active: true,
});
ok(active.code === 0, 'hook never blocks when stop_hook_active is set');

const sameTwice = { transcript_path: transcriptWith('Broken — again.'), session_id: `test-loop-${RUN}` };
const first = runHook(sameTwice);
const second = runHook(sameTwice);
ok(first.code === 2, 'first block on new text');
ok(second.code === 0, 'never blocks twice on identical text');

ok(runHook({}).code === 0, 'no payload exits 0');
ok(runHook({ transcript_path: '/does/not/exist.jsonl' }).code === 0, 'missing transcript exits 0');

console.log(`${fail === 0 ? 'ALL PASS' : 'FAILURES'} (${pass} checks), FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
