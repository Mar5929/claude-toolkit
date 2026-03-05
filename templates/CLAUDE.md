# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

<!-- Briefly describe what this project does and its primary purpose. -->

**Name:** <!-- Project name -->
**Description:** <!-- One-paragraph description -->
**Tech Stack:** <!-- e.g. TypeScript, React, Node.js, PostgreSQL -->

## Repository Structure

```
.
├── src/          # Application source code
├── tests/        # Automated tests
├── docs/         # Project documentation
└── README.md
```

<!-- Update the tree above to match your actual layout. -->

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Lint & format
npm run lint
npm run format
```

<!-- Replace with the commands that apply to your stack. -->

## Architecture & Key Decisions

<!-- Link to or summarize the most important architecture decisions. -->

- See [DECISIONS.md](./DECISIONS.md) for architecture decision records (ADRs).
- See [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) for the full technical specification.

## Coding Conventions

- **Language:** <!-- e.g. TypeScript strict mode -->
- **Formatting:** <!-- e.g. Prettier with default config -->
- **Linting:** <!-- e.g. ESLint with Airbnb config -->
- **Naming:** <!-- e.g. camelCase for variables, PascalCase for components -->
- **Commits:** <!-- e.g. Conventional Commits (feat/fix/chore/docs) -->
- **Branching:** <!-- e.g. feature/<ticket-id>-short-description -->

## Testing

- **Framework:** <!-- e.g. Vitest, Jest, Pytest -->
- **Coverage target:** <!-- e.g. ≥80 % lines -->
- Run all tests: `npm test`
- Run a single file: `npm test -- path/to/file.test.ts`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `API_KEY` | Yes | External API key |
| `LOG_LEVEL` | No | Logging verbosity (default: `info`) |

<!-- Remove or add rows as needed. Never commit real secrets. -->

## Common Tasks for Claude

When asked to help with this project, Claude should:

1. **Follow existing patterns** — read neighboring files before writing new ones.
2. **Keep changes minimal** — make the smallest correct change that satisfies the request.
3. **Write tests** — every new function or bug fix should include a test.
4. **Update docs** — if behaviour changes, update README / CHANGELOG / DECISIONS as appropriate.
5. **Check BACKLOG.md** — before starting a new feature, confirm it is listed and prioritised.

## Out of Scope

<!-- List anything Claude should NOT do unless explicitly asked. -->

- Do not upgrade major dependency versions without discussion.
- Do not refactor unrelated code while implementing a feature.
- Do not commit secrets, credentials, or personal data.
