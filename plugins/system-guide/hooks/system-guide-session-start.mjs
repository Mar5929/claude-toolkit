import { pathToFileURL } from 'node:url';

import { inspectGuide } from '../tools/system-guide.mjs';

function coverageLabel(coverage) {
  if (!Array.isArray(coverage) || coverage.length === 0) return 'unavailable';
  if (coverage.some((source) => source?.completeness === 'partial')) return 'incomplete';
  if (coverage.every((source) => source?.completeness === 'complete')) return 'complete';
  return 'unavailable';
}

function attentionLabel(problems) {
  if (!Array.isArray(problems)) return '';
  const labels = [];
  if (problems.some((problem) => /stale/i.test(`${problem?.code ?? ''} ${problem?.message ?? ''}`))) {
    labels.push('stale evidence');
  }
  if (problems.some((problem) => /missing/i.test(`${problem?.code ?? ''} ${problem?.message ?? ''}`))) {
    labels.push('missing guide parts');
  }
  if (problems.length && labels.length === 0) labels.push('repair required');
  return labels.length ? `; attention: ${labels.join(', ')}` : '';
}

export function buildGuideBriefing(report) {
  if (!report || report.state === 'off') return '';

  const state = report.state === 'needs-repair' ? 'needs repair' : 'on';
  const guidePath = typeof report.guidePath === 'string' && report.guidePath.trim()
    ? report.guidePath.replaceAll('\\', '/').replace(/\/$/, '')
    : null;
  const entry = guidePath ? `${guidePath}/README.md` : 'unavailable';
  const coverage = coverageLabel(report.coverage);
  const refresh = report.lastRefresh || 'unavailable';
  const attention = attentionLabel(report.problems);

  return `System Guide: ${state}; entry: ${entry}; capture scope: ${coverage}; last refresh: ${refresh}${attention}.`;
}

export async function runSessionStart({ input = process.stdin, output = process.stdout } = {}) {
  try {
    let raw = '';
    for await (const chunk of input) raw += chunk;
    const event = raw.trim() ? JSON.parse(raw) : {};
    const root = typeof event.cwd === 'string' && event.cwd ? event.cwd : process.cwd();
    const briefing = buildGuideBriefing(await inspectGuide(root));
    if (briefing) output.write(`${briefing}\n`);
  } catch {
    // Startup guidance must never prevent a session from opening.
  }
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) await runSessionStart();
