/* ============================================================
   AI-Assisted Dev Loop — Node & Edge Data
   ============================================================ */

const DevLoopData = (() => {

  const steps = [
    { id: 'task',        name: 'Receive Task',      category: 'process',  description: 'User describes the task or selects from backlog.',                         order: 0 },
    { id: 'brainstorm',  name: 'Brainstorm',         category: 'process',  description: 'Superpowers brainstorming skill — explore intent, requirements, design.',   order: 1 },
    { id: 'plan',        name: 'Write Plan',         category: 'process',  description: 'Superpowers writing-plans skill — structured implementation plan.',         order: 2 },
    { id: 'execute',     name: 'Execute Plan',       category: 'process',  description: 'Superpowers executing-plans skill — dispatch parallel subagents.',          order: 3 },
    { id: 'build',       name: 'Build / Code',       category: 'process',  description: 'Write implementation code. TDD: tests first, then code.',                  order: 4 },
    { id: 'screenshot',  name: 'Screenshot',         category: 'process',  description: 'Capture UI with screenshot.mjs or Playwright MCP.',                        order: 5, subloop: true },
    { id: 'review',      name: 'Visual Review',      category: 'decision', description: 'Read the PNG — inspect spacing, alignment, colors, typography.',           order: 6, subloop: true },
    { id: 'iterate',     name: 'Fix & Iterate',      category: 'process',  description: 'Fix issues found in screenshot review. Repeat until passing.',             order: 7, subloop: true },
    { id: 'test',        name: 'Run Tests',          category: 'process',  description: 'Execute test suite. Systematic debugging if failures.',                    order: 8 },
    { id: 'verify',      name: 'Verify',             category: 'process',  description: 'Superpowers verification — evidence before assertions.',                   order: 9 },
    { id: 'commit',      name: 'Commit',             category: 'process',  description: 'Stage, commit with descriptive message. Never amend unless asked.',        order: 10 },
    { id: 'pr',          name: 'PR / Merge',         category: 'process',  description: 'Create PR via gh, request code review, finish branch.',                    order: 11 },
  ];

  const edges = [
    { source: 'task',       target: 'brainstorm' },
    { source: 'brainstorm', target: 'plan' },
    { source: 'plan',       target: 'execute' },
    { source: 'execute',    target: 'build' },
    { source: 'build',      target: 'screenshot' },
    { source: 'screenshot', target: 'review' },
    { source: 'review',     target: 'iterate',    label: 'Issues found' },
    { source: 'iterate',    target: 'screenshot', label: 'Re-check' },
    { source: 'review',     target: 'test',       label: 'Looks good' },
    { source: 'test',       target: 'verify' },
    { source: 'verify',     target: 'commit' },
    { source: 'commit',     target: 'pr' },
    { source: 'pr',         target: 'task',       label: 'Next task' },
  ];

  // Tools used at each step
  const toolMap = {
    'task':       ['Todoist MCP', 'Linear MCP', 'User request'],
    'brainstorm': ['Superpowers: Brainstorming'],
    'plan':       ['Superpowers: Writing Plans'],
    'execute':    ['Superpowers: Executing Plans', 'Subagent-Driven Dev', 'Git Worktrees'],
    'build':      ['Superpowers: TDD', 'Frontend Design', 'MCP tools', 'Document Skills'],
    'screenshot': ['screenshot.mjs', 'Playwright MCP'],
    'review':     ['Read PNG (multimodal)', 'Visual inspection'],
    'iterate':    ['Code edits', 'screenshot.mjs'],
    'test':       ['Superpowers: TDD', 'webapp-testing skill', 'Playwright'],
    'verify':     ['Superpowers: Verification Before Completion'],
    'commit':     ['Git', 'Superpowers: Finishing Dev Branch'],
    'pr':         ['gh CLI', 'Code Review Plugin', 'Superpowers: Code Review'],
  };

  return { steps, edges, toolMap };
})();
