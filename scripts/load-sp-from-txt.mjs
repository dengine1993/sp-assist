#!/usr/bin/env node

/**
 * Упрощенный скрипт для загрузки документа СП 60.13330.2020 из TXT файла
 * 
 * Использование:
 * 1. Конвертируйте PDF в TXT и сохраните как public/sp-60-13330-2020.txt
 * 2. Убедитесь, что .env содержит VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY
 * 3. Запустите: node scripts/load-sp-from-txt.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TXT_PATH = join(__dirname, '..', 'public', 'sp-60-13330-2020.txt');
const DOCUMENT_NAME = 'sp-60-13330-2020';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY должны быть установлены в .env файле');
  process.exit(1);
}

if (!existsSync(TXT_PATH)) {
  console.error(`❌ Ошибка: Файл ${TXT_PATH} не найден`);
  console.error('   Пожалуйста, конвертируйте PDF в TXT и сохраните как public/sp-60-13330-2020.txt');
  process.exit(1);
}

async function uploadToSupabase(text, documentName) {
  console.log(`🚀 Загрузка документа "${documentName}" в Supabase...`);
  console.log(`   Размер текста: ${text.length} символов\n`);
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/process-pdf`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          pdfText: text,
          documentName: documentName,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Успешно загружено!`);
    console.log(`   📊 Обработано фрагментов: ${result.chunksProcessed}`);
    console.log(`   📝 Документ: ${result.documentName}`);
    
    return result;
  } catch (error) {
    console.error('❌ Ошибка при загрузке в Supabase:', error);
    throw error;
  }
}

async function main() {
  console.log('🔧 Загрузка документа СП 60.13330.2020 в векторную базу данных\n');
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  console.log(`   TXT файл: ${TXT_PATH}\n`);
  
  try {
    // Читаем текст из файла
    console.log('📄 Чтение текста из файла...');
    const text = readFileSync(TXT_PATH, 'utf-8');
    console.log(`✅ Прочитано ${text.length} символов\n`);
    
    // Загружаем в Supabase
    await uploadToSupabase(text, DOCUMENT_NAME);
    
    console.log('\n✨ Готово! Документ успешно загружен и проиндексирован.');
    console.log('   Теперь DeepSeek будет искать ответы в этом документе.');
  } catch (error) {
    console.error('\n❌ Процесс завершился с ошибкой:', error.message);
    process.exit(1);
  }
}

main();

