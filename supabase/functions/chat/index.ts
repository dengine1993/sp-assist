import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to create embeddings using OpenAI
async function createEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    console.log('Starting RAG-enhanced chat request');

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    let contextFromPDF = '';

    if (lastUserMessage) {
      try {
        // Create embedding for the user's question
        console.log('Creating embedding for user question');
        const queryEmbedding = await createEmbedding(lastUserMessage.content, openaiApiKey);

        // Search for similar chunks across ALL documents
        console.log('Searching for similar chunks in database');
        const { data: chunks, error } = await supabase.rpc('search_similar_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: 5,
          doc_name: null  // Search across all documents
        });

        if (error) {
          console.error('Error searching chunks:', error);
        } else if (chunks && chunks.length > 0) {
          console.log(`Found ${chunks.length} relevant chunks`);
          
          // Group chunks by document name
          const chunksByDoc = chunks.reduce((acc: any, chunk: any) => {
            const docName = chunk.document_name || 'Неизвестный документ';
            if (!acc[docName]) acc[docName] = [];
            acc[docName].push(chunk);
            return acc;
          }, {});

          contextFromPDF = '\n\nРелевантные разделы из загруженных строительных норм:\n\n';
          
          Object.entries(chunksByDoc).forEach(([docName, docChunks]: [string, any]) => {
            contextFromPDF += `\n📄 ${docName}:\n`;
            docChunks.forEach((chunk: any, idx: number) => {
              contextFromPDF += `[${idx + 1}] ${chunk.content}\n(релевантность: ${(chunk.similarity * 100).toFixed(1)}%)\n\n`;
            });
          });
        } else {
          console.log('No relevant chunks found');
        }
      } catch (embeddingError) {
        console.error('Error in RAG pipeline:', embeddingError);
      }
    }

    // Prepare system message with context
    const systemContent = `Вы - SP-Агент, универсальный помощник по строительным нормам и правилам (СП).

ВАЖНО: Вы работаете ТОЛЬКО с документами СП, загруженными администратором в систему. НЕ используйте информацию из интернета или другие источники.

Правила работы:
1. Отвечайте ТОЛЬКО на основе предоставленного контекста из загруженных документов СП
2. Если в контексте есть релевантная информация - используйте её и обязательно указывайте из какого именно СП взята информация
3. Если контекста недостаточно для ответа - честно скажите: "В загруженных документах СП нет информации по этому вопросу"
4. НЕ придумывайте информацию и НЕ используйте знания вне загруженных документов
5. Когда цитируете документ, всегда упоминайте его название
6. Отвечайте четко, профессионально и по существу${contextFromPDF}`;

    console.log('Sending request to OpenRouter with RAG context');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.app',
        'X-Title': 'SP-Assistant'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3.1:free',
        messages: [
          { role: 'system', content: systemContent },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'OpenRouter API error', details: errorText }), 
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
