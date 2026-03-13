/* ============================================================
   System Architecture — Node & Edge Data
   Source of truth: my-toolstack.md
   ============================================================ */

const ArchitectureData = (() => {

  const nodes = [
    // ── Hub ──
    { id: 'claude-code', name: 'Claude Code', category: 'hub', description: 'Primary orchestrator — routes actions to all tools, MCP servers, plugins, and services from the terminal.' },

    // ── MCP Servers ──
    { id: 'mcp-gcal', name: 'Google Calendar', category: 'mcp', description: 'Personal and work scheduling. Calendar: "Events", account: michael@rihm.com, timezone: America/New_York.' },
    { id: 'mcp-gmail', name: 'Gmail', category: 'mcp', description: 'Primary email via Composio OAuth integration.' },
    { id: 'mcp-notion', name: 'Notion', category: 'mcp', description: 'Notes, second brain, knowledge base. Connected via Notion MCP.' },
    { id: 'mcp-linear', name: 'Linear', category: 'mcp', description: 'Issue tracking and project management.' },
    { id: 'mcp-context7', name: 'Context7', category: 'mcp', description: 'Up-to-date library documentation lookup.' },
    { id: 'mcp-todoist', name: 'Todoist', category: 'mcp', description: 'Primary task manager. Claude project ID: 6g7gpCcqMc2gCXf2. Batch updates in groups of 10.' },
    { id: 'mcp-drawio', name: 'Draw.io', category: 'mcp', description: 'Diagramming — flowcharts, architecture, system design. Exports to PNG/SVG/PDF.' },
    { id: 'mcp-excalidraw', name: 'Excalidraw', category: 'mcp', description: 'Quick whiteboard-style architecture diagrams, sequence diagrams, data flow.' },
    { id: 'mcp-obsidian', name: 'Obsidian', category: 'mcp', description: 'Obsidian vault integration for notes and knowledge management.' },
    { id: 'mcp-playwright', name: 'Playwright', category: 'mcp', description: 'Browser automation and screenshot loop for UI verification.' },
    { id: 'mcp-composio', name: 'Composio', category: 'mcp', description: 'OAuth-based MCP platform for additional integrations (Gmail, Outlook).' },

    // ── Plugins ──
    { id: 'plug-playwright', name: 'Playwright Plugin', category: 'plugin', description: 'Browser automation and testing plugin.' },
    { id: 'plug-code-review', name: 'Code Review', category: 'plugin', description: 'Pull request code review plugin.' },
    { id: 'plug-superpowers', name: 'Superpowers', category: 'plugin', description: 'Enhanced workflow skills — brainstorming, TDD, debugging, planning, git worktrees, verification.' },
    { id: 'plug-frontend', name: 'Frontend Design', category: 'plugin', description: 'Production-grade frontend interface design.' },
    { id: 'plug-context7', name: 'Context7 Plugin', category: 'plugin', description: 'Library documentation lookup plugin.' },
    { id: 'plug-setup', name: 'Claude Code Setup', category: 'plugin', description: 'Codebase automation recommendations.' },
    { id: 'plug-skill-creator', name: 'Skill Creator', category: 'plugin', description: 'Skill authoring and evaluation plugin.' },
    { id: 'plug-doc-skills', name: 'Document Skills', category: 'plugin', description: '~17 sub-skills: docx, xlsx, pptx, pdf, canvas-design, brand-guidelines, and more.' },

    // ── Global Skills ──
    { id: 'skill-project-init', name: 'Project Init', category: 'global-skill', description: 'Initializes new projects with structured interview, repo scaffolding, config files, and boilerplate docs.' },
    { id: 'skill-excalidraw', name: 'Excalidraw Skill', category: 'global-skill', description: 'Architecture diagrams, sequence diagrams, data flow via Excalidraw MCP.' },
    { id: 'skill-frontend', name: 'Frontend Design Skill', category: 'global-skill', description: 'Generating polished frontend UI with 21st.dev components and UI/UX Pro Max.' },
    { id: 'skill-html-diagrams', name: 'HTML Diagrams', category: 'global-skill', description: 'Interactive D3.js diagrams with dark-theme design system — force graphs, swimlane flowcharts, circular rings.' },
    { id: 'skill-sf-architect', name: 'SF Architect Solutioning', category: 'global-skill', description: 'Salesforce solution architecture — solution plans, architectural patterns, integration strategies.' },

    // ── Project Skills ──
    { id: 'pskill-docx', name: 'docx/', category: 'project-skill', description: 'Create, edit, validate .docx files — OOXML schemas, tracked changes, comments.' },
    { id: 'pskill-xlsx', name: 'xlsx/', category: 'project-skill', description: 'Create, edit, analyze .xlsx/.xlsm/.csv — Pandas + openpyxl with financial model standards.' },
    { id: 'pskill-mcp-builder', name: 'mcp-builder/', category: 'project-skill', description: 'Four-phase workflow for building MCP servers (research, implement, review, eval).' },
    { id: 'pskill-skill-creator', name: 'skill-creator/', category: 'project-skill', description: 'Full lifecycle skill authoring: design, SKILL.md generation, eval, description optimization.' },
    { id: 'pskill-webapp-test', name: 'webapp-testing/', category: 'project-skill', description: 'Playwright-based web app testing with server lifecycle and screenshot verification.' },

    // ── Custom Agents ──
    { id: 'agent-pptx', name: 'PowerPoint Generator', category: 'agent', description: 'Creates professional PPTX presentations using python-pptx — clarification, outline, generation, iteration.' },
    { id: 'agent-prompt', name: 'Prompt Engineer', category: 'agent', description: 'Designs, critiques, refactors, and stress-tests LLM prompts across models.' },

    // ── Commands ──
    { id: 'cmd-drawio', name: '/drawio', category: 'command', description: 'Generate draw.io diagrams as .drawio files with optional PNG/SVG/PDF export.' },

    // ── Templates ──
    { id: 'tpl-backlog', name: 'BACKLOG.md', category: 'template', description: 'Phase-organized work items with priority, status, and requirement links.' },
    { id: 'tpl-changelog', name: 'CHANGELOG.md', category: 'template', description: 'Keep a Changelog format (Added/Changed/Fixed/Removed/Deprecated/Security).' },
    { id: 'tpl-claude', name: 'CLAUDE.md', category: 'template', description: 'Claude Code persistent memory — 13-section project context file.' },
    { id: 'tpl-atlas', name: 'CODE_ATLAS.md', category: 'template', description: 'Codebase reference — architecture, services, routes, patterns.' },
    { id: 'tpl-datamodel', name: 'DATA_MODEL.md', category: 'template', description: 'Database schema with DDL, ERD, and naming conventions.' },
    { id: 'tpl-decisions', name: 'DECISIONS.md', category: 'template', description: 'Architecture Decision Records with options, trade-offs, consequences.' },
    { id: 'tpl-getstarted', name: 'GETTING_STARTED.md', category: 'template', description: 'AI agent bootstrap prompt — which files to read first.' },
    { id: 'tpl-migration', name: 'MIGRATION_REF.md', category: 'template', description: 'Old-to-new system mapping (modules, APIs, data models, patterns).' },
    { id: 'tpl-readme', name: 'README.md', category: 'template', description: 'Standard project README with directory tree and quick start.' },
    { id: 'tpl-reqs', name: 'REQUIREMENTS.md', category: 'template', description: 'Functional requirements with acceptance criteria and NFRs.' },
    { id: 'tpl-techspec', name: 'TECHNICAL_SPEC.md', category: 'template', description: '10-section technical specification.' },

    // ── External Services ──
    { id: 'ext-github', name: 'GitHub', category: 'external', description: 'Version control, app deployment, CI/CD via GitHub Actions.' },
    { id: 'ext-vscode', name: 'VS Code', category: 'external', description: 'Primary development IDE.' },
    { id: 'ext-claude-ai', name: 'Claude.ai', category: 'external', description: 'Conversational AI, research, writing, planning. Pro plan.' },
    { id: 'ext-gws', name: 'Google Workspace CLI', category: 'external', description: 'Unified CLI for Docs, Sheets, Drive, Gmail, Calendar, Chat. 100+ agent skills.' },
    { id: 'ext-pinecone', name: 'Pinecone', category: 'external', description: 'Vector database for semantic search, RAG, and knowledge retrieval.' },
    { id: 'ext-gemini-embed', name: 'Gemini Embedding', category: 'external', description: 'Multimodal embedding model for vector embeddings (text, images).' },
    { id: 'ext-21st', name: '21st.dev', category: 'external', description: 'UI/UX design components and inspiration.' },
    { id: 'ext-pencil', name: 'Pencil', category: 'external', description: 'UI/UX design and prototyping — Figma replacement powered by Claude.' },
  ];

  const edges = [
    // Hub → MCP
    { source: 'claude-code', target: 'mcp-gcal' },
    { source: 'claude-code', target: 'mcp-gmail' },
    { source: 'claude-code', target: 'mcp-notion' },
    { source: 'claude-code', target: 'mcp-linear' },
    { source: 'claude-code', target: 'mcp-context7' },
    { source: 'claude-code', target: 'mcp-todoist' },
    { source: 'claude-code', target: 'mcp-drawio' },
    { source: 'claude-code', target: 'mcp-excalidraw' },
    { source: 'claude-code', target: 'mcp-obsidian' },
    { source: 'claude-code', target: 'mcp-playwright' },
    { source: 'claude-code', target: 'mcp-composio' },

    // Hub → Plugins
    { source: 'claude-code', target: 'plug-playwright' },
    { source: 'claude-code', target: 'plug-code-review' },
    { source: 'claude-code', target: 'plug-superpowers' },
    { source: 'claude-code', target: 'plug-frontend' },
    { source: 'claude-code', target: 'plug-context7' },
    { source: 'claude-code', target: 'plug-setup' },
    { source: 'claude-code', target: 'plug-skill-creator' },
    { source: 'claude-code', target: 'plug-doc-skills' },

    // Hub → Skills
    { source: 'claude-code', target: 'skill-project-init' },
    { source: 'claude-code', target: 'skill-excalidraw' },
    { source: 'claude-code', target: 'skill-frontend' },
    { source: 'claude-code', target: 'skill-html-diagrams' },
    { source: 'claude-code', target: 'skill-sf-architect' },

    // Hub → Project Skills
    { source: 'claude-code', target: 'pskill-docx' },
    { source: 'claude-code', target: 'pskill-xlsx' },
    { source: 'claude-code', target: 'pskill-mcp-builder' },
    { source: 'claude-code', target: 'pskill-skill-creator' },
    { source: 'claude-code', target: 'pskill-webapp-test' },

    // Hub → Agents
    { source: 'claude-code', target: 'agent-pptx' },
    { source: 'claude-code', target: 'agent-prompt' },

    // Hub → Commands
    { source: 'claude-code', target: 'cmd-drawio' },

    // Hub → Templates (via Project Init)
    { source: 'skill-project-init', target: 'tpl-backlog' },
    { source: 'skill-project-init', target: 'tpl-changelog' },
    { source: 'skill-project-init', target: 'tpl-claude' },
    { source: 'skill-project-init', target: 'tpl-atlas' },
    { source: 'skill-project-init', target: 'tpl-datamodel' },
    { source: 'skill-project-init', target: 'tpl-decisions' },
    { source: 'skill-project-init', target: 'tpl-getstarted' },
    { source: 'skill-project-init', target: 'tpl-migration' },
    { source: 'skill-project-init', target: 'tpl-readme' },
    { source: 'skill-project-init', target: 'tpl-reqs' },
    { source: 'skill-project-init', target: 'tpl-techspec' },

    // Hub → External
    { source: 'claude-code', target: 'ext-github' },
    { source: 'claude-code', target: 'ext-vscode' },
    { source: 'claude-code', target: 'ext-gws' },
    { source: 'claude-code', target: 'ext-pinecone' },
    { source: 'claude-code', target: 'ext-gemini-embed' },

    // Cross-connections
    { source: 'mcp-composio', target: 'mcp-gmail' },
    { source: 'mcp-playwright', target: 'plug-playwright' },
    { source: 'mcp-drawio', target: 'cmd-drawio' },
    { source: 'skill-excalidraw', target: 'mcp-excalidraw' },
    { source: 'skill-frontend', target: 'ext-21st' },
    { source: 'ext-pinecone', target: 'ext-gemini-embed' },
    { source: 'ext-claude-ai', target: 'mcp-gcal' },
    { source: 'ext-claude-ai', target: 'mcp-gmail' },
    { source: 'ext-claude-ai', target: 'mcp-notion' },
    { source: 'ext-claude-ai', target: 'mcp-linear' },
    { source: 'ext-claude-ai', target: 'mcp-context7' },
    { source: 'pskill-webapp-test', target: 'mcp-playwright' },
    { source: 'plug-frontend', target: 'ext-21st' },
    { source: 'plug-frontend', target: 'ext-pencil' },
  ];

  const categories = [
    { key: 'hub',           label: 'Claude Code',      layer: 2 },
    { key: 'mcp',           label: 'MCP Servers',      layer: 1 },
    { key: 'plugin',        label: 'Plugins',          layer: 3 },
    { key: 'global-skill',  label: 'Global Skills',    layer: 4 },
    { key: 'project-skill', label: 'Project Skills',   layer: 4 },
    { key: 'agent',         label: 'Custom Agents',    layer: 4 },
    { key: 'command',       label: 'Commands',         layer: 4 },
    { key: 'template',      label: 'Templates',        layer: 5 },
    { key: 'external',      label: 'External Services', layer: 0 },
  ];

  return { nodes, edges, categories };
})();
