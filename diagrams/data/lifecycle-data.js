/* ============================================================
   Project Lifecycle — Node & Edge Data
   ============================================================ */

const LifecycleData = (() => {

  const phases = [
    { id: 'phase-init',    label: 'Initialize',  color: '#7C3AED' },
    { id: 'phase-scaffold',label: 'Scaffold',    color: '#2563EB' },
    { id: 'phase-develop', label: 'Develop',     color: '#0D9488' },
    { id: 'phase-test',    label: 'Test & QA',   color: '#D97706' },
    { id: 'phase-deploy',  label: 'Deploy',      color: '#059669' },
  ];

  const nodes = [
    // Init phase
    { id: 'user-request',    name: 'User Request',          phase: 'phase-init',     category: 'process',  description: 'User describes what they want to build.',              x: 0,   shape: 'rect' },
    { id: 'brainstorm',      name: 'Brainstorming',         phase: 'phase-init',     category: 'process',  description: 'Superpowers brainstorming skill explores intent, requirements, and design.',  x: 1,   shape: 'rect' },
    { id: 'project-init',    name: 'Project Init Skill',    phase: 'phase-init',     category: 'process',  description: 'Structured interview: tech stack, features, constraints, hosting.',            x: 2,   shape: 'rect' },
    { id: 'has-salesforce',  name: 'Salesforce?',           phase: 'phase-init',     category: 'decision', description: 'Decision: Is this a Salesforce implementation?',        x: 3,   shape: 'diamond' },

    // Scaffold phase
    { id: 'repo-create',     name: 'Create Repo',           phase: 'phase-scaffold', category: 'process',  description: 'git init, .gitignore, initial commit.',                x: 4,   shape: 'rect' },
    { id: 'install-toolkit', name: 'Install Toolkit',       phase: 'phase-scaffold', category: 'process',  description: 'Clone claude-toolkit, run install.sh to set up config, skills, agents.',       x: 5,   shape: 'rect' },
    { id: 'gen-docs',        name: 'Generate Docs',         phase: 'phase-scaffold', category: 'process',  description: 'Copy 11 templates into docs/ — CLAUDE.md, REQUIREMENTS.md, BACKLOG.md, etc.', x: 6,   shape: 'rect' },
    { id: 'has-ui',          name: 'Has UI?',               phase: 'phase-scaffold', category: 'decision', description: 'Decision: Does this project have a frontend/UI?',       x: 7,   shape: 'diamond' },
    { id: 'setup-screenshot',name: 'Setup Screenshots',     phase: 'phase-scaffold', category: 'process',  description: 'Copy screenshot.mjs + SCREENSHOT_WORKFLOW.md into project root.',             x: 8,   shape: 'rect' },

    // Develop phase
    { id: 'write-plan',      name: 'Write Plan',            phase: 'phase-develop',  category: 'process',  description: 'Superpowers writing-plans skill creates implementation plan.',                x: 9,   shape: 'rect' },
    { id: 'execute-plan',    name: 'Execute Plan',          phase: 'phase-develop',  category: 'process',  description: 'Superpowers executing-plans skill with parallel subagents.',                  x: 10,  shape: 'rect' },
    { id: 'build-loop',      name: 'Build → Screenshot\n→ Review Loop', phase: 'phase-develop', category: 'process', description: 'Iterative: build UI, screenshot, review PNG, fix, repeat.', x: 11, shape: 'rect' },
    { id: 'use-mcp',         name: 'Use MCP Tools',         phase: 'phase-develop',  category: 'process',  description: 'Todoist for tasks, Linear for issues, Draw.io/Excalidraw for diagrams.',      x: 12,  shape: 'rect' },

    // Test phase
    { id: 'tdd',             name: 'TDD Cycle',             phase: 'phase-test',     category: 'process',  description: 'Superpowers TDD skill: write tests first, then implement.',                   x: 13,  shape: 'rect' },
    { id: 'webapp-test',     name: 'Webapp Testing',        phase: 'phase-test',     category: 'process',  description: 'Playwright-based web app testing with screenshot verification.',              x: 14,  shape: 'rect' },
    { id: 'debug',           name: 'Systematic Debug',      phase: 'phase-test',     category: 'process',  description: 'Superpowers systematic-debugging skill for any failures.',                    x: 15,  shape: 'rect' },
    { id: 'tests-pass',      name: 'Tests Pass?',           phase: 'phase-test',     category: 'decision', description: 'Decision: Do all tests pass?',                          x: 16,  shape: 'diamond' },

    // Deploy phase
    { id: 'verification',    name: 'Final Verification',    phase: 'phase-deploy',   category: 'process',  description: 'Superpowers verification-before-completion skill — evidence before assertions.', x: 17, shape: 'rect' },
    { id: 'code-review',     name: 'Code Review',           phase: 'phase-deploy',   category: 'process',  description: 'Plugin code-review or superpowers requesting-code-review.',                   x: 18,  shape: 'rect' },
    { id: 'finish-branch',   name: 'Finish Branch',         phase: 'phase-deploy',   category: 'process',  description: 'Superpowers finishing-a-development-branch: merge, PR, or cleanup.',          x: 19,  shape: 'rect' },
    { id: 'deploy',          name: 'Deploy',                phase: 'phase-deploy',   category: 'process',  description: 'Push to GitHub, CI/CD via GitHub Actions.',              x: 20,  shape: 'rect' },
  ];

  const edges = [
    { source: 'user-request',     target: 'brainstorm' },
    { source: 'brainstorm',       target: 'project-init' },
    { source: 'project-init',     target: 'has-salesforce' },
    { source: 'has-salesforce',   target: 'repo-create',       label: 'Yes / No' },
    { source: 'repo-create',      target: 'install-toolkit' },
    { source: 'install-toolkit',  target: 'gen-docs' },
    { source: 'gen-docs',         target: 'has-ui' },
    { source: 'has-ui',           target: 'setup-screenshot',  label: 'Yes' },
    { source: 'has-ui',           target: 'write-plan',        label: 'No' },
    { source: 'setup-screenshot', target: 'write-plan' },
    { source: 'write-plan',       target: 'execute-plan' },
    { source: 'execute-plan',     target: 'build-loop' },
    { source: 'build-loop',       target: 'use-mcp' },
    { source: 'use-mcp',          target: 'tdd' },
    { source: 'tdd',              target: 'webapp-test' },
    { source: 'webapp-test',      target: 'debug' },
    { source: 'debug',            target: 'tests-pass' },
    { source: 'tests-pass',       target: 'verification',     label: 'Yes' },
    { source: 'tests-pass',       target: 'tdd',              label: 'No' },
    { source: 'verification',     target: 'code-review' },
    { source: 'code-review',      target: 'finish-branch' },
    { source: 'finish-branch',    target: 'deploy' },
  ];

  // Tools active at each step
  const toolMap = {
    'brainstorm':       ['Superpowers: Brainstorming'],
    'project-init':     ['Project Init Skill', 'Salesforce reference docs'],
    'install-toolkit':  ['install.sh', 'claude-toolkit repo'],
    'gen-docs':         ['11 doc templates', 'Project Init Skill'],
    'setup-screenshot': ['screenshot.mjs', 'SCREENSHOT_WORKFLOW.md'],
    'write-plan':       ['Superpowers: Writing Plans'],
    'execute-plan':     ['Superpowers: Executing Plans', 'Parallel subagents'],
    'build-loop':       ['Playwright MCP', 'screenshot.mjs', 'Frontend Design'],
    'use-mcp':          ['Todoist MCP', 'Linear MCP', 'Draw.io MCP', 'Excalidraw MCP'],
    'tdd':              ['Superpowers: TDD'],
    'webapp-test':      ['webapp-testing skill', 'Playwright MCP'],
    'debug':            ['Superpowers: Systematic Debugging'],
    'verification':     ['Superpowers: Verification Before Completion'],
    'code-review':      ['Code Review Plugin', 'Superpowers: Requesting Code Review'],
    'finish-branch':    ['Superpowers: Finishing Dev Branch', 'Git worktrees'],
    'deploy':           ['GitHub Actions', 'gh CLI'],
  };

  return { phases, nodes, edges, toolMap };
})();
