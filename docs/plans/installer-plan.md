# План реализации инсталлятора QArness

## Общая концепция

Создать универсальный cross-platform инсталлятор для QArness, который будет устанавливаться одной командой и работать с различными AI-ассистентами (OpenCode, Claude Desktop и др.).

## 1. Архитектура инсталлятора

### 1.1 Структура проекта
```
QArness/
├── install.sh              # Основной инсталляционный скрипт для Unix-систем
├── install.ps1             # Инсталляционный скрипт для Windows PowerShell
├── qarness                 # CLI утилита для управления (написана на bash)
├── qarness.cmd             # Windows wrapper для CLI
├── agents/                 # Существующие агенты
├── skills/                 # Существующие навыки
├── config/                 # Новая директория с конфигурациями
│   ├── opencode-template.json       # Шаблон для OpenCode
│   ├── claude-template.json         # Шаблон для Claude Desktop
│   ├── ai-detectors.json            # Правила определения AI-ассистентов
│   └── proxy-config.json            # Настройки прокси
├── scripts/                # Вспомогательные скрипты
│   ├── detect-ai.sh        # Определение установленных AI-ассистентов
│   ├── install-deps.sh     # Установка зависимостей
│   ├── proxy-setup.sh      # Настройка прокси
│   ├── version-check.sh    # Проверка версий
│   └── integrate-ai.sh     # Интеграция с AI-ассистентами
├── lib/                    # Библиотеки для CLI
│   ├── common.sh           # Общие функции
│   ├── config-manager.sh   # Управление конфигурацией
│   └── proxy-handler.sh    # Обработка прокси
├── docs/
│   ├── INSTALL.md          # Детальная инструкция установки
│   ├── CLI.md              # Документация CLI команд
│   └── TROUBLESHOOTING.md  # Решение проблем
├── .version                # Файл версии
└── README.md               # Обновленный README
```

### 1.2 Путь установки
- **Unix (Linux/macOS)**: `~/.qarness/`
- **Windows**: `%USERPROFILE%\.qarness\`

После установки создать символические ссылки/интеграцию с AI-ассистентами.

---

## 2. Основные компоненты инсталлятора

### 2.1 Входная точка установки

**Команда для установки:**
```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash

# Или с wget
wget -qO- https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash

