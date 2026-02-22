-- Migration 003: Aggiorna rag_documents per nomic-embed-text (768d) e aggiunge colonne mancanti
-- nomic-embed-text produce vettori a 768 dimensioni, non 1536 (OpenAI ada-002)

BEGIN;

-- ── Aggiorna colonna embedding: 1536 → 768 per nomic-embed-text ───────────
-- La tabella è vuota in questo stadio, sicuro fare drop+recreate
ALTER TABLE rag_documents DROP COLUMN IF EXISTS embedding;
ALTER TABLE rag_documents ADD COLUMN embedding vector(768);

-- ── Aggiungi colonne mancanti ─────────────────────────────────────────────
ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS title       TEXT,
  ADD COLUMN IF NOT EXISTS chunk_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- ── Ricrea l'indice ivfflat con le nuove dimensioni ───────────────────────
DROP INDEX IF EXISTS idx_rag_documents_embedding;
CREATE INDEX idx_rag_documents_embedding
  ON rag_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ── Indici aggiuntivi per performance ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rag_documents_course
  ON rag_documents (course_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_lesson
  ON rag_documents (lesson_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_documents_lesson_chunk
  ON rag_documents (lesson_id, chunk_index)
  WHERE lesson_id IS NOT NULL;

-- ── Aggiorna la funzione match_documents per usare 768d ───────────────────
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold  float    DEFAULT 0.5,
  match_count      int      DEFAULT 5,
  filter_course_id uuid     DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  lesson_id   uuid,
  course_id   uuid,
  title       text,
  content     text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    d.id,
    d.lesson_id,
    d.course_id,
    d.title,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM rag_documents d
  WHERE
    (filter_course_id IS NULL OR d.course_id = filter_course_id)
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMIT;
