#!/usr/bin/env node
/**
 * Test harness for style-reminder.
 *
 * Run: node plugins/hooks-library/tests/style-reminder-harness.mjs
 *
 * The weighting is deliberate. A reminder hook fails in two directions and only
 * one of them is visible: injecting the wrong text is obvious, while staying
 * silent when it should have fired looks exactly like everything working. So
 * the silence cases are tested as hard as the firing cases.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { resolveStyleName, stripFrontmatter, buildReminder, styleBody } from '../hooks/style-reminder.mjs';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'hooks', 'style-reminder.mjs');

let pass = 0;
const failures = [];

function check(label, condition) {
  if (condition) pass++;
  else failures.push(label);
}

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'style-reminder-test-'));
  mkdirSync(join(dir, '.claude', 'output-styles'), { recursive: true });
  return dir;
}

function writeStyle(dir, name, text) {
  writeFileSync(join(dir, '.claude', 'output-styles', `${name}.md`), text);
}

function writeJson(dir, file, value) {
  writeFileSync(join(dir, '.claude', file), JSON.stringify(value));
}

/**
 * A home directory with nothing in it. Every end-to-end run points HOME here
 * unless a test says otherwise, so the results do not depend on whether the
 * machine running the tests happens to have a style installed. Since #102 the
 * hook falls back to ~/.claude, and without this the "stays silent" tests would
 * pass or fail based on the developer's own setup.
 */
const EMPTY_HOME = mkdtempSync(join(tmpdir(), 'style-reminder-home-'));

/** Run the hook as Claude Code would: JSON on stdin, read stdout. */
function run(dir, payload = {}, home = EMPTY_HOME) {
  return execFileSync('node', [HOOK], {
    input: JSON.stringify({ cwd: dir, session_id: 'test-session', ...payload }),
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });
}

/** A scratch directory shaped like a home folder, with a style already in it. */
function scratchHome(styleName, text) {
  const dir = mkdtempSync(join(tmpdir(), 'style-reminder-home-'));
  mkdirSync(join(dir, '.claude', 'output-styles'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'output-styles', `${styleName}.md`), text);
  return dir;
}

const STYLE = `---
name: plain-language
description: Write for a non-technical owner.
keep-coding-instructions: true
---

The owner is not technical.

- Use plain, clear, simple language.
- Never use em dashes.
`;

// ---------------------------------------------------------------- pure units

check('stripFrontmatter removes the block', !stripFrontmatter(STYLE).includes('keep-coding'));
check('stripFrontmatter keeps the body', stripFrontmatter(STYLE).includes('not technical'));
check('stripFrontmatter starts at the body', stripFrontmatter(STYLE).startsWith('The owner'));
check('stripFrontmatter tolerates no frontmatter', stripFrontmatter('# Hi\n\nBody') === '# Hi\n\nBody');
check('stripFrontmatter tolerates empty input', stripFrontmatter('') === '');
check(
  'stripFrontmatter does not eat a body rule line',
  stripFrontmatter('---\na: b\n---\ntext\n\n---\n\nmore') === 'text\n\n---\n\nmore',
);
check('stripFrontmatter handles CRLF', stripFrontmatter('---\r\na: b\r\n---\r\nbody').trim() === 'body');

check('buildReminder names the style', buildReminder('body', 'plain-language').includes('"plain-language"'));
check('buildReminder carries the body', buildReminder('BODY-TEXT', 'x').includes('BODY-TEXT'));

// ------------------------------------------------------------- name resolving
{
  const dir = scratch();
  check('resolveStyleName falls back to the default', resolveStyleName(dir, '') === 'plain-language');

  writeJson(dir, 'settings.json', { outputStyle: 'committed-style' });
  check('resolveStyleName reads settings.json', resolveStyleName(dir, '') === 'committed-style');

  writeJson(dir, 'settings.local.json', { outputStyle: 'local-style' });
  check('resolveStyleName prefers settings.local.json', resolveStyleName(dir, '') === 'local-style');

  check('resolveStyleName lets config win over both', resolveStyleName(dir, 'forced') === 'forced');

  writeJson(dir, 'settings.local.json', { theme: 'dark' });
  check(
    'resolveStyleName ignores a settings file with no outputStyle',
    resolveStyleName(dir, '') === 'committed-style',
  );

  writeFileSync(join(dir, '.claude', 'settings.local.json'), '{ broken json');
  check('resolveStyleName survives malformed JSON', resolveStyleName(dir, '') === 'committed-style');
  rmSync(dir, { recursive: true, force: true });
}

// ------------------------------------------------------------------- it fires
{
  const dir = scratch();
  writeStyle(dir, 'plain-language', STYLE);
  const out = run(dir);
  check('fires with no settings at all', out.includes('Never use em dashes'));
  check('fires with the reminder preamble', out.includes('output style is active'));
  check('fires without leaking frontmatter', !out.includes('keep-coding-instructions'));
  rmSync(dir, { recursive: true, force: true });
}

