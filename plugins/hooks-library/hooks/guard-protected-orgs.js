#!/usr/bin/env node
/**
 * Salesforce production-org guard  (Claude Code PreToolUse hook)
 * ------------------------------------------------------------------
 * Fires before every Bash / PowerShell tool call. If the command runs a
 * guarded Salesforce CLI verb (deploy or a destructive op) against an org
 * that classifies as PRODUCTION, it returns a "confirm before running"
 * decision so the deploy/delete cannot happen by accident.
 *
 * Policy is data-driven from .claude/protected-orgs.json. The default policy
 * (set in Gate 2 of project-init):
 *   - protect: any production org (auto-detected via `sf org list`)
 *   - action: ask  (confirm; nothing is hard-blocked)
 *   - watch:  deploys + destructive commands
 *
 * Contract (verified against https://code.claude.com/docs/en/hooks.md):
 *   stdin  = JSON { tool_name, tool_input: { command }, ... }
 *   stdout = JSON { hookSpecificOutput: { hookEventName, permissionDecision,
 *                   permissionDecisionReason } }  with exit 0
 *   permissionDecision: "allow" | "ask" | "deny"
 *
 * Design notes:
 *   - Fast path: any command that does not invoke `sf`/`sfdx` a guarded verb
 *     exits 0 silently with NO subprocess and NO file read, so the hook adds
 *     ~nothing to normal Bash calls.
 *   - Org classification calls `sf org list --json --skip-connection-status`,
 *     which reads the LOCAL auth store (no network round-trip).
 *   - Fail-safe: if the guard hits an internal error on the heavy path, it
 *     asks rather than silently allowing. Errors before a guarded verb is
 *     confirmed allow through, so unrelated tools are never blocked.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ------------------------------------------------------------------ output
function emit(decision, reason) {
  if (decision === 'allow') {
    // Silent allow: emit nothing, let normal permission flow apply.
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

// ------------------------------------------------------------------ config
function loadConfig() {
  const defaults = {
    action: 'ask', // "ask" | "deny"
    unknownOrgAction: 'ask', // what to do when an org can't be classified
    confirmOrgDeleteAlways: true, // any `org delete` asks, prod or not
    alwaysProtect: [], // aliases/usernames always guarded
    neverProtect: [], // aliases/usernames never guarded (escape hatch)
  };
  try {
    const cfgPath = path.join(__dirname, '..', 'protected-orgs.json');
    const raw = fs.readFileSync(cfgPath, 'utf8');
    return Object.assign(defaults, JSON.parse(raw));
  } catch {
    return defaults; // no/invalid config -> safe defaults
  }
}

// ------------------------------------------------------------------ verb sets
// Contiguous verb phrases; flags/args follow. `sf` or `sfdx` accepted.
const DEPLOY_VERBS = [
  /\b(?:sf|sfdx)\s+project\s+deploy\s+(?:start|quick|resume)\b/,
  /\b(?:sf|sfdx)\s+force:source:deploy\b/,
  /\b(?:sf|sfdx)\s+force:mdapi:deploy\b/,
];
const ORG_DELETE_VERBS = [
  /\b(?:sf|sfdx)\s+org\s+delete\s+(?:scratch|sandbox)\b/,
  /\b(?:sf|sfdx)\s+force:org:delete\b/,
];
const DESTRUCTIVE_VERBS = [
  /\b(?:sf|sfdx)\s+project\s+delete\s+source\b/,
  /\b(?:sf|sfdx)\s+data\s+delete\s+(?:record|bulk|resume)\b/,
  /\b(?:sf|sfdx)\s+apex\s+run\b/,
  /\b(?:sf|sfdx)\s+force:source:delete\b/,
  /\b(?:sf|sfdx)\s+force:data:record:delete\b/,
  /\b(?:sf|sfdx)\s+force:data:bulk:delete\b/,
  /\b(?:sf|sfdx)\s+force:apex:execute\b/,
  ...ORG_DELETE_VERBS,
];

function matchedVerb(cmd) {
  for (const re of DEPLOY_VERBS) if (re.test(cmd)) return { kind: 'deploy', re };
  for (const re of DESTRUCTIVE_VERBS)
    if (re.test(cmd)) return { kind: 'destructive', re };
  return null;
}

function isOrgDelete(cmd) {
  return ORG_DELETE_VERBS.some((re) => re.test(cmd));
}

// ------------------------------------------------------------------ target org
// Pull every explicit -o / --target-org / -u / --targetusername value.
function explicitTargets(cmd) {
  const out = [];
  const re =
    /(?:--target-org|--targetusername|--targetusernamealias|-o|-u)(?:[=\s]+)("[^"]+"|'[^']+'|\S+)/g;
  let m;
  while ((m = re.exec(cmd)) !== null) {
    out.push(m[1].replace(/^["']|["']$/g, ''));
  }
  return out;
}

function defaultTarget() {
  // Env override first, then CLI config.
  const env =
    process.env.SF_TARGET_ORG ||
    process.env.SFDX_DEFAULTUSERNAME ||
    process.env.SF_TARGET_ORG_ALIAS;
  if (env) return env;
  try {
    const out = execSync('sf config get target-org --json', {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(out);
    const rows = parsed.result || [];
    for (const r of rows) if (r && r.value) return String(r.value);
  } catch {
    /* no default configured */
  }
  return null;
}

