#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';

const args = parseArgs(process.argv.slice(2));
if (!args['source-root'] || !args['handoff-source-root']) {
  fail('usage: node tests/knowledge-behavior/run.mjs --source-root PATH --handoff-source-root PATH [--scenario ID] [--results-dir PATH] [--timeout-seconds N]');
}

const sourceRoot = resolve(args['source-root']);
const handoffRoot = resolve(args['handoff-source-root']);
const layout = existsSync(join(sourceRoot, 'plugins', 'second-brain', 'skills', 'knowledge-setup', 'SKILL.md')) ? 'v2' : 'v1';
const selected = args.scenario;
const preflightOnly = args['preflight-only'] === 'true';
const timeoutSeconds = Number(args['timeout-seconds'] || 900);
if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 30 || timeoutSeconds > 1800) fail('--timeout-seconds must be between 30 and 1800');
const runStamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');
const resultsRoot = resolve(args['results-dir'] || join(tmpdir(), 'knowledge-behavior-results', runStamp));
if (existsSync(join(resultsRoot, 'run.json'))) fail(`refusing to overwrite existing run evidence: ${resultsRoot}`);
mkdirSync(resultsRoot, { recursive: true });

const manifest = JSON.parse(readFileSync(new URL('./scenarios.json', import.meta.url), 'utf8'));
const scenarios = manifest.scenarios.filter((scenario) => !selected || scenario.id === selected);
if (!scenarios.length) fail(`unknown scenario: ${selected}`);

const host = command('sw_vers', [], process.cwd(), false);
const codexVersion = command('codex', ['--version'], process.cwd(), false).stdout.trim();
const sourceFiles = requiredSources(sourceRoot, handoffRoot, layout);
for (const file of sourceFiles) if (!existsSync(file.path)) fail(`required source is missing: ${file.path}`);
const sourceSnapshot = sourceFiles.map((file) => ({ label: file.label, source: file.path, sha256: sha256(file.path) }));

const runRecord = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  invocation: { sourceRoot, handoffRoot, selected: selected || 'all', timeoutSeconds, preflightOnly },
  knowledgeLayout: layout,
  sourceGit: gitSourceState(sourceRoot, handoffRoot),
  host: { platform: process.platform, arch: process.arch, os: host.stdout.trim(), node: process.version, codexVersion },
  model: 'gpt-5.6-sol',
  codexArguments: ['exec', '--model', 'gpt-5.6-sol', '--ignore-user-config', '--json', '--ephemeral', '--sandbox', 'workspace-write', '--add-dir', '<fixture-root>'],
  sourceSnapshot,
  limitations: [
    `A passing pilot is outcome evidence for these exact ${layout} trials, not a reliability claim or acceptance evidence for another Knowledge generation.`,
    'The harness observes files, Git state, responses, and Codex events; it does not infer that hooks fired.',
    'The remote is a local bare repository, so publication evidence does not exercise network authentication or a second machine.'
  ],
  results: []
};

