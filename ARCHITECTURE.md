# Архитектура SP-Assistant

Этот документ описывает техническую архитектуру системы SP-Assistant и принципы её работы.

## Обзор системы

SP-Assistant — это RAG-система (Retrieval-Augmented Generation), которая использует векторный поиск для предоставления точных ответов из документа СП 60.13330.2020.

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │─────▶│  React App   │─────▶│  Supabase   │
│             │◀─────│  (Frontend)  │◀─────│ Edge Funcs  │
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                   │
                         ┌─────────────────────────┼────────────────┐
                         │                         │                │
                         ▼                         ▼                ▼
                  ┌─────────────┐          ┌─────────────┐  ┌──────────┐
                  │  PostgreSQL │          │   OpenAI    │  │OpenRouter│
                  │  + pgvector │          │  Embeddings │  │ DeepSeek │
                  └─────────────┘          └─────────────┘  └──────────┘
```

## Компоненты системы

### 1. Frontend (React + TypeScript)

**Основные файлы:**
- `src/pages/Index.tsx` - главная страница с чатом
- `src/components/ChatInput.tsx` - поле ввода сообщений
- `src/components/ChatMessage.tsx` - отображение сообщений

**Функциональность:**
- Отправка вопросов пользователя
- Получение streaming ответов от DeepSeek
- Отображение истории диалога

### 2. Backend (Supabase Edge Functions)

#### 2.1. Chat Function (`supabase/functions/chat/index.ts`)

Основная функция для обработки запросов пользователя.

**Workflow:**

1. **Получение запроса** - принимает историю сообщений от пользователя
2. **Создание embedding** - преобразует последний вопрос пользователя в вектор (1536 измерений)
   ```typescript
   const queryEmbedding = await createEmbedding(lastUserMessage.content, openaiApiKey);
   ```

3. **Векторный поиск** - ищет похожие фрагменты в базе данных
   ```typescript
   const { data: chunks } = await supabase.rpc('search_similar_chunks', {
     query_embedding: queryEmbedding,
     match_threshold: 0.7,      // минимальная схожесть 70%
     match_count: 5,             // топ-5 релевантных фрагментов
     doc_name: 'sp-60-13330-2020'
   });
   ```

4. **Формирование контекста** - найденные фрагменты добавляются в системный промпт
   ```typescript
   const systemContent = `Вы - SP-Assistant...
   
   Релевантные разделы из СП 60.13330.2020:
   [1] ${chunk1.content} (релевантность: 85%)
   [2] ${chunk2.content} (релевантность: 78%)
   ...`;
   ```

5. **Генерация ответа** - DeepSeek генерирует ответ на основе контекста
   ```typescript
   const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
     model: 'deepseek/deepseek-chat-v3.1:free',
     messages: [
       { role: 'system', content: systemContent },
       ...messages
     ],
     stream: true
   });
   ```

6. **Streaming ответа** - ответ передается пользователю в реальном времени

#### 2.2. Process-PDF Function (`supabase/functions/process-pdf/index.ts`)

Функция для обработки и индексации документов.

**Workflow:**

1. **Получение текста** - принимает текст документа (из PDF или TXT)
2. **Chunking** - разбивает текст на фрагменты
   ```typescript
   function chunkText(text: string, maxChunkSize = 1000): string[] {
     // Разбивает по параграфам, объединяя в фрагменты до 1000 символов
   }
   ```

3. **Создание embeddings** - для каждого фрагмента создается вектор
   ```typescript
   const embeddings = await Promise.all(
     batch.map(chunk => createEmbedding(chunk, openaiApiKey))
   );
   ```

4. **Сохранение в БД** - фрагменты с embeddings сохраняются
   ```typescript
   await supabase.from('document_chunks').insert({
     content: chunk,
     embedding: embedding,
     document_name: 'sp-60-13330-2020',
     chunk_index: index
   });
   ```

### 3. База данных (PostgreSQL + pgvector)

#### Таблица `document_chunks`

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,                -- текст фрагмента
  embedding vector(1536),               -- вектор OpenAI
  metadata JSONB,                       -- дополнительная информация
  document_name TEXT NOT NULL,          -- имя документа
  chunk_index INTEGER NOT NULL,         -- порядковый номер
  created_at TIMESTAMP
);
```

#### Функция векторного поиска

```sql
CREATE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  doc_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB,
  chunk_index INTEGER
)
```

**Алгоритм:**
- Использует косинусное расстояние (`<=>` operator)
- Индекс IVFFlat для быстрого поиска
- Возвращает только фрагменты со схожестью > threshold

### 4. Внешние API

#### 4.1. OpenAI Embeddings API

**Модель:** `text-embedding-3-small`
- Размерность: 1536
- Стоимость: ~$0.02 за 1M токенов
- Скорость: ~500 запросов/мин

**Использование:**
- Создание embeddings для фрагментов документа (при индексации)
- Создание embedding для вопроса пользователя (при поиске)

#### 4.2. OpenRouter (DeepSeek)

**Модель:** `deepseek/deepseek-chat-v3.1:free`
- Контекст: 64K токенов
- Streaming: да
- Стоимость: бесплатно

