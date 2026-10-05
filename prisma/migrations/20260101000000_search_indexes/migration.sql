-- Full-text search indexes.
--
-- `contains` does a sequential scan with ILIKE and cannot use an index, so it
-- degrades linearly with content. GIN indexes over to_tsvector give ranked,
-- stemmed matching that stays fast as the archive grows ("touring" matches
-- "tour", which ILIKE never would).
--
-- Expression indexes must be IMMUTABLE, hence the explicit 'english' config.

CREATE INDEX IF NOT EXISTS "Post_search_idx"
  ON "Post"
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '')));

CREATE INDEX IF NOT EXISTS "Artist_search_idx"
  ON "Artist"
  USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(genre, '') || ' ' || coalesce(bio, '')));

CREATE INDEX IF NOT EXISTS "Episode_search_idx"
  ON "Episode"
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '')));

CREATE INDEX IF NOT EXISTS "Event_search_idx"
  ON "Event"
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(venue, '')));

-- Trigram fallback for short/partial queries, where full-text finds nothing.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Artist_name_trgm_idx" ON "Artist" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx" ON "Post" USING GIN (title gin_trgm_ops);
