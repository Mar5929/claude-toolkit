import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeProject, ok, refused, prompt, subagentStart, flow } from './helpers.mjs';
import { listTopics, renderIndex, renderGlossary, parseTopic } from '../engine/memory.mjs';

// Queues a trusted-mode job and returns its id.
function queue(dir, fields) {
  prompt(dir, 'save this');
  ok(dir, ['route', 'remember']);
  const out = ok(dir, ['memory', 'propose', '--file', '-'], { stdin: JSON.stringify({ source: 'owner, 2026-09-26', why: 'The owner said so.', ...fields }) });
  const job = /job (job-[0-9a-f]+)/.exec(out)[1];
  ok(dir, ['next']);
  subagentStart(dir, 'second-brain-flow:memory-librarian');
  ok(dir, ['next']);
  return job;
}

function trustedProject() {
  const dir = makeProject();
  prompt(dir, '/second-brain-flow:trust on');
  ok(dir, ['trust', 'set', 'on']);
  return dir;
}

function read(dir, rel) {
  return fs.readFileSync(path.join(dir, rel), 'utf8');
}

function assertValid(dir) {
  for (const t of listTopics(dir)) {
    for (const f of ['id', 'type', 'title', 'summary', 'status', 'source', 'created', 'updated']) assert.ok(t.fm[f], `${t.fm.id} has ${f}`);
    assert.equal(path.basename(t.file), `${t.fm.id}.md`);
  }
  assert.equal(read(dir, 'memory/INDEX.md'), renderIndex(dir));
  assert.equal(read(dir, 'memory/GLOSSARY.md'), renderGlossary(dir));
  assert.match(ok(dir, ['doctor']), /No problems found/);
}

test('create writes a valid topic, INDEX.md, GLOSSARY.md, and a log entry', () => {
  const dir = trustedProject();
  const job = queue(dir, { type: 'term', title: 'SSO', statement: 'SSO means single sign-on: one login for many apps.' });
  assert.match(ok(dir, ['librarian', 'next']), new RegExp(`Job ${job}`));
  const out = ok(dir, ['librarian', 'apply', '--job', job, '--action', 'create']);
  assert.match(out, /Applied create/);
  const topic = parseTopic(read(dir, 'memory/topics/term-sso.md'));
  assert.equal(topic.fm.status, 'active');
  assert.equal(topic.fm.summary, 'SSO means single sign-on: one login for many apps.');
  assert.match(read(dir, 'memory/INDEX.md'), /\[term-sso\]\(topics\/term-sso\.md\) SSO means single sign-on/);
  assert.match(read(dir, 'memory/GLOSSARY.md'), /\*\*SSO\*\*: SSO means single sign-on/);
  assert.match(read(dir, 'memory/log.md'), /\| create \| term-sso \| "SSO" \| mode trusted/);
  assert.match(ok(dir, ['librarian', 'next']), /No librarian jobs are waiting/);
  refused(dir, ['librarian', 'apply', '--job', job, '--action', 'create']);
  assertValid(dir);
});

test('update, supersede, merge, and skip produce valid files and log entries', () => {
  const dir = trustedProject();
  const j1 = queue(dir, { type: 'decision', title: 'Okta for login', statement: 'The portal signs in through Okta.' });
  ok(dir, ['librarian', 'apply', '--job', j1, '--action', 'create']);
  const j2 = queue(dir, { type: 'decision', title: 'Okta groups', statement: 'Okta groups map to portal roles.' });
  ok(dir, ['librarian', 'apply', '--job', j2, '--action', 'update', '--topic', 'decision-okta-for-login']);
  assert.match(read(dir, 'memory/topics/decision-okta-for-login.md'), /\*\*Update \d{4}-\d\d-\d\d\.\*\* Okta groups map/);

  const j3 = queue(dir, { type: 'decision', title: 'Auth0 for login', statement: 'The portal signs in through Auth0.' });
  ok(dir, ['librarian', 'apply', '--job', j3, '--action', 'supersede', '--topic', 'decision-okta-for-login']);
  const old = parseTopic(read(dir, 'memory/topics/decision-okta-for-login.md'));
  assert.equal(old.fm.status, 'superseded');
  assert.equal(old.fm.superseded_by, 'decision-auth0-for-login');
  assert.deepEqual(parseTopic(read(dir, 'memory/topics/decision-auth0-for-login.md')).fm.supersedes, ['decision-okta-for-login']);
  assert.doesNotMatch(read(dir, 'memory/INDEX.md'), /decision-okta-for-login/);

  const j4 = queue(dir, { type: 'fact', title: 'Staging host', statement: 'Staging runs at staging.example.com.' });
  ok(dir, ['librarian', 'apply', '--job', j4, '--action', 'create']);
  const j5 = queue(dir, { type: 'fact', title: 'Staging server', statement: 'The staging server is staging.example.com.' });
  ok(dir, ['librarian', 'apply', '--job', j5, '--action', 'create']);
  const j6 = queue(dir, { type: 'fact', title: 'Staging', statement: 'Staging is reset nightly.' });
  ok(dir, ['librarian', 'apply', '--job', j6, '--action', 'merge', '--topic', 'fact-staging-host', '--from', 'fact-staging-server']);
  assert.equal(parseTopic(read(dir, 'memory/topics/fact-staging-server.md')).fm.status, 'merged');
  assert.match(read(dir, 'memory/topics/fact-staging-host.md'), /Merged .* from fact-staging-server/);

  const j7 = queue(dir, { type: 'fact', title: 'Staging again', statement: 'Staging is at staging.example.com.' });
  refused(dir, ['librarian', 'apply', '--job', j7, '--action', 'skip']);
  ok(dir, ['librarian', 'apply', '--job', j7, '--action', 'skip', '--reason', 'Already in fact-staging-host.']);
  assert.match(ok(dir, ['librarian', 'done']), /All librarian jobs are done/);

  const log = read(dir, 'memory/log.md');
  for (const action of ['create', 'update', 'supersede', 'merge', 'skip']) assert.match(log, new RegExp(`\\| ${action} \\|`));
  assert.match(log, /reason: Already in fact-staging-host/);
  assertValid(dir);
});

