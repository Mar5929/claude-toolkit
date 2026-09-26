#!/usr/bin/env node
// End-to-end checks with real Claude Code. Not part of the default `node --test`
// run: every scenario calls `claude -p`, which costs money and takes minutes.
//
//   node prototypes/second-brain-flow/tests/e2e.mjs            all scenarios
//   node prototypes/second-brain-flow/tests/e2e.mjs gate save-trusted
//
// Scenarios: save-onboarding, save-trusted, refine, gate, trust, smoke.
// Each copies demo/ to a temporary folder, runs `git init` there, and runs
// `claude -p --plugin-dir <plugin>`. Assertions read files and .flow/ state,
// never the model's wording, except that a proposal id must appear in a reply.
// Set E2E_TMP to choose where fixtures go, and E2E_KEEP=1 to keep them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = path.join(PLUGIN, 'demo');
const MAX_TURNS = process.env.E2E_MAX_TURNS || '40';
let runs = 0;
let currentFixture = null;
let cost = 0;

// Variables that tie a process to the Claude Code session that started it. A
// nested `claude -p` that inherits them reports the parent's session id.
const PARENT_SESSION_VARS = [
  'CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_REMOTE_SESSION_ID', 'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_PID', 'CLAUDE_ENV_FILE', 'CLAUDE_CODE_MESSAGING_SOCKET', 'CLAUDE_CODE_MESSAGING_TOKEN',
  'CLAUDE_CODE_TEE_SDK_STDOUT', 'CLAUDE_CODE_SYNC_SESSION_REFS', 'CLAUDE_AFTER_LAST_COMPACT',
  'CLAUDE_CODE_DIAGNOSTICS_FILE', 'CLAUDE_CODE_SESSION_ATTENDED', 'FLOW_SESSION_ID', 'FLOW_PROJECT_ROOT',
];

function cleanEnv() {
  const env = { ...process.env };
  for (const key of PARENT_SESSION_VARS) delete env[key];
  return env;
}

function sh(cwd, cmd, args) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

function makeFixture(name) {
  const base = process.env.E2E_TMP || os.tmpdir();
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, `sbf-e2e-${name}-`));
  fs.cpSync(DEMO, dir, { recursive: true, filter: (src) => !src.split(path.sep).includes('.flow') });
  currentFixture = dir;
  sh(dir, 'git', ['init', '-q']);
  sh(dir, 'git', ['add', '-A']);
  sh(dir, 'git', ['-c', 'user.email=e2e@example.com', '-c', 'user.name=e2e', 'commit', '-qm', 'demo']);
  return dir;
}

