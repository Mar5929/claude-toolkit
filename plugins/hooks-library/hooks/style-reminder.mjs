#!/usr/bin/env node
/**
 * style-reminder: a UserPromptSubmit hook that re-states the project's active
 * output style every time the owner sends a message.
 *
 * Why this exists. An output style is delivered once, in the system prompt at
 * session start. Voice instructions do not hold across a long session from a
 * single delivery: measuring real transcripts showed writing rules stated in
 * several places and broken constantly anyway. This hook puts the style back in
 * front of the agent on every turn, so the instruction is never thousands of
 * tokens stale.
 *
 * What it is NOT. This is a reminder, not a check. It reads nothing the agent
 * wrote and blocks nothing. It cannot catch a violation; it only lowers the
 * odds of one.
 *
 * Where the text comes from. The style file itself, never a copy. The hook
 * resolves the active style from the project's settings and reads that file, so
 * editing the style is the only edit needed. A reminder that restated the style
 * inline would be one more copy to fall out of step.
 *
 * Resolution order for the style name:
 *   1. `style` in .claude/style-reminder.json
 *   2. `outputStyle` in .claude/settings.local.json
 *   3. `outputStyle` in .claude/settings.json
 *   4. DEFAULT_STYLE
 *
 * Then it reads .claude/output-styles/<name>.md and strips the frontmatter.
 * A built-in style (Explanatory, Learning, Proactive, Default) has no file in
 * the project, so nothing is found and the hook stays silent. That is correct:
 * it must never re-state a style the owner switched away from.
 *
 * How it delivers. Exit 0 with the reminder on stdout. Claude Code adds a
 * UserPromptSubmit hook's stdout to the session context. Exit 0 with no output
 * means no reminder this turn.
 *
 * Fails open and quiet. Any unexpected error exits 0 with nothing written. A
 * broken reminder must never block the owner's message.
 *
 * Config, all optional, from .claude/style-reminder.json in the project root:
 *   { "style": "plain-language",   // override the resolved style name
 *     "everyNPrompts": 1,          // 1 = every message, 3 = every third
 *     "maxChars": 4000 }           // skip rather than inject an enormous file
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DEFAULT_STYLE = 'plain-language';
const EVERY_N_DEFAULT = 1;
const MAX_CHARS_DEFAULT = 4000;

function bail() {
  process.exit(0);
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function readJson(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function loadConfig(projectDir) {
  const defaults = {
    style: '',
    everyNPrompts: EVERY_N_DEFAULT,
    maxChars: MAX_CHARS_DEFAULT,
  };
  if (!projectDir) return defaults;
  const parsed = readJson(join(projectDir, '.claude', 'style-reminder.json'));
  if (!parsed) return defaults;
  return {
    style: typeof parsed.style === 'string' ? parsed.style : '',
    everyNPrompts:
      Number.isInteger(parsed.everyNPrompts) && parsed.everyNPrompts > 0
        ? parsed.everyNPrompts
        : EVERY_N_DEFAULT,
    maxChars:
      Number.isInteger(parsed.maxChars) && parsed.maxChars > 0
        ? parsed.maxChars
        : MAX_CHARS_DEFAULT,
  };
}

/** Exported for tests. Settings precedence: local overrides committed. */
export function resolveStyleName(projectDir, configStyle) {
  if (configStyle) return configStyle;
  for (const file of ['settings.local.json', 'settings.json']) {
    const parsed = readJson(join(projectDir, '.claude', file));
    if (parsed && typeof parsed.outputStyle === 'string' && parsed.outputStyle) {
      return parsed.outputStyle;
    }
  }
  return DEFAULT_STYLE;
}

/**
 * Exported for tests. Pure: file text in, body out.
 * Strips YAML frontmatter, which is metadata for the picker and would be noise
 * in a reminder.
 */
export function stripFrontmatter(text) {
  const match = /^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
  return (match ? text.slice(match[0].length) : text).trim();
}

/** Exported for tests. Pure: body in, reminder out. */
export function buildReminder(body, styleName) {
  return [
    `Reminder, the "${styleName}" output style is active for this project.`,
    'It governs your next reply. Follow it as written:',
    '',
    body,
  ].join('\n');
}

function styleBody(projectDir, styleName, maxChars) {
  const path = join(projectDir, '.claude', 'output-styles', `${styleName}.md`);
  if (!existsSync(path)) return '';
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return '';
  }
  if (raw.length > maxChars) return '';
  return stripFrontmatter(raw);
}

function counterFile(sessionId) {
  const dir = join(tmpdir(), 'claude-style-reminder');
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return null;
  }
  const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '');
  return join(dir, `${safe || 'unknown'}.json`);
}

/**
 * Returns true when this prompt should carry the reminder.
 * everyNPrompts of 1 fires every time and never touches disk.
 */
function shouldFire(sessionId, everyN) {
  if (everyN <= 1) return true;
  const path = counterFile(sessionId);
  if (!path) return true;
  const parsed = readJson(path);
  const count = parsed && Number.isInteger(parsed.count) ? parsed.count : 0;
  try {
    writeFileSync(path, JSON.stringify({ count: count + 1 }));
  } catch {
    return true;
  }
  return count % everyN === 0;
}

function main() {
  const raw = readStdin();
  let payload = {};
  try {
    payload = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    bail();
  }

  const projectDir = payload.cwd || process.env.CLAUDE_PROJECT_DIR || '';
  if (!projectDir) bail();

  const config = loadConfig(projectDir);
  const styleName = resolveStyleName(projectDir, config.style);
  const body = styleBody(projectDir, styleName, config.maxChars);
  if (!body) bail();

  if (!shouldFire(payload.session_id, config.everyNPrompts)) bail();

  process.stdout.write(buildReminder(body, styleName) + '\n');
  process.exit(0);
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('style-reminder.mjs')
) {
  try {
    main();
  } catch {
    bail();
  }
}
