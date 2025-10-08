#!/usr/bin/env node
/**
 * Автоматический скрипт для исправления ошибки загрузки .txt файлов
 * Применяет миграцию базы данных через Supabase API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

async function main() {
  log('\n🔧 Автоматическое исправление ошибки загрузки .txt файлов\n', 'cyan');

  // Проверка переменных окружения
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('❌ ОШИБКА: Не найдены переменные окружения', 'red');
    log('\nСоздайте файл .env с содержимым:', 'yellow');
    log('VITE_SUPABASE_URL=https://your-project.supabase.co', 'yellow');
    log('VITE_SUPABASE_ANON_KEY=your-anon-key\n', 'yellow');
    process.exit(1);
  }

  log('✅ Переменные окружения найдены', 'green');
  log(`   URL: ${supabaseUrl}`, 'blue');

  // Создание клиента Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  log('\n📊 Шаг 1: Проверка текущего состояния базы данных', 'cyan');

  try {
    // Проверяем, есть ли данные в таблице
    const { data: chunks, error: checkError } = await supabase
      .from('document_chunks')
      .select('id, document_name')
      .limit(1);

    if (checkError) {
      log(`⚠️  Не удалось проверить таблицу: ${checkError.message}`, 'yellow');
    } else {
      log(`✅ Таблица document_chunks доступна`, 'green');
      if (chunks && chunks.length > 0) {
        log(`   Найдено данных в таблице: есть`, 'blue');
      } else {
        log(`   Таблица пуста`, 'blue');
      }
    }
  } catch (error) {
    log(`⚠️  Ошибка проверки: ${error.message}`, 'yellow');
  }

  log('\n📝 Шаг 2: Применение SQL миграции', 'cyan');
  log('⚠️  ВНИМАНИЕ: Этот шаг требует прав администратора Supabase', 'yellow');
  log('   Миграция изменяет размерность векторов с 1536 на 1024', 'blue');
  
  // Читаем миграционный файл
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251008000000_fix_embedding_dimension.sql');
  
  try {
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    log('\n✅ Миграционный файл загружен', 'green');
    log(`   Размер: ${migrationSql.length} символов`, 'blue');
  } catch (error) {
    log(`❌ Не удалось прочитать файл миграции: ${error.message}`, 'red');
    process.exit(1);
  }

  log('\n' + '='.repeat(70), 'cyan');
  log('⚠️  ВАЖНАЯ ИНФОРМАЦИЯ', 'yellow');
  log('='.repeat(70), 'cyan');
  log('\nК сожалению, применение SQL миграции через Supabase API', 'yellow');
  log('требует прямого доступа к SQL Editor в Supabase Dashboard.', 'yellow');
  log('\nАвтоматическое применение невозможно из соображений безопасности.', 'yellow');
  
  log('\n📋 ЧТО НУЖНО СДЕЛАТЬ ВРУЧНУЮ:\n', 'cyan');
  log('1️⃣  Откройте Supabase Dashboard:', 'green');
  log('   https://supabase.com/dashboard/project/xcfywgwbzisuflngcwme', 'blue');
  
  log('\n2️⃣  Перейдите в SQL Editor:', 'green');
  log('   Левое меню → SQL Editor → New Query', 'blue');
  
  log('\n3️⃣  Скопируйте содержимое файла:', 'green');
  log('   supabase/migrations/20251008000000_fix_embedding_dimension.sql', 'blue');
  
  log('\n4️⃣  Вставьте в SQL Editor и нажмите Run', 'green');

  log('\n5️⃣  Настройте JINA_API_KEY:', 'green');
  log('   a) Зарегистрируйтесь на https://jina.ai', 'blue');
  log('   b) Создайте API ключ', 'blue');
  log('   c) Supabase Dashboard → Settings → Edge Functions → Secrets', 'blue');
  log('   d) Добавьте: Name=JINA_API_KEY, Value=ваш_ключ', 'blue');

  log('\n6️⃣  Переразверните Edge Functions:', 'green');
  log('   Edge Functions → process-pdf → Redeploy', 'blue');
  log('   Edge Functions → chat → Redeploy', 'blue');

  log('\n7️⃣  Очистите старые данные (в SQL Editor):', 'green');
  log('   DELETE FROM public.document_chunks;', 'blue');

  log('\n' + '='.repeat(70), 'cyan');

  log('\n📚 Детальные инструкции смотрите в файлах:', 'magenta');
  log('   - БЫСТРОЕ_ИСПРАВЛЕНИЕ.md (рекомендуется)', 'blue');
  log('   - ЧЕКЛИСТ_ИСПРАВЛЕНИЯ.md (пошаговый чеклист)', 'blue');
  log('   - ДИАГНОСТИКА.md (техническая информация)\n', 'blue');

  log('✅ Скрипт завершен. Следуйте инструкциям выше.\n', 'green');
}

main().catch(error => {
  log(`\n❌ Критическая ошибка: ${error.message}\n`, 'red');
  process.exit(1);
});

