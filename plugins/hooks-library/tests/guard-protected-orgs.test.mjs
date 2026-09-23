#!/usr/bin/env node
/**
 * Tests for guard-protected-orgs.js. Run:
 *   node plugins/hooks-library/tests/guard-protected-orgs.test.mjs
 *
 * Each case feeds the hook one command and checks the decision it returns.
 * Nothing here touches a real org. The hook is copied into a temporary
 * `.claude/hooks/` folder with its own `protected-orgs.json`, and a fake `sf`
 * is put first on PATH. The fake answers `sf org list` from a fixed list of
 * three orgs (one production, one sandbox, one scratch) and `sf config get
 * target-org` from the FAKE_DEFAULT_ORG environment variable.
 *
 * The hook fails in two directions. A wrong block is obvious; a wrong pass
 * looks exactly like everything working. So the allow cases below matter as
 * much as the ask and deny cases.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'hooks', 'guard-protected-orgs.js');
const temp = mkdtempSync(join(tmpdir(), 'guard-protected-orgs-test-'));
const claudeDir = join(temp, '.claude');
const hook = join(claudeDir, 'hooks', 'guard-protected-orgs.js');
const config = join(claudeDir, 'protected-orgs.json');
const bin = join(temp, 'bin');

const ORGS = {
  status: 0,
  result: {
    nonScratchOrgs: [
      { alias: 'PROD', username: 'admin@example.com', instanceUrl: 'https://example.my.salesforce.com', isSandbox: false },
    ],
    sandboxes: [
      { alias: 'DEV', username: 'admin@example.com.dev', instanceUrl: 'https://example--dev.sandbox.my.salesforce.com', isSandbox: true },
    ],
    scratchOrgs: [
      { alias: 'SCRATCH', username: 'test-abc@example.com', isScratch: true },
    ],
  },
};

const FAKE_SF = `
const args = process.argv.slice(2).join(' ');
if (args.startsWith('org list')) {
  process.stdout.write(${JSON.stringify(JSON.stringify(ORGS))});
} else if (args.startsWith('config get target-org')) {
  const value = process.env.FAKE_DEFAULT_ORG;
  process.stdout.write(JSON.stringify({ status: 0, result: value ? [{ name: 'target-org', value }] : [] }));
} else {
  process.exit(1);
}
`;

function put(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function setPolicy(overrides = {}) {
  put(config, JSON.stringify({
    action: 'ask',
    unknownOrgAction: 'ask',
    sandboxAction: 'ask',
    confirmOrgDeleteAlways: true,
    alwaysProtect: [],
    neverProtect: [],
    ...overrides,
  }));
}

function run(command, env = {}) {
  const childEnv = { ...process.env };
  for (const key of ['SF_TARGET_ORG', 'SFDX_DEFAULTUSERNAME', 'SF_TARGET_ORG_ALIAS', 'FAKE_DEFAULT_ORG']) {
    delete childEnv[key];
  }
  // Windows keeps the search path under "Path"; set every spelling so the fake wins.
  const path = [bin, dirname(process.execPath), childEnv.PATH || childEnv.Path || ''].join(delimiter);
  for (const key of Object.keys(childEnv)) if (key.toUpperCase() === 'PATH') delete childEnv[key];
  childEnv.PATH = path;
  const out = execFileSync(process.execPath, [hook], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    timeout: 60000,
    env: { ...childEnv, ...env },
  });
  if (!out.trim()) return { decision: 'allow', reason: '' };
  const parsed = JSON.parse(out).hookSpecificOutput;
  return { decision: parsed.permissionDecision, reason: parsed.permissionDecisionReason };
}

let checks = 0;
let failed = 0;
function expect(want, command, { env = {}, reasonHas = [] } = {}) {
  const got = run(command, env);
  let ok = got.decision === want;
  for (const text of reasonHas) ok = ok && got.reason.includes(text);
  checks++;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  want=${want} got=${got.decision}  ${command}`);
  if (!ok) console.log(`        ${got.reason || '(no reason)'}`);
}

try {
  copyFileSync(source, (mkdirSync(dirname(hook), { recursive: true }), hook));
  put(join(bin, 'fake-sf.js'), FAKE_SF);
  put(join(bin, 'sf.cmd'), '@node "%~dp0fake-sf.js" %*\r\n');
  put(join(bin, 'sf'), '#!/bin/sh\nexec node "$(dirname "$0")/fake-sf.js" "$@"\n');
  if (process.platform !== 'win32') execFileSync('chmod', ['+x', join(bin, 'sf')]);

  // --- Default policy: ask on production, ask on sandbox writes -----------
  setPolicy();

  // Production: every command that changes the org asks.
  expect('ask', 'sf project deploy start -x manifest/package.xml -o PROD', { reasonHas: ["'deploy'", 'PRODUCTION'] });
  expect('ask', 'sf project deploy validate -x manifest/package.xml -o PROD', { reasonHas: ["'validate'"] });
  expect('ask', 'sf data create record -s Account -v "Name=Foo" -o PROD', { reasonHas: ["'dataWrite'"] });
  expect('ask', 'sf data update record -s Account -i 001x -v "Name=Foo" -o PROD');
  expect('ask', 'sf data upsert bulk -s Account -f load.csv -i Id -o PROD');
  expect('ask', 'sf data import tree -f data.json -o PROD');
  expect('ask', 'sf data delete record -s Account -i 001x -o PROD');
  expect('ask', 'sfdx force:data:record:update -s Account -i 001x -u PROD');
  expect('ask', 'sf apex run -f script.apex -o PROD', { reasonHas: ["'apex'"] });
  expect('ask', 'sf project delete source -m ApexClass:Foo -o PROD', { reasonHas: ["'metadataDelete'"] });
  // A username works the same as an alias, in any case.
  expect('ask', 'sf data update record -s Account -i 001x --target-org ADMIN@example.com');

  // Sandbox and scratch: writes ask, because the rule wants the owner's yes.
  expect('ask', 'sf project deploy start -x manifest/package.xml -o DEV', { reasonHas: ['sandbox org'] });
  expect('ask', 'sf data update record -s Account -i 001x -o dev');
  expect('ask', 'sf apex run -f script.apex -o DEV');
  expect('ask', 'sf data create record -s Account -v "Name=Foo" -o SCRATCH', { reasonHas: ['scratch org'] });
  // A validate on a sandbox needs no yes.
  expect('allow', 'sf project deploy validate -x manifest/package.xml -o DEV');
  // An org delete always asks, even on a sandbox.
  expect('ask', 'sf org delete sandbox -o DEV', { reasonHas: ['irreversible'] });

  // Reads, unguarded sf verbs, and non-Salesforce commands pass silently.
  expect('allow', 'sf data query -q "SELECT Id FROM Account" -o PROD');
  expect('allow', 'sf project retrieve start -m CustomObject:Account -o PROD');
  expect('allow', 'sf apex test run -o DEV');
  expect('allow', 'sf org list');
  expect('allow', 'git status');

  // An org the local store does not know is treated as protected.
  expect('ask', 'sf project deploy start -o NOT-AUTHENTICATED', { reasonHas: ['could not be classified'] });

  // No -o: the default org decides, and the message says so.
  expect('ask', 'sf project deploy start -x manifest/package.xml', { env: { FAKE_DEFAULT_ORG: 'PROD' }, reasonHas: ['(default org)'] });
  expect('ask', 'sf project deploy start -x manifest/package.xml', { reasonHas: ['no resolvable target org'] });

  // --- sandboxAction allow: sandbox writes go back to silent -------------
  setPolicy({ sandboxAction: 'allow' });
  expect('allow', 'sf project deploy start -x manifest/package.xml -o DEV');
  expect('allow', 'sf data update record -s Account -i 001x -o SCRATCH');
  expect('ask', 'sf project deploy start -x manifest/package.xml -o PROD');

  // --- action deny: production hard-blocks, sandboxes still only ask -----
  setPolicy({ action: 'deny' });
  expect('deny', 'sf project deploy start -x manifest/package.xml -o PROD', { reasonHas: ['BLOCKED'] });
  expect('deny', 'sf project deploy validate -x manifest/package.xml -o PROD');
  expect('deny', 'sf data upsert bulk -s Account -f load.csv -i Id -o PROD');
  expect('ask', 'sf project deploy start -x manifest/package.xml -o DEV');
  // Strictest target wins: nothing rides along on a sandbox's allowance.
  expect('deny', 'sf project deploy start -x manifest/package.xml -o DEV -o PROD');

  // --- neverProtect and alwaysProtect -------------------------------------
  setPolicy({ action: 'deny', neverProtect: ['scratch'], alwaysProtect: ['dev'] });
  expect('allow', 'sf data create record -s Account -v "Name=Foo" -o SCRATCH');
  expect('deny', 'sf project deploy start -x manifest/package.xml -o DEV', { reasonHas: ['alwaysProtect'] });

  // --- no policy file: safe defaults apply --------------------------------
  rmSync(config);
  expect('ask', 'sf project deploy start -x manifest/package.xml -o PROD');
  expect('ask', 'sf data update record -s Account -i 001x -o DEV');

  assert.equal(failed, 0, `${failed} of ${checks} checks failed`);
  console.log(`\nAll ${checks} checks passed.`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
