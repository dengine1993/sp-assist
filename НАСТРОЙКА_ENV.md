# 🔐 Настройка переменных окружения

## Быстрая настройка

### Шаг 1: Создание файла .env

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://xcfywgwbzisuflngcwme.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=ваш_anon_key_здесь
VITE_SUPABASE_ANON_KEY=ваш_anon_key_здесь
```

### Шаг 2: Получение Anon Key

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/xcfywgwbzisuflngcwme)
2. Перейдите в **Settings** → **API**
3. В разделе **Project API keys** найдите ключ **anon** / **public**
4. Скопируйте его
5. Замените `ваш_anon_key_здесь` на скопированный ключ

### Шаг 3: Проверка

Запустите проверку конфигурации:

```bash
npm run check-fix
```

Вы должны увидеть:
```
✅ Локальные переменные окружения настроены
```

## Альтернативный способ (PowerShell)

Если вы на Windows, можете создать .env файл командой:

```powershell
@"
VITE_SUPABASE_URL=https://xcfywgwbzisuflngcwme.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=ваш_anon_key_здесь
VITE_SUPABASE_ANON_KEY=ваш_anon_key_здесь
"@ | Out-File -FilePath .env -Encoding utf8
```

Затем откройте `.env` в редакторе и замените `ваш_anon_key_здесь` на настоящий ключ.

## ⚠️ Безопасность

- ❌ **НЕ** коммитьте файл `.env` в Git
- ❌ **НЕ** храните в `.env` секретные ключи (Service Role Key)
- ✅ Используйте только **Anon Key** (публичный ключ)
- ✅ Секретные ключи для Edge Functions настраиваются в Supabase Dashboard

## Edge Functions Secrets

Следующие ключи настраиваются **только в Supabase Dashboard**, а НЕ в `.env`:

1. **JINA_API_KEY** - для создания embeddings
   - Получить на: https://jina.ai
   - Добавить в: Supabase Dashboard → Settings → Edge Functions → Secrets

2. **LOVABLE_API_KEY** - для чата с AI
   - Получить на: https://lovable.dev
   - Добавить в: Supabase Dashboard → Settings → Edge Functions → Secrets

3. **SUPABASE_SERVICE_ROLE_KEY** - уже доступен в Edge Functions
4. **SUPABASE_URL** - уже доступен в Edge Functions

## Проверка работы

После настройки .env:

```bash
# Проверка конфигурации
npm run check-fix

# Запуск приложения
npm run dev
```

## Troubleshooting

### Ошибка: "Cannot find module 'dotenv'"

```bash
npm install
```

### Ошибка: "VITE_SUPABASE_URL is not defined"

Убедитесь, что:
1. Файл `.env` существует в корне проекта
2. Переменные начинаются с `VITE_`
3. Перезапустите `npm run dev` после создания .env

### Ошибка подключения к Supabase

Проверьте:
1. URL проекта корректен: `https://xcfywgwbzisuflngcwme.supabase.co`
2. Anon Key скопирован полностью без пробелов
3. Проект активен в Supabase Dashboard
