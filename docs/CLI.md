# QArness CLI Документация

QArness предоставляет удобную CLI утилиту для управления установкой и интеграцией с AI-ассистентами.

## Основные команды

### qarness install

Установка или переустановка QArness.

```bash
qarness install
```

Эта команда запускает полный процесс установки заново.

---

### qarness update

Проверка и установка обновлений.

```bash
qarness update
```

**Что делает:**
- Проверяет наличие новой версии в GitHub
- Показывает список изменений (changelog)
- Запрашивает подтверждение
- Обновляет QArness через git pull
- Обновляет интеграции с AI-ассистентами

**Примеры вывода:**

```
Проверка обновлений...
Доступна новая версия: v1.1.0

Изменения:
* Add support for new AI assistant
* Fix proxy detection on Windows
* Improve error handling

Обновить? [Y/n] y
Обновление завершено
✓ QArness обновлен до версии 1.1.0
```

---

### qarness status

Показывает текущий статус установки QArness.

```bash
qarness status
```

**Вывод включает:**
- Версию QArness
- Путь установки
- Интегрированные AI-ассистенты
- Установленные зависимости (Git, Node.js, npm)
- Настройки прокси

**Пример:**

```
Версия: 1.0.0
Установлен в: /home/user/.qarness

Интегрированные AI-ассистенты:
  ✓ OpenCode (/home/user/.config/opencode)
  ✗ Claude Desktop

Зависимости:
  ✓ Git 2.34.1
  ✓ Node.js 20.11.0
  ✓ npm 10.2.4

Прокси: http://proxy.company.com:8080
```

---

### qarness config

Управление конфигурацией QArness.

#### Настройка прокси

```bash
# Установить прокси
qarness config proxy set <url>

# Проверить прокси
qarness config proxy test

# Удалить прокси
qarness config proxy clear
```

**Примеры:**

```bash
# Простой прокси
qarness config proxy set http://proxy.company.com:8080

# С аутентификацией
qarness config proxy set http://username:password@proxy.company.com:8080

# Проверка
qarness config proxy test
```

**Вывод test:**
```
Проверка прокси: http://proxy.company.com:8080
✓ Прокси работает корректно
```

#### Просмотр конфигурации

```bash
qarness config show
```

Показывает содержимое файла `~/.qarness/config.json`.

#### Сброс конфигурации

```bash
qarness config reset
```

Сбрасывает все настройки к значениям по умолчанию. Запрашивает подтверждение.

---

### qarness integrate

Интеграция QArness с AI-ассистентами.

```bash
qarness integrate <ai-name>
```

**Поддерживаемые AI-ассистенты:**
- `opencode` - OpenCode
- `claude` - Claude Desktop

**Примеры:**

```bash
# Интегрировать с OpenCode
qarness integrate opencode

# Интегрировать с Claude Desktop
qarness integrate claude
```

**Процесс интеграции:**

1. Автоматически определяет путь к конфигурации AI-ассистента
2. Если не найден, предлагает указать путь вручную
3. Создает бэкап существующей конфигурации
4. Добавляет пути к агентам и навыкам QArness
5. Настраивает MCP серверы (XMind)
6. Обновляет конфигурацию QArness

**Что добавляется в конфигурацию OpenCode:**

```json
{
  "agents": {
    "paths": ["/home/user/.qarness/agents"]
  },
  "skills": {
    "paths": ["/home/user/.qarness/skills"]
  },
  "mcpServers": {
    "xmind": {
      "command": "npx",
      "args": ["-y", "xmind-mcp-server"]
    }
  }
}
```

---

### qarness doctor

Диагностика проблем QArness.

```bash
qarness doctor
```

**Проверки:**
- Целостность файлов установки
- Наличие всех зависимостей (Git, Node.js, npm, jq/python3)
- Корректность интеграций с AI-ассистентами
- Доступность прокси (если настроен)
- Состояние Git репозитория

**Пример вывода:**

