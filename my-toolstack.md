# My Toolstack — Master Reference

> **Last updated:** March 2026
> **Purpose:** Single source of truth for every tool, platform, and integration I use across personal productivity, development, AI/creative work, and professional projects.

## Table of Contents

- [Task Management](#task-management)
- [Notes & Knowledge Management](#notes--knowledge-management)
- [AI Assistants & Interfaces](#ai-assistants--interfaces)
- [Development & Deployment](#development--deployment)
- [Calendar & Email](#calendar--email)
- [Google Workspace](#google-workspace)
- [Project Management](#project-management)
- [AI & Creative Tools](#ai--creative-tools)
- [Diagramming & Design](#diagramming--design)
- [AI/ML Infrastructure](#aiml-infrastructure)
- [Claude Skills & Libraries](#claude-skills--libraries)
- [Claude Code Plugins](#claude-code-plugins)
- [Claude Code Custom Agents](#claude-code-custom-agents)
- [Claude Code Slash Commands](#claude-code-slash-commands)
- [Project Documentation Templates](#project-documentation-templates)
- [Key GitHub Repos](#key-github-repos)
- [Testing & QA](#testing--qa)
- [MCP Platforms & Hubs](#mcp-platforms--hubs)
- [MCP Integrations Summary](#mcp-integrations-summary)
- [Active Projects](#active-projects)
- [Notes](#notes)

---


## Task Management

### Todoist
- **Use case:** Primary task manager for personal and project tasks
- **Account:** Personal
- **Key config:**
  - Claude project ID: `6g7gpCcqMc2gCXf2`
  - Integrated with Claude Code via MCP for task creation, updates, and batch operations
  - Tasks organized by project → section; batch updates in groups of 10 via `update-tasks`
- **Link:** [todoist.com](https://todoist.com)

### Apple Reminders
- **Use case:** Quick capture, personal reminders, Siri-triggered tasks
- **Account:** iCloud
- **Notes:** Used alongside Todoist for lightweight/personal items

---

## Notes & Knowledge Management

### Notion
- **Use case:** Notes, second brain, knowledge base
- **Account:** Personal
- **Integrations:** Connected to Claude.ai via Notion MCP
- **Link:** [notion.so](https://notion.so)

---

## AI Assistants & Interfaces

### Claude.ai (Web/Mobile App)
- **Use case:** Conversational AI, research, writing, planning, voice access
- **Account:** Personal Pro plan (michael@rihm.com)
- **Key config:**
  - Connected integrations: Gmail, Google Calendar, Linear, Notion, Context7
  - Skills synced manually (Settings → Capabilities → Skills → Add → Upload)
  - Voice access via "Hey Claude" Siri Shortcut on iPhone (setup in progress)
- **Link:** [claude.ai](https://claude.ai)

### Claude Code (CLI)
- **Use case:** Primary orchestrator / "second brain" hub — routes actions to Todoist, Google Calendar, Gmail, GitHub, and other tools from the terminal
- **Key config:**
  - Local skills directory: `~/.claude/skills/`
  - MCP config: `claude_desktop_config.json` on Mac
  - Portable config repo: `claude-toolkit` (clone + `install.sh` to set up any machine)
  - 8 plugins enabled, 2 custom agents, 1 slash command (see dedicated sections below)
- **Paths by machine:**
  - Windows: `C:/Users/michael.rihm/.claude/`
  - Mac: `/Users/naterihm/.claude/`
- **Link:** [docs.anthropic.com](https://docs.anthropic.com)

---

## Development & Deployment

### VS Code
- **Use case:** Primary development IDE
- **Notes:** Used for all coding work across projects

### GitHub
- **Use case:** Version control, app deployment, CI/CD
- **Key config:**
  - GitHub Actions for CI/CD pipelines
  - Repos for Davis Advisors migration and personal projects
- **Link:** [github.com](https://github.com)

---

## Calendar & Email

### Google Calendar
- **Use case:** All personal and work scheduling
- **Key config:**
  - Calendar name: "Events"
  - Calendar ID / account: `michael@rihm.com`
  - Timezone: `America/New_York`
  - Integrated with Claude.ai via Google Calendar MCP
  - Always use `gcal_create_event` — never iCloud calendar
- **Link:** [calendar.google.com](https://calendar.google.com)

### Gmail
- **Use case:** Primary email
- **Account:** michael@rihm.com
- **Integrations:** Connected to Claude.ai via Gmail MCP; also available in Claude Code via Composio OAuth (`python config/composio/authorize.py gmail`)
- **Link:** [mail.google.com](https://mail.google.com)

### Microsoft Outlook (Web)
- **Use case:** Workplace email and calendar
- **Key config:**
  - Workplace uses Outlook Web (not desktop app)
  - AppleScript-based MCPs won't work — requires Composio OAuth approach (`@composio/mcp@latest` via `npx`)
  - Composio setup in progress (last blocked on locating Tools section in Composio UI)
- **Notes:** Composio UI changes frequently; may need screenshot-based guidance when resuming setup

---

## Google Workspace

### Google Drive
- **Use case:** File storage, document collaboration, shared resources
- **Account:** michael@rihm.com
- **Integrations:** Accessible via Claude.ai Google Drive search
- **Link:** [drive.google.com](https://drive.google.com)

### Google Workspace CLI (`gws`)
- **Use case:** Unified CLI for managing Google Docs, Sheets, Drive, Gmail, Calendar, Chat, and more directly from Claude Code
- **Key config:**
  - Install: `npm install -g @googleworkspace/cli`
  - Auth setup: `gws auth setup` → `gws auth login`
  - All output is structured JSON (agent-friendly)
  - Ships 100+ agent skills for common workflows; installable via `npx skills add`
  - Requires Google Cloud project with OAuth credentials (Desktop App type)
- **Link:** [github.com/googleworkspace/cli](https://github.com/googleworkspace/cli)

---

## Project Management

### Linear
- **Use case:** Issue tracking, project management
- **Integrations:** Connected to Claude.ai via Linear MCP
- **Link:** [linear.app](https://linear.app)

---

## AI & Creative Tools

### Higgsfield.ai
- **Use case:** Inspiration, video generation, exploring different AI models
- **Link:** [higgsfield.ai](https://higgsfield.ai)

### 21st.dev
- **Use case:** UI/UX design components, design inspiration
- **Link:** [21st.dev](https://21st.dev)

---

## Diagramming & Design

### Draw.io (diagrams.net)
- **Use case:** Diagramming — flowcharts, architecture diagrams, system design
- **Key config:**
  - Draw.io MCP installed for Claude Code CLI
  - `/drawio` slash command for generating `.drawio` files with optional PNG/SVG/PDF export
- **Link:** [draw.io](https://app.diagrams.net)

### Lucidchart
- **Use case:** Diagramming — collaborative diagrams, flowcharts, wireframes
- **Link:** [lucidchart.com](https://lucidchart.com)

### Pencil
- **Use case:** UI/UX design and prototyping — Figma replacement powered by Claude
- **Notes:** Used with Claude to generate UI/UX designs programmatically
- **Link:** [pencil.li](https://pencil.li)

---

## AI/ML Infrastructure

### Gemini Embedding 2 (Google)
- **Use case:** Primary multimodal embedding model — generates vector embeddings for text, images, and other modalities
- **Key config:**
  - Accessed via API with Claude Code
  - Used in conjunction with Pinecone for vector storage and retrieval
- **Link:** [ai.google.dev](https://ai.google.dev)

### Pinecone
- **Use case:** Vector database — stores and queries embeddings for semantic search, RAG, and knowledge retrieval
- **Key config:**
  - Paired with Gemini Embedding 2 as the embedding model
- **Link:** [pinecone.io](https://pinecone.io)

---

## Claude Skills & Libraries

### Global Skills (installed to `~/.claude/skills/`)

#### Project Init Skill
- **Use case:** Initializes new projects with structured interview, repository scaffolding, config files, and boilerplate documentation
- **Location:** `~/.claude/skills/project-init/` — also uploadable to Claude.ai
- **Notes:** Critical skill — ensures consistent project scaffolding across all repos

#### Draw.io Skill
- **Use case:** Generate draw.io diagrams as `.drawio` files with optional PNG/SVG/PDF export
- **Location:** `~/.claude/skills/drawio/`
- **Status:** Deployed and active

#### HTML Diagrams Skill
- **Use case:** Create interactive HTML diagrams using D3.js with a dark-theme design system — force-directed graphs, swimlane flowcharts, and circular ring diagrams as self-contained HTML files
- **Location:** `~/.claude/skills/html-diagrams/`
- **Status:** Deployed and active

#### SF Architect Solutioning Skill
- **Use case:** Salesforce solution architecture — generates solution plans with architectural patterns, integration strategies, and solutioning checklists for SF consulting engagements
- **Location:** `sf-consulting-framework/skills/sf-architect-solutioning/`
- **Status:** Deployed and active

#### Frontend Design Skill
- **Use case:** Generating polished frontend UI directly from Claude
- **Notes:** Used in conjunction with 21st.dev components and UI/UX Pro Max library

### Plugin-Provided Skills (via `document-skills` plugin)

The `document-skills` plugin provides additional skills (docx, xlsx, mcp-builder, skill-creator, webapp-testing, and more) — these are not stored in this repo.

### Skills In Development

#### PRD Interviewer Skill
- **Use case:** Interactive product requirements gathering — Claude Code interviews the user with targeted questions to define scope, features, constraints, and acceptance criteria, then generates a comprehensive PRD
- **Status:** In development
- **Notes:** Designed to run in Claude Code as a conversational workflow before project kickoff. Distinct from the Project Init skill — PRD Interviewer focuses specifically on deep requirements gathering, while Project Init handles broader scaffolding.

#### Architecture Document Skill
- **Use case:** Generates technical architecture documents — system design, component diagrams, data flow, infrastructure decisions
- **Status:** Planned

---

## Claude Code Plugins

8 plugins enabled in `settings.json`. Plugins extend Claude Code with specialized skills, tools, and workflows.

| Plugin | Source | Description |
|--------|--------|-------------|
| `playwright` | claude-plugins-official | Browser automation and testing |
| `code-review` | claude-plugins-official | Pull request code review |
| `superpowers` | claude-plugins-official | Enhanced workflow skills — brainstorming, TDD, systematic debugging, planning, git worktrees, verification |
| `frontend-design` | claude-plugins-official | Production-grade frontend interface design |
| `context7` | claude-plugins-official | Up-to-date library documentation lookup |
| `claude-code-setup` | claude-plugins-official | Codebase automation recommendations |
| `skill-creator` | claude-plugins-official | Skill authoring and evaluation |
| `document-skills` | anthropics/skills | Document generation and creative skills (see sub-skills below) |

### Document Skills Plugin — Sub-Skills

The `document-skills` plugin (from the `anthropics/skills` marketplace) provides ~17 specialized sub-skills:

| Sub-Skill | Description |
|-----------|-------------|
| `docx` | Word document creation and manipulation |
| `xlsx` | Excel spreadsheet creation and analysis |
| `pptx` | PowerPoint presentation creation and editing |
| `pdf` | PDF reading, merging, splitting, OCR, watermarks |
| `canvas-design` | Visual art and poster design in PNG/PDF |
| `brand-guidelines` | Anthropic brand colors and typography |
| `frontend-design` | Web components, pages, and applications |
| `web-artifacts-builder` | Multi-component React/Tailwind HTML artifacts for Claude.ai |
| `theme-factory` | 10 pre-set themes applicable to any artifact (slides, docs, pages) |
| `internal-comms` | Status reports, leadership updates, newsletters, incident reports |
| `doc-coauthoring` | Structured workflow for co-authoring documentation |
| `slack-gif-creator` | Animated GIFs optimized for Slack |
| `algorithmic-art` | Generative art using p5.js with seeded randomness |
| `webapp-testing` | Playwright-based web app testing and screenshots |
| `mcp-builder` | MCP server development guide (Python FastMCP / Node.js SDK) |
| `skill-creator` | Skill authoring, eval running, and description optimization |
| `claude-api` | Build apps with the Claude API / Anthropic SDK / Agent SDK |

---

## Claude Code Custom Agents

Custom agents defined in `~/.claude/agents/`. These are launched via the `Agent` tool with a matching `subagent_type`.

| Agent | Description |
|-------|-------------|
| `powerpoint-generator` | Creates professional PPTX presentations using python-pptx — handles clarification, outline, file generation, and iteration |
| `prompt-engineer` | Designs, critiques, refactors, and stress-tests LLM prompts across Claude, GPT, Gemini, and open-source models |

---

## Claude Code Slash Commands

Custom slash commands defined in `~/.claude/commands/`.

| Command | Description |
|---------|-------------|
| `/drawio` | Generate draw.io diagrams as `.drawio` files with optional PNG/SVG/PDF export via the Draw.io MCP server |

---

## Project Documentation Templates

11 project templates in `claude-toolkit/templates/` — copied into a new project's `docs/` directory by the Project Init skill for structured documentation.

| Template | Purpose |
|----------|---------|
| `BACKLOG.md` | Phase-organized work items with priority, status, and requirement links |
| `CHANGELOG.md` | Keep a Changelog format (Added/Changed/Fixed/Removed/Deprecated/Security) |
| `CLAUDE.md` | Claude Code persistent memory — 13-section project context file |
| `CODE_ATLAS.md` | Codebase reference — architecture, services, routes, patterns |
| `DATA_MODEL.md` | Database schema with DDL, ERD, and naming conventions |
| `DECISIONS.md` | Architecture Decision Records with options, trade-offs, and consequences |
| `GETTING_STARTED.md` | AI agent bootstrap prompt — which files to read first |
| `MIGRATION_REFERENCE.md` | Old-to-new system mapping (modules, APIs, data models, patterns) |
| `README.md` | Standard project README with directory tree and quick start |
| `REQUIREMENTS.md` | Functional requirements with acceptance criteria and NFRs |
| `TECHNICAL_SPEC.md` | 10-section technical specification |

---

## Key GitHub Repos

### Awesome Claude Code
- **Use case:** Curated collection of Claude Code resources, tips, tools, and community extensions
- **Link:** [github.com/anthropics/awesome-claude-code](https://github.com/anthropics/awesome-claude-code)

### UI/UX Pro Max
- **Use case:** UI/UX component library and design system for Claude-powered frontend generation
- **Link:** [https://github.com/nextlevelbuilder/ui-ux-pro-max-skill](GitHub (UI/UX Pro Max repo))

---

## Testing & QA

### Playwright (MCP)
- **Use case:** Automated screenshot loop for Claude Code development — when the agent builds and deploys code, Playwright takes browser screenshots to visually verify the UI, then iterates and fixes issues in real-time before reporting back as done
- **Key config:**
  - Playwright MCP server integrated with Claude Code
  - Enables a build → screenshot → evaluate → fix loop for frontend development
- **Link:** [playwright.dev](https://playwright.dev)

### Screenshot Workflow
- **Use case:** Iterative screenshot verification loop for UI development — ensures every UI change is visually verified before being considered complete
- **Key config:**
  - `screenshot.mjs` — Node.js script that captures localhost pages as PNG screenshots
  - `SCREENSHOT_WORKFLOW.md` — Full workflow documentation and verification checklist
  - Both files are copied from `~/.claude/templates/` into project root during UI project setup
- **Workflow:** Build → Launch dev server → Screenshot → Review PNG → Iterate until passing → Done

---

## MCP Platforms & Hubs

### Composio.dev
- **Use case:** MCP integration platform — provides OAuth-based MCP servers for services that don't have native MCPs
- **Key config:**
  - Install via `npx @composio/mcp@latest`
  - Currently used for: Gmail auth in Claude Code, Outlook Web integration (in progress)
  - Authorization scripts: `python config/composio/authorize.py <toolkit>`
  - Composio UI changes frequently — screenshot-based guidance recommended
- **Link:** [composio.dev](https://composio.dev)

---

## MCP Integrations Summary

| MCP Server | Status | Access Via |
|---|---|---|
| Google Calendar | ✅ Active | Claude.ai, Claude Code |
| Gmail | ✅ Active | Claude.ai, Claude Code (via Composio) |
| Notion | ✅ Active | Claude.ai |
| Linear | ✅ Active | Claude.ai |
| Context7 | ✅ Active | Claude.ai, Claude Code (via plugin) |
| Todoist | ✅ Active | Claude Code |
| Draw.io | ✅ Active | Claude Code |
| Obsidian | ✅ Active | Claude Code |
| Playwright | ✅ Active | Claude Code (screenshot loop for UI verification) |
| Outlook Web (Composio) | 🔄 In Progress | Claude Code (blocked on Composio UI setup) |
| Composio.dev | 🔄 Hub | Claude Code (OAuth-based MCP platform for additional integrations) |

---
