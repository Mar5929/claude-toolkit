-- DragonFly memory MCP server: Postgres schema (Neon).
-- Run once against the Neon database, then run seed.sql.

create extension if not exists vector;

-- One row per project (per-project isolation key).
create table if not exists projects (
  id          text primary key,          -- e.g. 'dragonfly'
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Who may access which project. Private by default: no row = no access.
create table if not exists grants (
  project_id    text not null references projects(id),
  github_login  text not null,
  role          text not null check (role in ('read', 'write', 'admin')),
  created_at    timestamptz not null default now(),
  primary key (project_id, github_login)
);

-- Local fast-path bearer tokens. Only the SHA-256 hash of the token is stored.
create table if not exists tokens (
  id            uuid primary key default gen_random_uuid(),
  token_hash    text not null unique,    -- hex sha-256 of the raw token
  github_login  text not null,           -- token acts as this person; grants still apply
  label         text,                    -- e.g. 'mike-laptop'
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz              -- set to revoke
);

-- Memory nodes. `markdown` holds the FULL node file text (frontmatter + body)
-- so export reproduces the exact markdown file. `frontmatter` is a parsed copy
-- for querying. `embedding` is nullable until Phase 2 writes populate it
-- (Workers AI bge-m3 = 1024 dimensions).
create table if not exists nodes (
  project_id   text not null references projects(id),
  id           text not null,            -- stable node id, e.g. 'dec-0001-slug'
  path         text not null,            -- file path inside brain/, e.g. 'decisions/dec-0001-slug.md'
  type         text not null,            -- decision | knowledge | preference | rule | session | entity | question | blocker | work-item
  title        text not null,
  status       text not null default 'active',
  markdown     text not null,
  frontmatter  jsonb not null default '{}'::jsonb,
  embedding    vector(1024),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (project_id, id)
);

-- Full-text search over title + body, used by recall.
alter table nodes add column if not exists search tsvector
  generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(markdown, ''))) stored;
create index if not exists nodes_search_idx on nodes using gin (search);
create index if not exists nodes_project_idx on nodes (project_id);

-- Approximate-nearest-neighbour index for semantic recall (cosine). hnsw needs
-- no training rows, so it is safe to create on an empty store; recall keeps the
-- `embedding is not null` predicate so null-embedding rows are skipped.
create index if not exists nodes_embedding_idx on nodes using hnsw (embedding vector_cosine_ops);

-- Retrieval quality additions (mirrored in upgrade-001-retrieval.sql):
-- usage tracking, digest pinning, and fast tag lookups.
alter table nodes add column if not exists recall_count     integer not null default 0;
alter table nodes add column if not exists last_recalled_at timestamptz;
alter table nodes add column if not exists pinned boolean not null default false;
create index if not exists nodes_tags_idx on nodes using gin ((frontmatter -> 'tags'));

-- Links between notes as their own table, so recall can pull a note's
-- neighbors (what it depends on, what replaced it, what it belongs to).
create table if not exists edges (
  project_id  text not null references projects(id),
  from_id     text not null,
  to_id       text not null,
  rel         text not null,  -- e.g. depends-on, supersedes, part-of, relates-to
  created_at  timestamptz not null default now(),
  primary key (project_id, from_id, rel, to_id),
  foreign key (project_id, from_id) references nodes (project_id, id) on delete cascade,
  foreign key (project_id, to_id)   references nodes (project_id, id) on delete cascade
);
create index if not exists edges_from_idx on edges (project_id, from_id);
create index if not exists edges_to_idx   on edges (project_id, to_id);

-- Review scheduling: open confirms, corrected-premise flags, stale open items
-- (mirrored in upgrade-002-history.sql; see PATTERNS.md).
alter table nodes add column if not exists review_after timestamptz;

-- Revision history: prior content of a node is snapshotted here on every
-- update. No foreign key on purpose: history survives node deletion.
create table if not exists node_versions (
  seq          bigserial primary key,
  project_id   text not null,
  id           text not null,
  title        text not null,
  status       text not null,
  markdown     text not null,
  frontmatter  jsonb not null default '{}'::jsonb,
  replaced_at  timestamptz not null default now(),
  replaced_by  text
);
create index if not exists node_versions_node_idx on node_versions (project_id, id, seq);

-- The curated digest injected at session start (BRAIN.md equivalent).
create table if not exists digests (
  project_id  text primary key references projects(id),
  markdown    text not null,
  updated_at  timestamptz not null default now()
);

-- Turn journal for capture/curation (used from Phase 2 on; created now so the
-- schema is stable).
create table if not exists journal (
  seq         bigserial primary key,
  project_id  text not null references projects(id),
  entry       jsonb not null,
  drained_at  timestamptz,               -- set when a curation pass consumes it
  created_at  timestamptz not null default now()
);
create index if not exists journal_project_idx on journal (project_id, drained_at);
