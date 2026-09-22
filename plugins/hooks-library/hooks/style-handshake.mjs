#!/usr/bin/env node
/**
 * On each user message, ask the agent to read the selected output style file
 * silently before working. No acknowledgment is requested, and no other event
 * produces output. With no style selected, or no file for that style, the hook
 * says nothing. It reports only a found file it cannot read, or bad settings.
 */
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const userDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');

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
  return null;
}

function stylePath(name, root) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const dir of [join(root, '.claude', 'output-styles'), join(userDir, 'output-styles')]) {
    let names;
    try { names = readdirSync(dir).filter(file => file.endsWith('.md')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const file of names) {
      const path = join(dir, file);
      let text;
      try { text = readFileSync(path, 'utf8'); }
      catch (error) { if (file === `${slug}.md`) throw error; continue; }
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
    path = name && stylePath(name, root);
  } catch {
    context(event, 'Style check: the output style settings or the selected style file could not be read. '
      + 'Say so in one line, do not claim you read it, and go on with the request.');
    return;
  }
  if (path) context(event, 'Style check for this message: before you start, '
    + `read the whole file ${JSON.stringify(path)} with the Read tool. Read it silently and follow it. `
    + 'Do not mention the read. Start your reply with the answer.');
}

// Old confirm invocations do nothing and never wait for stdin.
if (process.argv.length === 2) {
  try { run(JSON.parse(readFileSync(0, 'utf8'))); }
  catch { /* A broken reminder must never trap the conversation. */ }
}
