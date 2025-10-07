#!/usr/bin/env node

/**
 * Скрипт для проверки, загружен ли документ в векторную базу данных
 * 
 * Использование: node scripts/check-document.mjs
 */

import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const DOCUMENT_NAME = 'sp-60-13330-2020';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY должны быть установлены в .env файле');
  process.exit(1);
}

async function checkDocument() {
  console.log('🔍 Проверка наличия документа в базе данных...\n');
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/document_chunks?document_name=eq.${DOCUMENT_NAME}&select=count`,
      {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const contentRange = response.headers.get('content-range');
    
    if (!contentRange) {
      console.log('⚠️  Не удалось получить информацию о документе');
      console.log('   Возможно, таблица document_chunks не создана или недоступна');
      return;
    }

    // Content-Range format: "0-24/142" where 142 is total count
    const totalMatch = contentRange.match(/\/(\d+)/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    console.log(`📊 Результаты проверки:`);
    console.log(`   Документ: ${DOCUMENT_NAME}`);
    console.log(`   Найдено фрагментов: ${total}\n`);

    if (total === 0) {
      console.log('❌ Документ НЕ загружен в базу данных');
      console.log('   Запустите загрузку документа:');
      console.log('   npm run load-sp-pdf  (или)  npm run load-sp-txt\n');
      console.log('   Подробнее: см. LOAD_DOCUMENT.md');
    } else {
      console.log('✅ Документ успешно загружен и готов к использованию!');
      console.log(`   Проиндексировано ${total} фрагментов текста`);
      console.log('   Можно запускать приложение: npm run dev');
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error.message);
    console.log('\nВозможные причины:');
    console.log('1. Неправильные настройки Supabase в .env');
    console.log('2. Таблица document_chunks не создана (запустите миграции)');
    console.log('3. Проблемы с подключением к интернету');
  }
}

checkDocument();

