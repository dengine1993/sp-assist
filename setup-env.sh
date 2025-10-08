#!/bin/bash
# Скрипт для создания файла .env
# Использование: bash setup-env.sh или ./setup-env.sh

echo -e "\n🔧 Настройка переменных окружения для SP-Агент\n"

# Проверка существования .env
if [ -f ".env" ]; then
    echo -e "⚠️  Файл .env уже существует!"
    read -p "Перезаписать? (y/N): " overwrite
    if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
        echo "Отменено пользователем."
        exit 0
    fi
fi

# URL Supabase известен из config.toml
SUPABASE_URL="https://xcfywgwbzisuflngcwme.supabase.co"

echo -e "📋 Проект Supabase: xcfywgwbzisuflngcwme"
echo -e "🌐 URL: $SUPABASE_URL\n"

echo -e "Для продолжения вам нужен Anon Key из Supabase Dashboard:"
echo -e "1. Откройте: https://supabase.com/dashboard/project/xcfywgwbzisuflngcwme"
echo -e "2. Settings → API → Project API keys"
echo -e "3. Скопируйте ключ 'anon' / 'public'\n"

read -p "Вставьте Anon Key (или нажмите Enter для временного значения): " ANON_KEY

if [ -z "$ANON_KEY" ]; then
    ANON_KEY="YOUR_ANON_KEY_HERE"
    echo -e "\n⚠️  Используется временное значение. Не забудьте заменить позже!\n"
fi

# Создание содержимого .env
cat > .env << EOF
# Supabase Configuration
# Автоматически создано: $(date '+%Y-%m-%d %H:%M:%S')

VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_ANON_KEY=$ANON_KEY

# ===== ВАЖНО =====
# Edge Functions переменные (JINA_API_KEY, LOVABLE_API_KEY) 
# настраиваются в Supabase Dashboard, а НЕ в этом файле:
# Settings → Edge Functions → Secrets
EOF

if [ $? -eq 0 ]; then
    echo -e "✅ Файл .env успешно создан!\n"
    echo -e "📂 Расположение: $(pwd)/.env"
    
    if [ "$ANON_KEY" == "YOUR_ANON_KEY_HERE" ]; then
        echo -e "\n⚠️  НЕ ЗАБУДЬТЕ:"
        echo -e "Откройте .env и замените YOUR_ANON_KEY_HERE на настоящий ключ!\n"
    else
        echo -e "\n🎉 Конфигурация готова!"
        echo -e "Проверьте работу командой: npm run check-fix\n"
    fi
    
    echo -e "Следующие шаги:"
    echo -e "1. npm run check-fix    - проверка конфигурации"
    echo -e "2. npm run apply-fix    - инструкции по исправлению"
    echo -e "3. npm run dev          - запуск приложения\n"
else
    echo -e "❌ Ошибка создания файла"
    exit 1
fi

echo -e "💡 Подробная инструкция: НАСТРОЙКА_ENV.md\n"

