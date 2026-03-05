# <!-- PROJECT_NAME -->

<!-- Brief one-line project description -->

---

## What's Inside

```
<!-- PROJECT_ROOT -->/
├── CLAUDE.md                     # Claude Code project configuration
├── docs/                         # Living project documents
│   ├── BACKLOG.md                # Prioritised feature & task backlog
│   ├── CHANGELOG.md              # Running changelog
│   ├── CODE_ATLAS.md             # Complete codebase reference
│   ├── DATA_MODEL.md             # Database schema definition
│   ├── DECISIONS.md              # Architecture Decision Records (ADRs)
│   ├── REQUIREMENTS.md           # Business requirements
│   └── TECHNICAL_SPEC.md         # Full technical specification
│
├── <!-- src/ or apps/ -->        # Application source code
│   └── <!-- ... -->
│
└── <!-- other directories -->
```

---

## Quick Start

### Prerequisites

<!-- List required tools and versions -->
- <!-- e.g., Node.js 20+ -->
- <!-- e.g., Python 3.12+ -->
- <!-- e.g., Docker & Docker Compose -->
- <!-- e.g., pnpm 9+ -->

### 1. Clone & Install

```bash
git clone <!-- REPO_URL -->
cd <!-- PROJECT_NAME -->
<!-- e.g., pnpm install -->
<!-- e.g., pip install -r requirements.txt -->
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start Development

```bash
<!-- e.g., docker-compose up -d -->
<!-- e.g., pnpm dev -->
```

### 4. Run Tests

```bash
<!-- e.g., pnpm test -->
```

---

## Architecture Overview

<!-- Brief description of the system architecture -->

| Layer | Technology | Purpose |
|---|---|---|
| <!-- e.g., Frontend --> | <!-- e.g., Next.js 15 --> | <!-- Purpose --> |
| <!-- e.g., Backend --> | <!-- e.g., FastAPI --> | <!-- Purpose --> |
| <!-- e.g., Database --> | <!-- e.g., PostgreSQL 16 --> | <!-- Purpose --> |

---

## Documentation

| Document | Description |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Claude Code configuration and project rules |
| [REQUIREMENTS.md](./docs/REQUIREMENTS.md) | Functional and non-functional requirements |
| [TECHNICAL_SPEC.md](./docs/TECHNICAL_SPEC.md) | Architecture, APIs, integrations, security |
| [DATA_MODEL.md](./docs/DATA_MODEL.md) | Database schema definition |
| [DECISIONS.md](./docs/DECISIONS.md) | Architecture Decision Records |
| [BACKLOG.md](./docs/BACKLOG.md) | Prioritised backlog with phases |
| [CHANGELOG.md](./docs/CHANGELOG.md) | Running changelog |
| [CODE_ATLAS.md](./docs/CODE_ATLAS.md) | Complete codebase reference |

---

## Key Commands

```bash
# Development
<!-- e.g., pnpm dev                    # Start dev servers -->
<!-- e.g., docker-compose up -d        # Start infrastructure -->

# Testing
<!-- e.g., pnpm test                   # Run all tests -->
<!-- e.g., pnpm test:e2e               # Run E2E tests -->

# Database
<!-- e.g., alembic upgrade head        # Run migrations -->

# Deployment
<!-- e.g., pnpm build                  # Production build -->
```

---

## Contributing

1. Fork the repo and create a branch: `feature/your-improvement`.
2. Make your changes and ensure tests pass.
3. Update relevant documentation under `docs/`.
4. Open a pull request with a description of what you changed and why.

---

## License

<!-- e.g., [MIT](LICENSE) -->
