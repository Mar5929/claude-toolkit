-- Upgrade 001: retrieval quality additions (edges, usage tracking, pinned flag).
-- Safe to run on an existing database; it only adds things.

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

-- Usage tracking: which notes actually get used, and when last.
alter table nodes add column if not exists recall_count     integer not null default 0;
alter table nodes add column if not exists last_recalled_at timestamptz;

-- Pinned notes are always kept in the digest by the curator.
alter table nodes add column if not exists pinned boolean not null default false;

-- Faster tag-filtered queries against the note front matter.
create index if not exists nodes_tags_idx on nodes using gin ((frontmatter -> 'tags'));