```
Диагностика QArness
=====================================

Проверка целостности файлов...
Проверка зависимостей...
Проверка интеграций...
OpenCode интеграция: OK
Проверка прокси...
Проверка Git репозитория...

✓ Проблем не обнаружено
```

**При обнаружении проблем:**

```
Обнаружено проблем: 2

Рекомендации:
  1. Переустановите QArness: qarness install
  2. Проверьте зависимости: bash ~/.qarness/scripts/install-deps.sh --check
  3. Проверьте логи: cat ~/.qarness/logs/qarness.log
```

---

### qarness remove

Удаление QArness из системы.

```bash
qarness remove
```

**Что удаляется:**
- Интеграции из конфигураций AI-ассистентов
- CLI команда из PATH (`/usr/local/bin/qarness`)
- Все файлы QArness (`~/.qarness/`)

**Внимание:** Создаются бэкапы конфигураций AI-ассистентов перед удалением интеграций.

---

### qarness version

Показывает версию QArness.

```bash
qarness version
```

**Вывод:**
```
QArness v1.0.0
```

---

### qarness help

Показывает справку по командам.

```bash
qarness help
# или
qarness --help
qarness -h
```

---

## Дополнительные возможности

### Автоматическая проверка обновлений

QArness автоматически проверяет наличие обновлений раз в день при запуске команды `qarness status`.

Вы увидите уведомление:
```
[INFO] Доступно обновление QArness. Выполните: qarness update
```

Отключить автоматическую проверку можно в конфигурации (пока не реализовано через CLI, нужно редактировать config.json вручную).

### Логи

Все операции QArness логируются в файл:
- Unix: `~/.qarness/logs/qarness.log`
- Windows: `%USERPROFILE%\.qarness\logs\qarness.log`

Просмотр логов:
```bash
cat ~/.qarness/logs/qarness.log
# или
tail -f ~/.qarness/logs/qarness.log  # для мониторинга в реальном времени
```

### Конфигурационный файл

QArness хранит настройки в JSON файле:
- Unix: `~/.qarness/config.json`
- Windows: `%USERPROFILE%\.qarness\config.json`

**Структура:**

```json
{
  "version": "1.0.0",
  "installedAt": "2026-05-20T12:00:00Z",
  "integrations": {
    "opencode": {
      "enabled": true,
      "configPath": "/home/user/.config/opencode"
    },
    "claude": {
      "enabled": false,
      "configPath": null
    }
  },
  "dependencies": {
    "nodejs": "20.11.0",
    "npm": "10.2.4",
    "git": "2.34.1"
  },
  "proxy": {
    "url": "http://proxy.company.com:8080",
    "enabled": true
  },
  "settings": {
    "autoUpdate": true,
    "checkUpdateInterval": 86400
  }
}
```

---

## Типичные сценарии использования

### Установка с нуля

```bash
# 1. Установить QArness
curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash

# 2. Проверить статус
qarness status

# 3. Интегрировать с OpenCode
qarness integrate opencode

# 4. Готово!
```

### Работа с прокси

```bash
# Установить через прокси
HTTP_PROXY=http://proxy:8080 curl -fsSL ... | bash

# После установки настроить прокси
qarness config proxy set http://proxy:8080
qarness config proxy test

# Обновиться через прокси
qarness update
```

### Переустановка при проблемах

```bash
# Диагностика
qarness doctor

# Если много проблем - переустановка
qarness install

# Или полное удаление и установка заново
qarness remove
curl -fsSL ... | bash
```

### Обновление до новой версии

```bash
# Проверить текущую версию
qarness version

# Проверить обновления
qarness update

# После обновления проверить
qarness status
qarness doctor
```

---

## Переменные окружения

QArness учитывает следующие переменные окружения:

- `HTTP_PROXY` / `http_proxy` - прокси для HTTP
- `HTTPS_PROXY` / `https_proxy` - прокси для HTTPS
- `NO_PROXY` / `no_proxy` - исключения для прокси

---

## См. также

- [Установка](INSTALL.md)
- [Решение проблем](TROUBLESHOOTING.md)
- [GitHub](https://github.com/vnewhatson-code/QArness)
