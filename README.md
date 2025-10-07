# SP-Агент

Универсальный интеллектуальный помощник по строительным нормам и правилам (СП).

## О проекте

SP-Агент — это AI-помощник на базе DeepSeek, использующий технологию RAG (Retrieval-Augmented Generation) для поиска и предоставления информации из любых загруженных документов СП. 

### Основные возможности:

- 🤖 **Умный поиск** - DeepSeek анализирует вопросы и находит релевантные разделы из всех документов
- 📚 **Мультидокументная база знаний** - поддержка неограниченного количества документов СП
- 👨‍💼 **Админ-панель** - удобная загрузка и управление документами через веб-интерфейс
- 👤 **Система регистрации** - создание личных кабинетов для пользователей
- 🔐 **Supabase Auth** - безопасная авторизация с подтверждением email
- 💬 **Контекстные ответы** - система учитывает историю диалога
- 🎯 **Точные ссылки** - ответы с указанием источника (конкретного СП)
- ⚡ **Быстрый отклик** - streaming ответы в реальном времени
- 🏠 **Личный кабинет** - персональное пространство для каждого пользователя

## Project info

**URL**: https://lovable.dev/projects/057b6bc0-0adc-4e6c-ac2c-a12b094640b7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/057b6bc0-0adc-4e6c-ac2c-a12b094640b7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Первоначальная настройка

### 1. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 2. Настройка Supabase Edge Functions

В Supabase Dashboard → Project Settings → Edge Functions добавьте переменные окружения:

```env
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Запуск приложения

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5173

### 4. Загрузка документов СП

После запуска приложения:

1. Нажмите кнопку **"Админ-панель"** в правом верхнем углу
2. Войдите с учетными данными:
   - **Логин:** `admin`
   - **Пароль:** `Chelsea1905`
3. Загрузите документы СП в формате `.txt` через интерфейс

**Подробная инструкция:** См. [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)

## Использование

### Для обычных пользователей

**Регистрация:** http://localhost:5173/register

1. **Создайте аккаунт** - укажите email и пароль
2. **Подтвердите email** - проверьте почту и перейдите по ссылке
3. **Войдите в систему** - используйте свои данные
4. **Доступ к личному кабинету** - управление профилем

**Возможности:**
- ✅ Задавать вопросы SP-Агенту по всем документам
- ✅ Просмотр личного кабинета
- 📝 История запросов (в разработке)
- 🔖 Сохраненные ответы (в разработке)

См. полное руководство: [USER_GUIDE.md](./USER_GUIDE.md)

### Для администраторов

**Доступ:** http://localhost:5173/login

Учетные данные:
- Логин: `admin`
- Пароль: `Chelsea1905`

**Возможности:**
- ✅ Все возможности обычного пользователя
- ✅ Загрузка документов СП в формате .txt
- ✅ Просмотр списка загруженных документов
- ✅ Удаление документов
- ✅ Мониторинг статуса индексации

См. полное руководство: [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)

### Примеры вопросов к SP-Агенту:

- "Какая температура должна быть в жилых помещениях?"
- "Расскажи о требованиях к вентиляции в СП 60.13330.2020"
- "Как рассчитывается воздухообмен?"
- "Сравни требования к отоплению в разных СП"

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

### Frontend:
- **Vite** - Build tool
- **TypeScript** - Type safety
- **React** - UI framework
- **shadcn-ui** - Component library
- **Tailwind CSS** - Styling
- **Tanstack Query** - Data fetching

### Backend:
- **Supabase** - Backend as a Service
- **PostgreSQL + pgvector** - Vector database
- **Supabase Edge Functions** - Serverless functions (Deno)

### AI/ML:
- **DeepSeek** (via OpenRouter) - Large Language Model
- **OpenAI Embeddings** - Text embeddings для векторного поиска
- **RAG (Retrieval-Augmented Generation)** - Поиск по документам

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/057b6bc0-0adc-4e6c-ac2c-a12b094640b7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
