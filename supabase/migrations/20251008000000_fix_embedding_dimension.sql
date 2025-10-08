-- Fix embedding dimension for Jina AI embeddings (1024 instead of 1536)

-- Drop existing policies, function, and indexes that depend on the column
DROP POLICY IF EXISTS "Allow public insert access to document chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Allow public read access to document chunks" ON public.document_chunks;
DROP FUNCTION IF EXISTS public.search_similar_chunks(vector(1536), FLOAT, INT, TEXT);
DROP INDEX IF EXISTS public.document_chunks_embedding_idx;

-- Alter the embedding column to use vector(1024) for Jina AI
ALTER TABLE public.document_chunks 
ALTER COLUMN embedding TYPE vector(1024);

-- Recreate the index with the new dimension
CREATE INDEX document_chunks_embedding_idx 
ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Recreate the search function with the new dimension
CREATE OR REPLACE FUNCTION public.search_similar_chunks(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  doc_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB,
  chunk_index INTEGER,
  document_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity,
    document_chunks.metadata,
    document_chunks.chunk_index,
    document_chunks.document_name
  FROM public.document_chunks
  WHERE 
    (doc_name IS NULL OR document_chunks.document_name = doc_name)
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Recreate RLS policies
CREATE POLICY "Allow public read access to document chunks"
ON public.document_chunks FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to document chunks"
ON public.document_chunks FOR INSERT
WITH CHECK (true);

-- Add DELETE policy for document updates
CREATE POLICY "Allow public delete access to document chunks"
ON public.document_chunks FOR DELETE
USING (true);
