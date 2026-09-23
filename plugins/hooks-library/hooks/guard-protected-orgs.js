#!/usr/bin/env node
/**
 * Salesforce production-org guard  (Claude Code PreToolUse hook)
 * ------------------------------------------------------------------
 * Fires before every Bash / PowerShell tool call. If the command runs a
 * guarded Salesforce CLI verb against an org that classifies as PRODUCTION, it
 * returns a "confirm before running" decision so the change cannot happen by
 * accident. A guarded verb is anything that changes an org: a deploy or deploy
 * validate, a data write, anonymous Apex, a metadata delete, or an org delete.
 *
 * Policy is data-driven from .claude/protected-orgs.json. The default policy
 * (set in Gate 2 of project-init):
 *   - protect: any production org (auto-detected via `sf org list`)
 *   - action: ask  (confirm; nothing is hard-blocked)
 *   - watch:  deploys, validates, data writes, anonymous Apex, deletes
 *   - sandboxAction: ask. The salesforce-safety-guardrails rule allows sandbox
 *             deploys, data writes and anonymous Apex only after the owner says
 *             yes, so the hook asks for them on a sandbox or scratch org too. A
 *             deploy validate on a sandbox needs no yes and passes silently.
 *
 * Set action to "deny" for a project whose written rule says an agent may never
 * deploy to production. The block message changes with the setting: on "deny" it
 * says BLOCKED and tells the agent not to rewrite the command, because a hard
 * block that ends with "confirm before running" reads as a prompt and invites a
 * retry.
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
    sandboxAction: 'ask', // "ask" | "allow" for a guarded verb on a sandbox or scratch org
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
const ORG_DELETE_VERBS = [
  /\b(?:sf|sfdx)\s+org\s+delete\s+(?:scratch|sandbox)\b/,
  /\b(?:sf|sfdx)\s+force:org:delete\b/,
];
const DEPLOY_VERBS = [
  /\b(?:sf|sfdx)\s+project\s+deploy\s+(?:start|quick|resume)\b/,
  /\b(?:sf|sfdx)\s+force:source:deploy\b/,
  /\b(?:sf|sfdx)\s+force:mdapi:deploy\b/,
];
// A validate is not a read: it uploads the package and runs the deploy's Apex
// tests in the target org. The safety rule forbids it in production. It has its
// own category because the same rule allows it on a sandbox with no yes.
const VALIDATE_VERBS = [
  /\b(?:sf|sfdx)\s+project\s+deploy\s+validate\b/,
];
// Every way the CLI can change records, not only the delete verbs. An earlier
// version guarded deletes alone, so `sf data create/update/upsert/import` went
// through untouched and only the written rule stopped them.
const DATA_WRITE_VERBS = [
  /\b(?:sf|sfdx)\s+data\s+delete\s+(?:record|bulk|resume)\b/,
  /\b(?:sf|sfdx)\s+data\s+create\s+(?:record|file)\b/,
  /\b(?:sf|sfdx)\s+data\s+update\s+record\b/,
  /\b(?:sf|sfdx)\s+data\s+upsert\s+(?:bulk|resume)\b/,
  /\b(?:sf|sfdx)\s+data\s+import\s+(?:tree|bulk|resume)\b/,
  /\b(?:sf|sfdx)\s+force:data:record:(?:create|update|delete)\b/,
  /\b(?:sf|sfdx)\s+force:data:bulk:(?:upsert|delete)\b/,
  /\b(?:sf|sfdx)\s+force:data:tree:import\b/,
];
const APEX_VERBS = [
  /\b(?:sf|sfdx)\s+apex\s+run\b/,
  /\b(?:sf|sfdx)\s+force:apex:execute\b/,
];
const METADATA_DELETE_VERBS = [
  /\b(?:sf|sfdx)\s+project\s+delete\s+source\b/,
  /\b(?:sf|sfdx)\s+force:source:delete\b/,
];

// Every guarded verb belongs to exactly one category. First match wins, and the
// category names itself in the message the owner reads.
const VERB_CATEGORIES = [
  { category: 'orgDelete', verbs: ORG_DELETE_VERBS },
  { category: 'deploy', verbs: DEPLOY_VERBS },
  { category: 'validate', verbs: VALIDATE_VERBS },
  { category: 'dataWrite', verbs: DATA_WRITE_VERBS },
  { category: 'apex', verbs: APEX_VERBS },
  { category: 'metadataDelete', verbs: METADATA_DELETE_VERBS },
];

// Categories the safety rule allows on a sandbox or scratch org without the
// owner's yes. Everything else asks there, unless sandboxAction is "allow".
const SANDBOX_SILENT = new Set(['validate']);

function matchedVerb(cmd) {
  for (const { category, verbs } of VERB_CATEGORIES) {
    for (const re of verbs) if (re.test(cmd)) return { kind: category, re };
  }
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
      timeout: 30000,
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
    // 30s, not 8s. `sf org list` has been measured at over 8 seconds on a
    // Windows machine with several orgs, so an 8s timeout expired on nearly
    // every call and every org fell through to "could not be classified". That
    // looks safe, because unknown is guarded, but it meant a sandbox could never
    // be told apart. Keep the hook's registered timeout above the two sf calls
    // together (see salesforce-prod-guard-hook.md): a PreToolUse command hook
    // that runs out of time lets the tool call continue.
    out = execSync('sf org list --json --skip-connection-status', {
      encoding: 'utf8',
      timeout: 30000,
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
    // The closing sentence has to match the decision. A "deny" that ends with
    // "Confirm before running" reads as a prompt the agent can click through,
    // so it invites a retry against the org the hook just refused.
    const tail =
      decision === 'deny'
        ? 'BLOCKED. Ask the owner to run it, and do not rewrite the command to get around this.'
        : 'Confirm before running.';
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
          `Guarded: '${verb.kind}' org-delete is irreversible${
            targets.length ? ` (target: ${targets.join(', ')})` : ''
          }. ${tail}`
        );
      }
    }

    // No resolvable target -> can't prove it's non-production.
    if (targets.length === 0) {
      return emit(
        cfg.unknownOrgAction === 'allow' ? 'allow' : decision,
        `Guarded: '${verb.kind}' command with no resolvable target org, ` +
          `so it cannot be proved non-production. ${tail}`
      );
    }

    const index = buildOrgIndex();
    const reasons = [];
    const sandboxReasons = [];
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
      } else if (cat === 'sandbox' || cat === 'scratch') {
        sandboxReasons.push(`'${t}' is a ${cat} org`);
      }
    }

    // Strictest target wins. A command naming a sandbox AND a production org
    // gets the production decision.
    if (protectHit) {
      return emit(
        decision,
        `Guarded '${verb.kind}' command${usedDefault ? ' (default org)' : ''}: ` +
          `${reasons.join('; ')}. ${tail}`
      );
    }

    // A sandbox deploy, data write, Apex run or delete is allowed by the safety
    // rule, but only after the owner says yes. Nothing else makes that happen,
    // so the hook turns it into a prompt instead of letting it through
    // silently. Set sandboxAction to "allow" to go back to silent.
    if (
      sandboxReasons.length > 0 &&
      cfg.sandboxAction !== 'allow' &&
      !SANDBOX_SILENT.has(verb.kind)
    ) {
      return emit(
        'ask',
        `Guarded '${verb.kind}' command against ${sandboxReasons.join('; ')}. ` +
          `Sandbox work is allowed, but only after the owner approves each ` +
          `change, so approve it here or cancel and ask them.`
      );
    }

    return emit('allow');
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
