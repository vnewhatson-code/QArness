# План: Мультиплатформенный установщик на Bun

## Контекст

Текущая ситуация требует поддержки двух скриптов установки:
- `install.ps1` (250 строк) — PowerShell для Windows
- `install.sh` (320 строк) — Bash для Linux/macOS

Это дублирование кода, затрудняет поддержку и создаёт проблемы с синхронизацией функциональности между платформами.

**Вдохновение:** [xpowers](https://github.com/dpolishuk/xpowers) использует elegant data-driven подход с TypeScript + Bun, поддерживая 6+ разных AI-агентов одним скриптом.

**Цель:** Заменить оба скрипта единым мультиплатформенным решением на TypeScript + Bun.

## Что будет сделано

### 1. Создание новой структуры файлов (вдохновлено xpowers)

```
QArness/
├── install.ts              # Главный установщик на TypeScript
├── install.sh              # Bootstrap (~50 строк): клонирует и запускает install.ts
├── uninstall.ts            # Deinstaller (manifest-based)
├── src/
│   └── installer/
│       ├── hosts.ts        # Data-driven конфигурация хостов
│       ├── features.ts     # Data-driven конфигурация фич
│       ├── manifest.ts     # Управление manifest.json
│       ├── utils.ts        # Утилиты: copyDir, commandExists, backup
│       └── cli.ts          # Парсинг аргументов, TUI с @clack/prompts
├── src/
│   └── cli/
│       ├── index.ts        # Главный CLI (замена qarness)
│       ├── commands/*.ts   # Команды: status, update, integrate, config, doctor
│       └── lib/            # Общие функции
└── qarness                 # Скомпилированный CLI (bun build)
```

### 2. Ключевые идеи из xpowers

#### Data-driven конфигурация хостов

Вместо функций для каждого хоста — один массив конфигов:

```typescript
type HostConfig = {
  id: string               // "opencode", "claude"
  name: string             // "OpenCode", "Claude Code"
  detect: () => boolean    // Детекция: существует ли директория?
  targetDir: () => string  // Куда устанавливать
  sources: Record<string, SourceMapping>  // Что копировать
  postInstall?: (targetDir: string) => Promise<void>
  postUninstall?: (targetDir: string) => Promise<void>
}
```

#### Manifest system

Все установленные файлы записываются в `~/.qarness/manifest.json`:

```typescript
type InstallManifest = {
  version: string
  installedAt: string
  hosts: Record<string, { targetDir: string; files: string[] }>
  features: Record<string, { installed: boolean }>
}
```

Это позволяет:
- Чисто удалять (`uninstall.ts`)
- Обновлять без дублирования
- Проверять целостность

#### @clack/prompts для TUI

Красивый интерактивный интерфейс:
- `p.multiselect` — выбор хостов
- `p.confirm` — подтверждения
- `p.spinner` — прогресс

Автоматически не-интерактивный в CI/AI режиме.

#### Graceful rollback

При ошибке установки:
- Удалить все созданные файлы
- Восстановить backup-ы
- Вернуть состояние

### 3. Реализуемые модули

#### hosts.ts (data-driven конфигурация хостов)

```typescript
const HOSTS: HostConfig[] = [
  {
    id: "opencode",
    name: "OpenCode",
    detect: () => existsSync(join(xdgConfig(), "opencode")),
    targetDir: () => join(xdgConfig(), "opencode"),
    sources: {
      skills: { from: "skills", pattern: "checklist-*|mindmap-*" },
      agents: { from: "agents" }
    },
    postInstall: async (targetDir) => {
      // Модифицировать opencode.json
      // Добавить paths, MCP servers
    }
  },
  {
    id: "claude",
    name: "Claude Code",
    detect: () => existsSync(join(homedir(), ".claude")),
    targetDir: () => join(homedir(), ".claude"),
    sources: {
      skills: { from: "skills" },
      agents: { from: "agents" }
    },
    postInstall: async (targetDir) => {
      // Модифицировать ~/.claude/config.json или settings.json
    }
  }
]
```

#### features.ts (опциональные компоненты)

```typescript
const FEATURES: FeatureConfig[] = [
  {
    id: "xmind-mcp",
    name: "XMind MCP Server",
    install: async () => {
      // npm install -g xmind-mcp-server
    }
  },
  {
    id: "proxy-setup",
    name: "Proxy Configuration",
    install: async () => {
      // Детект и настройка прокси
    }
  }
]
```

#### manifest.ts
- `readManifest()` — чтение ~/.qarness/manifest.json
- `writeManifest()` — запись

#### utils.ts
- `copyDir(src, dest)` — рекурсивное копирование
- `commandExists(cmd)` — проверка команды
- `xdgConfig()` — XDG_CONFIG_HOME или ~/.config

#### cli.ts
- Парсинг: `--yes`, `--uninstall`, `--hosts`, `--features`, `--json`
- TUI с @clack/prompts
- JSON output для AI агентов

### 4. Bootstrap скрипт (install.sh)

Минимальный bootstrap (~50 строк):
1. Клонирует репо если запущен через curl
2. Проверяет bun, устанавливает если нет
3. Запускает `bun install.ts`

### 5. Миграция главного CLI

Файл `qarness` (474 строки Bash) будет переписан на TypeScript как `src/cli/index.ts` с командами:
- `qarness status` — статус установки
- `qarness update` — обновление
- `qarness integrate [ai]` — интеграция
- `qarness config proxy set` — настройка прокси
- `qarness doctor` — диагностика
- `qarness remove` — удаление

Компилируется через `bun build --compile` в `qarness`.

### 6. Файлы к изменению

**Создать:**
- `install.ts` — главный установщик
- `install.sh` — bootstrap (~50 строк)
- `uninstall.ts` — deinstaller
- `src/installer/hosts.ts` — конфигурация хостов
- `src/installer/features.ts` — конфигурация фич
- `src/installer/manifest.ts` — управление manifest
- `src/installer/utils.ts` — утилиты
- `src/cli/index.ts` — главный CLI
- `src/cli/commands/*.ts` — команды

**Удалить:**
- `install.sh` (старый)
- `install.ps1`
- `qarness` (Bash скрипт)

**Сохранить:**
- `config/*.json` — шаблоны
- `skills/`, `agents/` — контент

### 7. Порядок реализации

1. **Инфраструктура:** `package.json`, `bun setup`
2. **Утилиты:** `utils.ts` (copyDir, commandExists, xdgConfig)
3. **Конфигурация:** `hosts.ts`, `features.ts`
4. **Manifest:** `manifest.ts` (read/write)
5. **Установщик:** `install.ts` с @clack/prompts
6. **Bootstrap:** `install.sh` (клон + bun install)
7. **Deinstaller:** `uninstall.ts`
8. **CLI:** `src/cli/index.ts` + команды
9. **Компиляция:** `bun build --compile` → `qarness`
10. **Тестирование:** все платформы

### 8. Тестирование в Docker

**Платформы для тестирования:**
- **Ubuntu** — Linux контейнеры, работают везде
- **Windows Nanoserver** — только на Windows хосте

#### Ubuntu контейнер

```typescript
// tests/installer.test.ts
const linuxImages = [
  { name: 'ubuntu', tag: '22.04' },
]
```

#### Windows Nanoserver контейнер (только на Windows хосте)

Используем `mcr.microsoft.com/windows/nanoserver`:
- `cnewb/node:20-nanoserver-ltsc2022`
- `ghcr.io/amitie10g/node-nanoserver:iron`

Windows контейнеры требуют:
- Windows хост (GitHub Actions `windows-latest`)
- Docker в Windows Container mode
- Пути в Windows формате (`C:\\app`)

#### Docker Compose

```yaml
# docker-compose.test.yml
services:
  ubuntu:
    image: ubuntu:22.04
    volumes:
      - .:/qarness
    command: tail -f /dev/null

  # Windows — только на Windows хосте
  # docker compose --profile windows up
  windows:
    profiles: ["windows"]
    image: mcr.microsoft.com/windows/nanoserver:ltsc2025
    volumes:
      - .:C:\\qarness
    command: powershell -Command Start-Sleep -Seconds 999999
    platform: windows/amd64
```

### 9. CI/CD (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test Installer
on: [push, pull_request]

jobs:
  linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Run Linux container tests
        run: bun test tests/installer.test.ts

  windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Run Windows container tests
        run: bun test tests/installer-windows.test.ts
```

### 10. Проверка

**Docker тесты (ubuntu-latest):**
- Ubuntu 22.04

**Docker тесты (windows-latest):**
- Windows Nanoserver ltsc2025

**Сценарии проверки:**
- Свежая установка
- Обновление существующей установки
- Установка с прокси
- Интеграция с OpenCode
- Интеграция с Claude Code
- Команды CLI после установки
