# Data Model — Database Schema

> **Project**: <!-- PROJECT_NAME -->
> **Last Updated**: <!-- YYYY-MM-DD -->
> **Status**: <!-- Draft | In Progress | Final -->

---

## Table Inventory

| Table | Description | Status |
|---|---|---|
| `<!-- table_name -->` | <!-- Description --> | <!-- PLANNED / CREATED / MODIFIED --> |
| `<!-- table_name -->` | <!-- Description --> | <!-- Status --> |
| `<!-- table_name -->` | <!-- Description --> | <!-- Status --> |

---

## Schema Definitions

<!-- 
CONVENTIONS (adjust to your project):
- Naming: snake_case tables and columns. Plural table names.
- Primary keys: UUID v4 or SERIAL/BIGSERIAL.
- Timestamps: created_at and updated_at on every table.
- Soft deletes: deleted_at TIMESTAMPTZ where appropriate.
- Indexes: On all foreign keys and frequently queried columns.
-->

### <!-- Table Group Name (e.g., Core Infrastructure) -->

#### `<!-- table_name -->`

```sql
CREATE TABLE <!-- table_name --> (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    <!-- column_name -->  <!-- DATA_TYPE -->  <!-- CONSTRAINTS -->,
    <!-- column_name -->  <!-- DATA_TYPE -->  <!-- CONSTRAINTS -->,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_<!-- table -->_<!-- column --> ON <!-- table_name -->(<!-- column -->);
```

---

#### `<!-- table_name -->`

```sql
CREATE TABLE <!-- table_name --> (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    <!-- column_name -->  <!-- DATA_TYPE -->  <!-- CONSTRAINTS -->,
    <!-- fk_column -->    UUID NOT NULL REFERENCES <!-- parent_table -->(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_<!-- table -->_<!-- column --> ON <!-- table_name -->(<!-- column -->);
```

---

### <!-- Table Group Name (e.g., Application Tables) -->

#### `<!-- table_name -->`

```sql
CREATE TABLE <!-- table_name --> (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    <!-- Define columns -->
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Enum/Picklist Values:**

| Column | Values |
|---|---|
| `<!-- column -->` | <!-- value1, value2, value3 --> |

---

<!-- Copy the table definition block above for each new table -->

## Relationships

| Parent | Child | FK Column | On Delete |
|---|---|---|---|
| `<!-- parent_table -->` | `<!-- child_table -->` | `<!-- fk_column -->` | <!-- CASCADE / SET NULL / RESTRICT --> |
| `<!-- parent_table -->` | `<!-- child_table -->` | `<!-- fk_column -->` | <!-- On Delete --> |

---

## ERD Diagram

```mermaid
erDiagram
    <!-- parent_table --> ||--o{ <!-- child_table --> : "has"
    <!-- parent_table --> ||--o{ <!-- child_table --> : "has"
    <!-- table_a --> ||--o{ <!-- junction_table --> : "links"
    <!-- table_b --> ||--o{ <!-- junction_table --> : "links"
```

---

## Naming Conventions

| Aspect | Convention | Example |
|---|---|---|
| Tables | <!-- e.g., snake_case, plural --> | `work_items`, `users` |
| Columns | <!-- e.g., snake_case --> | `created_at`, `user_id` |
| Primary keys | <!-- e.g., UUID v4 --> | `id UUID DEFAULT gen_random_uuid()` |
| Foreign keys | <!-- e.g., referenced_table_id --> | `user_id`, `tenant_id` |
| Indexes | <!-- e.g., idx_table_column --> | `idx_users_email` |
| Timestamps | <!-- e.g., TIMESTAMPTZ with default --> | `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| Booleans | <!-- e.g., is_active, has_xxx --> | `is_active`, `is_deleted` |

---

## Migration Notes

<!-- Document migration tool and conventions -->

- **Tool**: <!-- e.g., Alembic, Prisma Migrate, Knex, etc. -->
- **Location**: <!-- e.g., migrations/versions/ -->
- **Convention**: <!-- e.g., Autogenerate → review → commit. Never edit schema directly. -->
