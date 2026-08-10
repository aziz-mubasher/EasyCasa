-- EC-25 — Aste document chat + Italian FTS on chunks (hybrid retrieval).
-- Additive. Requires 0050 (buyer_profile/translations). Ops applies before flag enable.

CREATE TABLE IF NOT EXISTS aste_chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id  uuid NOT NULL REFERENCES aste_analyses(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('user', 'assistant')),
  content      text NOT NULL,
  lang         text NOT NULL,
  citations    jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aste_chat_messages_analysis_created_idx
  ON aste_chat_messages (analysis_id, created_at);

COMMENT ON TABLE aste_chat_messages IS
  'EC-25 — grounded Q&A history per analysis; DSAR-exportable; cascades with analysis.';

-- Generated Italian FTS column for lexical retrieval leg (both legs always run).
ALTER TABLE aste_doc_chunks
  ADD COLUMN IF NOT EXISTS text_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('italian', coalesce(text, ''))) STORED;

CREATE INDEX IF NOT EXISTS aste_doc_chunks_text_tsv_gin
  ON aste_doc_chunks USING gin (text_tsv);
