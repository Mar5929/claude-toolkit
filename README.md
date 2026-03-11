# Claude Toolkit

Portable Claude Code setup — clone this repo on any machine, run `install.sh`, and your `~/.claude/` environment is fully configured.

This repo is the **single source of truth** for global Claude Code configuration: settings, skills, agents, commands, templates, and composio integrations.

---

## Quick Start

```bash
git clone https://github.com/your-username/claude-toolkit.git
cd claude-toolkit
bash install.sh
```

The install script will:
1. Back up any existing `~/.claude/` config files
2. Copy `config/` contents to `~/.claude/`
3. Print reminders for plugins and MCP servers to configure

---

## Directory Structure

```
claude-toolkit/
├── install.sh                     # Setup script — copies config/ to ~/.claude/
├── README.md
├── .gitignore
├── claude-code-migration-guide.pdf
│
├── config/                        # Maps 1:1 to ~/.claude/
│   ├── CLAUDE.md                  # Global instructions for all projects
│   ├── settings.json              # Plugins, permissions, model preference
│   ├── settings.local.json        # Local shell permissions (Windows-specific)
│   ├── templates/                 # Screenshot workflow files
│   │   ├── screenshot.mjs
│   │   └── SCREENSHOT_WORKFLOW.md
│   ├── skills/                    # Globally-installed skills
│   │   ├── drawio/                # Draw.io diagram generation
│   │   └── project-init/          # Project scaffolding interview + docs
│   ├── commands/
│   │   └── drawio.md              # Draw.io diagram generation command
│   ├── agents/
│   │   ├── powerpoint-generator.md  # PPTX creation agent
│   │   └── prompt-engineer.md       # Prompt design/critique agent
│   ├── agent-memory/              # Persistent agent memory directories
│   │   ├── powerpoint-generator/
│   │   └── prompt-engineer/
│   └── composio/                  # Composio integration scripts
│       ├── authorize.py           # OAuth toolkit authorization
│       └── composio_agent.py      # Reusable agent runner
│
├── templates/                     # Project document templates (copy into projects)
│   ├── BACKLOG.md
│   ├── CHANGELOG.md
│   ├── CLAUDE.md
│   ├── CODE_ATLAS.md
│   ├── DATA_MODEL.md
│   ├── DECISIONS.md
│   ├── GETTING_STARTED.md
│   ├── MIGRATION_REFERENCE.md
│   ├── README.md
│   ├── REQUIREMENTS.md
│   └── TECHNICAL_SPEC.md
│
└── diagrams/                      # Interactive D3.js diagrams (open in browser)
    ├── index.html
    ├── system-architecture.html
    ├── project-lifecycle.html
    ├── dev-loop.html
    ├── shared.css
    ├── shared.js
    └── data/
```

---

## Global Config (`config/`)

Everything in `config/` maps directly to `~/.claude/`. The install script copies these files into place.

### `CLAUDE.md` — Global Instructions

Applied to every Claude Code session. Contains:
- Document generation cleanup rules
- Screenshot workflow for UI projects
- UI framework preferences (Tailwind CSS, Playwright)
- Iterative screenshot verification loop

### `settings.json` — Plugins & Permissions

Configures enabled plugins, permission allowlists, auto-update channel, and default model (`opus`).

### `settings.local.json` — Local Shell Permissions

Windows-specific shell permissions (`cmd.exe`, `powershell.exe`, `gh`, `python`). **Mac/Linux users** should update these for their shell environment.

### `skills/` — Global Skills

| Skill | Description |
|-------|-------------|
| `drawio/` | Generate draw.io diagrams as `.drawio` files with optional PNG/SVG/PDF export |
| `project-init/` | Structured project initialization interview that scaffolds documentation (CLAUDE.md, requirements, technical spec, backlog, etc.) |
| `ui-ux-pro-max/` | UI/UX design intelligence — 67 styles, 161 color palettes, 57 font pairings, landing page patterns, and accessibility guidelines (Python search engine via `uipro-cli`) |

### `commands/` — Slash Commands

| Command | Description |
|---------|-------------|
| `drawio.md` | Generate draw.io diagrams as `.drawio` files with optional PNG/SVG/PDF export |

### `agents/` — Custom Agents