{
  const dir = scratch();
  writeStyle(dir, 'house-voice', 'body of the house voice');
  writeJson(dir, 'settings.json', { outputStyle: 'house-voice' });
  const out = run(dir);
  check('follows the selected style name', out.includes('body of the house voice'));
  check('names the selected style', out.includes('"house-voice"'));
  rmSync(dir, { recursive: true, force: true });
}

{
  const dir = scratch();
  writeStyle(dir, 'forced', 'forced body');
  writeStyle(dir, 'plain-language', STYLE);
  writeJson(dir, 'style-reminder.json', { style: 'forced' });
  const out = run(dir);
  check('config style overrides the settings file', out.includes('forced body'));
  rmSync(dir, { recursive: true, force: true });
}

// ------------------------------------- the machine-wide copy is the fallback
{
  const dir = scratch();
  const home = scratchHome('plain-language', STYLE);
  writeFileSync(join(home, '.claude', 'settings.json'), JSON.stringify({ outputStyle: 'plain-language' }));
  check('resolveStyleName reads the machine settings last', resolveStyleName(dir, '', home) === 'plain-language');
  check('styleBody falls back to the home copy', styleBody(dir, 'plain-language', 4000, home).includes('not technical'));
  check('fires from the home copy with nothing in the project', run(dir, {}, home).includes('Never use em dashes'));
  rmSync(dir, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
}

{
  const dir = scratch();
  const home = scratchHome('plain-language', '---\nname: plain-language\n---\n\nhome copy body');
  writeStyle(dir, 'plain-language', STYLE);
  check('the project copy beats the home copy', run(dir, {}, home).includes('Never use em dashes'));
  check('the project copy really is the one used', !run(dir, {}, home).includes('home copy body'));
  rmSync(dir, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
}

{
  const dir = scratch();
  const home = scratchHome('plain-language', STYLE);
  writeJson(dir, 'settings.json', { outputStyle: 'Explanatory' });
  check(
    'a built-in style in the project still silences the home copy',
    run(dir, {}, home).trim() === '',
  );
  rmSync(dir, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
}

// ------------------------------------------------------- it stays silent
{
  const dir = scratch();
  check('silent when no style file exists in the project or the home folder', run(dir).trim() === '');
  rmSync(dir, { recursive: true, force: true });
}

{
  const dir = scratch();
  writeStyle(dir, 'plain-language', STYLE);
  writeJson(dir, 'settings.json', { outputStyle: 'Explanatory' });
  check(
    'silent when the owner switched to a built-in style',
    run(dir).trim() === '',
  );
  rmSync(dir, { recursive: true, force: true });
}

{
  const dir = scratch();
  writeStyle(dir, 'plain-language', STYLE);
  writeJson(dir, 'style-reminder.json', { maxChars: 10 });
  check('silent when the style file exceeds maxChars', run(dir).trim() === '');
  rmSync(dir, { recursive: true, force: true });
}

{
  const dir = scratch();
  writeStyle(dir, 'plain-language', STYLE);
  writeFileSync(join(dir, '.claude', 'style-reminder.json'), '{ not json');
  check('malformed config falls back to defaults and still fires', run(dir).includes('em dashes'));
  rmSync(dir, { recursive: true, force: true });
}

// --------------------------------------------------------------- fails open
{
  const dir = scratch();
  writeStyle(dir, 'plain-language', STYLE);
  const out = execFileSync('node', [HOOK], { input: 'not json at all', encoding: 'utf8' });
  check('malformed stdin exits quietly', out.trim() === '');
  const empty = execFileSync('node', [HOOK], { input: '', encoding: 'utf8' });
  check('empty stdin exits quietly', empty.trim() === '');
  rmSync(dir, { recursive: true, force: true });
}

// ------------------------------------------------------------------ throttle
{
  const dir = scratch();
  writeStyle(dir, 'plain-language', STYLE);
  writeJson(dir, 'style-reminder.json', { everyNPrompts: 3 });
  const session = `throttle-${process.pid}`;
  const runs = [1, 2, 3, 4].map(() => run(dir, { session_id: session }).trim() !== '');
  check('everyNPrompts fires on the first prompt', runs[0] === true);
  check('everyNPrompts stays silent on the second', runs[1] === false);
  check('everyNPrompts stays silent on the third', runs[2] === false);
  check('everyNPrompts fires again on the fourth', runs[3] === true);
  rmSync(dir, { recursive: true, force: true });
}

{
  const dir = scratch();
  writeStyle(dir, 'plain-language', STYLE);
  const session = `default-${process.pid}`;
  const runs = [1, 2, 3].map(() => run(dir, { session_id: session }).trim() !== '');
  check('default throttle fires on every prompt', runs.every(Boolean));
  rmSync(dir, { recursive: true, force: true });
}

// ------------------------------------------------------------------- results
if (failures.length) {
  console.error(`FAIL (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error(`\nPASS: ${pass}`);
  process.exit(1);
}
console.log(`ALL PASS (${pass} checks), FAIL: 0`);