# Windows (PowerShell)
iwr -useb https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.ps1 | iex
```

### 2.2 Процесс установки (install.sh/install.ps1)

**Этапы установки:**

1. **Детектирование окружения**
   - Определить операционную систему (Linux/macOS/Windows)
   - Определить архитектуру (x64/arm64)
   - Проверить права доступа

2. **Проверка зависимостей**
   - Git (для клонирования репозитория)
   - Node.js (>=18.x для утилит)
   - Python (>=3.8, опционально)
   
3. **Определение установленных AI-ассистентов**
   - OpenCode: проверить `~/.config/opencode/` или `%APPDATA%\opencode\`
   - Claude Desktop: проверить `~/Library/Application Support/Claude/` (macOS) или `%APPDATA%\Claude\` (Windows)
   - Другие поддерживаемые ассистенты
   
4. **Клонирование/копирование файлов QArness**
   ```bash
   git clone https://github.com/vnewhatson-code/QArness.git ~/.qarness/
   # Или скачивание релиза
   ```

5. **Автоматическая установка зависимостей**
   - Установить Node.js (если отсутствует)
   - Установить/настроить XMind MCP server
   - Проверить наличие OpenCode

6. **Настройка интеграции с AI-ассистентами**
   - Для каждого найденного ассистента:
     - Создать/обновить конфигурационные файлы
     - Добавить пути к агентам и навыкам QArness
     - Настроить MCP серверы

7. **Создание CLI команды `qarness`**
   - Добавить исполняемый файл в PATH
   - Для Unix: создать symlink в `/usr/local/bin/qarness`
   - Для Windows: добавить в PATH через переменные окружения

8. **Вывод итогов установки**
   - Список установленных компонентов
   - Интегрированные AI-ассистенты
   - Инструкции по использованию

---

## 3. CLI утилита `qarness`

### 3.1 Команды
```bash
qarness install          # Установка/переустановка QArness
qarness update           # Проверка и установка обновлений
qarness config           # Управление конфигурацией
qarness status           # Статус установки и интеграций
qarness integrate [ai]   # Интеграция с конкретным AI-ассистентом
qarness remove           # Удаление QArness
qarness version          # Версия QArness
qarness doctor           # Диагностика проблем
```

### 3.2 Реализация
- Язык: **Bash** для основного функционала (кроссплатформенность через Git Bash на Windows)

---

## 4. Система интеграции с AI-ассистентами

### 4.1 OpenCode интеграция

**Файл**: `~/.config/opencode/opencode.json` (или `~/.config/opencode/opencode.jsonc`)

**Действия инсталлятора:**
1. Проверить существование файла конфигурации
2. Добавить/обновить секции:
   ```json
   {
     "agents": {
       "paths": ["~/.qarness/agents"]
     },
     "skills": {
       "paths": ["~/.qarness/skills"]
     },
     "mcpServers": {
       "xmind": {
         "command": "node",
         "args": ["path/to/xmind-mcp-server"]
       }
     }
   }
   ```
3. Создать бэкап перед изменениями

### 4.2 Claude Desktop интеграция

**Файл**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

**Действия инсталлятора:**
1. Аналогично OpenCode
2. Добавить пути к агентам и навыкам
3. Настроить MCP серверы

### 4.3 Универсальная конфигурация

Создать файл `~/.qarness/config.json`:
```json
{
  "version": "1.0.0",
  "installedAt": "2026-05-20T12:00:00Z",
  "integrations": {
    "opencode": {
      "enabled": true,
      "configPath": "~/.config/opencode/opencode.json"
    },
    "claude": {
      "enabled": false,
      "configPath": null
    }
  },
  "dependencies": {
    "nodejs": "20.11.0",
    "xmind-mcp": "1.0.0"
  }
}
```

---

## 5. Система обновлений

### 5.1 Команда `qarness update`

**Функционал:**
1. Проверить текущую версию QArness
2. Запросить удаленный репозиторий на наличие новой версии
3. Показать changelog
4. Запросить подтверждение
5. Выполнить обновление через `git pull` или скачивание новой версии
6. Обновить интеграции с AI-ассистентами
7. Перезапустить конфигурации

### 5.2 Автоматическая проверка обновлений

- При запуске `qarness` команды раз в день проверять наличие обновлений
- Уведомлять пользователя о доступных обновлениях
- Опция отключения: `qarness config set auto-update false`

---

## 6. Управление зависимостями

### 6.1 Node.js

**Установка:**
- Linux: через `nvm` или системный package manager (apt/yum)
- macOS: через `brew` или `nvm`
- Windows: скачать официальный инсталлятор

**Проверка:**
```bash
node --version
npm --version
```

### 6.2 XMind MCP Server

**Установка:**
```bash
npm install -g xmind-mcp-server  # Если существует как npm пакет
# Или клонирование репозитория
```

**Интеграция:**
- Автоматически добавить в конфигурацию AI-ассистентов
- Проверить работоспособность

### 6.3 OpenCode

**Проверка:**
- Поиск исполняемого файла opencode в PATH
- Проверка конфигурационных файлов

**Установка (если отсутствует):**
- Вывести инструкции по установке OpenCode
- Предложить ссылки на официальную документацию

---

## 7. Обработка ошибок и диагностика

### 7.1 Команда `qarness doctor`

**Проверки:**
1. Версия QArness
2. Целостность файлов установки
3. Наличие всех зависимостей
4. Корректность конфигураций AI-ассистентов
5. Доступность MCP серверов
6. Права доступа к файлам

**Вывод:**
- Список проблем с приоритетами
- Рекомендации по исправлению
- Команды для автоматического исправления

### 7.2 Логирование

**Файл лога**: `~/.qarness/logs/install.log`

**Содержимое:**
- Дата и время операций
- Выполненные действия
- Ошибки и предупреждения
- Версии установленных компонентов

---

## 8. Кроссплатформенность

### 8.1 Linux
- Основной скрипт: `install.sh`
- Поддержка дистрибутивов: Ubuntu, Debian, Fedora, Arch
- Package managers: apt, yum, pacman

### 8.2 macOS
- Тот же `install.sh`
- Использование Homebrew для зависимостей
- Особенности путей (Application Support)

### 8.3 Windows
- Скрипт: `install.ps1` (PowerShell)
- Использование Chocolatey/Scoop для зависимостей
- Git Bash для запуска Unix-скриптов
- Особенности путей (%APPDATA%, %USERPROFILE%)

---

## 9. Безопасность

### 9.1 Проверка целостности
- Добавить checksums для скачиваемых файлов
- Проверка подписи скриптов (опционально)

### 9.2 Разрешения
- Запрашивать минимальные необходимые права
- Не требовать sudo/admin где не нужно
- Создавать бэкапы перед изменением конфигураций

### 9.3 Безопасное удаление
```bash
qarness remove
# Удалить файлы ~/.qarness/
# Очистить интеграции из конфигураций AI-ассистентов
# Удалить команду из PATH
```

---

## 10. Поддержка корпоративных прокси

### 10.1 Определение прокси

Инсталлятор будет автоматически определять прокси из:
- Переменных окружения: `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`
- Системных настроек (Linux: gsettings, macOS: networksetup, Windows: netsh)
- Конфигурации Git: `git config --global http.proxy`

### 10.2 Применение прокси

Прокси будет применяться для:
- Git клонирования
- npm установки пакетов
- curl/wget загрузок

### 10.3 Ручная настройка прокси

```bash
qarness config proxy set <proxy-url>
qarness config proxy test          # Проверка соединения через прокси
qarness config proxy clear         # Удаление настроек прокси
```

### 10.4 Аутентификация прокси

Поддержка прокси с аутентификацией:
```bash
qarness config proxy set http://username:password@proxy.company.com:8080
```

---

## 11. Документация

### 11.1 README.md обновление
- Добавить секцию "Быстрая установка"
- Примеры команд установки для всех ОС
- Инструкции по использованию CLI

### 11.2 Создать INSTALL.md
- Подробное описание процесса установки
- Ручная установка (если автоматическая не работает)
- Решение частых проблем
- Установка через корпоративный прокси

### 11.3 Создать CLI.md
- Описание всех команд qarness
- Примеры использования
- Опции и флаги

### 11.4 Создать TROUBLESHOOTING.md
- Часто встречающиеся проблемы
- Проблемы с прокси
- Проблемы с интеграцией
- Диагностика через qarness doctor

---

## 12. Тестирование

### 12.1 Юнит-тесты
- Тесты для функций определения ОС
- Тесты для парсинга конфигурационных файлов
- Тесты для проверки зависимостей

### 12.2 Интеграционные тесты
- Полная установка в Docker-контейнерах (Linux)
- Тестирование на виртуальных машинах (Windows, macOS)
- Проверка интеграции с AI-ассистентами

### 12.3 CI/CD
- GitHub Actions для автоматического тестирования
- Матрица ОС: Ubuntu, macOS, Windows
- Автоматическая сборка релизов

---

## 13. Поэтапная реализация

### Фаза 1: Базовая инфраструктура
1. Создать структуру директорий (config/, scripts/, lib/, docs/)
2. Написать lib/common.sh с базовыми функциями
3. Написать lib/proxy-handler.sh для поддержки прокси
4. Написать lib/config-manager.sh для управления конфигурацией
5. Создать .version файл
6. Создать config/ai-detectors.json

### Фаза 2: Unix инсталлятор (MVP)
1. Написать install.sh с основной логикой
2. Реализовать detect_os()
3. Реализовать detect_proxy() с поддержкой всех источников
4. Реализовать check_dependencies()
5. Реализовать install_qarness() с поддержкой прокси
6. Реализовать install_dependencies() (Node.js, npm)
7. Написать scripts/detect-ai.sh
8. Написать scripts/integrate-ai.sh для OpenCode
9. Реализовать setup_cli()
10. Тестирование на Linux

### Фаза 3: Windows инсталлятор
1. Портировать install.sh на PowerShell (install.ps1)
2. Адаптировать пути для Windows
3. Реализовать определение прокси в Windows
4. Создать qarness.cmd wrapper
5. Тестирование на Windows

### Фаза 4: CLI утилита
1. Написать базовую структуру qarness CLI
2. Реализовать cmd_status()
3. Реализовать cmd_update() с поддержкой прокси
4. Реализовать cmd_doctor()
5. Реализовать cmd_config() для управления прокси
6. Реализовать cmd_integrate()
7. Тестирование всех команд

### Фаза 5: Дополнительные интеграции
1. Добавить поддержку Claude Desktop в scripts/detect-ai.sh
2. Добавить integrate_claude() в scripts/integrate-ai.sh
3. Создать config/claude-template.json
4. Тестирование интеграции с Claude

### Фаза 6: Документация
1. Обновить README.md с новыми инструкциями установки
2. Написать docs/INSTALL.md
3. Написать docs/CLI.md с описанием всех команд
4. Написать docs/TROUBLESHOOTING.md
5. Добавить примеры для корпоративных прокси

### Фаза 7: Тестирование и финализация
1. Тестирование на Ubuntu 22.04/24.04
2. Тестирование на macOS (Intel и Apple Silicon)
3. Тестирование на Windows 10/11
4. Тестирование с различными типами прокси
5. Исправление найденных багов
6. Код-ревью всех скриптов
7. Проверка безопасности
8. Создание релиза v1.0.0

---

## 14. Примеры использования

### Установка
```bash
# Установка одной командой
curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash

# С прокси
HTTP_PROXY=http://proxy.company.com:8080 curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash

# После установки
qarness status
# Output: QArness v1.0.0 установлен
#         Интегрирован с: OpenCode
#         Зависимости: Node.js v20.11.0, XMind MCP v1.0.0
```

### Обновление
```bash
qarness update
# Output: Проверка обновлений...
#         Доступна версия 1.1.0
#         Changelog: ...
#         Обновить? [Y/n] y
#         Обновление завершено успешно
```

### Интеграция с новым AI
```bash
qarness integrate claude
# Output: Обнаружен Claude Desktop в ~/Library/Application Support/Claude/
#         Добавить интеграцию QArness? [Y/n] y
#         Интеграция завершена
```

### Настройка прокси
```bash
qarness config proxy set http://proxy.company.com:8080
qarness config proxy test
qarness config proxy clear
```

---

## 15. Технические детали

### 15.1 Формат версионирования
- Semantic Versioning (SemVer): MAJOR.MINOR.PATCH
- Пример: 1.0.0, 1.1.0, 2.0.0

### 15.2 Релизы
- GitHub Releases с тегами
- Changelog для каждой версии

### 15.3 Обратная совместимость
- Сохранять совместимость конфигураций между минорными версиями
- Миграции при мажорных обновлениях

---

## 16. Ключевые решения

1. **Оффлайн-установка**: НЕ требуется
2. **URL репозитория**: `https://github.com/vnewhatson-code/QArness.git`
3. **XMind MCP server**: Будет использоваться существующий
4. **Корпоративные прокси**: ДА, полная поддержка
5. **Телеметрия**: НЕТ

---

## Вопросы для уточнения

1. **XMind MCP Server**: Существует ли уже готовый npm пакет `xmind-mcp-server`? Если нет, как его следует устанавливать?
2. **Минимальные версии зависимостей**: Какие минимальные версии требуются?
   - Node.js >= 18.x ?
   - npm >= 9.x ?
   - Git >= 2.x ?
3. **Конфигурация OpenCode**: Можете подтвердить правильность формата конфигурации OpenCode? (agents.paths, skills.paths, mcpServers)
4. **Права доступа**: Требуются ли sudo/admin права для установки, или все должно устанавливаться в домашнюю директорию пользователя?
5. **Приоритет AI-ассистентов**: Если обнаружены оба (OpenCode и Claude), интегрировать оба или спросить пользователя?