**Использование:**
- Генерация ответов на основе контекста из документа

## Процесс обработки запроса (End-to-End)

```
1. Пользователь: "Какая температура должна быть в жилых помещениях?"
   │
   ▼
2. Frontend отправляет на /functions/v1/chat
   │
   ▼
3. Chat Function:
   ├─ Создает embedding вопроса через OpenAI
   │  [0.123, -0.456, 0.789, ...] (1536 чисел)
   │
   ├─ Ищет похожие фрагменты в БД
   │  SELECT * FROM document_chunks
   │  WHERE 1 - (embedding <=> query_embedding) > 0.7
   │  ORDER BY embedding <=> query_embedding
   │  LIMIT 5
   │
   ├─ Находит топ-5 релевантных фрагментов:
   │  [1] "5.2.1 Температура в жилых помещениях..." (87% схожесть)
   │  [2] "Таблица 5.1 - Расчетные параметры..." (82% схожесть)
   │  [3] "5.2.3 Допустимые отклонения..." (79% схожесть)
   │  ...
   │
   ├─ Формирует промпт с контекстом
   │  System: "Вы SP-Assistant. Вот релевантные разделы: ..."
   │  User: "Какая температура должна быть в жилых помещениях?"
   │
   └─ Отправляет на DeepSeek
      │
      ▼
4. DeepSeek генерирует ответ на основе контекста
   "Согласно разделу 5.2.1 СП 60.13330.2020,
    температура в жилых помещениях должна быть..."
   │
   ▼
5. Frontend получает streaming ответ и отображает
```

## Ключевые параметры настройки

### Векторный поиск

```typescript
// supabase/functions/chat/index.ts

match_threshold: 0.7   // Порог схожести (0.0-1.0)
                       // ↑ больше = строже (меньше результатов)
                       // ↓ меньше = мягче (больше результатов)

match_count: 5         // Количество фрагментов в контексте
                       // ↑ больше = больше контекста (но дороже)
                       // ↓ меньше = меньше контекста (экономия токенов)
```

### Chunking

```typescript
// supabase/functions/process-pdf/index.ts

maxChunkSize: 1000     // Размер фрагмента в символах
                       // ↑ больше = меньше фрагментов (хуже точность)
                       // ↓ меньше = больше фрагментов (лучше точность, но дороже)

batchSize: 5           // Фрагментов в одном batch для embeddings
                       // Влияет на скорость обработки и rate limits
```

## Безопасность

### Row Level Security (RLS)

```sql
-- Чтение разрешено всем
CREATE POLICY "Allow public read access"
ON document_chunks FOR SELECT
USING (true);

-- Запись разрешена всем (для загрузки документов)
CREATE POLICY "Allow public insert access"
ON document_chunks FOR INSERT
WITH CHECK (true);
```

**Примечание:** В production рекомендуется ограничить доступ на запись.

### API Keys

- **Frontend (.env):** Только anon key (ограниченный доступ)
- **Edge Functions:** Service role key (полный доступ)
- **OpenAI/OpenRouter:** Хранятся только на сервере

## Масштабирование

### Производительность

**Текущая конфигурация:**
- ~142 фрагмента документа
- Поиск: ~50-100ms
- Генерация ответа: ~1-3 секунды (streaming)

**Оптимизация для больших документов:**

1. **Увеличить lists в индексе:**
   ```sql
   CREATE INDEX ... USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 1000);  -- вместо 100
   ```

2. **Использовать HNSW вместо IVFFlat:**
   ```sql
   CREATE INDEX ... USING hnsw (embedding vector_cosine_ops);
   ```

3. **Кэширование частых запросов**

### Стоимость

**При 1000 запросов в день:**
- OpenAI Embeddings: ~$0.50/месяц
- DeepSeek: $0 (бесплатная модель)
- Supabase: Free tier (до 500MB БД)

**Итого:** ~$0.50/месяц

## Troubleshooting

### Низкое качество ответов

**Проблема:** Система не находит релевантные фрагменты

**Решения:**
1. Снизить `match_threshold` (с 0.7 до 0.6)
2. Увеличить `match_count` (с 5 до 10)
3. Улучшить chunking (разбивать по смысловым блокам)

### Медленная индексация

**Проблема:** Загрузка документа занимает слишком много времени

**Решения:**
1. Увеличить `batchSize` (но следить за rate limits)
2. Использовать параллельную обработку
3. Кэшировать embeddings

### Ошибки векторного поиска

**Проблема:** `search_similar_chunks` возвращает ошибку

**Решения:**
1. Проверить размерность векторов (должна быть 1536)
2. Пересоздать индекс `document_chunks_embedding_idx`
3. Обновить расширение pgvector

## Дальнейшее развитие

Возможные улучшения:

1. **Гибридный поиск** - комбинация векторного и полнотекстового поиска
2. **Переранжирование** - использование reranker моделей
3. **Chunking с контекстом** - добавление соседних фрагментов
4. **Мультидокументный поиск** - работа с несколькими нормативами
5. **Кэширование** - Redis для частых запросов
6. **Аналитика** - отслеживание качества ответов

---

Для вопросов по архитектуре или предложений по улучшению создайте Issue в репозитории.

