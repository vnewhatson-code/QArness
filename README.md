# QArness

Набор инструментов (harness) для QA-специалистов: автоматизация создания тестовой документации, mind map, чек-листов и автотестов.

Работает через AI-ассистентов (OpenCode, Claude Code) с помощью навыков и агентов.

## Что внутри

- **Навыки (skills)** — генерация mind map для тестирования, чек-листы, документирование форм 1С
- **Агенты (agents)** — form-documenter для автоматического описания интерфейсов
- **Инсталлятор** — устанавливает навыки и агенты в AI-ассистенты одной командой
- **CLI** — управление установкой, обновлениями, прокси, диагностикой

## Установка

### Этап 1

Для начала устанавливаем сам OpenCode. Для этого в терминале/ PowerShell выполняем команду:

*для Windows:*

```npm install -g opencode-ai```

Если у тебя нет npm, установи [по инструкции]([url](https://nodejs.org/en/download)).

*для macOS:*

```curl -fsSL https://opencode.ai/install | bash```

### Этап 2

Следующий шаг — доступ к модели. Для этого создаем конфигурационный файл и выдаем ему API-ключ.

#### 2.1 Где создать файл?

Переходим в скрытую папку конфигурации:

*путь для Windows:*

```C:\Users\ТВОЕ_ИМЯ_ПОЛЬЗОВАТЕЛЯ\.config\opencode\ — если папки opencode нет, то просто создай её руками.```

*путь для MacOS:*

Открой Finder/Проводник, нажми Cmd + Shift + . (точка), чтобы показать скрытые файлы, и перейди в папку ~/.config/opencode/

#### 2.2 Что писать в файле?

Внутри этой папки создаём обычный текстовый файл с названием opencode.json. Именно таким, ни буквы мимо. Открываем в текстовом редакторе — в идеале VS Code, но можно и Блокнот — и вставляем следующее:

```{"$schema": "https://opencode.ai/config.json","share": "disabled","enabled_providers": ["kontur_ai"],"model": "kontur_ai/preview-code-pro", // или "kontur_ai/code-pro", смотря какую из 2 хочешь по дефолту. preview-code-pro умнее, но дороже"provider": {"kontur_ai": {"npm": "@ai-sdk/openai-compatible","name": "Kontur AI","options": {"baseURL": "https://srs-litellm.kontur.host/v1","apiKey": "{env:OPENAI_API_KEY}" // или просто захардкодить сюда},"models": {"code-pro": {"name": "code-pro","limit": {"context": 65536,"output": 65536}},"preview-code-pro": {"name": "preview-code-pro","limit": {"context": 131072,"output": 131072}}}}}}```

💡 Важно! Что здесь нужно поменять:

Вместо https://your-api-endpoint/v1 вставь адрес сервера, откуда берется ИИ (если используешь OpenAI напрямую, оставь как есть, но если используешь локальный ИИ или прокси, адрес будет другим).
Вместо {env:OPENAI_API_KEY} впиши свой API-ключ 
Сохрани файл. Проверь, что расширение файла именно .json, а не .json.txt.

### Этап 3

Время запускать агента. Для этого необходимо в терминале перейти в папку с проектом и выполнить команду:

opencode

Теперь необходимо исполнить ритуал первого запуска — не нужно, если у тебя уже есть CLAUDE.md или AGENTS.md (OpenCode подхватит его автоматически)

```/init```

Что делает /init:

Индексирует директорию проекта
Генерирует AGENTS.md — контекстный файл для ИИ

**Далее устанавливаем сами скиллы:**

Требуется **git** и **bash**. Bun (JS-рантайм) установится автоматически.

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash
```

### Windows

```powershell
irm https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.ps1 | iex
```

Инсталлятор обнаружит установленные AI-ассистенты и предложит выбор через интерактивное меню.

### Неинтерактивный режим (CI / AI-агенты)

```bash
# Авто-установка во все обнаруженные хосты
bun install.ts --yes

# Установка в конкретные хосты
bun install.ts --yes --hosts claude
bun install.ts --yes --hosts opencode,claude

# JSON-вывод для AI-агентов
bun install.ts --yes --json
```

### Удаление

```bash
# Интерактивное удаление
bun uninstall.ts

# Неинтерактивное удаление
bun install.ts --uninstall
```

## Использование навыков

После установки навыки и агенты доступны через AI-ассистент:

- **Создать mind map**: «Создай mind map для новой функциональности» — анализирует описание из `docs/QA/__workspace_inbox__` и исходный код, генерирует `MINDMAP.md` и `mindmap.xmind`
- **Сгенерировать чек-лист**: «Составь чек-лист для тестирования» — на основе изменений в коде
- **Документировать форму**: «Задокументируй форму [имя]» — анализирует XML формы 1С, описывает все элементы интерфейса

## CLI

```bash
# Скомпилировать бинарник (bun build --compile)
bun run build:cli
./qarness status              # Статус установки
./qarness update              # Обновить QArness
./qarness integrate <ai>      # Интегрировать с AI-ассистентом
./qarness config proxy set <url>  # Настроить прокси
./qarness config show         # Показать конфигурацию
./qarness doctor              # Диагностика
./qarness remove              # Удалить QArness

# Или без компиляции:
bun src/cli/index.ts status
```

## Разработка и тестирование

```bash
bun install                   # Установить зависимости

# Unit-тесты (без Docker)
bun test tests/unit/

# Интеграционные тесты (требуется Docker)
bun test tests/installer.test.ts

# Все тесты
bun test
```

### Docker Compose (ручное тестирование)

```bash
docker compose -f docker-compose.test.yml up -d ubuntu
docker compose -f docker-compose.test.yml exec ubuntu bash
```

## Поддерживаемые AI-ассистенты

| Ассистент | ID | Конфигурация |
|---|---|---|
| OpenCode | `opencode` | `~/.config/opencode/` |
| Claude Code | `claude` | `~/.claude/` |

## Зависимости

- **git** — клонирование репозитория и обновления
- **bash** — bootstrap-скрипт и `commandExists`
- **bun** — JS-рантайм (устанавливается автоматически при `curl | bash`)
- **npm** — опционально, для `xmind-mcp-server`

## Лицензия

MIT
