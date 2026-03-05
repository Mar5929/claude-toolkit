# CLAUDE.md — <!-- PROJECT_NAME -->

> **Purpose**: Persistent instructions for Claude when working in this workspace.
> Claude MUST read this file at the start of every session.

---

## 1. Project Overview

- **Project Name**: <!-- PROJECT_NAME -->
- **What**: <!-- Brief description of what the project does and its purpose -->
- **Stack**: <!-- e.g., Next.js 15 (frontend) · Python 3.12 / FastAPI (backend) · PostgreSQL 16 (database) -->
- **Hosting**: <!-- e.g., Vercel (frontend) · AWS ECS Fargate (API) · AWS RDS (PostgreSQL) -->
- **Repo**: <!-- Mono-repo or multi-repo? Package manager? -->
- **Related Projects**: <!-- Links to related or predecessor projects, if any -->

---

## 2. Golden Rules

1. **Ask before assuming.** If a requirement is ambiguous, ask a clarifying question before writing code. Never guess at business logic, data model relationships, or security rules.
2. **Document as you build.** Every feature, requirement, or technical decision MUST be reflected in the living documents under `docs/`. Update them _in the same response_ that implements the change.
3. **Minimize token waste.** Use concise code, avoid re-printing unchanged files, and reference files by path instead of pasting entire contents when possible.
4. **Incremental, deployable changes.** Each change should be small enough to test independently. Never leave the project in a broken state.
5. **Type safety everywhere.** <!-- Adapt to your stack: e.g., TypeScript strict: true, Python type hints + Pydantic, etc. -->
6. <!-- Add any additional project-specific golden rules -->

---

## 3. Workspace Structure

```
<!-- PROJECT_ROOT -->/
├── CLAUDE.md                     # THIS FILE — AI agent instructions
├── package.json                  # Root package.json (if applicable)
├── .env.example                  # Environment variable template
├── .gitignore
│
├── docs/                         # Living project documents (ALWAYS keep updated)
│   ├── BACKLOG.md                # Work items to complete
│   ├── CHANGELOG.md              # Running log of what was built & when
│   ├── CODE_ATLAS.md             # Complete codebase reference (updated as code is written)
│   ├── DATA_MODEL.md             # Database schema — tables, columns, indexes, relationships
│   ├── DECISIONS.md              # Architecture Decision Records (ADRs)
│   ├── REQUIREMENTS.md           # Business requirements
│   └── TECHNICAL_SPEC.md         # Architecture, APIs, integrations, security
│
├── <!-- src/ or apps/ or other top-level directories -->
│   └── <!-- Describe your directory layout here -->
│
└── <!-- Additional top-level directories (infra/, scripts/, etc.) -->
```

---

## 4. Living Documents — Update Protocol

These files under `docs/` are the **single source of truth**. Claude MUST follow this protocol:

| Event | Action |
|---|---|
| New feature requested | Add to `REQUIREMENTS.md` → Add technical approach to `TECHNICAL_SPEC.md` → update `BACKLOG.md` |
| New table/column created | Add to `DATA_MODEL.md` |
| Architecture decision made | Add ADR entry to `DECISIONS.md` |
| Any code committed | Add entry to `CHANGELOG.md` |
| Requirement changed | Update `REQUIREMENTS.md`, mark old version as superseded |
| Feature completed | Mark status as `[DONE]` in `REQUIREMENTS.md` → update `BACKLOG.md` |
| Code added/modified | Update `CODE_ATLAS.md` — modules, functions, classes, relationships |
| Request to modify backlog | Update `BACKLOG.md` |

### Format Rules:

- Use **compact Markdown** — tables and bullet lists preferred over prose.
- Requirements: `REQ-001`, `REQ-002`, etc.
- Decisions: `ADR-001`, `ADR-002`, etc.
- Backlog items: `BL-001`, `BL-002`, etc.
- Changelog: ISO dates (`YYYY-MM-DD`).

---

## 5. Coding Standards

<!-- Replace the sections below with your project's specific standards.
     Remove any language sections that don't apply. Add sections for languages you use. -->

### <!-- Language 1 (e.g., TypeScript) -->

- <!-- Strict mode / compiler settings -->
- **Naming**: <!-- e.g., PascalCase for components/types, camelCase for functions/variables, UPPER_SNAKE for constants -->
- **Components/Modules**: <!-- e.g., Functional components with hooks. One component per file. -->
- **State Management**: <!-- e.g., React Server Components, Zustand, Redux, etc. -->
- **Styling**: <!-- e.g., Tailwind CSS utility classes, CSS Modules, styled-components -->
- **Data Fetching**: <!-- e.g., Server Components, useSWR, react-query -->
- **Forms**: <!-- e.g., React Hook Form + Zod validation -->
- **File structure**: <!-- e.g., One component per file. Co-locate tests. -->
- **Imports**: <!-- e.g., Use @/ path alias for src/ -->

### <!-- Language 2 (e.g., Python) -->

- <!-- Type hints / annotations policy -->
- **Naming**: <!-- e.g., snake_case for functions/variables/modules, PascalCase for classes -->
- **Async**: <!-- e.g., Async by default for all DB and HTTP operations -->
- **Validation**: <!-- e.g., Pydantic v2 for all request/response schemas -->
- **ORM**: <!-- e.g., SQLAlchemy 2.0 with Mapped[] type annotations -->
- **Error handling**: <!-- e.g., Custom exception classes → structured JSON error responses -->
- **Testing**: <!-- e.g., pytest with httpx.AsyncClient, factory_boy for test data -->

