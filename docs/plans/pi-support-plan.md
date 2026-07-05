# План: Добавление поддержки Pi Coding Agent в QArness

## Контекст

QArness поддерживает установку скиллов и агентов в OpenCode и Claude Code. Пользователь хочет добавить поддержку **Pi Coding Agent**.

**Ключевое отличие Pi:** Pi использует пакет `pi-subagents` (`pi install npm:pi-subagents`) для работы с субагентами. Субагенты — это `.md` файлы с YAML frontmatter в специфическом формате, отличном от OpenCode/Claude Code.

**Текущие агенты QArness** (в `agents/`):
- `form-documenter.md` — в формате OpenCode (`mode: subagent`, `tools: { read: true, write: true, bash: true }`)
- Другие агенты (если появятся)

**Формат pi-subagents (из документации npm:pi-subagents):**
- Агенты — `.md` файлы с YAML frontmatter
- Поля: `name`, `description`, `tools` (строчный allowlist: `read, write, bash`), `model`, `systemPromptMode`, `inheritProjectContext`, `inheritSkills`
- Размещение (user scope): `~/.pi/agent/agents/**/*.md`
- Размещение (builtin scope пакета): `~/.pi/agent/extensions/subagent/agents/`

## Что будет сделано

### 1. Добавить хост "pi" в `src/installer/hosts.ts`

Новая запись в массиве `HOSTS` с:
- `detect()` — проверка `~/.pi/agent/` или `commandExists("pi")`
- `targetDir()` — `~/.pi/agent`
- sources: копирование skills в `extensions/qarness/skills/`
- postInstall: создание extension, установка pi-subagents, конвертация агентов
- postUninstall: удаление extension

### 2. Создать Pi Extension для QArness (`src/pi/extension.ts`)

Шаблон расширения, копируемый в `~/.pi/agent/extensions/qarness/index.ts`:
- Подключает скиллы через `resources_discover`
- Регистрирует `/qarness:*` команды

### 3. Установка pi-subagents

В `postInstall`:
- Проверить, установлен ли `pi-subagents` (по `~/.pi/agent/packages/pi-subagents/`)
- Если нет — выполнить `pi install npm:pi-subagents`

### 4. Конвертация и установка агентов в формат pi-subagents

**Конвертация полей (OpenCode → pi-subagents):**

| OpenCode (исходный) | pi-subagents (целевой) |
|---|---|
| `description: ...` | `description: ...` (без изменений) |
| `mode: subagent` | → `systemPromptMode: replace` |
| `temperature: 0.3` | → удаляется |
| `tools: { read: true, write: true, bash: true }` | → `tools: read, write, bash` |
| — | `inheritProjectContext: false` |
| — | `inheritSkills: false` |
| тело документа после `---` | тело документа (без изменений) |

**Куда устанавливать:** `~/.pi/agent/agents/` (user scope, подхватывается pi-subagents).

### 5. Идентификация для uninstall

Используем существующий манифест QArness (`~/.qarness/manifest.json`). Пути конвертированных агентов добавляются в манифест в `install.ts` после вызова `installHost()`.

## Файлы для создания/изменения

| Файл | Действие |
|------|----------|
| `src/installer/hosts.ts` | Добавить хост `pi` в `HOSTS` |
| `src/installer/utils.ts` | Добавить `piDir()` утилиту |
| `src/pi/extension.ts` | **Создать** — шаблон Pi extension |
| `src/pi/convert-agent.ts` | **Создать** — конвертер OpenCode → pi-subagents |
| `install.ts` | Добавить `pi` в help + пост-обработку агентов для манифеста |

## Верификация

1. **bun test tests/unit/** — все unit-тесты проходят
2. **bun run type-check** — компиляция без ошибок
3. **Ручной тест конвертации:** `agents/form-documenter.md` → pi-subagents формат