test('undo restores the previous content and rebuilds the index', () => {
  const dir = trustedProject();
  const j1 = queue(dir, { type: 'decision', title: 'Okta for login', statement: 'The portal signs in through Okta.' });
  const created = ok(dir, ['librarian', 'apply', '--job', j1, '--action', 'create']);
  const createChange = /Change (chg-[0-9a-f]+)/.exec(created)[1];
  const before = read(dir, 'memory/topics/decision-okta-for-login.md');
  const j2 = queue(dir, { type: 'decision', title: 'Auth0', statement: 'Auth0 replaces Okta.' });
  const sup = ok(dir, ['librarian', 'apply', '--job', j2, '--action', 'supersede', '--topic', 'decision-okta-for-login']);
  const supChange = /Change (chg-[0-9a-f]+)/.exec(sup)[1];
  assert.match(ok(dir, ['memory', 'log']), new RegExp(supChange));

  ok(dir, ['memory', 'undo', supChange]);
  assert.equal(read(dir, 'memory/topics/decision-okta-for-login.md'), before);
  assert.ok(!fs.existsSync(path.join(dir, 'memory/topics/decision-auth0.md')));
  assert.match(read(dir, 'memory/INDEX.md'), /decision-okta-for-login/);
  refused(dir, ['memory', 'undo', supChange]);

  ok(dir, ['memory', 'undo', createChange]);
  assert.ok(!fs.existsSync(path.join(dir, 'memory/topics/decision-okta-for-login.md')));
  assert.match(read(dir, 'memory/INDEX.md'), /No topics yet/);
  assert.match(read(dir, 'memory/log.md'), /\| undo \|/);
  assertValid(dir);
});

test('recall ranks the obviously matching topic first', () => {
  const dir = trustedProject();
  const topics = [
    { type: 'decision', title: 'Okta is the identity provider', statement: 'The customer portal signs customers in through Okta.' },
    { type: 'fact', title: 'Deploy day', statement: 'Deploys happen on Tuesday afternoons.' },
    { type: 'preference', title: 'Short replies', statement: 'The owner prefers short replies without preamble.' },
    { type: 'lesson', title: 'Test the portal build', statement: 'Run the portal build before a deploy.' },
  ];
  for (const t of topics) {
    const job = queue(dir, t);
    ok(dir, ['librarian', 'apply', '--job', job, '--action', 'create']);
  }
  const out = ok(dir, ['memory', 'recall', 'which', 'identity', 'provider', 'for', 'portal', 'login']);
  assert.match(out.split('\n')[0], /^1\. \[decision-okta-is-the-identity-provider\]/);
  assert.match(ok(dir, ['memory', 'recall', 'when', 'do', 'we', 'deploy']).split('\n')[0], /fact-deploy-day/);
  assert.match(ok(dir, ['memory', 'recall', 'zebra']), /No matches/);
});

test('doctor reports hand edits that break structure', () => {
  const dir = trustedProject();
  const job = queue(dir, { type: 'fact', title: 'A fact', statement: 'Something true.' });
  ok(dir, ['librarian', 'apply', '--job', job, '--action', 'create']);
  fs.writeFileSync(path.join(dir, 'memory/topics/fact-broken.md'), '---\nid: fact-other\ntype: rumor\n---\nbody\n');
  const r = flow(dir, ['doctor']);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /fact-broken\.md is missing/);
  assert.match(r.stdout, /does not match its file name/);
  assert.match(r.stdout, /unknown type rumor/);
  fs.rmSync(path.join(dir, 'memory/topics/fact-broken.md'));
  fs.appendFileSync(path.join(dir, 'memory/INDEX.md'), '- hand edit\n');
  assert.match(flow(dir, ['doctor']).stdout, /INDEX.md does not match/);
  assert.match(ok(dir, ['doctor', '--fix']), /No problems found/);
});
