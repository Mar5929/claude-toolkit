# CODE_ATLAS.md — Complete Codebase Reference

> **Purpose**: Persistent context memory for Claude. Read this file instead of scanning individual source files.
> **Last Updated**: <!-- YYYY-MM-DD -->
> **Status**: Skeleton — populated as code is written.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Backend Services](#3-backend-services)
4. [API Routes](#4-api-routes)
5. [Background Tasks](#5-background-tasks)
6. [Frontend Components](#6-frontend-components)
7. [Key Patterns & Conventions](#7-key-patterns--conventions)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)

---

## 1. Architecture Overview

### Platform

- **Frontend**: <!-- e.g., Next.js 15 (App Router, TypeScript, React 19, Tailwind 4, shadcn/ui) -->
- **Backend**: <!-- e.g., Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2 -->
- **Database**: <!-- e.g., PostgreSQL 16 -->
- **Cache/Queue**: <!-- e.g., Redis 7, Celery 5 -->
- **Hosting**: <!-- e.g., Vercel (frontend) + AWS ECS (backend) -->

### Layer Diagram

```
<!-- ASCII layer diagram showing the system tiers -->
<!-- Example:
┌─────────────────────────────────────────────────┐
│  Frontend                                       │
│  Pages │ Components │ Hooks │ State             │
├─────────────────────────────────────────────────┤
│  Backend API                                    │
│  Routes │ Middleware │ Auth                      │
├─────────────────────────────────────────────────┤
│  Service Layer                                  │
│  Business logic modules                         │
├─────────────────────────────────────────────────┤
│  Data Layer                                     │
│  Database │ Cache │ External APIs               │
└─────────────────────────────────────────────────┘
-->
```

---

## 2. Database Schema

> Full DDL: see `docs/DATA_MODEL.md`

<!-- Populated as tables are created. List table name, key columns, and relationships. -->

| Table | Purpose | Key Columns |
|---|---|---|
| <!-- table_name --> | <!-- Purpose --> | <!-- Key columns --> |

---

## 3. Backend Services

<!-- Populated as services are implemented. Document module path, purpose, key methods. -->

| Module | Purpose | Key Methods |
|---|---|---|
| `<!-- module_path -->` | <!-- Purpose --> | <!-- Key methods --> |

---

## 4. API Routes

<!-- Populated as routes are implemented. Document method, path, purpose. -->

| Method | Path | Purpose | Service |
|---|---|---|---|
| <!-- GET/POST/PATCH/DELETE --> | `<!-- /api/v1/... -->` | <!-- Purpose --> | <!-- service_module --> |

---

## 5. Background Tasks

<!-- Populated as tasks are created. Remove section if not applicable. -->

| Task | Schedule | Purpose |
|---|---|---|
| `<!-- task_name -->` | <!-- Schedule --> | <!-- Purpose --> |

---

## 6. Frontend Components

<!-- Populated as components are built. Document component name, path, purpose. -->

| Component | Path | Purpose |
|---|---|---|
| `<!-- ComponentName -->` | `<!-- file/path.tsx -->` | <!-- Purpose --> |

---

## 7. Key Patterns & Conventions

<!-- Document important patterns used across the codebase -->

### 7.1 <!-- Pattern Name (e.g., Error Handling) -->

<!-- Description of the pattern and how it's used -->

### 7.2 <!-- Pattern Name (e.g., Authentication Flow) -->

<!-- Description -->

### 7.3 <!-- Pattern Name (e.g., Data Validation) -->

<!-- Description -->

---

## 8. Cross-Cutting Concerns

### 8.1 Authentication

<!-- Describe auth mechanism: JWT, session, OAuth, etc. -->

### 8.2 Error Handling

<!-- Describe error handling strategy: exception classes, response format, etc. -->

### 8.3 Logging

<!-- Describe logging strategy: structured logs, log levels, etc. -->

### 8.4 <!-- Additional Concern (e.g., Multi-Tenancy, Caching, Rate Limiting) -->

<!-- Description -->

---

## Appendix A: File → Module Reference

<!-- Map source files to their logical module/purpose. Populated as code is written. -->

| File Path | Module | Purpose |
|---|---|---|
| `<!-- path -->` | <!-- Module --> | <!-- Purpose --> |

## Appendix B: Dependency Graph

<!-- Document key dependencies between modules. Populated as code is written. -->
