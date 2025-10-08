import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to split text into chunks (ultra-conservative for Cyrillic tokenization)
function chunkText(text: string, maxChunkSize: number = 100): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
}

// Function to create embeddings using Jina AI
async function createEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v3',
      input: [text],
      task: 'retrieval.passage'
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jina AI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, documentName } = await req.json();
    
    if (!pdfText || !documentName) {
      throw new Error('Missing pdfText or documentName');
    }

    console.log(`Processing document: ${documentName}`);
    console.log(`Text length: ${pdfText.length} characters`);

    const jinaApiKey = Deno.env.get('JINA_API_KEY');
    if (!jinaApiKey) {
      throw new Error('JINA_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete existing chunks for this document
    console.log(`Deleting existing chunks for ${documentName}`);
    const { error: deleteError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_name', documentName);

    if (deleteError) {
      console.error('Error deleting existing chunks:', deleteError);
    }

    // Split text into chunks
    const chunks = chunkText(pdfText);
    console.log(`Created ${chunks.length} chunks`);

    // Process chunks in batches to avoid rate limits
    const batchSize = 5;
    let processedCount = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Log chunk sizes for debugging
      console.log(`Batch ${i / batchSize + 1}: chunk sizes:`, batch.map(c => c.length));
      
      const embeddings = await Promise.all(
        batch.map(async (chunk, idx) => {
          try {
            return await createEmbedding(chunk, jinaApiKey);
          } catch (err) {
            console.error(`Error processing chunk ${i + idx} (length: ${chunk.length}):`, err);
            throw err;
          }
        })
      );

      // Insert chunks with embeddings
      const chunksToInsert = batch.map((content, idx) => ({
        content,
        embedding: embeddings[idx],
        document_name: documentName,
        chunk_index: i + idx,
        metadata: {
          length: content.length,
          processed_at: new Date().toISOString(),
        },
      }));

      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(chunksToInsert);

      if (insertError) {
        console.error('Error inserting chunks:', insertError);
        throw insertError;
      }

      processedCount += batch.length;
      console.log(`Processed ${processedCount}/${chunks.length} chunks`);

      // Small delay to avoid rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunksProcessed: chunks.length,
        documentName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});