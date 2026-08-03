#!/usr/bin/env node
/**
 * Tests for writing-guard. Run: node plugins/hooks-library/tests/writing-guard-harness.mjs
 *
 * Covers the two things that matter: it catches what it should, and it never
 * blocks on text that is fine. A guard with false positives costs the owner a
 * wasted turn every time it fires, so the clean cases carry as much weight as
 * the dirty ones.
 *
 * Since #102 the filler-opener check is OFF by default, so every test that
 * exercises it turns it on explicitly. That is the point of the first block
 * below: the default set is exactly two checks, and nothing else fires unasked.
 */

import { findViolations, buildMessage, stripQuoted } from '../hooks/writing-guard.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'hooks', 'writing-guard.mjs');
const FILLER_ON = { 'filler-opener': true };

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

// --- the default set is exactly the two hard bans ------------------------

ok(ids('The result is clear — it works.').includes('em-dash'), 'catches an em dash by default');
ok(ids('See § 7 for details.').includes('section-sign'), 'catches a section sign by default');
ok(ids('Let me check that for you.').length === 0, 'filler-opener is OFF by default');
ok(ids('Sure! Here is the answer.').length === 0, 'no opener fires without being asked for');

// --- filler-opener still works when a project turns it on ----------------

ok(ids('Let me check that for you.', FILLER_ON).includes('filler-opener'), 'catches "Let me" when on');
ok(ids('Sure! Here is the answer.', FILLER_ON).includes('filler-opener'), 'catches "Sure" when on');
ok(ids('Great question. The answer is 4.', FILLER_ON).includes('filler-opener'), 'catches "Great question"');
ok(ids("I'll go ahead and run it.", FILLER_ON).includes('filler-opener'), 'catches "I\'ll go ahead"');
ok(ids('  \n  Of course. Done.', FILLER_ON).includes('filler-opener'), 'catches an opener after whitespace');

const multi = findViolations('A — B — C — D');
ok(multi[0].count === 3, 'counts repeated em dashes');

// --- quoted text is the agent quoting, not the agent writing -------------

ok(findViolations('Here it is:\n```\nconst a = 1; // A — B\n```\nDone.').length === 0, 'fenced block is exempt');
ok(findViolations('The file says `a — b` on line 4.').length === 0, 'backtick span is exempt');
ok(findViolations('Text\n~~~\nA — B\n~~~\nmore').length === 0, 'tilde fence is exempt');
ok(findViolations('Broke off:\n```\nA — B').length === 0, 'unterminated fence is exempt to end of text');
ok(ids('It broke — badly.\n```\nA — B\n```').includes('em-dash'), 'prose outside a fence is still caught');
ok(findViolations('Here:\n```\nA — B\n```\nAnd `c — d` too.').length === 0, 'both exemptions apply at once');
ok(stripQuoted('a `b` c').includes('a') && !stripQuoted('a `b` c').includes('b'), 'stripQuoted removes spans');
ok(stripQuoted('the ` character alone').includes('character'), 'a lone backtick strips nothing');

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
for (const text of clean) {
  ok(findViolations(text, FILLER_ON).length === 0, `still clean with filler-opener on: ${JSON.stringify(text.slice(0, 32))}`);
}

// --- config disables a check ---------------------------------------------

ok(ids('A — B', { 'em-dash': false }).length === 0, 'config can disable em-dash');
ok(ids('Let me explain — now.', { 'em-dash': false, 'filler-opener': true }).includes('filler-opener'), 'disabling one check leaves the others');
ok(ids('See § 7.', { 'section-sign': false }).length === 0, 'config can disable section-sign');

// --- message names the violation and the fix -----------------------------

const msg = buildMessage(findViolations('Let me explain — briefly.', FILLER_ON));
ok(msg.includes('em dash'), 'message names the em dash');
ok(msg.includes('filler opener'), 'message names the filler opener');
ok(msg.includes('plain-language'), 'message cites the output style');
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

const opener = runHook({
  transcript_path: transcriptWith('Let me run that for you. It passed.'),
  session_id: `test-opener-${RUN}`,
});
ok(opener.code === 0, 'hook does not block a filler opener by default');

const quoted = runHook({
  transcript_path: transcriptWith('The file reads:\n```\nA — B\n```\nThat is all.'),
  session_id: `test-quoted-${RUN}`,
});
ok(quoted.code === 0, 'hook does not block an em dash inside a fence');

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
