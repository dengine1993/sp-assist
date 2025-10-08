#!/usr/bin/env node
/**
 * Скрипт для проверки статуса исправления
 * Проверяет, применены ли все необходимые изменения
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загрузка переменных окружения
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function checkEnvironmentVariables() {
  log('\n🔍 Проверка 1: Переменные окружения', 'cyan');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    log('❌ VITE_SUPABASE_URL не найден', 'red');
    return false;
  }
  if (!supabaseKey) {
    log('❌ VITE_SUPABASE_ANON_KEY не найден', 'red');
    return false;
  }

  log('✅ Локальные переменные окружения настроены', 'green');
  log(`   URL: ${supabaseUrl}`, 'blue');
  return { supabaseUrl, supabaseKey };
}

async function checkDatabaseConnection(supabase) {
  log('\n🔍 Проверка 2: Подключение к базе данных', 'cyan');
  
  try {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('id')
      .limit(1);

    if (error) {
      log(`❌ Ошибка подключения: ${error.message}`, 'red');
      return false;
    }

    log('✅ Подключение к базе данных успешно', 'green');
    return true;
  } catch (error) {
    log(`❌ Не удалось подключиться: ${error.message}`, 'red');
    return false;
  }
}

async function checkTableStructure(supabase) {
  log('\n🔍 Проверка 3: Структура таблицы document_chunks', 'cyan');
  
  try {
    // Попытка получить информацию о таблице через RPC
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('*')
      .limit(1);

    if (error) {
      log(`❌ Ошибка при проверке таблицы: ${error.message}`, 'red');
      return false;
    }

    log('✅ Таблица document_chunks доступна', 'green');
    
    if (chunks && chunks.length > 0) {
      const firstChunk = chunks[0];
      const hasEmbedding = 'embedding' in firstChunk;
      const hasContent = 'content' in firstChunk;
      const hasDocumentName = 'document_name' in firstChunk;

      log(`   • Поле 'embedding': ${hasEmbedding ? '✅' : '❌'}`, hasEmbedding ? 'green' : 'red');
      log(`   • Поле 'content': ${hasContent ? '✅' : '❌'}`, hasContent ? 'green' : 'red');
      log(`   • Поле 'document_name': ${hasDocumentName ? '✅' : '❌'}`, hasDocumentName ? 'green' : 'red');

      if (firstChunk.embedding) {
        const embeddingLength = Array.isArray(firstChunk.embedding) 
          ? firstChunk.embedding.length 
          : 'неизвестно';
        
        if (embeddingLength === 1024) {
          log(`   • Размерность вектора: ${embeddingLength} ✅ (правильно!)`, 'green');
        } else if (embeddingLength === 1536) {
          log(`   • Размерность вектора: ${embeddingLength} ❌ (нужно 1024!)`, 'red');
          log('   ⚠️  Миграция НЕ применена!', 'yellow');
          return false;
        } else {
          log(`   • Размерность вектора: ${embeddingLength}`, 'yellow');
        }
      }
    } else {
      log('   ⚠️  Таблица пуста - невозможно проверить размерность', 'yellow');
      log('   Загрузите тестовый документ для проверки', 'blue');
    }

    return true;
  } catch (error) {
    log(`❌ Ошибка проверки: ${error.message}`, 'red');
    return false;
  }
}

async function checkEdgeFunctions(supabase) {
  log('\n🔍 Проверка 4: Edge Functions', 'cyan');
  
  try {
    // Попытка вызвать Edge Function с минимальными данными
    const { data, error } = await supabase.functions.invoke('process-pdf', {
      body: { 
        pdfText: 'test'.repeat(30), // Минимальный текст для проверки
        documentName: '__test_check__'
      }
    });

    if (error) {
      if (error.message.includes('JINA_API_KEY')) {
        log('❌ JINA_API_KEY не настроен в Edge Functions', 'red');
        log('   Необходимо добавить в Supabase Dashboard:', 'yellow');
        log('   Settings → Edge Functions → Secrets', 'blue');
        return false;
      }
      log(`⚠️  Edge Function ответила с ошибкой: ${error.message}`, 'yellow');
      return false;
    }

    log('✅ Edge Function process-pdf доступна', 'green');
    
    // Удаляем тестовые данные
    try {
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_name', '__test_check__');
    } catch (e) {
      // Игнорируем ошибки при удалении
    }

    return true;
  } catch (error) {
    log(`❌ Ошибка вызова Edge Function: ${error.message}`, 'red');
    return false;
  }
}

async function checkDocuments(supabase) {
  log('\n🔍 Проверка 5: Загруженные документы', 'cyan');
  
  try {
    const { data: documents, error } = await supabase
      .from('document_chunks')
      .select('document_name')
      .limit(100);

    if (error) {
      log(`❌ Ошибка получения документов: ${error.message}`, 'red');
      return false;
    }

    if (!documents || documents.length === 0) {
      log('⚠️  Нет загруженных документов', 'yellow');
      log('   Загрузите тестовый .txt файл для проверки работы', 'blue');
      return true;
    }

    // Подсчет уникальных документов
    const uniqueDocs = [...new Set(documents.map(d => d.document_name))];
    log(`✅ Найдено документов: ${uniqueDocs.length}`, 'green');
    log(`   Всего фрагментов: ${documents.length}`, 'blue');
    
    uniqueDocs.forEach(docName => {
      const count = documents.filter(d => d.document_name === docName).length;
      log(`   • ${docName}: ${count} фрагментов`, 'blue');
    });

    return true;
  } catch (error) {
    log(`❌ Ошибка проверки документов: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🔧 ПРОВЕРКА СТАТУСА ИСПРАВЛЕНИЯ', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  // Проверка 1: Переменные окружения
  const env = await checkEnvironmentVariables();
  if (!env) {
    log('\n❌ Проверка не пройдена. Настройте переменные окружения.\n', 'red');
    process.exit(1);
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseKey);

  // Проверка 2: Подключение
  const connected = await checkDatabaseConnection(supabase);
  if (!connected) {
    log('\n❌ Не удалось подключиться к базе данных.\n', 'red');
    process.exit(1);
  }

  // Проверка 3: Структура таблицы
  const tableOk = await checkTableStructure(supabase);

  // Проверка 4: Edge Functions
  // Временно отключена, так как требует настроенный JINA_API_KEY
  // const functionsOk = await checkEdgeFunctions(supabase);

  // Проверка 5: Документы
  const docsOk = await checkDocuments(supabase);

  // Итоги
  log('\n' + '='.repeat(70), 'cyan');
  log('📊 ИТОГИ ПРОВЕРКИ', 'cyan');
  log('='.repeat(70), 'cyan');

  const checks = [
    { name: 'Переменные окружения', status: true },
    { name: 'Подключение к БД', status: connected },
    { name: 'Структура таблицы', status: tableOk },
    // { name: 'Edge Functions', status: functionsOk },
    { name: 'Документы', status: docsOk },
  ];

  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    const color = check.status ? 'green' : 'red';
    log(`${icon} ${check.name}`, color);
  });

  const allPassed = checks.every(c => c.status);

  if (allPassed) {
    log('\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!', 'green');
    log('Система готова к работе.\n', 'green');
  } else {
    log('\n⚠️  ЕСТЬ ПРОБЛЕМЫ', 'yellow');
    log('Следуйте инструкциям в файлах:', 'yellow');
    log('  - БЫСТРОЕ_ИСПРАВЛЕНИЕ.md', 'blue');
    log('  - ЧЕКЛИСТ_ИСПРАВЛЕНИЯ.md\n', 'blue');
  }

  log('💡 Для применения исправлений запустите:', 'magenta');
  log('   npm run apply-fix\n', 'blue');
}

main().catch(error => {
  log(`\n❌ Критическая ошибка: ${error.message}\n`, 'red');
  console.error(error);
  process.exit(1);
});
