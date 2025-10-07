# Настройка системы авторизации

Этот документ описывает техническую настройку системы регистрации и авторизации в SP-Агент.

## Архитектура авторизации

### Две системы авторизации:

1. **Supabase Auth** - для обычных пользователей
2. **Локальная авторизация** - для администратора (admin/Chelsea1905)

### Почему две системы?

- **Администратор** не должен зависеть от Supabase Auth (независимый доступ)
- **Пользователи** получают все преимущества Supabase Auth (восстановление пароля, OAuth и т.д.)

## Настройка Supabase Auth

### 1. Включение Email Auth

В Supabase Dashboard:

1. Перейдите в **Authentication** → **Settings**
2. Найдите **Auth Providers**
3. Убедитесь, что **Email** включен
4. Настройте **Email Templates** (опционально)

### 2. Настройка Email провайдера

По умолчанию Supabase использует встроенный SMTP. Для production рекомендуется:

**Перейдите в Settings → Email:**

```
SMTP Settings:
- Host: smtp.gmail.com (или другой)
- Port: 587
- Username: your-email@gmail.com
- Password: your-app-password
```

### 3. Настройка подтверждения Email

В **Authentication** → **Settings** → **Email Auth**:

- ✅ **Enable email confirmations** - требовать подтверждение email
- ⏱️ **Email confirmation timeout** - 24 часа (по умолчанию)

### 4. Кастомизация Email шаблонов (опционально)

В **Authentication** → **Email Templates**:

**Confirm signup:**
```html
<h2>Подтверждение регистрации в SP-Агент</h2>
<p>Здравствуйте!</p>
<p>Спасибо за регистрацию в SP-Агент - помощнике по строительным нормам.</p>
<p><a href="{{ .ConfirmationURL }}">Подтвердите ваш email</a></p>
```

**Invite user, Reset password, Change email** - настраиваются аналогично.

## Структура AuthContext

### Основные состояния:

```typescript
interface AuthContextType {
  user: User | null;           // Supabase пользователь
  isAdmin: boolean;            // Флаг администратора
  isAuthenticated: boolean;    // Общий флаг авторизации
  loading: boolean;            // Загрузка состояния
  
  // Методы
  loginAdmin: (username, password) => boolean;
  loginUser: (email, password) => Promise<{success, error}>;
  signUp: (email, password, fullName) => Promise<{success, error}>;
  logout: () => Promise<void>;
}
```

### Логика работы:

1. **При загрузке приложения:**
   - Проверяется localStorage для админа
   - Проверяется Supabase сессия для пользователей

2. **При входе:**
   - Admin → локальная проверка → localStorage
   - User → Supabase Auth → JWT токен

3. **При выходе:**
   - Очищается localStorage (если админ)
   - Вызывается supabase.auth.signOut() (если пользователь)

## Защищенные роуты

### ProtectedRoute компонент:

```typescript
<Route path="/profile" element={
  <ProtectedRoute>
    <Profile />
  </ProtectedRoute>
} />
```

**Логика:**
1. Проверяет `loading` - показывает спиннер
2. Проверяет `isAuthenticated` - редирект на /user-login
3. Сохраняет attempted location для возврата после логина

### Доступ к роутам:

| Роут | Доступ |
|------|--------|
| `/` | Все |
| `/register` | Неавторизованные |
| `/user-login` | Неавторизованные |
| `/login` | Неавторизованные |
| `/profile` | Только пользователи |
| `/admin` | Только админ |

## Хранение данных пользователя

### Supabase User Metadata:

При регистрации сохраняется:

```typescript
{
  email: "user@example.com",
  user_metadata: {
    full_name: "Иван Иванов"
  }
}
```

**Доступ к данным:**
```typescript
const { user } = useAuth();
const fullName = user?.user_metadata?.full_name;
const email = user?.email;
```

### Расширение метаданных:

В будущем можно добавить:
```typescript
user_metadata: {
  full_name: "Иван Иванов",
  phone: "+7 900 123 45 67",
  organization: "ООО Строй",
  position: "Инженер"
}
```

## Безопасность

### Текущая реализация:

**Admin:**
- ❌ Пароль в коде (для демо)
- ✅ localStorage (доступ только с устройства)
- ⚠️ Без шифрования

**Users:**
- ✅ Supabase Auth (bcrypt)
- ✅ JWT токены
- ✅ HTTPS (в production)
- ✅ Email подтверждение

### Рекомендации для production:

1. **Админ:**
   ```typescript
   const ADMIN_USERNAME = process.env.VITE_ADMIN_USERNAME;
   const ADMIN_PASSWORD = process.env.VITE_ADMIN_PASSWORD;
   ```

2. **Пользователи:**
   - Включить 2FA (Supabase поддерживает)
   - Настроить OAuth providers (Google, GitHub)
   - Логирование входов

3. **Общее:**
   - Rate limiting
   - CORS настройки
   - CSP headers

## Row Level Security (RLS)

### Для будущих таблиц пользователей:

```sql
-- Таблица профилей
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- RLS политика
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);
```

## OAuth провайдеры (опционально)

### Настройка Google OAuth:

1. **Создайте OAuth приложение** в Google Cloud Console
2. **В Supabase** → Authentication → Providers → Google
3. **Включите** Google provider
4. **Добавьте** Client ID и Client Secret

### Использование в коде:

```typescript
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });
  if (error) console.error(error);
};
```

Аналогично для GitHub, Facebook и др.

## Восстановление пароля

### Функция (для будущей реализации):

```typescript
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:5173/reset-password',
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};
```

### Email шаблон:

```html
<h2>Восстановление пароля</h2>
<p>Вы запросили восстановление пароля для SP-Агент.</p>
<p><a href="{{ .ConfirmationURL }}">Сбросить пароль</a></p>
<p>Если это были не вы, проигнорируйте это письмо.</p>
```

## Миграция данных

### При обновлении с v2.0 на v3.0:

Старые пользователи (если были):
```sql
-- Нет миграции, т.к. в v2.0 не было пользователей
-- Все пользователи создаются с нуля в v3.0
```

## Тестирование

### Тестовые сценарии:

1. **Регистрация:**
   - ✅ Успешная регистрация
   - ❌ Существующий email
   - ❌ Слабый пароль
   - ❌ Несовпадающие пароли

2. **Вход:**
   - ✅ Правильные данные
   - ❌ Неправильный email
   - ❌ Неправильный пароль
   - ❌ Неподтвержденный email

3. **Защищенные роуты:**
   - ✅ Доступ с авторизацией
   - ❌ Редирект без авторизации
   - ✅ Возврат после логина

## Мониторинг

### В Supabase Dashboard:

**Authentication → Users:**
- Список всех пользователей
- Дата регистрации
- Последний вход
- Статус email (подтвержден/нет)

**Authentication → Logs:**
- История входов
- Ошибки авторизации
- API запросы

## Troubleshooting

### Email не приходит:

1. Проверьте спам
2. Проверьте SMTP настройки
3. Проверьте логи в Supabase

### Пользователь не может войти:

1. Email подтвержден?
2. Правильный пароль?
3. Проверьте Supabase logs

### Сессия сбрасывается:

1. Проверьте JWT expiry settings
2. Проверьте localStorage (не очищается ли)
3. Проверьте CORS settings

---

**Для дополнительной помощи:**
- Документация Supabase: https://supabase.com/docs/guides/auth
- Наши документы: `USER_GUIDE.md`, `ADMIN_GUIDE.md`

