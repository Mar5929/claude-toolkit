#!/usr/bin/env node
/**
 * Permission set deploy guard (PreToolUse).
 *
 * A Salesforce permission set deploy REPLACES the whole component: any grant
 * missing from the local file is switched off in the org. Neither
 * "sf project deploy validate" nor "sf project deploy preview" can warn about
 * this, because both work at whole-component level. A file missing hundreds of
 * grants passes both and then deletes them.
 *
 * The only real check is a grant-level comparison against the target org, which
 * is what tools/permissions/permsets.py preflight does. This hook makes that
 * step impossible to skip: it blocks any deploy command that names a permission
 * set unless a clean preflight for that permission set ran recently.
 *
 * The preflight writes a receipt to .claude/.permset-preflight/<Name>.json on a
 * clean or explicitly accepted run. This hook looks for that receipt.
 *
 * Contract:
 *   stdin  = JSON { tool_name, tool_input: { command }, ... }
 *   stdout = JSON { hookSpecificOutput: { hookEventName, permissionDecision,
 *                   permissionDecisionReason } }  with exit 0
 *   permissionDecision: "allow" | "ask" | "deny"
 *
 * Fails open on its own errors: a broken guard must never block unrelated work.
 * It is a backstop for the rule, not a replacement for reading it.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// A receipt older than this is treated as stale. The org drifts, and a
// preflight against yesterday's org state proves nothing about today's.
const RECEIPT_MAX_AGE_MINUTES = 30;

const RECEIPT_DIR = path.join('.claude', '.permset-preflight');

function respond(decision, reason) {
  if (decision === 'allow') {
    process.exit(0);
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision, // "ask" | "deny"
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

/** True when the command is a Salesforce metadata deploy that could ship files. */
function isDeployCommand(cmd) {
  return (
    /\bsf\s+project\s+deploy\s+(start|quick|resume)\b/.test(cmd) ||
    /\bsf\s+deploy\s+metadata\b/.test(cmd) ||
    /\bsfdx\s+force:(source|mdapi):deploy\b/.test(cmd) ||
    /\bsfdx\s+force:source:push\b/.test(cmd)
  );
}

/**
 * Permission set API names the command would deploy.
 *
 * Three shapes reach a permission set:
 *   -m PermissionSet:Name        an explicit metadata list
 *   -d path/to/Name.permissionset-meta.xml
 *   -d <a directory>             which may contain permission sets
 *   -x manifest.xml              a manifest naming PermissionSet members
 */
function permissionSetsInCommand(cmd) {
  const names = new Set();

  // -m / --metadata PermissionSet:Name
  const metaRe = /(?:-m|--metadata)[= ]\s*["']?PermissionSet:([A-Za-z0-9_]+)/g;
  let m;
  while ((m = metaRe.exec(cmd)) !== null) names.add(m[1]);

  // A bare PermissionSet with no colon deploys every permission set in the
  // package directories. Treat that as unknown-and-broad.
  if (/(?:-m|--metadata)[= ]\s*["']?PermissionSet["']?(\s|$)/.test(cmd)) {
    names.add('*');
  }

  // -d / --source-dir pointing at a file or a folder
  const dirRe = /(?:-d|--source-dir)[= ]\s*["']?([^"'\s]+)/g;
  while ((m = dirRe.exec(cmd)) !== null) {
    const target = m[1];
    if (/\.permissionset(-meta\.xml)?$/.test(target)) {
      names.add(path.basename(target).split('.')[0]);
    } else if (safeIsDirectory(target) && directoryHasPermissionSets(target)) {
      names.add('*');
    }
  }

  // -x / --manifest naming PermissionSet members
  const manRe = /(?:-x|--manifest)[= ]\s*["']?([^"'\s]+)/g;
  while ((m = manRe.exec(cmd)) !== null) {
    for (const name of permissionSetsInManifest(m[1])) names.add(name);
  }

  return [...names];
}

function safeIsDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function directoryHasPermissionSets(dir) {
  try {
    const stack = [dir];
    let visited = 0;
    while (stack.length && visited < 2000) {
      const current = stack.pop();
      visited += 1;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (/\.permissionset(-meta\.xml)?$/.test(entry.name)) {
          return true;
        }
      }
    }
  } catch {
    // Unreadable path: do not claim it holds permission sets.
  }
  return false;
}

function permissionSetsInManifest(manifestPath) {
  const found = [];
  let xml;
  try {
    xml = fs.readFileSync(manifestPath, 'utf8');
  } catch {
    return found;
  }
  // Find each <types> block whose <name> is PermissionSet, then read its members.
  const typesRe = /<types>([\s\S]*?)<\/types>/g;
  let block;
  while ((block = typesRe.exec(xml)) !== null) {
    const body = block[1];
    if (!/<name>\s*PermissionSet\s*<\/name>/.test(body)) continue;
    const memberRe = /<members>\s*([^<]+?)\s*<\/members>/g;
    let member;
    while ((member = memberRe.exec(body)) !== null) {
      found.push(member[1].trim());
    }
  }
  return found;
}

/** Names with no fresh, clean preflight receipt. */
function namesMissingReceipt(names) {
  const cutoff = Date.now() - RECEIPT_MAX_AGE_MINUTES * 60 * 1000;
  const missing = [];

  for (const name of names) {
    if (name === '*') {
      missing.push('* (the command deploys every permission set it can reach)');
      continue;
    }
    const receipt = path.join(RECEIPT_DIR, `${name}.json`);
    try {
      const parsed = JSON.parse(fs.readFileSync(receipt, 'utf8'));
      const when = Date.parse(parsed.checkedAt);
      if (!parsed.clean) missing.push(`${name} (last preflight found losses that were not accepted)`);
      else if (!Number.isFinite(when) || when < cutoff) missing.push(`${name} (preflight is stale)`);
    } catch {
      missing.push(`${name} (no preflight on record)`);
    }
  }
  return missing;
}

function main() {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    respond('allow');
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    respond('allow');
  }

  const cmd = payload && payload.tool_input && payload.tool_input.command;
  if (typeof cmd !== 'string' || !cmd) respond('allow');
  if (!isDeployCommand(cmd)) respond('allow');

  const names = permissionSetsInCommand(cmd);
  if (names.length === 0) respond('allow');

  const missing = namesMissingReceipt(names);
  if (missing.length === 0) respond('allow');

  respond(
    'deny',
    [
      'Blocked: this deploy ships a permission set with no fresh preflight.',
      '',
      'A permission set deploy REPLACES the whole component, so every grant',
      'missing from the local file is switched off in the org. "deploy validate"',
      'and "deploy preview" cannot see this: both work at whole-component level.',
      '',
      `Not cleared: ${missing.join('; ')}`,
      '',
      'Run this for each permission set, read what it says it would remove, then',
      'deploy again:',
      '',
      '  python tools/permissions/permsets.py preflight <file> --org <sandbox>',
      '',
      'If the removals are intended, re-run it with --accept-removals to record',
      'that decision. Do not edit or disable this hook to get past it.',
    ].join('\n')
  );
}

main();
