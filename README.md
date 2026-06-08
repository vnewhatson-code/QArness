# QArness

Набор инструментов (harness) для QA-специалистов: автоматизация создания тестовой документации, mind map, чек-листов и автотестов.

Работает через AI-ассистентов (OpenCode, Claude Code) с помощью навыков и агентов.

## Что внутри

- **Навыки (skills)** — генерация mind map для тестирования, чек-листы, документирование форм 1С
- **Агенты (agents)** — form-documenter для автоматического описания интерфейсов
- **Инсталлятор** — устанавливает навыки и агенты в AI-ассистенты одной командой
- **CLI** — управление установкой, обновлениями, прокси, диагностикой

## Структура проекта

```
QArness/
├── install.ts              # Главный установщик (TypeScript + Bun)
├── install.sh              # Bootstrap: клонирует репо и запускает install.ts
├── uninstall.ts            # Деинсталлятор на основе манифеста
├── package.json            # Зависимости и скрипты
├── skills/                 # Навыки для AI-ассистентов
│   ├── checklist-generator/    # Генерация чек-листов
│   ├── mindmap-generator/      # Генерация mind map (XMind)
│   └── form-documentation-skill/  # Документирование форм
├── agents/                 # Агенты
│   ├── form-documenter.md      # Агент документирования форм 1С
│   └── templates/
├── src/
│   ├── installer/          # Модули установщика
│   │   ├── hosts.ts        # Data-driven конфигурация хостов (OpenCode, Claude Code)
│   │   ├── features.ts     # Опциональные компоненты (xmind-mcp)
│   │   ├── manifest.ts     # Manifest-based tracking (~/.qarness/manifest.json)
│   │   ├── utils.ts        # Утилиты
│   │   └── cli.ts          # Парсинг аргументов
│   └── cli/                # CLI команды
│       ├── index.ts        # Точка входа
│       └── commands/       # status, update, integrate, config, doctor, remove
├── tests/
│   ├── unit/               # Unit-тесты (84 шт.)
│   └── installer.test.ts   # Интеграционные тесты в Docker (18 шт.)
├── config/                 # Шаблоны конфигураций
├── docs/plans/             # Планы и чек-листы
└── docker-compose.test.yml
```

## Установка

Требуется **git** и **bash**. Bun (JS-рантайм) установится автоматически.

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash
```

### Windows

```bash
# Через Git Bash (рекомендуется)
curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash
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