// ------------------------------------------------------------------ org index
// Build alias/username -> category from the local auth store.
function buildOrgIndex() {
  const index = new Map(); // key (lowercased alias or username) -> category
  let out;
  try {
    out = execSync('sf org list --json --skip-connection-status', {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return index; // empty -> everything classifies "unknown"
  }
  let result;
  try {
    result = JSON.parse(out).result || {};
  } catch {
    return index;
  }

  const add = (rec, groupName) => {
    if (!rec) return;
    const cat = categorize(rec, groupName);
    for (const key of [rec.alias, rec.username]) {
      if (key) index.set(String(key).toLowerCase(), cat);
    }
  };

  // sf org list groups orgs across versions; cover the known array names.
  for (const rec of result.scratchOrgs || []) add(rec, 'scratchOrgs');
  for (const rec of result.sandboxes || []) add(rec, 'sandboxes');
  for (const rec of result.nonScratchOrgs || []) add(rec, 'nonScratchOrgs');
  for (const rec of result.devHubs || []) add(rec, 'nonScratchOrgs');
  for (const rec of result.regularOrgs || []) add(rec, 'nonScratchOrgs');
  for (const rec of result.other || []) add(rec, 'other');

  return index;
}

function categorize(rec, groupName) {
  if (groupName === 'scratchOrgs' || rec.isScratch === true) return 'scratch';
  if (groupName === 'sandboxes' || rec.isSandbox === true) return 'sandbox';
  const url = String(rec.instanceUrl || rec.loginUrl || '').toLowerCase();
  if (url.includes('test.salesforce.com') || url.includes('.sandbox.'))
    return 'sandbox';
  return 'production';
}

function classify(target, index) {
  const hit = index.get(String(target).toLowerCase());
  return hit || 'unknown';
}

// ------------------------------------------------------------------ main
function main() {
  // --- read + parse stdin; on any failure, allow (never block unrelated tools)
  let payload;
  try {
    const raw = fs.readFileSync(0, 'utf8');
    payload = JSON.parse(raw);
  } catch {
    emit('allow');
  }

  const cmd = payload && payload.tool_input && payload.tool_input.command;
  if (!cmd || typeof cmd !== 'string') emit('allow');

  // Fast path: not a Salesforce CLI call at all.
  if (!/\b(?:sf|sfdx)\b/.test(cmd)) emit('allow');

  const verb = matchedVerb(cmd);
  if (!verb) emit('allow'); // sf command, but not a guarded verb (retrieve, list, ...)

  // --- from here we know it's a guarded verb; fail-safe = ask on error ---
  try {
    const cfg = loadConfig();
    const decision = cfg.action === 'deny' ? 'deny' : 'ask';
    const never = (cfg.neverProtect || []).map((s) => String(s).toLowerCase());
    const always = (cfg.alwaysProtect || []).map((s) => String(s).toLowerCase());

    let targets = explicitTargets(cmd);
    let usedDefault = false;
    if (targets.length === 0) {
      const def = defaultTarget();
      if (def) {
        targets = [def];
        usedDefault = true;
      }
    }

    // confirmOrgDeleteAlways: any org delete asks, regardless of org type,
    // unless the target is explicitly on neverProtect.
    if (cfg.confirmOrgDeleteAlways && isOrgDelete(cmd)) {
      const allNeverProtected =
        targets.length > 0 &&
        targets.every((t) => never.includes(String(t).toLowerCase()));
      if (!allNeverProtected) {
        return emit(
          decision,
          `Guarded: '${verb.kind}' org-delete is irreversible. ` +
            `Confirm before running${
              targets.length ? ` (target: ${targets.join(', ')})` : ''
            }.`
        );
      }
    }

    // No resolvable target -> can't prove it's non-production.
    if (targets.length === 0) {
      return emit(
        cfg.unknownOrgAction === 'allow' ? 'allow' : decision,
        `Guarded: '${verb.kind}' command with no resolvable target org. ` +
          `Confirm this is not a production org.`
      );
    }

    const index = buildOrgIndex();
    const reasons = [];
    let protectHit = false;

    for (const t of targets) {
      const key = String(t).toLowerCase();
      if (never.includes(key)) continue; // escape hatch
      if (always.includes(key)) {
        protectHit = true;
        reasons.push(`'${t}' is on alwaysProtect`);
        continue;
      }
      const cat = classify(t, index);
      if (cat === 'production') {
        protectHit = true;
        reasons.push(`'${t}' is a PRODUCTION org`);
      } else if (cat === 'unknown' && cfg.unknownOrgAction !== 'allow') {
        protectHit = true;
        reasons.push(`'${t}' could not be classified (treated as protected)`);
      }
    }

    if (!protectHit) emit('allow');

    return emit(
      decision,
      `Guarded '${verb.kind}' command${usedDefault ? ' (default org)' : ''}: ` +
        `${reasons.join('; ')}. Confirm before running.`
    );
  } catch (err) {
    // Heavy-path failure on a known guarded verb -> fail safe: ask.
    return emit(
      'ask',
      `Guard error while checking a '${verb.kind}' command (${
        err && err.message ? err.message : 'unknown'
      }). Confirm manually.`
    );
  }
}

main();
