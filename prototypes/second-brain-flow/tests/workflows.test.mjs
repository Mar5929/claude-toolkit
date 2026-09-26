import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeProject, ok, refused, prompt, where, state, subagentStart } from './helpers.mjs';
import { listWorkflowIds, loadWorkflow, validateWorkflow, diagram } from '../engine/workflows.mjs';
import { CHECKS, ACTIONS } from '../engine/runner.mjs';

const EXPECTED = ['chat', 'new-work', 'recall', 'refine', 'remember', 'resume-work', 'turn', 'work', 'wrap-up'];

test('every workflow in the design exists and validates', () => {
  assert.deepEqual(listWorkflowIds(), EXPECTED);
  for (const id of EXPECTED) {
    assert.deepEqual(validateWorkflow(loadWorkflow(id), { checks: CHECKS, actions: ACTIONS }), [], id);
  }
});

test('validation catches a broken definition', () => {
  const bad = {
    id: 'bad', title: 'Bad', start: 'a',
    steps: {
      a: { kind: 'agent', next: 'missing', exit: ['noSuchCheck'] },
      b: { kind: 'auto', action: 'noSuchAction', next: 'a' },
    },
  };
  const problems = validateWorkflow(bad, { checks: CHECKS, actions: ACTIONS });
  assert.ok(problems.some((p) => p.includes('missing step')));
  assert.ok(problems.some((p) => p.includes('no instructions')));
  assert.ok(problems.some((p) => p.includes('noSuchCheck')));
  assert.ok(problems.some((p) => p.includes('noSuchAction')));
  assert.ok(problems.some((p) => p.includes('cannot be reached')));
  assert.ok(problems.some((p) => p.includes('no end step')));
});

test('flow diagram prints Mermaid for every workflow', () => {
  for (const id of EXPECTED) {
    const text = diagram(id);
    const lines = text.trim().split('\n');
    assert.equal(lines[0], 'flowchart TD');
    assert.ok(lines.every((l, i) => i === 0 || /^ {2}\S/.test(l)), `${id}: every line is indented`);
    assert.ok(text.includes('begin((start)) --> s_'));
    for (const step of Object.keys(loadWorkflow(id).steps)) assert.ok(text.includes(`s_${step.replace(/-/g, '_')}`), `${id} names ${step}`);
    assert.ok(!/\bend\b\s*-->/.test(text), 'no node is called end');
  }
  assert.match(diagram('refine'), /s_decide -- more --> s_ask/);
  assert.match(diagram('new-work'), /s_refine\[\["refine<br\/>runs refine"\]\]/);
});

test('turn: a prompt starts the turn workflow at route, and flow route ends it', () => {
  const dir = makeProject();
  const out = prompt(dir, 'What is the weather like?');
  assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(out.hookSpecificOutput.additionalContext, /flow route <route>/);
  assert.equal(where(dir), 'turn:route');
  refused(dir, ['next']);
  ok(dir, ['route', 'chat']);
  assert.equal(where(dir), 'chat:answer');
  assert.equal(state(dir).turn.routed, true);
});

test('chat: answer ends with flow next, or on the next prompt', () => {
  const dir = makeProject();
  prompt(dir, 'hello');
  ok(dir, ['route', 'chat']);
  assert.match(ok(dir, ['next']), /Workflow chat is finished/);
  assert.equal(where(dir), 'empty');

  prompt(dir, 'hello again');
  ok(dir, ['route', 'chat']);
  prompt(dir, 'third prompt');
  assert.equal(state(dir).stack.length, 1, 'chat closed; only the new turn remains');
  assert.equal(where(dir), 'turn:route');
});

test('recall: search runs automatically, use ends the workflow', () => {
  const dir = makeProject();
  prompt(dir, 'what did we decide about login?');
  const out = ok(dir, ['route', 'recall', '--query', 'login']);
  assert.match(out, /matching "login"/);
  assert.equal(where(dir), 'recall:use');
  ok(dir, ['next']);
  assert.equal(where(dir), 'empty');
});

