-- Upgrade 002: revision history + review scheduling.
-- Driven by real conversation patterns (see PATTERNS.md).
-- Safe to run on an existing database; it only adds things.

-- Every time a note is updated, its prior content is snapshotted here first.
-- No foreign key on purpose: history survives even if the note is deleted.
create table if not exists node_versions (
  seq          bigserial primary key,
  project_id   text not null,
  id           text not null,
  title        text not null,
  status       text not null,
  markdown     text not null,
  frontmatter  jsonb not null default '{}'::jsonb,
  replaced_at  timestamptz not null default now(),
  replaced_by  text  -- who wrote the newer version (github login or 'curator')
);
create index if not exists node_versions_node_idx on node_versions (project_id, id, seq);

-- "Look at this again after X": open confirms, corrected-premise flags,
-- stale open questions/blockers. Curation sweeps surface anything past due.
alter table nodes add column if not exists review_after timestamptz;
