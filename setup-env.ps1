# Скрипт для создания файла .env
# Использование: .\setup-env.ps1

Write-Host "`n🔧 Настройка переменных окружения для SP-Агент`n" -ForegroundColor Cyan

# Проверка существования .env
if (Test-Path ".env") {
    Write-Host "⚠️  Файл .env уже существует!" -ForegroundColor Yellow
    $overwrite = Read-Host "Перезаписать? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Отменено пользователем." -ForegroundColor Gray
        exit 0
    }
}

# URL Supabase известен из config.toml
$supabaseUrl = "https://xcfywgwbzisuflngcwme.supabase.co"

Write-Host "📋 Проект Supabase: xcfywgwbzisuflngcwme" -ForegroundColor Green
Write-Host "🌐 URL: $supabaseUrl`n" -ForegroundColor Blue

Write-Host "Для продолжения вам нужен Anon Key из Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "1. Откройте: https://supabase.com/dashboard/project/xcfywgwbzisuflngcwme" -ForegroundColor Gray
Write-Host "2. Settings → API → Project API keys" -ForegroundColor Gray
Write-Host "3. Скопируйте ключ 'anon' / 'public'`n" -ForegroundColor Gray

$anonKey = Read-Host "Вставьте Anon Key (или нажмите Enter для временного значения)"

if ([string]::IsNullOrWhiteSpace($anonKey)) {
    $anonKey = "YOUR_ANON_KEY_HERE"
    Write-Host "`n⚠️  Используется временное значение. Не забудьте заменить позже!`n" -ForegroundColor Yellow
}

# Создание содержимого .env
$envContent = @"
# Supabase Configuration
# Автоматически создано: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_PUBLISHABLE_KEY=$anonKey
VITE_SUPABASE_ANON_KEY=$anonKey

# ===== ВАЖНО =====
# Edge Functions переменные (JINA_API_KEY, LOVABLE_API_KEY) 
# настраиваются в Supabase Dashboard, а НЕ в этом файле:
# Settings → Edge Functions → Secrets
"@

# Сохранение файла
try {
    $envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
    Write-Host "✅ Файл .env успешно создан!`n" -ForegroundColor Green
    
    Write-Host "📂 Расположение: $(Get-Location)\.env" -ForegroundColor Blue
    
    if ($anonKey -eq "YOUR_ANON_KEY_HERE") {
        Write-Host "`n⚠️  НЕ ЗАБУДЬТЕ:" -ForegroundColor Yellow
        Write-Host "Откройте .env и замените YOUR_ANON_KEY_HERE на настоящий ключ!`n" -ForegroundColor Yellow
    } else {
        Write-Host "`n🎉 Конфигурация готова!" -ForegroundColor Green
        Write-Host "Проверьте работу командой: npm run check-fix`n" -ForegroundColor Cyan
    }
    
    Write-Host "Следующие шаги:" -ForegroundColor Magenta
    Write-Host "1. npm run check-fix    - проверка конфигурации" -ForegroundColor Gray
    Write-Host "2. npm run apply-fix    - инструкции по исправлению" -ForegroundColor Gray
    Write-Host "3. npm run dev          - запуск приложения`n" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Ошибка создания файла: $_" -ForegroundColor Red
    exit 1
}

Write-Host "💡 Подробная инструкция: НАСТРОЙКА_ENV.md`n" -ForegroundColor Cyan

