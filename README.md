# claude-toolkit

Reusable Claude Code prompts, `CLAUDE.md` templates, and project documentation scaffolding
for spinning up structured AI-assisted development workflows.

---

## What's Inside

```
claude-toolkit/
├── prompts/                    # Reusable prompt templates for Claude Code
│   ├── README.md               # Index and usage guide
│   ├── code-review.md          # Review code for correctness, security & style
│   ├── debugging.md            # Methodically diagnose and fix bugs
│   ├── refactoring.md          # Improve structure without changing behaviour
│   ├── test-generation.md      # Generate unit / integration tests
│   └── documentation.md        # Write or improve inline and reference docs
│
└── templates/                  # Project file templates
    ├── CLAUDE.md               # Claude Code project configuration
    ├── BACKLOG.md              # Prioritised feature & task backlog
    ├── DECISIONS.md            # Architecture Decision Records (ADRs)
    ├── CHANGELOG.md            # Keep-a-Changelog formatted release notes
    ├── REQUIREMENTS.md         # Functional & non-functional requirements
    └── TECHNICAL_SPEC.md       # Full technical specification
```

---

## Quick Start

### 1. Bootstrap a new project

Copy the templates you need into your project root:

```bash
# Clone or download the toolkit
git clone https://github.com/Mar5929/claude-toolkit.git

# Copy all templates into your project
cp claude-toolkit/templates/* /path/to/your-project/

# Copy prompts for reference
cp -r claude-toolkit/prompts /path/to/your-project/docs/prompts
```

### 2. Customise `CLAUDE.md`

`CLAUDE.md` is the most important file — it tells Claude Code about your project:

1. Open `templates/CLAUDE.md` and fill in every `<!-- placeholder -->`.
2. Place the completed file at the **root of your repository** as `CLAUDE.md`.
3. Claude Code will automatically read it at the start of every session.

### 3. Fill in the doc templates

| Template | When to fill in |
|----------|----------------|
| `REQUIREMENTS.md` | Before starting development |
| `TECHNICAL_SPEC.md` | After requirements are agreed |
| `DECISIONS.md` | As architectural decisions are made |
| `BACKLOG.md` | Ongoing — keep it up to date each sprint |
| `CHANGELOG.md` | On every release |

### 4. Use a prompt

Paste a prompt from `prompts/` directly into your Claude Code chat, or add it to the
**Common Tasks for Claude** section of your `CLAUDE.md`.

```
# Example — add to your CLAUDE.md
## Common Tasks for Claude

### Code Review
When asked to review code, follow the process in prompts/code-review.md.
```

---

## Templates

| Template | Description |
|----------|-------------|
| [`CLAUDE.md`](./templates/CLAUDE.md) | Project config for Claude Code: tech stack, conventions, setup commands, and guidance on how Claude should behave |
| [`BACKLOG.md`](./templates/BACKLOG.md) | MoSCoW-prioritised backlog with Now / Next / Later / Icebox sections |
| [`DECISIONS.md`](./templates/DECISIONS.md) | Architecture Decision Records with a standard ADR format |
| [`CHANGELOG.md`](./templates/CHANGELOG.md) | [Keep a Changelog](https://keepachangelog.com/) + [SemVer](https://semver.org/) format |
| [`REQUIREMENTS.md`](./templates/REQUIREMENTS.md) | Functional and non-functional requirements with MoSCoW priorities |
| [`TECHNICAL_SPEC.md`](./templates/TECHNICAL_SPEC.md) | Architecture, data model, API design, security, deployment, and open questions |

---

## Prompts

| Prompt | Description |
|--------|-------------|
| [`code-review.md`](./prompts/code-review.md) | Full review (correctness, security, performance, style) plus quick and security-only variants |
| [`debugging.md`](./prompts/debugging.md) | Hypothesis-driven debugging with variants for quick fixes and race conditions |
| [`refactoring.md`](./prompts/refactoring.md) | Structure improvements with variants for extract-function, conditionals, and naming |
| [`test-generation.md`](./prompts/test-generation.md) | Comprehensive test generation with variants for REST endpoints and property-based tests |
| [`documentation.md`](./prompts/documentation.md) | JSDoc, README, API reference, and documentation improvement variants |

---

## Contributing

1. Fork the repo and create a branch: `feature/your-improvement`.
2. Add or update a template or prompt.
3. Open a pull request with a description of what you changed and why.

---

## License

[MIT](LICENSE)