function newWorkToApproval(dir) {
  prompt(dir, 'I want a customer portal login');
  ok(dir, ['route', 'new-work']);
  assert.equal(where(dir), 'new-work:capture');
  refused(dir, ['next']);
  ok(dir, ['item', 'new', '--title', 'Customer portal login', '--goal', 'Customers sign in', '--why', 'Support load']);
  ok(dir, ['next']);
  assert.equal(where(dir), 'refine:ask');
  refused(dir, ['next', '--decision', 'asked']);
  ok(dir, ['item', 'question', '--text', 'Which identity provider?']);
  ok(dir, ['next', '--decision', 'asked']);
  assert.equal(where(dir), 'refine:await-answer');
  refused(dir, ['next']);
}

test('new-work and refine: every branch reaches end', () => {
  const dir = makeProject();
  newWorkToApproval(dir);
  prompt(dir, 'Okta');
  ok(dir, ['route', 'continue']);
  assert.equal(where(dir), 'refine:capture');
  refused(dir, ['next']);
  ok(dir, ['item', 'answer', 'Q1', '--text', 'Okta']);
  ok(dir, ['item', 'requirement', '--text', 'Customers sign in with Okta.']);
  ok(dir, ['next']);
  assert.equal(where(dir), 'refine:decide');
  refused(dir, ['next']);
  // more -> ask again
  ok(dir, ['next', '--decision', 'more']);
  assert.equal(where(dir), 'refine:ask');
  ok(dir, ['item', 'question', '--text', 'Do partners use it?']);
  ok(dir, ['next', '--decision', 'asked']);
  prompt(dir, 'Not now');
  ok(dir, ['route', 'continue']);
  ok(dir, ['item', 'answer', 'Q2', '--defer']);
  ok(dir, ['next']);
  ok(dir, ['next', '--decision', 'ready']);
  assert.equal(where(dir), 'refine:propose-approval');
  refused(dir, ['next']);
  ok(dir, ['item', 'approve', '--propose']);
  ok(dir, ['next']);
  assert.equal(where(dir), 'refine:await-approval');
  // changes -> capture
  prompt(dir, 'Change R1 wording');
  ok(dir, ['route', 'continue']);
  assert.equal(where(dir), 'refine:record-approval');
  ok(dir, ['next', '--decision', 'changes']);
  assert.equal(where(dir), 'refine:capture');
  ok(dir, ['next']);
  ok(dir, ['next', '--decision', 'ready']);
  ok(dir, ['item', 'approve', '--propose']);
  ok(dir, ['next']);
  prompt(dir, 'Approved');
  ok(dir, ['route', 'continue']);
  refused(dir, ['next', '--decision', 'approved']);
  ok(dir, ['item', 'approve']);
  const out = ok(dir, ['next', '--decision', 'approved']);
  assert.match(out, /Workflow refine is finished/);
  assert.match(out, /Workflow new-work is finished/);
  assert.equal(where(dir), 'empty');
  assert.match(ok(dir, ['item', 'show', '1']), /stage: requirements-approved/);
});

