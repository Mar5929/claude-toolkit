-- Upgrade 003: approximate-nearest-neighbour index for semantic recall.
-- Safe to run on an existing database; it only adds an index. Run once per
-- project database that predates this file (new databases get it from schema.sql).

create index if not exists nodes_embedding_idx on nodes using hnsw (embedding vector_cosine_ops);
