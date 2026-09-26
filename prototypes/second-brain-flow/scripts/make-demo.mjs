#!/usr/bin/env node
// Rebuilds demo/memory and demo/work through the engine: the flow command and
// the prompt and SubagentStart hooks, the same calls a real session makes.
// Nothing is written by hand. Run: node prototypes/second-brain-flow/scripts/make-demo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../engine/cli.mjs';
import * as hooks from '../engine/hooks.mjs';

const plugin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(plugin, 'demo');
for (const sub of ['memory', 'work', '.flow']) fs.rmSync(path.join(dir, sub), { recursive: true, force: true });
const S = 'demo-setup';
const flow = (...args) => {
  const r = run(args, { cwd: dir, env: { FLOW_SESSION_ID: S }, stdin: () => '' });
  if (r.code) throw new Error(`flow ${args.join(' ')}: ${r.stderr}`);
  if (process.env.VERBOSE) console.log(`$ flow ${args.join(' ')}\n${r.stdout}\n`);
  return r.stdout;
};
const prompt = (text) => hooks.userPromptSubmit({ session_id: S, cwd: dir, hook_event_name: 'UserPromptSubmit', prompt: text }, {});

flow('init');
// Work item 1, in refinement, with two requirements and one open question.
prompt('New work: clients want invoice reminders.');
flow('route', 'new-work');
flow('item', 'new', '--title', 'Invoice reminder emails', '--goal', 'Email clients a reminder when an invoice is unpaid after its due date.', '--why', 'Late payments rose in the last quarter, and the finance team sends reminders by hand.');
flow('next');
flow('item', 'question', '--text', 'Which clients should get reminders?');
flow('next', '--decision', 'asked');
prompt('All wholesale clients. Send one reminder 7 days after the due date.');
flow('route', 'continue');
flow('item', 'answer', 'Q1', '--text', 'All wholesale clients.');
flow('item', 'requirement', '--text', 'Every wholesale client with an unpaid invoice gets a reminder email.');
flow('item', 'requirement', '--text', 'The reminder is sent 7 days after the invoice due date.');
flow('next');
flow('next', '--decision', 'more');
flow('item', 'question', '--text', 'Should a second reminder go out if the invoice is still unpaid, and when?');
flow('next', '--decision', 'asked');

// Three memory topics, saved through the remember workflow in onboarding mode.
const saves = [
  ['term', 'Wholesale client', 'A wholesale client is a business that buys from Northwind at volume prices and pays by invoice.', 'The team uses this term for the clients the billing service serves.'],
  ['decision', 'Invoices are emailed as PDF attachments', 'Invoices are emailed to clients as PDF attachments, not as links.', 'Several clients cannot open links from outside their company network.'],
  ['fact', 'Payment terms are 30 days', 'Northwind invoices are due 30 days after the invoice date.', 'The due date drives reminder timing.'],
];
for (const [type, title, statement, why] of saves) {
  prompt(`save this: ${statement}`);
  flow('route', 'remember');
  const out = flow('memory', 'propose', '--type', type, '--title', title, '--statement', statement, '--why', why, '--source', 'owner, 2026-09-26');
  const id = /Memory proposal (\S+)/.exec(out)[1];
  flow('next');
  flow('next');
  prompt('approve');
  flow('route', 'continue');
  flow('memory', 'approve', id);
  flow('next', '--decision', 'approved');
  hooks.subagentStart({ session_id: S, cwd: dir, hook_event_name: 'SubagentStart', agent_id: 'demo', agent_type: 'second-brain-flow:memory-librarian' }, {});
  flow('next');
  flow('librarian', 'next');
  flow('librarian', 'apply', '--action', 'create');
}
flow('librarian', 'done');
flow('item', 'progress', '--item', '1', '--next', "Get the owner's answer to Q2, then decide whether the requirements are ready for approval.");
flow('doctor');
fs.rmSync(path.join(dir, '.flow'), { recursive: true, force: true });
console.log(`Rebuilt ${path.relative(process.cwd(), dir) || dir}: work item 1 in refinement, ${fs.readdirSync(path.join(dir, 'memory', 'topics')).filter((n) => n.endsWith('.md')).length} memory topics.`);
