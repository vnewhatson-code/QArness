# Решение проблем QArness

Это руководство поможет решить наиболее частые проблемы при установке и использовании QArness.

## Содержание

- [Проблемы установки](#проблемы-установки)
- [Проблемы с прокси](#проблемы-с-прокси)
- [Проблемы с интеграцией](#проблемы-с-интеграцией)
- [Проблемы с зависимостями](#проблемы-с-зависимостями)
- [Проблемы с CLI](#проблемы-с-cli)
- [Общая диагностика](#общая-диагностика)

---

## Проблемы установки

### Ошибка: Git не найден

**Проблема:**
```
[ERROR] Git не найден. Пожалуйста, установите Git
```

**Решение:**

**Linux (Debian/Ubuntu):**
```bash
sudo apt update
sudo apt install git
```

**Linux (Fedora/CentOS):**
```bash
sudo yum install git
# или
sudo dnf install git
```

**macOS:**
```bash
brew install git
# или используйте Xcode Command Line Tools
xcode-select --install
```

**Windows:**
Скачайте и установите с https://git-scm.com/download/win

---

### Ошибка: Не удается клонировать репозиторий

**Проблема:**
```
[ERROR] Ошибка клонирования репозитория
fatal: unable to access 'https://github.com/...'
```

**Возможные причины и решения:**

1. **Проблема с сетью/прокси:**
   ```bash
   # Установите прокси перед установкой
   export HTTP_PROXY=http://proxy.company.com:8080
   curl -fsSL ... | bash
   ```

2. **Заблокирован доступ к GitHub:**
   ```bash
   # Проверьте доступ
   curl https://github.com
   
   # Если не работает, используйте VPN или прокси
   ```

3. **Проблемы с SSL:**
   ```bash
   # Временно отключить проверку SSL (не рекомендуется)
   git config --global http.sslVerify false
   ```

---

### Ошибка: Нет прав для создания symlink

**Проблема:**
```
[WARN] Нет прав записи в /usr/local/bin
```

**Решение 1:** Использовать sudo
```bash
sudo ln -s ~/.qarness/qarness /usr/local/bin/qarness
```

**Решение 2:** Добавить в PATH вручную

**Bash:**
```bash
echo 'export PATH="$HOME/.qarness:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Zsh:**
```bash
echo 'export PATH="$HOME/.qarness:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Windows:**
Добавьте `%USERPROFILE%\.qarness` в переменную PATH через Системные настройки.

---

### Ошибка: Существующая установка не обновляется

**Проблема:**
Инсталлятор обнаруживает существующую установку, но обновление не работает.

**Решение:**

1. **Полная переустановка:**
   ```bash
   rm -rf ~/.qarness
   curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash
   ```

2. **Ручное обновление:**
   ```bash
   cd ~/.qarness
   git pull origin main
   qarness doctor
   ```

---

## Проблемы с прокси

### Прокси не определяется автоматически

**Проблема:**
Установлен корпоративный прокси, но QArness его не находит.

**Решение:**

1. **Установите прокси вручную:**
   ```bash
   qarness config proxy set http://proxy.company.com:8080
   ```

2. **Проверьте переменные окружения:**
   ```bash
   echo $HTTP_PROXY
   echo $HTTPS_PROXY
   
   # Если не установлены, добавьте в ~/.bashrc
   export HTTP_PROXY=http://proxy:8080
   export HTTPS_PROXY=http://proxy:8080
   ```

3. **Проверьте Git конфигурацию:**
   ```bash
   git config --global --get http.proxy
   
   # Если не установлен
   git config --global http.proxy http://proxy:8080
   ```

---

### Ошибка аутентификации прокси

**Проблема:**
```
[ERROR] Не удалось подключиться через прокси
407 Proxy Authentication Required
```

**Решение:**

Добавьте учетные данные в URL прокси:

```bash
qarness config proxy set http://username:password@proxy.company.com:8080
```

**Важно:** Если пароль содержит специальные символы, закодируйте их:
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`

Пример:
```bash
# Пароль: p@ss:word/123
qarness config proxy set http://user:p%40ss%3Aword%2F123@proxy:8080
```

---

### Прокси не работает для npm

**Проблема:**
Git работает через прокси, но npm не может скачать пакеты.

**Решение:**

```bash
# Установите прокси для npm
npm config set proxy http://proxy:8080
npm config set https-proxy http://proxy:8080

# Или через qarness
qarness config proxy set http://proxy:8080
# (автоматически настроит и npm)

# Проверьте настройки
npm config get proxy
npm config get https-proxy
```

---

### Тестирование прокси не проходит

**Проблема:**
```bash
qarness config proxy test
[ERROR] Не удалось подключиться через прокси
```

**Решение:**

1. **Проверьте доступность прокси:**
   ```bash
   curl --proxy http://proxy:8080 https://github.com
   ```

2. **Проверьте правильность URL:**
   ```bash
   # Должен быть формат: http://host:port
   # Не: host:port (без протокола)
   ```

3. **Проверьте firewall/антивирус:**
   Временно отключите для проверки

4. **Попробуйте другой прокси (если доступен):**
   ```bash
   qarness config proxy set http://alternative-proxy:3128
   qarness config proxy test
   ```

---

## Проблемы с интеграцией

### OpenCode не видит агенты QArness

**Проблема:**
После интеграции OpenCode не показывает агенты и навыки QArness.

**Решение:**

1. **Проверьте конфигурацию OpenCode:**
   ```bash
   cat ~/.config/opencode/opencode.json
   ```
   
   Должны быть пути:
   ```json
   {
     "agents": {
       "paths": ["/home/user/.qarness/agents"]
     },
     "skills": {
       "paths": ["/home/user/.qarness/skills"]
     }
   }
   ```

2. **Переинтегрируйте:**
   ```bash
   qarness integrate opencode
   ```

3. **Перезапустите OpenCode:**
   Закройте и откройте OpenCode заново

4. **Проверьте права доступа:**
   ```bash
   ls -la ~/.qarness/agents
   ls -la ~/.qarness/skills
   ```
   
   Все файлы должны быть читаемыми

---

### Конфигурация AI-ассистента повреждена

**Проблема:**
После интеграции AI-ассистент не запускается или выдает ошибки парсинга JSON.

**Решение:**

1. **Восстановите из бэкапа:**
   ```bash
   # Найдите бэкап
   ls -lt ~/.config/opencode/*.backup.*
   
   # Восстановите последний
   cp ~/.config/opencode/opencode.json.backup.YYYYMMDD_HHMMSS ~/.config/opencode/opencode.json
   ```

2. **Проверьте валидность JSON:**
   ```bash
   jq . ~/.config/opencode/opencode.json
   # или
   python3 -m json.tool ~/.config/opencode/opencode.json
   ```

3. **Переинтегрируйте заново:**
   ```bash
   qarness integrate opencode
   ```

---

### AI-ассистент не обнаружен

**Проблема:**
```
[WARN] opencode не обнаружен
```

**Решение:**

1. **Убедитесь, что AI-ассистент установлен:**
   ```bash
   which opencode
   ls ~/.config/opencode
   ```

2. **Укажите путь вручную:**
   ```bash
   qarness integrate opencode
   # Когда спросит, введите путь: ~/.config/opencode
   ```

3. **Проверьте нестандартные пути:**
   Если конфигурация находится в нестандартном месте, укажите полный путь:
   ```bash
   qarness integrate opencode /custom/path/to/opencode/config
   ```

---

## Проблемы с зависимостями

### Node.js не устанавливается автоматически

**Проблема:**
```
[WARN] Не удалось автоматически установить Node.js
```

**Решение:**

**Установка Node.js вручную:**

**Linux (через nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**macOS:**
```bash
brew install node
```

**Windows:**
- Chocolatey: `choco install nodejs`
- Scoop: `scoop install nodejs`
- Официальный установщик: https://nodejs.org/

После установки проверьте:
```bash
node --version
npm --version
```

---

### jq не установлен, python3 тоже

**Проблема:**
```
[WARN] jq или python3 не установлены (нужен хотя бы один)
```

**Решение:**

**Установить jq (рекомендуется):**

**Linux (Debian/Ubuntu):**
```bash
sudo apt install jq
```

**macOS:**
```bash
brew install jq
```

**Windows:**
```bash
choco install jq
# или
scoop install jq
```

**Или установить Python 3:**

**Linux:**
```bash
sudo apt install python3
```

**macOS:**
```bash
brew install python3
```

**Windows:**
https://www.python.org/downloads/

---

### XMind MCP Server не найден

**Проблема:**
MCP сервер для XMind не установлен.

**Решение:**

Это не критично. XMind MCP Server будет запускаться через npx при необходимости.

Если хотите установить глобально:
```bash
npm install -g xmind-mcp-server
```

Если пакет не существует в npm registry, продолжайте использовать через npx (установлено автоматически).

---

## Проблемы с CLI

### Команда qarness не найдена

**Проблема:**
```bash
qarness status
-bash: qarness: command not found
```

**Решение:**

1. **Проверьте установку:**
   ```bash
   ls -la ~/.qarness/qarness
   ```

2. **Добавьте в PATH:**
   ```bash
   # Временно
   export PATH="$HOME/.qarness:$PATH"
   
   # Постоянно (Bash)
   echo 'export PATH="$HOME/.qarness:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   
   # Постоянно (Zsh)
   echo 'export PATH="$HOME/.qarness:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. **Или создайте symlink:**
   ```bash
   sudo ln -s ~/.qarness/qarness /usr/local/bin/qarness
   ```

4. **Для Windows:** Перезапустите PowerShell после установки

---

### Ошибка прав доступа при запуске qarness

**Проблема:**
```
Permission denied: qarness
```

**Решение:**

```bash
chmod +x ~/.qarness/qarness
chmod +x ~/.qarness/install.sh
chmod +x ~/.qarness/scripts/*.sh
```

---

## Общая диагностика

### Команда qarness doctor

Первым делом запустите диагностику:

```bash
qarness doctor
```

Эта команда проверит:
- Целостность файлов QArness
- Наличие всех зависимостей
- Корректность интеграций
- Доступность прокси
- Состояние Git репозитория

И предложит рекомендации по исправлению.

---

### Проверка логов

Логи QArness находятся в:
```bash
~/.qarness/logs/qarness.log
```

Просмотр последних записей:
```bash
tail -50 ~/.qarness/logs/qarness.log
```

Поиск ошибок:
```bash
grep ERROR ~/.qarness/logs/qarness.log
```

Мониторинг в реальном времени:
```bash
tail -f ~/.qarness/logs/qarness.log
```

---

### Полная переустановка

Если ничего не помогает:

```bash
# 1. Удалить QArness
qarness remove
# или вручную
rm -rf ~/.qarness

# 2. Очистить конфигурации (опционально)
# Создайте бэкапы перед удалением!
cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.manual-backup

# 3. Установить заново
curl -fsSL https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.sh | bash

# 4. Проверить
qarness status
qarness doctor
```

---

### Проверка системы

```bash
# Операционная система
uname -a

# Git
git --version

# Node.js
node --version
npm --version

# Shell
echo $SHELL

# Python (если используется вместо jq)
python3 --version

# jq
jq --version

# Прокси
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

---

## Получение помощи

Если проблема не решается:

1. **Проверьте документацию:**
   - [Установка](INSTALL.md)
   - [CLI команды](CLI.md)

2. **Создайте issue на GitHub:**
   https://github.com/vnewhatson-code/QArness/issues
   
   Включите в issue:
   - Вывод `qarness doctor`
   - Вашу ОС и версию
   - Логи из `~/.qarness/logs/qarness.log`
   - Шаги для воспроизведения проблемы

3. **Соберите диагностическую информацию:**
   ```bash
   # Создайте файл с диагностикой
   {
     echo "=== System Info ==="
     uname -a
     echo ""
     echo "=== QArness Status ==="
     qarness status
     echo ""
     echo "=== QArness Doctor ==="
     qarness doctor
     echo ""
     echo "=== Dependencies ==="
     git --version
     node --version
     npm --version
     echo ""
     echo "=== Logs (last 50 lines) ==="
     tail -50 ~/.qarness/logs/qarness.log
   } > qarness-diagnostic.txt
   ```
   
   Приложите `qarness-diagnostic.txt` к issue.

---

## См. также

- [Установка](INSTALL.md)
- [CLI документация](CLI.md)
- [GitHub Issues](https://github.com/vnewhatson-code/QArness/issues)
