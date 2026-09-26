// Loading, validating, and drawing workflow definitions.
import fs from 'node:fs';
import path from 'node:path';
import { PLUGIN_ROOT, refuse } from './core.mjs';

export const STEP_KINDS = ['auto', 'agent', 'owner', 'call', 'end'];
const WORKFLOW_DIR = path.join(PLUGIN_ROOT, 'workflows');
const cache = new Map();

export function listWorkflowIds() {
  return fs.readdirSync(WORKFLOW_DIR).filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5)).sort();
}

export function loadWorkflow(id) {
  if (cache.has(id)) return cache.get(id);
  const file = path.join(WORKFLOW_DIR, `${id}.json`);
  if (!/^[a-z][a-z-]*$/.test(id) || !fs.existsSync(file)) {
    refuse(`There is no workflow named "${id}". Workflows: ${listWorkflowIds().join(', ')}.`);
  }
  const def = JSON.parse(fs.readFileSync(file, 'utf8'));
  cache.set(id, def);
  return def;
}

export function stepTargets(step) {
  const targets = [];
  if (step.next) targets.push(step.next);
  if (step.branches) targets.push(...Object.values(step.branches));
  return targets;
}

// Returns a list of problems. An empty list means the definition is usable.
export function validateWorkflow(def, { checks = {}, actions = {}, workflowIds = listWorkflowIds() } = {}) {
  const problems = [];
  const steps = def.steps || {};
  const say = (msg) => problems.push(`${def.id}: ${msg}`);
  if (!def.id || !def.title) say('needs an id and a title.');
  if (!steps[def.start]) say(`start step "${def.start}" does not exist.`);
  for (const [name, step] of Object.entries(steps)) {
    if (!STEP_KINDS.includes(step.kind)) say(`step ${name} has unknown kind "${step.kind}".`);
    for (const target of stepTargets(step)) if (!steps[target]) say(`step ${name} points to missing step "${target}".`);
    if (step.kind !== 'end' && !stepTargets(step).length) say(`step ${name} has no next step.`);
    if (step.kind === 'end' && stepTargets(step).length) say(`end step ${name} must not have a next step.`);
    if (step.kind === 'agent' && !step.instructions) say(`agent step ${name} has no instructions.`);
    if (step.kind === 'agent' && step.instructions && step.instructions.split('\n').length > 4) say(`agent step ${name} has more than four lines of instructions.`);
    if (step.kind === 'auto' && !actions[step.action]) say(`auto step ${name} uses unknown action "${step.action}".`);
    if (step.kind === 'call' && !workflowIds.includes(step.workflow)) say(`call step ${name} names unknown workflow "${step.workflow}".`);
    for (const check of step.exit || []) if (!checks[check]) say(`step ${name} uses unknown exit check "${check}".`);
  }
  // Every step must be reachable from start, and an end must be reachable.
  const seen = new Set();
  const queue = [def.start];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name) || !steps[name]) continue;
    seen.add(name);
    queue.push(...stepTargets(steps[name]));
  }
  for (const name of Object.keys(steps)) if (!seen.has(name)) say(`step ${name} cannot be reached from the start.`);
  if (![...seen].some((n) => steps[n]?.kind === 'end')) say('no end step can be reached.');
  return problems;
}

function nodeId(name) {
  return `s_${name.replace(/[^A-Za-z0-9]/g, '_')}`;
}

export function diagram(id) {
  const def = loadWorkflow(id);
  const lines = ['flowchart TD', `  %% ${def.title}. Generated from workflows/${id}.json`];
  lines.push(`  begin((start)) --> ${nodeId(def.start)}`);
  for (const [name, step] of Object.entries(def.steps)) {
    const n = nodeId(name);
    if (step.kind === 'end') lines.push(`  ${n}((end))`);
    else if (step.kind === 'owner') lines.push(`  ${n}[/"${name}<br/>owner answers"/]`);
    else if (step.kind === 'auto') lines.push(`  ${n}["${name}<br/>auto: ${step.action}"]`);
    else if (step.kind === 'call') lines.push(`  ${n}[["${name}<br/>runs ${step.workflow}"]]`);
    else lines.push(`  ${n}("${name}<br/>agent")`);
  }
  for (const [name, step] of Object.entries(def.steps)) {
    if (step.branches) {
      for (const [label, target] of Object.entries(step.branches)) lines.push(`  ${nodeId(name)} -- ${label} --> ${nodeId(target)}`);
    }
    if (step.next) lines.push(`  ${nodeId(name)} --> ${nodeId(step.next)}`);
  }
  return `${lines.join('\n')}\n`;
}
