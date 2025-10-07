#!/usr/bin/env node

/**
 * Скрипт для автоматической загрузки документа СП 60.13330.2020 в векторную базу данных
 * 
 * Использование:
 * 1. Установите зависимости: npm install
 * 2. Убедитесь, что файл .env содержит необходимые переменные окружения
 * 3. Запустите: node scripts/load-sp-document.mjs
 */

import * as pdfjsLib from 'pdfjs-dist';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Настраиваем worker для pdf.js
const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PDF_PATH = join(__dirname, '..', 'public', 'sp-60-13330-2020.pdf');
const DOCUMENT_NAME = 'sp-60-13330-2020';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY должны быть установлены в .env файле');
  process.exit(1);
}

async function extractTextFromPDF(pdfPath) {
  console.log(`📄 Извлечение текста из ${pdfPath}...`);
  
  try {
    const data = new Uint8Array(readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    
    console.log(`📑 Всего страниц: ${pdf.numPages}`);
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
      
      if (i % 10 === 0) {
        console.log(`  ✓ Обработано страниц: ${i}/${pdf.numPages}`);
      }
    }
    
    console.log(`✅ Извлечено ${fullText.length} символов`);
    return fullText;
  } catch (error) {
    console.error('❌ Ошибка при извлечении текста из PDF:', error);
    throw error;
  }
}

async function uploadToSupabase(text, documentName) {
  console.log(`\n🚀 Загрузка документа "${documentName}" в Supabase...`);
  
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
  console.log(`   PDF файл: ${PDF_PATH}\n`);
  
  try {
    // Извлекаем текст из PDF
    const text = await extractTextFromPDF(PDF_PATH);
    
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