| Agent | Description |
|-------|-------------|
| `powerpoint-generator.md` | Creates professional PPTX presentations using python-pptx with design system, color palettes, and layout templates |
| `prompt-engineer.md` | Designs, critiques, refactors, and stress-tests LLM prompts across Claude, GPT, Gemini, and open-source models |

### `composio/` — Composio Integration

Scripts for authorizing and running Composio toolkits (Gmail, Slack, GitHub, etc.) with the Claude Agent SDK. API keys are read from environment variables (`COMPOSIO_API_KEY`, `COMPOSIO_USER_ID`).

---

## Project Templates

Copy these into a new project's `docs/` directory for structured documentation.

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

## Plugins

Enabled in `config/settings.json`:

| Plugin | Source | Description |
|--------|--------|-------------|
| `playwright` | claude-plugins-official | Browser automation and testing |
| `code-review` | claude-plugins-official | Pull request code review |
| `superpowers` | claude-plugins-official | Enhanced workflow skills (brainstorming, TDD, debugging, planning) |
| `frontend-design` | claude-plugins-official | Production-grade frontend interface design |
| `context7` | claude-plugins-official | Up-to-date library documentation lookup |
| `claude-code-setup` | claude-plugins-official | Codebase automation recommendations |
| `skill-creator` | claude-plugins-official | Skill authoring and evaluation |
| `document-skills` | anthropics/skills | Document generation (DOCX, XLSX, PPTX, PDF), web artifacts, canvas design, and more |

---

## MCP Servers

Configure these in your Claude Code MCP settings for full functionality:

| Server | Purpose | Setup |
|--------|---------|-------|
| **Obsidian** | Read/write notes in Obsidian vaults | [obsidian-mcp](https://github.com/smithery-ai/mcp-obsidian) |
| **Draw.io** | Create diagrams programmatically | [drawio-mcp](https://github.com/yctimlin/mcp-drawio) |
| **Gmail** | Read, search, draft emails | Via Composio (`python config/composio/authorize.py gmail`) |
| **Google Calendar** | List, create, update calendar events | Via Composio (`python config/composio/authorize.py google-calendar`) |
| **Linear** | Issue tracking integration | Via Composio or [linear-mcp](https://github.com/jerhadf/linear-mcp-server) |
| **Notion** | Read/write Notion pages and databases | Via Composio or [notion-mcp](https://github.com/modelcontextprotocol/servers/tree/main/src/notion) |
| **Playwright** | Browser automation for testing | Bundled with playwright plugin |
| **Context7** | Library documentation lookup | Bundled with context7 plugin |

---

## Updating the Repo

When you modify files in `~/.claude/` directly (e.g., editing CLAUDE.md, adding a new skill), sync changes back:

```bash
# From the claude-toolkit directory:

# Copy modified global config back
cp ~/.claude/CLAUDE.md config/CLAUDE.md
cp ~/.claude/settings.json config/settings.json

# Copy a new or modified skill
cp -r ~/.claude/skills/my-new-skill config/skills/my-new-skill

# Commit and push
git add -A
git commit -m "sync: update config from ~/.claude"
git push
```

---

## Interactive Diagrams

Open any HTML file directly in your browser (no server needed):

```
diagrams/
├── index.html                    # Landing page with links to all diagrams
├── system-architecture.html      # Hub-and-spoke: Claude Code → all tools & services
├── project-lifecycle.html        # Flowchart: user request → deploy (with swim lanes)
├── dev-loop.html                 # Circular: the iterative dev cycle with screenshot sub-loop
├── shared.css                    # Design system
├── shared.js                     # Shared D3.js utilities
└── data/                         # Node/edge data (edit these when tools change)
    ├── architecture-data.js
    ├── lifecycle-data.js
    └── devloop-data.js
```

Features: zoom/pan, hover tooltips, click-to-highlight connections, detail sidebar, category filters, animated edges, and search.

---

## Notes

- **Hardcoded paths**: The global `CLAUDE.md` references `C:/Users/michael.rihm/.claude/templates/...`. Update these paths if your username differs.
- **Windows-specific permissions**: `settings.local.json` contains `cmd.exe` and `powershell.exe` permissions. Mac/Linux users should replace these with their shell equivalents.

---

## License

All content in this repository is unlicensed.