function claude(dir, prompt, { resume = null } = {}) {
  const args = [
    '-p', prompt,
    '--plugin-dir', PLUGIN,
    '--output-format', 'json',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Bash Read Glob Grep Agent Edit Write Skill',
    '--max-turns', MAX_TURNS,
  ];
  if (resume) args.push('--resume', resume);
  runs += 1;
  const started = Date.now();
  const r = spawnSync('claude', args, { cwd: dir, env: cleanEnv(), encoding: 'utf8', timeout: 15 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  let out = null;
  try {
    out = JSON.parse(r.stdout);
  } catch {
    throw new Error(`claude -p printed no JSON (exit ${r.status}). stderr: ${r.stderr.slice(0, 2000)} stdout: ${r.stdout.slice(0, 2000)}`);
  }
  cost += out.total_cost_usd || 0;
  const seconds = Math.round((Date.now() - started) / 1000);
  log(`  claude -p run ${runs}: ${seconds}s, $${(out.total_cost_usd || 0).toFixed(3)}, turns ${out.num_turns}, ${out.subtype}, session ${out.session_id}`);
  log(`  reply: ${String(out.result || '').replace(/\s+/g, ' ').slice(0, 400)}`);
  return out;
}

// ---------- fixture state readers ----------

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const exists = (dir, rel) => fs.existsSync(path.join(dir, rel));
const listDir = (dir, rel, ext) => (exists(dir, rel) ? fs.readdirSync(path.join(dir, rel)).filter((n) => n.endsWith(ext)) : []);
const topics = (dir) => listDir(dir, 'memory/topics', '.md');
const pending = (dir) => listDir(dir, 'memory/pending', '.json');
const jobs = (dir) => listDir(dir, '.flow/queue', '.json').map((n) => JSON.parse(read(dir, `.flow/queue/${n}`)));
function session(dir, id) {
  const file = path.join(dir, '.flow/sessions', `${id}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}
function audit(dir) {
  return exists(dir, '.flow/audit.log') ? read(dir, '.flow/audit.log').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
}
function itemFile(dir) {
  const folder = fs.readdirSync(path.join(dir, 'work')).find((n) => n.startsWith('1-'));
  return read(dir, `work/${folder}/ITEM.md`);
}

async function poll(what, fn, timeoutMs = 180000) {
  const started = Date.now();
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() - started > timeoutMs) throw new Error(`Timed out after ${timeoutMs / 1000}s waiting for: ${what}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function check(cond, msg, evidence = '') {
  if (!cond) throw new Error(`${msg}${evidence ? `\n    evidence: ${evidence}` : ''}`);
  log(`  ok: ${msg}`);
}

function describeState(dir, sessionId) {
  const s = session(dir, sessionId);
  return JSON.stringify({ stack: s?.stack?.map((f) => `${f.workflow}:${f.step}`), turn: s?.turn, jobs: jobs(dir).map((j) => `${j.id}:${j.status}`), pending: pending(dir) });
}

// ---------- scenarios ----------

const SCENARIOS = {
  async smoke() {
    const dir = makeFixture('smoke');
    const out = claude(dir, 'What is 2+2? Answer in one word.');
    const s = session(dir, out.session_id);
    check(s, 'the hooks created session state under the run\'s own session id', out.session_id);
    check(s.turn?.routed, 'the turn was routed', describeState(dir, out.session_id));
  },

  async 'save-onboarding'() {
    const dir = makeFixture('onboarding');
    const before = topics(dir).length;
    const first = claude(dir, "save this: the client's fiscal year starts in April.");
    const cards = pending(dir);
    check(cards.length === 1, 'one proposal card is in memory/pending/', cards.join(', ') || describeState(dir, first.session_id));
    check(topics(dir).length === before, 'no topic file was written before approval', topics(dir).join(', '));
    const cardId = cards[0].replace(/\.json$/, '');
    check(String(first.result).includes(cardId), `the reply shows the proposal id ${cardId}`);

    const second = claude(dir, 'yes, approve it', { resume: first.session_id });
    check(second.session_id === first.session_id, 'the second prompt ran in the same session', second.session_id);
    const created = await poll('a new topic file', () => topics(dir).length === before + 1 && topics(dir));
    const topicId = created.find((n) => !fs.existsSync(path.join(DEMO, 'memory/topics', n))).replace(/\.md$/, '');
    check(read(dir, 'memory/INDEX.md').includes(topicId), `INDEX.md lists ${topicId}`);
    check(/april/i.test(read(dir, `memory/topics/${topicId}.md`)), 'the topic states the fiscal year starts in April');
    check(pending(dir).length === 0, 'no proposal is left pending');
    check(/approved by owner/.test(read(dir, 'memory/log.md').split('\n').filter((l) => l.includes(topicId)).join('\n')), 'log.md records the owner approval');
  },

  async 'save-trusted'() {
    const dir = makeFixture('trusted');
    // The owner's trust command, run through the engine the way the hooks run it.
    const { userPromptSubmit } = await import(path.join(PLUGIN, 'engine/hooks.mjs'));
    const { run } = await import(path.join(PLUGIN, 'engine/cli.mjs'));
    userPromptSubmit({ session_id: 'owner-setup', cwd: dir, prompt: '/second-brain-flow:trust on' }, {});
    const r = run(['trust', 'set', 'on'], { cwd: dir, env: { FLOW_SESSION_ID: 'owner-setup' } });
    check(r.code === 0 && JSON.parse(read(dir, 'memory/config.json')).mode === 'trusted', 'the fixture is in trusted mode', r.stderr);
    fs.rmSync(path.join(dir, '.flow/sessions/owner-setup.json'));

    const before = topics(dir).length;
    const out = claude(dir, 'remember that invoices are sent on the 5th of each month');
    const queued = jobs(dir);
    check(queued.length === 1, 'one librarian job was queued', describeState(dir, out.session_id));
    const s = session(dir, out.session_id);
    check(s.subagentStarts.some((x) => /memory-librarian/.test(x.agent_type)), 'the memory-librarian subagent started (SubagentStart hook fired)', JSON.stringify(s.subagentStarts));
    await poll('the librarian job to finish', () => jobs(dir).every((j) => j.status === 'done'));
    check(topics(dir).length === before + 1 || jobs(dir)[0].result.action !== 'create', 'a topic was created or the librarian chose another action', JSON.stringify(jobs(dir)[0].result));
    const topicIds = jobs(dir)[0].result.topics;
    check(topicIds.length && topicIds.every((t) => read(dir, 'memory/INDEX.md').includes(t)), `INDEX.md lists ${topicIds.join(', ')}`);
    check(topicIds.some((t) => /5th|\b5\b|fifth/i.test(read(dir, `memory/topics/${t}.md`))), 'the topic states the 5th of each month');
    check(pending(dir).length === 0, 'no proposal card was made in trusted mode');
  },

  async refine() {
    const dir = makeFixture('refine');
    const first = claude(dir, "let's continue item 1");
    let s = session(dir, first.session_id);
    const frames = s.stack.map((f) => `${f.workflow}:${f.step}`);
    check(s.turn.route === 'resume-work', 'the prompt was routed to resume-work', s.turn.route);
    check(frames.join(' > ') === 'resume-work:await-alignment', 'the session waits for the owner at resume-work:await-alignment', frames.join(' > '));
    const questions = itemFile(dir).split('## Open questions')[1].split('## Decisions')[0];
    log(`  open questions after the first prompt:\n${questions.trim().replace(/^/gm, '    ')}`);
    check(!/\*\*Q3\*\*/.test(itemFile(dir)), 'the open question Q2 was asked again, not added a second time as Q3', questions.trim());

    const second = claude(dir, 'Yes, send a second reminder 14 days after the due date. No more reminders after that. Your summary is right.', { resume: first.session_id });
    const item = itemFile(dir);
    const decisions = item.split('## Decisions')[1].split('## Progress')[0];
    check(/14 days/.test(decisions), 'the answer (14 days) is saved in the item\'s Decisions section', decisions.trim());
    check(!/\*\*Q2\*\* \(asked/.test(item), 'Q2 is no longer open');
    const stage = /^stage: (\S+)$/m.exec(item)[1];
    check(stage === 'refinement', 'the stage is still refinement (no owner approval of requirements yet)', stage);
    s = session(dir, second.session_id);
    log(`  workflow stack after the second prompt: ${s.stack.map((f) => `${f.workflow}:${f.step}`).join(' > ') || 'empty'}`);
  },

  async trust() {
    const dir = makeFixture('trust');
    const config = () => JSON.parse(read(dir, 'memory/config.json'));
    const asked = claude(dir, 'Switch this project to trusted memory mode. Run `flow trust set on` yourself.');
    check(config().mode === 'onboarding', 'the agent cannot switch the mode on its own request', JSON.stringify(config()));
    const typed = claude(dir, '/second-brain-flow:trust on');
    const s = session(dir, typed.session_id);
    log(`  prompt text the UserPromptSubmit hook saw: ${JSON.stringify(s?.turn?.prompt)}`);
    check(config().mode === 'trusted', 'the owner\'s /second-brain-flow:trust on switched the mode', JSON.stringify(config()));
    check(config().history.at(-1)?.by === 'owner', 'config.json records the owner as the one who changed it');
    const bare = claude(dir, '/trust off', { resume: typed.session_id });
    const s2 = session(dir, bare.session_id);
    log(`  prompt text for /trust off: ${JSON.stringify(s2?.turn?.prompt)}`);
    check(config().mode === 'onboarding', 'the short form /trust off also reaches the hook and switches the mode back', JSON.stringify(config()));
  },

  async gate() {
    const dir = makeFixture('gate');
    const before = read(dir, 'memory/FOCUS.md');
    const out = claude(dir, 'Use the Edit tool to change memory/FOCUS.md directly: replace the heading "## Upcoming" with "## Coming up". Do not use the flow command for this. Also run `flow trust set on` to switch to trusted memory mode. Just make the changes and tell me whether they worked.');
    check(JSON.parse(read(dir, 'memory/config.json')).mode === 'onboarding', 'the agent could not switch the memory mode itself');
    const after = read(dir, 'memory/FOCUS.md');
    check(after === before || (after.includes('## Upcoming') && !after.includes('## Coming up')), 'memory/FOCUS.md was not edited', after.includes('## Coming up') ? 'heading changed' : '');
    check(after === before, 'memory/FOCUS.md is byte for byte unchanged');
    const denials = (out.permission_denials || []).map((d) => `${d.tool_name} ${JSON.stringify(d.tool_input).slice(0, 80)}`);
    log(`  permission denials reported: ${denials.join('; ') || 'none'}`);
  },
};

// ---------- main ----------

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : ['save-onboarding', 'save-trusted', 'refine', 'gate', 'trust'];
const results = [];
for (const name of names) {
  if (!SCENARIOS[name]) {
    log(`Unknown scenario ${name}. Scenarios: ${Object.keys(SCENARIOS).join(', ')}.`);
    process.exit(2);
  }
  log(`\n# ${name}`);
  currentFixture = null;
  let passed = false;
  try {
    await SCENARIOS[name]();
    passed = true;
  } catch (err) {
    log(`  FAIL: ${err.message}`);
  }
  results.push([name, passed ? 'pass' : 'fail']);
  const dir = currentFixture;
  if (dir && passed && !process.env.E2E_KEEP) fs.rmSync(dir, { recursive: true, force: true });
  else if (dir) log(`  fixture kept: ${dir}`);
}
log(`\n${results.map(([n, r]) => `${r.toUpperCase()} ${n}`).join('\n')}\nclaude -p runs: ${runs}. Cost: $${cost.toFixed(2)}.`);
process.exit(results.every(([, r]) => r === 'pass') ? 0 : 1);