### Database

- **Naming**: <!-- e.g., snake_case tables and columns. Plural table names. -->
- **Primary keys**: <!-- e.g., UUID v4 (gen_random_uuid()) -->
- **Timestamps**: <!-- e.g., created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now() on every table -->
- **Migrations**: <!-- e.g., Alembic autogenerate → review → commit. Never edit schema directly. -->
- <!-- Add any other DB conventions: tenant isolation, soft deletes, indexing strategy, etc. -->

---

## 6. Tech Stack Quick Reference

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | <!-- e.g., Next.js --> | <!-- e.g., 15.x --> | <!-- e.g., App Router, RSC --> |
| UI Components | <!-- e.g., shadcn/ui --> | <!-- e.g., latest --> | <!-- Purpose --> |
| Styling | <!-- e.g., Tailwind CSS --> | <!-- e.g., 4.x --> | <!-- Purpose --> |
| Frontend Language | <!-- e.g., TypeScript --> | <!-- e.g., 5.x --> | <!-- Purpose --> |
| Auth | <!-- e.g., NextAuth.js --> | <!-- e.g., 5.x --> | <!-- Purpose --> |
| Backend Framework | <!-- e.g., FastAPI --> | <!-- e.g., 0.115+ --> | <!-- Purpose --> |
| Backend Language | <!-- e.g., Python --> | <!-- e.g., 3.12 --> | <!-- Purpose --> |
| ORM | <!-- e.g., SQLAlchemy --> | <!-- e.g., 2.0 --> | <!-- Purpose --> |
| Database | <!-- e.g., PostgreSQL --> | <!-- e.g., 16 --> | <!-- Purpose --> |
| Cache | <!-- e.g., Redis --> | <!-- e.g., 7.x --> | <!-- Purpose --> |
| Testing (Backend) | <!-- e.g., pytest --> | <!-- --> | <!-- Purpose --> |
| Testing (Frontend) | <!-- e.g., Vitest + RTL --> | <!-- --> | <!-- Purpose --> |
| Testing (E2E) | <!-- e.g., Playwright --> | <!-- --> | <!-- Purpose --> |
| CI/CD | <!-- e.g., GitHub Actions --> | <!-- --> | <!-- Purpose --> |
| Frontend Hosting | <!-- e.g., Vercel --> | <!-- --> | <!-- Purpose --> |
| Backend Hosting | <!-- e.g., AWS ECS Fargate --> | <!-- --> | <!-- Purpose --> |
| Database Hosting | <!-- e.g., AWS RDS --> | <!-- --> | <!-- Purpose --> |

---

## 7. Key Commands

### Local Development

```bash
# Start dev environment
<!-- e.g., docker-compose up -d -->
<!-- e.g., pnpm dev -->

# Frontend only
<!-- e.g., cd apps/web && pnpm dev -->

# Backend only
<!-- e.g., cd apps/api && uvicorn app.main:app --reload --port 8000 -->

# Database
<!-- e.g., alembic upgrade head -->
<!-- e.g., alembic revision --autogenerate -m "description" -->
```

### Testing

```bash
# Backend tests
<!-- e.g., pytest -->

# Frontend tests
<!-- e.g., pnpm test -->

# E2E tests
<!-- e.g., pnpm test:e2e -->

# All tests
<!-- e.g., pnpm test -->
```

### Deployment

```bash
<!-- Describe your deployment commands / process -->
```

---

## 8. Session Startup Checklist

At the start of every session, Claude should:

1. Read `CLAUDE.md` (this file)
2. Read `docs/CODE_ATLAS.md` — complete codebase reference
3. Read `docs/BACKLOG.md` — outstanding work items
4. Skim `docs/REQUIREMENTS.md` if working on a feature
5. Ask: _"What would you like to work on today? Here are the open backlog items: ..."_

---

## 9. Git Commit Protocol

### Commit Message Format:

```
feat(BL-XXX): Short summary of what was done

- Bullet list of key changes
- Docs updated: CHANGELOG.md, CODE_ATLAS.md, etc.
```

### Rules:

- Only commit after tests pass — never commit broken code.
- One commit per backlog item — keep history clean.
- Always push after commit.
- Include doc updates in the same commit.

---

## 10. Clarification Protocol

When Claude encounters ambiguity:

```
🔍 **Clarification Needed**

Before I proceed, I need to confirm:

1. [Specific question]
2. [Question about data model choice]

> My default assumption would be: [state default].
```

Categories that ALWAYS require clarification:
- Security/auth decisions (who can see what)
- Database schema changes that affect existing data
- Third-party service integrations
- Anything contradicting `docs/REQUIREMENTS.md`

---

## 11. Context Window Management

1. **Don't re-read files already read** this session unless changed.
2. **Reference by path** — say "see `docs/REQUIREMENTS.md` REQ-003" instead of pasting.
3. **Use `docs/` as external memory** — write decisions to docs files for future sessions.
4. **Read `docs/CODE_ATLAS.md`** for code context instead of scanning source files.
5. **Checkpoint conversations** — if getting long, suggest starting a new chat.

---

## 12. Bug-Prevention Facts

> Populated as you discover gotchas. Empty at project start.

- _(none yet)_

---

## 13. References

<!-- Link to any external resources, related projects, API documentation, etc. -->

| Resource | Description |
|---|---|
| <!-- URL or path --> | <!-- What it contains --> |