test('resume-work: not-aligned loops, aligned routes to refine or work by stage', () => {
  const dir = makeProject();
  prompt(dir, 'new item');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Portal login']);
  ok(dir, ['next']);
  assert.match(ok(dir, ['cancel']), /refine was dropped/);
  assert.equal(where(dir), 'empty', 'the new-work caller is dropped with its call');

  prompt(dir, "let's continue item 1");
  refused(dir, ['route', 'resume-work']);
  const out = ok(dir, ['route', 'resume-work', '--item', '1']);
  assert.match(out, /Work item 1, stage discovery/);
  assert.equal(where(dir), 'resume-work:brief');
  refused(dir, ['next']);
  ok(dir, ['item', 'question', '--text', 'Is SSO in scope?']);
  ok(dir, ['next']);
  prompt(dir, 'Not sure');
  ok(dir, ['route', 'continue']);
  assert.equal(where(dir), 'resume-work:align');
  refused(dir, ['next', '--decision', 'not-aligned']);
  ok(dir, ['item', 'answer', 'Q1', '--withdraw']);
  ok(dir, ['next', '--decision', 'not-aligned']);
  assert.equal(where(dir), 'resume-work:brief');
  ok(dir, ['item', 'question', '--none']);
  ok(dir, ['next']);
  prompt(dir, 'Yes that is right');
  ok(dir, ['route', 'continue']);
  const aligned = ok(dir, ['next', '--decision', 'aligned']);
  assert.match(aligned, /the refine workflow runs/);
  assert.equal(where(dir), 'refine:ask');

  // Same item moved to build goes to work.
  ok(dir, ['cancel']);
  ok(dir, ['item', 'stage', 'build', '--item', '1']);
  prompt(dir, 'continue item 1');
  ok(dir, ['route', 'resume-work', '--item', '1']);
  ok(dir, ['item', 'question', '--none']);
  ok(dir, ['next']);
  prompt(dir, 'right');
  ok(dir, ['route', 'continue']);
  assert.match(ok(dir, ['next', '--decision', 'aligned']), /the work workflow runs/);
  assert.equal(where(dir), 'work:do');
  refused(dir, ['next']);
  ok(dir, ['item', 'progress', '--text', 'Built the login form']);
  ok(dir, ['next']);
  assert.equal(where(dir), 'work:checkpoint');
  refused(dir, ['next']);
  ok(dir, ['item', 'progress', '--next', 'Wire up Okta']);
  const end = ok(dir, ['next']);
  assert.match(end, /Workflow work is finished/);
  assert.match(end, /Workflow resume-work is finished/);
  assert.equal(where(dir), 'empty');
});

test('remember: onboarding approve, reject, and edit branches; trusted branch', () => {
  const dir = makeProject();
  // approved
  prompt(dir, 'save this: we use Okta');
  ok(dir, ['route', 'remember']);
  refused(dir, ['next']);
  const card = ok(dir, ['memory', 'propose', '--type', 'decision', '--title', 'Okta for login', '--statement', 'The portal uses Okta.', '--why', 'Client licenses it.', '--source', 'owner, 2026-09-26']);
  const id = /Memory proposal (mem-[0-9a-f]+)/.exec(card)[1];
  ok(dir, ['next']);
  assert.equal(where(dir), 'remember:show-card');
  ok(dir, ['next']);
  assert.equal(where(dir), 'remember:await-decision');
  prompt(dir, 'approve');
  ok(dir, ['route', 'continue']);
  refused(dir, ['next', '--decision', 'approved']);
  ok(dir, ['memory', 'approve', id]);
  ok(dir, ['next', '--decision', 'approved']);
  assert.equal(where(dir), 'remember:dispatch');
  refused(dir, ['next']);
  subagentStart(dir, 'second-brain-flow:memory-librarian');
  ok(dir, ['next']);
  assert.equal(where(dir), 'empty');

  // edited, then rejected
  prompt(dir, 'remember that deploys are on Tuesdays');
  ok(dir, ['route', 'remember']);
  const card2 = ok(dir, ['memory', 'propose', '--type', 'fact', '--title', 'Deploy day', '--statement', 'Deploys happen on Tuesday.', '--why', 'Owner said so.', '--source', 'owner']);
  const id2 = /Memory proposal (mem-[0-9a-f]+)/.exec(card2)[1];
  ok(dir, ['next']);
  ok(dir, ['next']);
  prompt(dir, 'make it Wednesday');
  ok(dir, ['route', 'continue']);
  ok(dir, ['memory', 'edit', id2, '--statement', 'Deploys happen on Wednesday.']);
  ok(dir, ['next', '--decision', 'edited']);
  assert.equal(where(dir), 'remember:show-card');
  ok(dir, ['next']);
  prompt(dir, 'actually drop it');
  ok(dir, ['route', 'continue']);
  ok(dir, ['memory', 'reject', id2]);
  ok(dir, ['next', '--decision', 'rejected']);
  assert.equal(where(dir), 'empty');

  // trusted
  prompt(dir, '/second-brain-flow:trust on');
  ok(dir, ['trust', 'set', 'on']);
  ok(dir, ['route', 'chat']);
  ok(dir, ['next']);
  prompt(dir, 'save this: the staging URL is staging.example.com');
  ok(dir, ['route', 'remember']);
  ok(dir, ['memory', 'propose', '--type', 'fact', '--title', 'Staging URL', '--statement', 'Staging is staging.example.com.', '--why', 'Needed for tests.', '--source', 'owner']);
  ok(dir, ['next']);
  assert.equal(where(dir), 'remember:dispatch');
  subagentStart(dir, 'second-brain-flow:memory-librarian');
  ok(dir, ['next']);
  assert.equal(where(dir), 'empty');
});