for (const scenario of scenarios) {
  const caseRoot = join(resultsRoot, scenario.id);
  if (existsSync(caseRoot)) fail(`refusing to overwrite existing scenario evidence: ${caseRoot}`);
  mkdirSync(caseRoot, { recursive: true });
  const state = { fixture: null, execution: null, elapsedMs: null };
  let result;
  try {
    result = executeScenario(scenario, caseRoot, state);
  } catch (error) {
    result = failedScenarioResult(scenario, caseRoot, state, error);
  }
  runRecord.results.push(result);
  writeFileSync(join(caseRoot, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
}

runRecord.finishedAt = new Date().toISOString();
runRecord.mechanicalChecksPassed = runRecord.results.every((result) => result.mechanicalChecksPassed);
writeFileSync(join(resultsRoot, 'run.json'), `${JSON.stringify(runRecord, null, 2)}\n`);
process.stdout.write(`${resultsRoot}\n`);
process.exitCode = runRecord.mechanicalChecksPassed ? 0 : 1;

function executeScenario(scenario, caseRoot, state) {
  if (scenario.layouts && !scenario.layouts.includes(layout)) {
    return {
      id: scenario.id,
      description: scenario.description,
      mechanicalChecksPassed: false,
      modelOutcome: `not-run-unsupported-${layout}`,
      assertions: [],
      finalResponse: ''
    };
  }
  const fixture = createFixture(caseRoot, scenario.id, sourceRoot, handoffRoot, layout);
  state.fixture = fixture;
  writeFileSync(join(caseRoot, 'expected.json'), `${JSON.stringify(scenario.expected, null, 2)}\n`);
  writeFileSync(join(caseRoot, 'prompt.txt'), `${scenario.prompt}\n`);
  writeFileSync(join(caseRoot, 'source-snapshot.json'), `${JSON.stringify(sourceSnapshot, null, 2)}\n`);
  writeFileSync(join(caseRoot, 'preflight.json'), `${JSON.stringify(fixture.preflight, null, 2)}\n`);

  if (!fixture.preflight.passed) {
    return {
      id: scenario.id,
      description: scenario.description,
      mechanicalChecksPassed: false,
      modelOutcome: 'not-run-preflight-failed',
      preflight: fixture.preflight,
      assertions: [],
      finalResponse: ''
    };
  }
  if (preflightOnly) {
    return {
      id: scenario.id,
      description: scenario.description,
      mechanicalChecksPassed: true,
      modelOutcome: 'not-run-preflight-only',
      preflight: fixture.preflight,
      assertions: [],
      finalResponse: ''
    };
  }

  const before = snapshotFixture(fixture.writer);
  writeFileSync(join(caseRoot, 'before.json'), `${JSON.stringify(before, null, 2)}\n`);
  const started = performance.now();
  const execution = runCodex(fixture.writer, scenario.prompt, timeoutSeconds, caseRoot);
  state.execution = execution;
  state.elapsedMs = Math.round(performance.now() - started);
  const after = snapshotFixture(fixture.writer);
  writeFileSync(join(caseRoot, 'after.json'), `${JSON.stringify(after, null, 2)}\n`);

  const assertions = assertScenario(scenario, fixture, execution, after);
  return {
    id: scenario.id,
    description: scenario.description,
    mechanicalChecksPassed: execution.status === 0 && assertions.every((item) => item.passed),
    modelOutcome: 'requires-independent-review',
    exitCode: execution.status,
    signal: execution.signal,
    timedOut: execution.timedOut,
    processError: execution.error,
    elapsedMs: state.elapsedMs,
    tokenUsage: parseTokenUsage(execution.stdout),
    meaningOutcomes: scenario.expected.meaningOutcomes || [],
    assertions,
    finalResponse: execution.finalResponse,
    fixture: { writer: fixture.writer, reader: fixture.reader, remote: fixture.remote }
  };
}

function failedScenarioResult(scenario, caseRoot, state, error) {
  const execution = state.execution;
  const processingFailure = serializeError(error);
  const processingProcess = error?.processResult || null;
  return {
    id: scenario.id,
    description: scenario.description,
    mechanicalChecksPassed: false,
    modelOutcome: execution ? 'processing-failed-after-model' : 'not-run-processing-failed',
    exitCode: execution?.status ?? null,
    signal: processingProcess?.signal ?? execution?.signal ?? null,
    timedOut: Boolean(execution?.timedOut || processingProcess?.timedOut || processingFailure.code === 'ETIMEDOUT'),
    processError: processingProcess?.error ?? execution?.error ?? (processingFailure.code === 'ETIMEDOUT' ? processingFailure : null),
    modelProcess: execution ? { exitCode: execution.status, signal: execution.signal, timedOut: execution.timedOut, error: execution.error } : null,
    processingProcess,
    elapsedMs: state.elapsedMs,
    tokenUsage: execution ? parseTokenUsage(execution.stdout) : null,
    meaningOutcomes: scenario.expected.meaningOutcomes || [],
    assertions: [],
    finalResponse: execution?.finalResponse || '',
    processingFailure,
    rawEvidence: {
      events: existsSync(join(caseRoot, 'events.jsonl')) ? join(caseRoot, 'events.jsonl') : null,
      stderr: existsSync(join(caseRoot, 'stderr.txt')) ? join(caseRoot, 'stderr.txt') : null,
      finalResponse: existsSync(join(caseRoot, 'final-response.md')) ? join(caseRoot, 'final-response.md') : null
    },
    fixture: state.fixture ? { writer: state.fixture.writer, reader: state.fixture.reader, remote: state.fixture.remote } : null
  };
}

function createFixture(caseRoot, scenarioId, knowledgeSource, handoffSource, knowledgeLayout) {
  const fixtureRoot = join(caseRoot, 'fixture');
  const remote = join(fixtureRoot, 'remote.git');
  const writer = join(fixtureRoot, 'writer');
  const reader = join(fixtureRoot, 'reader');
  mkdirSync(fixtureRoot, { recursive: true });
  command('git', ['init', '--bare', remote], fixtureRoot);
  command('git', ['init', '-b', 'main', writer], fixtureRoot);
  command('git', ['config', 'user.name', 'Knowledge Behavior Fixture'], writer);
  command('git', ['config', 'user.email', 'fixture@example.invalid'], writer);

  mkdirSync(join(writer, '.agents', 'skills'), { recursive: true });
  const skillNames = knowledgeLayout === 'v2' ? ['knowledge-find', 'knowledge-save', 'knowledge-review', 'knowledge-setup'] : ['recall', 'remember', 'reflect', 'retire', 'second-brain', 'session-search'];
  for (const name of skillNames) {
    cpSync(join(knowledgeSource, 'plugins', 'second-brain', 'skills', name), join(writer, '.agents', 'skills', name), { recursive: true });
  }
  cpSync(join(handoffSource, 'plugins', 'session-skills', 'skills', 'handoff'), join(writer, '.agents', 'skills', 'handoff'), { recursive: true });
  const verifier = join(handoffSource, 'plugins', 'session-skills', 'agents', 'handoff-verifier.md');
  if (existsSync(verifier)) {
    mkdirSync(join(writer, '.agents', 'agents'), { recursive: true });
    cpSync(verifier, join(writer, '.agents', 'agents', 'handoff-verifier.md'));
  }
  const templateRoot = knowledgeLayout === 'v2' ? join(knowledgeSource, 'plugins', 'second-brain', 'skills', 'knowledge-setup', 'references', 'templates', 'knowledge') : join(knowledgeSource, 'plugins', 'second-brain', 'skills', 'second-brain', 'references', 'templates', 'knowledge');
  if (knowledgeLayout === 'v2') cpSync(templateRoot, join(writer, 'knowledge'), { recursive: true });
  else {
    mkdirSync(join(writer, 'knowledge', 'memory'), { recursive: true });
    mkdirSync(join(writer, 'knowledge', 'brainstorms'), { recursive: true });
    cpSync(join(templateRoot, 'knowledge-manual.md'), join(writer, 'knowledge', 'knowledge-manual.md'));
    cpSync(join(templateRoot, 'project.md'), join(writer, 'knowledge', 'project.md'));
  }
  cpSync(join(knowledgeSource, 'plugins', 'project-init', 'library', 'templates', 'toolkit-manual.md'), join(writer, 'knowledge', 'toolkit-manual.md'));
  mkdirSync(join(writer, '.claude', 'rules'), { recursive: true });
  mkdirSync(join(writer, '.claude', 'tools'), { recursive: true });
  cpSync(join(knowledgeSource, '.claude', 'rules', 'knowledge-direct-commit.md'), join(writer, '.claude', 'rules', 'knowledge-direct-commit.md'));
  for (const tool of ['build-knowledge-index.mjs', 'check-knowledge.mjs', 'frontmatter.mjs', 'inspect-knowledge-save.mjs']) {
    const source = join(knowledgeSource, 'plugins', 'second-brain', 'tools', tool);
    if (existsSync(source)) cpSync(source, join(writer, '.claude', 'tools', tool));
  }
  if (knowledgeLayout === 'v2') {
    mkdirSync(join(writer, '.claude', 'hooks'), { recursive: true });
    const hookNames = readdirSync(join(knowledgeSource, 'plugins', 'second-brain', 'hooks')).filter((name) => name.endsWith('.mjs')).sort();
    for (const hook of hookNames) {
      cpSync(join(knowledgeSource, 'plugins', 'second-brain', 'hooks', hook), join(writer, '.claude', 'hooks', hook));
    }
  }
  writeFileSync(join(writer, 'SOUL.md'), '# Who you are here\n\n## Your role\n\nTest knowledge routing and handoff behavior inside this synthetic project.\n\n## What this project is\n\nA disposable export service fixture.\n\n## What you optimise for\n\nPreserve sources, approval boundaries, and resumable work without inventing delivery.\n\n## What you never do\n\nNever use network remotes, secrets, global configuration, or files outside this fixture.\n');
  const currentRelativePath = knowledgeLayout === 'v2' ? join('knowledge', 'memory', 'current.md') : join('knowledge', 'current.md');
  writeFileSync(join(writer, 'AGENTS.md'), `# Fixture instructions\n\nRead knowledge/toolkit-manual.md, SOUL.md, knowledge/project.md, knowledge/knowledge-manual.md, ${currentRelativePath}, relevant knowledge/memory-inbox.md entries, knowledge/memory/memory-index.md, knowledge/prds/prd-index.md, and ai-external-knowledge/README.md completely, in that order. Read .claude/rules/knowledge-direct-commit.md before publishing documentation. Skills are installed under .agents/skills. Follow the named skill when a request matches it. Copied hooks are not registered in this fixture; use this root/manual fallback and do not claim a hook ran. This repository and its local bare remote are disposable. The owner explicitly authorizes fixture documentation commits and pushes to that local remote. Never use network remotes, secrets, global settings, or files outside this fixture.\n`);
  if (knowledgeLayout === 'v2') {
    writeFileSync(join(writer, 'knowledge', 'project.md'), '# What this project is\n\n## Why it exists\n\nTest an export service workflow without affecting a real project.\n\n## Current goal and boundaries\n\nVerify knowledge routing and handoff behavior. No production implementation is approved.\n\n## Main workstreams\n\nExport timing analysis and accessibility review.\n\n## What finished work looks like\n\nThe requested fixture outcome is recorded with its sources and approval limits intact.\n\n## Who is involved\n\nThe fixture owner supplies facts and approves durable knowledge.\n\n## Where active work is tracked\n\nNo tracker is configured. Current work stays in knowledge/memory/current.md.\n\n## Memory save permission\n\nPer-save approval is required.\n');
  } else {
    writeFileSync(join(writer, 'knowledge', 'memory-self-improvement.md'), '# Knowledge selection feedback\n\nNone.\n');
    writeFileSync(join(writer, 'knowledge', 'memory', 'memory-index.md'), '# Memory index\n');
  }
  mkdirSync(join(writer, 'knowledge', 'prds'), { recursive: true });
  if (knowledgeLayout === 'v1') writeFileSync(join(writer, 'knowledge', 'prds', 'spec-index.md'), '# PRD index\n');
  if (knowledgeLayout === 'v2') {
    mkdirSync(join(writer, 'brainstorms'), { recursive: true });
    writeFileSync(join(writer, 'brainstorms', '.gitkeep'), '');
    mkdirSync(join(writer, 'ai-external-knowledge', 'vendor-schedule'), { recursive: true });
    writeFileSync(join(writer, 'ai-external-knowledge', 'vendor-schedule', 'README.md'), '---\ngroup: Export references\nsummary: Vendor schedule statement used to test conflict handling.\nsource: https://example.invalid/vendor-export-schedule\ncaptured_at: 2026-09-19\n---\n\n# Vendor export schedule\n\nThe captured vendor page says exports run hourly. This is outside documentation, not project authority.\n');
    mkdirSync(join(writer, 'src'), { recursive: true });
    writeFileSync(join(writer, 'src', 'export.mjs'), 'export async function deliver(job) {\n  return retry(job, { attempts: 1 });\n}\n');
    mkdirSync(join(writer, 'knowledge', 'memory', 'memory-entries', 'customers'), { recursive: true });
    writeFileSync(join(writer, 'knowledge', 'memory', 'memory-entries', 'customers', 'legacy-customer.md'), '---\nsummary: The fixture customer was recorded as Oldstar LLC.\ntype: fact\nstatus: current\nsource: Fixture owner report on 2026-09-18\nconfidence: reported\ncreated_at: 2026-09-18\nupdated_at: 2026-09-18\ntags:\n  - customer\ngroup: Customers\ncontext: Saved before the owner supplied a conflicting customer name.\napproved_by: Fixture owner\napproval_date: 2026-09-18\n---\n\n# Legacy customer\n\nThe fixture customer is Oldstar LLC.\n');
  }
  mkdirSync(join(writer, 'docs'), { recursive: true });
  writeFileSync(join(writer, 'docs', 'export.md'), '# Export timing\n\n## Notes\n\nProfiling is complete. The next action is to inspect the saved query measurements first. Implementation approval is absent.\n');
  writeFileSync(join(writer, 'docs', 'theme.md'), '# Theme\n\n## Notes\n\nThe next action is to choose contrast values. Implementation approval is absent.\n');
  writeFileSync(join(writer, 'docs', 'audit.md'), '# Audit\n\n## Notes\n\nLog verification has not started. Implementation approval is absent.\n');
  const overflowCount = knowledgeLayout === 'v2' ? 48 : 18;
  const overflowIdentifiers = scenarioId.includes('overflow') ? Array.from({ length: overflowCount }, (_, index) => `C${String(index + 1).padStart(2, '0')}`) : [];
  const padding = overflowIdentifiers.length ? `\n## Existing constraints\n\n${overflowIdentifiers.map((id, index) => `- ${id}: preserve confirmed cutoff ${String(index + 1).padStart(2, '0')}:00 UTC and owner link docs/constraint-${id}.md.`).join('\n')}` : '';
  const resumeHandoff = scenarioId.includes('resume') ? '\n### 2026-09-20T01:00:00.000Z | Export timing\n\nGoal: keep the nightly export inside its processing window. Work stopped after profiling. The recorded next action was to compare two slow queries, but use the current [owning record](../../docs/export.md). Source task: fixture-export. Implementation approval is absent.\n' : '';
  const currentMarker = knowledgeLayout === 'v2' ? '<!-- claude-toolkit:knowledge-current:2 -->\n' : '';
  const owningLink = knowledgeLayout === 'v2' ? '../../docs/export.md' : '../docs/export.md';
  const orderedHandoff = scenarioId === 'handoff-newest-equal-order';
  const themeTime = orderedHandoff ? '2026-09-20T03:00:00.000Z' : '2026-09-20T02:00:00.000Z';
  const themeHandoff = (scenarioId.includes('capture-publication') || orderedHandoff) ? `\n### ${themeTime} | Theme\n\nGoal: choose accessible contrast values. Work stopped before selection. First action: open [the Theme record](${owningLink.replace('export', 'theme')}). Source task: fixture-theme. Implementation approval is absent.\n` : '';
  const auditHandoff = orderedHandoff ? `\n### 2026-09-20T02:00:00.000Z | Audit\n\nGoal: verify export logs. Work stopped before comparison. First action: open docs/audit.md. Source task: fixture-audit. Implementation approval is absent.\n` : '';
  writeFileSync(join(writer, currentRelativePath), `${currentMarker}# Current work\n\n## Project goal\n\nKeep the fixture export inside its nightly processing window. The project record says the export runs nightly.\n\n## Active work\n\n### Export timing\n\nUpdated: 2026-09-19\n\n**Goal** Keep the nightly export inside its processing window.\n\n**Current status** Profiling is complete. Implementation approval is absent.\n\n**Recent progress** The two slow queries were measured on 2026-09-19.\n\n**Next step** Compare the two saved slow-query measurements tomorrow.\n\n**Blocker** None.\n\n**To-dos** Review accessibility.\n\n**Detailed record** [Export timing](${owningLink}).\n\n## General project to-dos\n\n- Review accessibility.\n\n## Session handoffs\n${themeHandoff}${auditHandoff}${resumeHandoff.replace('../../docs/export.md', owningLink)}\n### Legacy exploration\n\nretain-legacy-context\n${padding}\n`);
  let preflight = { passed: true, build: null, checker: null, hooks: null, installedSourceIdentity: [] };
  if (knowledgeLayout === 'v2') {
    const build = command('node', ['.claude/tools/build-knowledge-index.mjs', writer], writer, false);
    const checker = command('node', ['.claude/tools/check-knowledge.mjs', writer], writer, false);
    const hooks = hookExecutablePreflight(writer, scenarioId);
    const copiedPairs = [
      ['managed manual', join(knowledgeSource, 'plugins', 'second-brain', 'skills', 'knowledge-setup', 'references', 'templates', 'knowledge', 'knowledge-manual.md'), join(writer, 'knowledge', 'knowledge-manual.md')],
      ['Toolkit manual', join(knowledgeSource, 'plugins', 'project-init', 'library', 'templates', 'toolkit-manual.md'), join(writer, 'knowledge', 'toolkit-manual.md')],
      ...['build-knowledge-index.mjs', 'check-knowledge.mjs', 'frontmatter.mjs', 'inspect-knowledge-save.mjs'].map((name) => [name, join(knowledgeSource, 'plugins', 'second-brain', 'tools', name), join(writer, '.claude', 'tools', name)]),
      ...skillNames.flatMap((name) => copyPairsForTree(`${name} skill`, join(knowledgeSource, 'plugins', 'second-brain', 'skills', name), join(writer, '.agents', 'skills', name))),
      ...copyPairsForTree('handoff skill', join(handoffSource, 'plugins', 'session-skills', 'skills', 'handoff'), join(writer, '.agents', 'skills', 'handoff')),
      ...copyPairsForTree('Knowledge hook', join(knowledgeSource, 'plugins', 'second-brain', 'hooks'), join(writer, '.claude', 'hooks'))
    ];
    preflight = {
      passed: build.status === 0 && checker.status === 0 && hooks.passed && copiedPairs.every(([, source, installed]) => sha256(source) === sha256(installed)),
      build,
      checker,
      hooks,
      installedSourceIdentity: copiedPairs.map(([label, source, installed]) => ({ label, source, installed, sourceSha256: sha256(source), installedSha256: sha256(installed), matches: sha256(source) === sha256(installed) }))
    };
  }
  if (!preflight.passed) return { remote, writer, reader, fixtureRoot, currentRelativePath, currentLimit: knowledgeLayout === 'v2' ? 4999 : 2000, overflowIdentifiers, preflight };
  const fixturePaths = ['AGENTS.md', 'SOUL.md', '.agents', '.claude', 'knowledge', 'docs'];
  if (knowledgeLayout === 'v2') fixturePaths.push('src', 'ai-external-knowledge', 'brainstorms');
  command('git', ['add', ...fixturePaths], writer);
  command('git', ['commit', '-m', 'Seed synthetic knowledge behavior fixture'], writer);
  const seedHead = command('git', ['rev-parse', 'HEAD'], writer).stdout.trim();
  const seededStatus = command('git', ['status', '--porcelain=v1'], writer, false);
  preflight.git = { head: seedHead, status: seededStatus.stdout.trim().split('\n').filter(Boolean), clean: seededStatus.status === 0 && seededStatus.stdout.trim() === '' };
  preflight.passed = preflight.passed && preflight.git.clean;
  command('git', ['remote', 'add', 'origin', remote], writer);
  command('git', ['push', '-u', 'origin', 'main'], writer);
  command('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], remote);
  command('git', ['clone', '-b', 'main', remote, reader], fixtureRoot);
  command('git', ['config', 'user.name', 'Knowledge Behavior Reader'], reader);
  command('git', ['config', 'user.email', 'reader@example.invalid'], reader);
  return { remote, writer, reader, fixtureRoot, currentRelativePath, currentLimit: knowledgeLayout === 'v2' ? 4999 : 2000, seedHead, overflowIdentifiers, preflight };
}

function runCodex(cwd, prompt, timeout, caseRoot) {
  const fixtureRoot = dirname(cwd);
  const argv = ['exec', '--model', 'gpt-5.6-sol', '--ignore-user-config', '--json', '--ephemeral', '--sandbox', 'workspace-write', '--add-dir', fixtureRoot, '--cd', cwd, prompt];
  const result = normalizeProcessResult(spawnSync('codex', argv, { cwd, encoding: 'utf8', timeout: timeout * 1000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1' } }));
  writeFileSync(join(caseRoot, 'events.jsonl'), result.stdout || '');
  writeFileSync(join(caseRoot, 'stderr.txt'), result.stderr || '');
  const finalResponse = parseFinalResponse(result.stdout || '');
  writeFileSync(join(caseRoot, 'final-response.md'), `${finalResponse}\n`);
  return { ...result, finalResponse };
}

function assertScenario(scenario, fixture, execution, after) {
  const expected = scenario.expected;
  const currentPath = join(fixture.writer, fixture.currentRelativePath);
  const current = readFileSync(currentPath, 'utf8');
  const checks = [];
  for (const value of expected.requiredCurrentSubstrings || []) checks.push(check(`current contains ${JSON.stringify(value)}`, current.includes(value)));
  if (expected.orderedCurrentSubstrings) {
    const positions = expected.orderedCurrentSubstrings.map((value) => current.indexOf(value));
    checks.push(check('current preserves declared newest-first order', positions.every((position) => position >= 0) && positions.every((position, index) => index === 0 || position > positions[index - 1]), { positions, values: expected.orderedCurrentSubstrings }));
  }
  for (const value of fixture.overflowIdentifiers || []) checks.push(check(`current preserves ${value}`, current.includes(value)));
  for (const value of expected.requiredResponseSubstrings || []) checks.push(check(`response contains ${JSON.stringify(value)}`, execution.finalResponse.toLowerCase().includes(value.toLowerCase())));
  for (const value of expected.forbiddenResponseSubstrings || []) checks.push(check(`response excludes ${JSON.stringify(value)}`, !execution.finalResponse.toLowerCase().includes(value.toLowerCase())));
  for (const value of expected.forbiddenPaths || []) checks.push(check(`path absent: ${value}`, !existsSync(join(fixture.writer, value))));
  if (expected.maxCurrentBytes) {
    const codepoints = [...current].length;
    checks.push(check(`current has at most ${fixture.currentLimit} codepoints`, codepoints <= fixture.currentLimit, { actualCodepoints: codepoints }));
  }
  if (expected.requireCleanWorktree) checks.push(check('worktree is clean', after.status.length === 0, { status: after.status }));
  if (expected.requireRemoteContainsHead) {
    const head = command('git', ['rev-parse', 'HEAD'], fixture.writer, false).stdout.trim();
    const remoteHead = command('git', ['rev-parse', 'refs/heads/main'], fixture.remote, false).stdout.trim();
    checks.push(check('fixture remote contains writer HEAD', head === remoteHead, { head, remoteHead }));
    checks.push(check('publication created a commit after fixture seed', head !== fixture.seedHead, { head, seedHead: fixture.seedHead }));
    command('git', ['fetch', 'origin', 'main'], fixture.reader);
    command('git', ['reset', '--hard', 'origin/main'], fixture.reader);
    const readerCurrent = readFileSync(join(fixture.reader, fixture.currentRelativePath), 'utf8');
    for (const value of expected.requiredCurrentSubstrings || []) checks.push(check(`reader current contains ${JSON.stringify(value)}`, readerCurrent.includes(value)));
  }
  checks.push(check('Codex process exited successfully', execution.status === 0, { exitCode: execution.status, signal: execution.signal }));
  return checks;
}

function snapshotFixture(root) {
  const files = walk(root).filter((path) => !path.includes(`${join(root, '.git')}/`)).map((path) => ({ path: relative(root, path), bytes: statSync(path).size, sha256: sha256(path) }));
  const status = command('git', ['status', '--porcelain=v1'], root, false).stdout.trim().split('\n').filter(Boolean);
  const log = command('git', ['log', '--format=%H%x09%aI%x09%s', '-10'], root, false).stdout.trim().split('\n').filter(Boolean);
  return { files, status, log, head: command('git', ['rev-parse', 'HEAD'], root, false).stdout.trim() };
}

function requiredSources(knowledgeRoot, handoffSource, knowledgeLayout) {
  const files = [];
  const skillNames = knowledgeLayout === 'v2' ? ['knowledge-find', 'knowledge-save', 'knowledge-review', 'knowledge-setup'] : ['recall', 'remember', 'reflect', 'retire', 'second-brain', 'session-search'];
  for (const name of skillNames) {
    const root = join(knowledgeRoot, 'plugins', 'second-brain', 'skills', name);
    for (const path of walk(root)) files.push({ label: `${name}/${relative(root, path)}`, path });
  }
  const handoffSkillRoot = join(handoffSource, 'plugins', 'session-skills', 'skills', 'handoff');
  for (const path of walk(handoffSkillRoot)) files.push({ label: `handoff/${relative(handoffSkillRoot, path)}`, path });
  const verifier = join(handoffSource, 'plugins', 'session-skills', 'agents', 'handoff-verifier.md');
  if (existsSync(verifier)) files.push({ label: 'agents/handoff-verifier.md', path: verifier });
  for (const [label, path] of [
    ['toolkit-manual template', join(knowledgeRoot, 'plugins', 'project-init', 'library', 'templates', 'toolkit-manual.md')],
    ['publication-rule', join(knowledgeRoot, '.claude', 'rules', 'knowledge-direct-commit.md')],
    ['second-brain Claude manifest', join(knowledgeRoot, 'plugins', 'second-brain', '.claude-plugin', 'plugin.json')],
    ['second-brain Codex manifest', join(knowledgeRoot, 'plugins', 'second-brain', '.codex-plugin', 'plugin.json')]
  ]) files.push({ label, path });
  for (const tool of ['build-knowledge-index.mjs', 'check-knowledge.mjs', 'frontmatter.mjs', 'inspect-knowledge-save.mjs']) {
    const path = join(knowledgeRoot, 'plugins', 'second-brain', 'tools', tool);
    if (existsSync(path)) files.push({ label: `second-brain/tools/${tool}`, path });
  }
  if (knowledgeLayout === 'v2') {
    const hookNames = readdirSync(join(knowledgeRoot, 'plugins', 'second-brain', 'hooks')).filter((name) => name.endsWith('.mjs')).sort();
    for (const hook of hookNames) {
      files.push({ label: `second-brain/hooks/${hook}`, path: join(knowledgeRoot, 'plugins', 'second-brain', 'hooks', hook) });
    }
  }
  return files;
}

function gitSourceState(knowledgeRoot, handoffSource) {
  return {
    knowledge: {
      head: command('git', ['rev-parse', 'HEAD'], knowledgeRoot, false).stdout.trim(),
      status: command('git', ['status', '--porcelain=v1'], knowledgeRoot, false).stdout.trim().split('\n').filter(Boolean)
    },
    handoff: {
      head: command('git', ['rev-parse', 'HEAD'], handoffSource, false).stdout.trim(),
      status: command('git', ['status', '--porcelain=v1'], handoffSource, false).stdout.trim().split('\n').filter(Boolean)
    }
  };
}

function hookExecutablePreflight(root, scenarioId) {
  const nested = join(root, 'packages', 'fixture');
  mkdirSync(nested, { recursive: true });
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  delete env.CODEX_PROJECT_DIR;
  const sessionId = `fixture-${scenarioId}`;
  const input = { session_id: sessionId, hook_event_name: 'UserPromptSubmit', cwd: nested };
  const receiptKey = createHash('sha256').update(JSON.stringify([resolve(root), sessionId, 'root'])).digest('hex');
  const receiptPath = join(tmpdir(), 'toolkit-knowledge-review', `${receiptKey}.json`);
  try {
    const startup = command('node', [join(root, '.claude', 'hooks', 'knowledge-session-start.mjs')], nested, false, env);
    const prompt = commandWithInput('node', [join(root, '.claude', 'hooks', 'memory-reminder.mjs')], nested, JSON.stringify(input), env);
    const generation = prompt.stdout.match(/knowledge-completion\.mjs review "[^"]*" "[^"]*" "[^"]*" ([\w-]+) OUTCOME/)?.[1] || '';
    const firstStop = commandWithInput('node', [join(root, '.claude', 'hooks', 'knowledge-completion.mjs')], nested, JSON.stringify({ ...input, hook_event_name: 'Stop' }), env);
    const review = generation ? command('node', [join(root, '.claude', 'hooks', 'knowledge-completion.mjs'), 'review', root, sessionId, 'root', generation, 'no-change'], nested, false, env) : { status: 1, signal: null, timedOut: false, error: null, stdout: '', stderr: 'missing generation' };
    const secondStop = commandWithInput('node', [join(root, '.claude', 'hooks', 'knowledge-completion.mjs')], nested, JSON.stringify({ ...input, hook_event_name: 'Stop' }), env);
    let firstDecision = null;
    let secondDecision = null;
    try { firstDecision = JSON.parse(firstStop.stdout); } catch {}
    try { secondDecision = JSON.parse(secondStop.stdout || '{}'); } catch {}
    const passed = startup.status === 0 && !/missing:|file empty:/.test(startup.stdout) && prompt.status === 0 && generation && firstStop.status === 0 && firstDecision?.decision === 'block' && review.status === 0 && secondStop.status === 0 && Object.keys(secondDecision || {}).length === 0;
    return { passed: Boolean(passed), startup, prompt, generation, firstStop, review, secondStop };
  } finally {
    rmSync(receiptPath, { force: true });
  }
}

function parseFinalResponse(jsonl) {
  let response = '';
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') response = event.item.text || response;
      if (event.type === 'message' && event.role === 'assistant') response = event.content || response;
    } catch {}
  }
  return typeof response === 'string' ? response : JSON.stringify(response);
}

function parseTokenUsage(jsonl) {
  let usage = null;
  for (const line of jsonl.split('\n')) {
    try {
      const event = JSON.parse(line);
      if (event.usage) usage = event.usage;
      if (event.type === 'turn.completed' && event.usage) usage = event.usage;
    } catch {}
  }
  return usage;
}

function command(bin, argv, cwd, throwOnError = true, env = process.env) {
  const result = normalizeProcessResult(spawnSync(bin, argv, { cwd, encoding: 'utf8', timeout: timeoutSeconds * 1000, maxBuffer: 32 * 1024 * 1024, env }));
  if (throwOnError && result.timedOut) {
    const error = new Error(`${bin} ${argv.join(' ')} timed out after ${timeoutSeconds} seconds`);
    error.code = 'ETIMEDOUT';
    error.processResult = result;
    throw error;
  }
  if (throwOnError && result.status !== 0) {
    const error = new Error(`${bin} ${argv.join(' ')} failed (${result.status}): ${result.stderr || result.error?.message || 'no error output'}`);
    error.code = result.error?.code || 'COMMAND_FAILED';
    error.processResult = result;
    throw error;
  }
  return result;
}

function commandWithInput(bin, argv, cwd, input, env = process.env) {
  return normalizeProcessResult(spawnSync(bin, argv, { cwd, encoding: 'utf8', timeout: timeoutSeconds * 1000, maxBuffer: 32 * 1024 * 1024, env, input }));
}

function normalizeProcessResult(result) {
  return {
    status: result.status,
    signal: result.signal,
    timedOut: result.error?.code === 'ETIMEDOUT',
    error: result.error ? serializeError(result.error) : null,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function serializeError(error) {
  return {
    name: error?.name || 'Error',
    code: error?.code || null,
    message: error?.message || String(error)
  };
}

function walk(root) {
  const output = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...walk(path)); else output.push(path);
  }
  return output.sort();
}

function copyPairsForTree(label, sourceRoot, installedRoot) {
  return walk(sourceRoot).map((source) => [`${label}: ${relative(sourceRoot, source)}`, source, join(installedRoot, relative(sourceRoot, source))]);
}

function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function check(name, passed, evidence = {}) { return { name, passed, ...evidence }; }
function fail(message) { process.stderr.write(`${message}\n`); process.exit(2); }
function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith('--')) fail(`unexpected argument: ${key}`);
    const value = values[index + 1];
    if (!value || value.startsWith('--')) fail(`missing value for ${key}`);
    parsed[key.slice(2)] = value;
    index += 1;
  }
  return parsed;
}
