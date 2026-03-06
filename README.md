# Claude Toolkit

A collection of prompts, templates, and skills for working with Claude Code and Claude AI agents. Designed to bootstrap new projects with structured documentation, enforce best-practice workflows, and extend Claude's capabilities with specialized skills.

---

## What's Inside

```
claude-toolkit/
├── prompts/                          # Reusable prompts for Claude Code
│   └── CLAUDE_CODE_BOOTSTRAP_PROMPT.md   # Project onboarding interview + scaffolding generator
│
├── templates/                        # Document templates for project documentation
│   ├── BACKLOG.md                    # Phase-based work item tracking
│   ├── CHANGELOG.md                  # Keep a Changelog format
│   ├── CLAUDE.md                     # Claude Code persistent memory (13-section structure)
│   ├── CODE_ATLAS.md                 # Codebase reference for AI context
│   ├── DATA_MODEL.md                 # Database schema with DDL, ERD, conventions
│   ├── DECISIONS.md                  # Architecture Decision Records (ADRs)
│   ├── GETTING_STARTED.md            # AI agent bootstrap prompt
│   ├── MIGRATION_REFERENCE.md        # Old-to-new system mapping (Rosetta Stone)
│   ├── README.md                     # Standard project README template
│   ├── REQUIREMENTS.md               # Business requirements with acceptance criteria
│   └── TECHNICAL_SPEC.md             # 10-section technical specification
│
└── skills/                           # Claude Code skills
    ├── docx/                         # Word document manipulation
    ├── mcp-builder/                  # MCP server development
    ├── skill-creator/                # Skill authoring & evaluation
    ├── webapp-testing/               # Playwright web app testing
    └── xlsx/                         # Excel spreadsheet manipulation
```

---

## Prompts

### `CLAUDE_CODE_BOOTSTRAP_PROMPT.md`

A comprehensive onboarding prompt you paste into a new Claude Code project. It conducts a structured interview (6 rounds covering project identity, phase, git workflow, documentation preferences, testing, and conventions), then generates a tailored documentation scaffolding based on your answers.

**What it produces:**
- `CLAUDE.md` — 13-section persistent memory file (golden rules, update protocol, coding standards, clarification protocol, etc.)
- Up to 10 living documents under `docs/` — backlog, requirements, technical spec, data model, decisions, changelog, code atlas, migration reference, README, and getting-started prompt
- Workflow rules for document maintenance, version control, testing, discovery, and migration

**Usage:** Copy the contents of `prompts/CLAUDE_CODE_BOOTSTRAP_PROMPT.md` and paste it as your first message in a new Claude Code session.

---

## Templates

Ready-to-use Markdown document templates. These define the exact structure and granularity that the bootstrap prompt generates. Use them directly if you prefer to set up documentation manually, or as a reference for the format the bootstrap prompt will produce.

| Template | Purpose |
|---|---|
| `CLAUDE.md` | Claude's persistent memory — project overview, golden rules, update protocol, coding standards, commands, session checklist, git protocol, clarification protocol |
| `BACKLOG.md` | Phase-organized work items with priority, status, requirement links, and detailed descriptions |
| `CHANGELOG.md` | [Keep a Changelog](https://keepachangelog.com/) format with Added/Changed/Fixed/Removed/Deprecated/Security categories |
| `CODE_ATLAS.md` | Persistent codebase reference — architecture, services, routes, components, patterns, cross-cutting concerns |
| `DATA_MODEL.md` | Database schema — table inventory, SQL DDL, relationships, Mermaid ERD, naming conventions |
| `DECISIONS.md` | Architecture Decision Records with options (pros/cons), consequences, and cross-references |
| `GETTING_STARTED.md` | Bootstrap prompt telling Claude which files to read and which backlog item to start with |
| `MIGRATION_REFERENCE.md` | Module, component, data model, API, and pattern mapping between old and new systems |
| `README.md` | Standard project README with directory tree, quick start, architecture overview, and docs index |
| `REQUIREMENTS.md` | Functional requirements (`REQ-001`) with acceptance criteria, NFRs (`NFR-001`), and glossary |
| `TECHNICAL_SPEC.md` | 10-section spec: architecture, tech stack, API design, service layer, components, security, deployment |

---

## Skills

### `docx/` — Word Document Manipulation

Create, edit, and analyze `.docx` files. Handles reading, creation (via docx-js), editing (unpack → edit XML → repack), conversion, validation against OOXML XSD schemas, tracked changes, and comments. Includes a full suite of Python scripts and ECMA/ISO/Microsoft XSD schemas for document validation.

### `xlsx/` — Excel Spreadsheet Manipulation

Create, edit, and analyze `.xlsx`/`.xlsm`/`.csv`/`.tsv` files. Covers pandas for data analysis, openpyxl for formulas and formatting, financial model standards (color coding, number formats), and mandatory formula recalculation via LibreOffice.

### `mcp-builder/` — MCP Server Development

A four-phase workflow for building high-quality MCP (Model Context Protocol) servers: research/planning, implementation, review/testing, and evaluation creation. Includes reference guides for Python (FastMCP) and Node.js (TypeScript) implementations, best practices, and an evaluation harness.

### `skill-creator/` — Skill Authoring & Evaluation

Full lifecycle toolkit for creating, evaluating, and improving Claude skills. Covers intent capture, interview-based skill design, SKILL.md authoring, test case creation, eval running (with/without skill + baseline comparisons), and description optimization. Includes blind comparator, grader, and analyzer agents.

### `webapp-testing/` — Playwright Web App Testing

Test local web applications with Playwright. Provides a decision tree for static vs. dynamic apps, a `with_server.py` helper for server lifecycle management, and example scripts for console logging, element discovery, and static HTML automation.

---

## Getting Started

1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-username/claude-toolkit.git
   ```

2. **Bootstrap a new project:** Copy the contents of `prompts/CLAUDE_CODE_BOOTSTRAP_PROMPT.md` and paste it as your first message in a new Claude Code session. Answer the interview questions, and Claude will generate your project's documentation scaffolding.

3. **Use templates directly:** Copy any template from `templates/` into your project's `docs/` directory and fill in the placeholders.

4. **Install skills:** Copy any skill directory from `skills/` into your Claude Code project's skills location.

---

## License

Skills under `skills/docx/` and `skills/xlsx/` are covered by the Anthropic proprietary license included in their respective `LICENSE.txt` files. All other content in this repository is unlicensed — see individual directories for details.