test('wrap-up: refresh-focus runs, notes needs a record', () => {
  const dir = makeProject();
  prompt(dir, "let's wrap up");
  const out = ok(dir, ['route', 'wrap-up']);
  assert.match(out, /Focus file rebuilt/);
  assert.equal(where(dir), 'wrap-up:notes');
  refused(dir, ['next']);
  ok(dir, ['focus', 'todo', '--text', 'Send the Okta contract to legal']);
  ok(dir, ['next']);
  assert.equal(where(dir), 'empty');
  assert.match(ok(dir, ['focus']), /Send the Okta contract to legal/);
});

test('a second workflow can start inside a routed turn, and the first resumes', () => {
  const dir = makeProject();
  prompt(dir, 'new work');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['route', 'remember']);
  assert.equal(where(dir), 'remember:propose');
  ok(dir, ['cancel']);
  assert.equal(where(dir), 'new-work:capture');
  assert.ok(state(dir).stack.every((f) => f.workflow !== 'turn'));
});

test('questions: a repeated question is asked again, not added twice; refine can skip asking', () => {
  const dir = makeProject();
  prompt(dir, 'new');
  ok(dir, ['route', 'new-work']);
  ok(dir, ['item', 'new', '--title', 'Reminders']);
  ok(dir, ['next']);
  ok(dir, ['item', 'question', '--text', 'Should a second reminder go out?']);
  ok(dir, ['item', 'answer', 'Q1', '--defer']);
  // The same words, with other case and punctuation, reuse Q1 and reopen it.
  assert.match(ok(dir, ['item', 'question', '--text', 'should a SECOND reminder go out']), /Question Q1 .* asked again/);
  assert.match(ok(dir, ['item', 'question', '--ask', 'Q1']), /Question Q1 .* asked again/);
  refused(dir, ['item', 'question', '--ask', 'Q9']);
  refused(dir, ['item', 'question']);
  const item = ok(dir, ['item', 'show']);
  assert.equal((item.match(/\*\*Q\d+\*\*/g) || []).length, 1, 'only one question is on the item');
  assert.match(item, /\*\*Q1\*\* \(asked/);
  ok(dir, ['next', '--decision', 'asked']);
  assert.equal(where(dir), 'refine:await-answer');

  // With nothing to ask, refine goes straight to decide.
  prompt(dir, 'Yes, after 14 days');
  ok(dir, ['route', 'continue']);
  ok(dir, ['item', 'answer', 'Q1', '--text', 'Yes, after 14 days']);
  ok(dir, ['item', 'requirement', '--text', 'A second reminder goes out 14 days after the due date.']);
  ok(dir, ['next']);
  ok(dir, ['next', '--decision', 'more']);
  assert.equal(where(dir), 'refine:ask');
  refused(dir, ['next', '--decision', 'none']);
  refused(dir, ['next', '--decision', 'asked']);
  ok(dir, ['item', 'question', '--none']);
  ok(dir, ['next', '--decision', 'none']);
  assert.equal(where(dir), 'refine:decide');
});

test('flow init sets up the folder it runs in, and that folder then stops root discovery', () => {
  const outer = makeProject(); // has .git
  const inner = path.join(outer, 'demo');
  fs.mkdirSync(inner);
  assert.match(ok(inner, ['init']), new RegExp(`Set up memory/ and work/ in ${inner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.ok(fs.existsSync(path.join(inner, 'memory', 'config.json')));
  assert.ok(!fs.existsSync(path.join(outer, 'memory')), 'the outer repository is not set up');
  assert.match(ok(path.join(inner, 'work'), ['item', 'new', '--title', 'Inner item']), /File: work\/1-inner-item\/ITEM.md/);
  assert.ok(fs.existsSync(path.join(inner, 'work', '1-inner-item', 'ITEM.md')));
});
