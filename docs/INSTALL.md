# Установка QArness

## Автоматическая установка

### Linux/macOS

Запустите команду в терминале:

```bash
curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash
```

Или с wget:

```bash
wget -qO- https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash
```

### Windows

Запустите в PowerShell:

```powershell
iwr -useb https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.ps1 | iex
```

## Установка через корпоративный прокси

### Linux/macOS

```bash
HTTP_PROXY=http://proxy.company.com:8080 curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash
```

Или:

```bash
export HTTP_PROXY=http://proxy.company.com:8080
curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash
```

### Windows

```powershell
$env:HTTP_PROXY="http://proxy.company.com:8080"
iwr -useb https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.ps1 | iex
```

### С аутентификацией прокси

Если прокси требует аутентификацию:

```bash
# Linux/macOS
HTTP_PROXY=http://username:password@proxy.company.com:8080 curl -fsSL ...

# Windows
$env:HTTP_PROXY="http://username:password@proxy.company.com:8080"
```

## Системные требования

### Обязательные

- **Git** >= 2.0
  - Linux: `sudo apt install git` или `sudo yum install git`
  - macOS: `brew install git` или установлен по умолчанию с Xcode
  - Windows: https://git-scm.com/download/win

- **Node.js** >= 18.0
  - Инсталлятор попытается установить автоматически
  - Ручная установка: https://nodejs.org/

- **npm** (обычно устанавливается с Node.js)

### Рекомендуемые

- **jq** - для работы с JSON (или python3 как альтернатива)
  - Linux: `sudo apt install jq`
  - macOS: `brew install jq`
  - Windows: `choco install jq` или `scoop install jq`

- **Python 3** - альтернатива для обработки JSON

## Ручная установка

Если автоматическая установка не работает, можно установить вручную:

### Шаг 1: Клонирование репозитория

```bash
git clone https://github.com/vnewhatson-code/QArness.git ~/.qarness
cd ~/.qarness
```

С прокси:

```bash
git -c http.proxy=http://proxy.company.com:8080 clone https://github.com/vnewhatson-code/QArness.git ~/.qarness
```

### Шаг 2: Установка зависимостей

```bash
bash scripts/install-deps.sh
```

### Шаг 3: Настройка интеграции с AI-ассистентом

Для OpenCode:

```bash
bash scripts/integrate-ai.sh opencode ~/.config/opencode
```

Для Claude Desktop:

**macOS:**
```bash
bash scripts/integrate-ai.sh claude ~/Library/Application\ Support/Claude
```

**Linux:**
```bash
bash scripts/integrate-ai.sh claude ~/.config/claude
```

**Windows (Git Bash):**
```bash
bash scripts/integrate-ai.sh claude "$APPDATA/Claude"
```

### Шаг 4: Добавление CLI в PATH

**Linux/macOS:**

```bash
# Создать symlink (требуются права)
sudo ln -s ~/.qarness/qarness /usr/local/bin/qarness

# Или добавить в PATH через .bashrc/.zshrc
echo 'export PATH="$HOME/.qarness:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Windows:**

Добавьте `%USERPROFILE%\.qarness` в переменную PATH через:
- Параметры системы → Дополнительно → Переменные среды
- Или PowerShell: `[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:USERPROFILE\.qarness", "User")`

## Настройка прокси после установки

После установки вы можете настроить прокси через команду qarness:

```bash
# Установить прокси
qarness config proxy set http://proxy.company.com:8080

# С аутентификацией
qarness config proxy set http://username:password@proxy.company.com:8080

# Проверить работоспособность
qarness config proxy test

# Удалить прокси
qarness config proxy clear
```

Прокси будет автоматически применен для:
- Git операций (клонирование, pull, fetch)
- npm установки пакетов
- Загрузок через curl/wget

## Проверка установки

После установки проверьте статус:

```bash
qarness status
```

Вывод должен показать:
- Версию QArness
- Путь установки
- Интегрированные AI-ассистенты
- Установленные зависимости
- Настройки прокси (если есть)

Для диагностики проблем:

```bash
qarness doctor
```

## Обновление

Проверить и установить обновления:

```bash
qarness update
```

QArness автоматически проверяет обновления раз в день при запуске команд.

## Удаление

Для полного удаления QArness:

```bash
qarness remove
```

Эта команда:
- Удалит интеграции из конфигураций AI-ассистентов
- Удалит CLI команду из PATH
- Удалит все файлы QArness (~/.qarness/)

## Возможные проблемы

### Git не найден

```
[ERROR] Git не найден
```

**Решение:** Установите Git для вашей ОС (см. Системные требования)

### Нет прав для создания symlink

```
[WARN] Нет прав записи в /usr/local/bin
```

**Решение:** Используйте sudo или добавьте в PATH вручную:
```bash
echo 'export PATH="$HOME/.qarness:$PATH"' >> ~/.bashrc
```

### Прокси не работает

```
[ERROR] Не удалось подключиться через прокси
```

**Решение:**
1. Проверьте URL прокси: `qarness config proxy test`
2. Убедитесь, что прокси доступен: `curl --proxy http://proxy:8080 https://github.com`
3. Проверьте аутентификацию (если требуется)

### AI-ассистент не обнаружен

```
[WARN] AI-ассистенты не обнаружены
```

**Решение:**
1. Убедитесь, что AI-ассистент установлен
2. Укажите путь вручную: `qarness integrate opencode <путь-к-конфигурации>`

## Дополнительная информация

- **CLI документация:** [CLI.md](CLI.md)
- **Решение проблем:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **GitHub:** https://github.com/vnewhatson-code/QArness
