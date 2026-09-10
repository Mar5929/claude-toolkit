#!/usr/bin/env node

/**
 * Exercise the System Guide experience boundary: startup is one cheap,
 * read-only briefing when enabled, silent when off, and never a turn loop.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import { buildGuideBriefing } from '../plugins/system-guide/hooks/system-guide-session-start.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const plugin = resolve(root, 'plugins/system-guide');
const cli = resolve(plugin, 'tools/system-guide.mjs');
const hook = resolve(plugin, 'hooks/system-guide-session-start.mjs');
const failures = [];
let checks = 0;

function check(name, run) {
  try {
    run();
    checks += 1;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function runCli(project, ...args) {
  return execFileSync(process.execPath, [cli, ...args, '--root', project, '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
}

function runHook(project) {
  return execFileSync(process.execPath, [hook], {
    cwd: project,
    encoding: 'utf8',
    input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', cwd: project }),
    timeout: 5000,
  });
}

function treeFingerprint(project) {
  const records = [];
  function walk(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const absolute = join(folder, entry.name);
      const path = relative(project, absolute).replaceAll('\\', '/');
      if (entry.isDirectory()) {
        records.push(`d:${path}`);
        walk(absolute);
      } else {
        const hash = createHash('sha256').update(readFileSync(absolute)).digest('hex');
        records.push(`f:${path}:${statSync(absolute).size}:${hash}`);
      }
    }
  }
  walk(project);
  return records.sort();
}

function configuredProject() {
  const project = mkdtempSync(join(tmpdir(), 'system-guide-experience-'));
  mkdirSync(resolve(project, 'src'), { recursive: true });
  writeFileSync(resolve(project, 'src/example.js'), 'export const value = 1;\n');
  runCli(project, 'setup', '--source', 'code:complete:src');
  return project;
}

check('one native SessionStart handler and no turn or stop loop', () => {
  const config = JSON.parse(readFileSync(resolve(plugin, 'hooks/hooks.json'), 'utf8'));
  assert.deepEqual(Object.keys(config.hooks), ['SessionStart']);
  assert.equal(config.hooks.SessionStart.length, 1);
  assert.equal(config.hooks.SessionStart[0].hooks.length, 1);
  const handler = config.hooks.SessionStart[0].hooks[0];
  assert.equal(handler.type, 'command');
  assert.equal(handler.timeout, 5);
  assert.deepEqual(handler.args, ['${CLAUDE_PLUGIN_ROOT}/hooks/system-guide-session-start.mjs']);
});

check('briefing distinguishes missing coverage from stale evidence', () => {
  const missing = buildGuideBriefing({
    state: 'on', enabled: true, guidePath: 'knowledge/system', coverage: [],
    lastRefresh: null, problems: [],
  });
  assert.match(missing, /capture scope: unavailable/);
  assert.match(missing, /last refresh: unavailable/);
  assert.doesNotMatch(missing, /stale/);

  const stale = buildGuideBriefing({
    state: 'on', enabled: true, guidePath: 'knowledge/system',
    coverage: [{ path: 'src', completeness: 'complete' }],
    lastRefresh: '2026-09-10T16:00:00.000Z',
    problems: [{ code: 'stale-generated-evidence', message: 'Refresh is stale.' }],
  });
  assert.match(stale, /capture scope: complete/);
  assert.match(stale, /last refresh: 2026-09-10T16:00:00.000Z/);
  assert.match(stale, /attention: stale evidence/);
});

check('missing configuration is silent and read-only', () => {
  const project = mkdtempSync(join(tmpdir(), 'system-guide-missing-'));
  try {
    writeFileSync(resolve(project, 'sentinel.txt'), 'unchanged\n');
    const before = treeFingerprint(project);
    assert.equal(runHook(project), '');
    assert.deepEqual(treeFingerprint(project), before);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

check('disabled configuration is silent and preserves guide files', () => {
  const project = configuredProject();
  try {
    runCli(project, 'disable');
    const before = treeFingerprint(project);
    assert.equal(runHook(project), '');
    assert.deepEqual(treeFingerprint(project), before);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

check('enabled startup emits one line and writes nothing', () => {
  const project = configuredProject();
  try {
    const before = treeFingerprint(project);
    const output = runHook(project);
    assert.equal(output.trim().split(/\r?\n/).length, 1);
    assert.match(output, /^System Guide: (on|needs repair);/);
    assert.match(output, /entry: knowledge\/system\/README\.md/);
    assert.deepEqual(treeFingerprint(project), before);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

check('enabled but incomplete setup reports missing guide parts', () => {
  const project = configuredProject();
  try {
    rmSync(resolve(project, 'knowledge/system/README.md'));
    const before = treeFingerprint(project);
    const output = runHook(project);
    assert.match(output, /^System Guide: needs repair;/);
    assert.match(output, /attention: missing guide parts/);
    assert.deepEqual(treeFingerprint(project), before);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

check('malformed startup input fails open without output', () => {
  const project = configuredProject();
  try {
    const output = execFileSync(process.execPath, [hook], {
      cwd: project,
      encoding: 'utf8',
      input: '{bad json',
      timeout: 5000,
    });
    assert.equal(output, '');
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

if (failures.length) {
  console.error(`FAIL: ${failures.length} System Guide experience problem(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`ALL PASS (${checks} System Guide experience checks), FAIL: 0`);
}
