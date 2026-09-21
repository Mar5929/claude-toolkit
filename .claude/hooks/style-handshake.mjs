#!/usr/bin/env node
/**
 * On each user message, ask the agent to read the selected output style file
 * silently before working. No acknowledgment is requested, and no other event
 * produces output. Delivery is observable; reading and compliance are not.
 */
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const userDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
// Claude Code delivers these itself: https://code.claude.com/docs/en/output-styles (2026-09-21).
const BUILT_IN = ['default', 'proactive', 'concise', 'explanatory', 'learning'];

function context(event, text) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: text },
  }));
}

function canonical(path) {
  const actual = realpathSync(path);
  return process.platform === 'win32' ? actual.toLowerCase() : actual;
}

function selectedStyle(root) {
  for (const path of [join(root, '.claude', 'settings.local.json'),
    join(root, '.claude', 'settings.json'), join(userDir, 'settings.json')]) {
    let settings;
    try { settings = JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (typeof settings.outputStyle === 'string' && settings.outputStyle.trim()) {
      return settings.outputStyle.trim();
    }
  }
  return 'Plain English';
}

function stylePath(name, root) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const dir of [join(root, '.claude', 'output-styles'), join(userDir, 'output-styles')]) {
    let names;
    try { names = readdirSync(dir).filter(file => file.endsWith('.md')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const file of names) {
      const path = join(dir, file);
      const text = readFileSync(path, 'utf8');
      const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const displayName = header?.[1].match(/^name:\s*(.*?)\s*$/m)?.[1]
        .replace(/^(['"])(.*)\1$/, '$2');
      if (displayName === name || (!displayName && file === `${slug}.md`)) {
        return canonical(path);
      }
    }
  }
  return null;
}

function run(input) {
  const event = input.hook_event_name;
  if (event !== 'UserPromptSubmit' || input.agent_id) return;
  const root = resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
  let path;
  try {
    const name = selectedStyle(root);
    path = stylePath(name, root);
    if (!path && BUILT_IN.includes(name.toLowerCase())) return;
    if (!path) throw new Error('No readable file for the selected output style');
  } catch {
    context(event, 'Style handshake: the selected output style file could not be located or read. '
      + 'Briefly report that limitation, do not claim you read it, and continue with the request.');
    return;
  }
  context(event, 'Style handshake for this new user message: before working on the request, '
    + `read the whole file ${JSON.stringify(path)} with the Read tool. Read it silently, then follow it. `
    + 'Do not announce, mention, or acknowledge the read. Begin your reply with the answer.');
}

// Old confirm invocations do nothing and never wait for stdin.
if (process.argv.length === 2) {
  try { run(JSON.parse(readFileSync(0, 'utf8'))); }
  catch { /* A broken reminder must never trap the conversation. */ }
}
