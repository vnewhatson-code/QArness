#!/bin/bash
# QArness Installer for Unix systems (Linux/macOS)
set -e

VERSION="1.0.0"
REPO_URL="https://github.com/vnewhatson-code/QArness.git"
INSTALL_DIR="${HOME}/.qarness"
TEMP_DIR="/tmp/qarness-install-$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Simple logging functions (before lib is available)
log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

print_banner() {
    echo
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                       ║${NC}"
    echo -e "${BLUE}║         QArness Installer v${VERSION}       ║${NC}"
    echo -e "${BLUE}║                                       ║${NC}"
    echo -e "${BLUE}║  AI-инструмент автоматизации QA       ║${NC}"
    echo -e "${BLUE}║                                       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo
}

# Check if running as root (we don't want that)
check_root() {
    if [ "$EUID" -eq 0 ]; then
        error "Не запускайте установку от имени root. QArness устанавливается в домашнюю директорию пользователя."
    fi
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)
            OS_TYPE="linux"
            log "Обнаружена ОС: Linux"
            ;;
        Darwin*)
            OS_TYPE="macos"
            log "Обнаружена ОС: macOS"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            OS_TYPE="windows"
            log "Обнаружена ОС: Windows (Git Bash)"
            ;;
        *)
            error "Неподдерживаемая операционная система: $(uname -s)"
            ;;
    esac
}

# Detect proxy
detect_proxy() {
    PROXY_URL=""
    
    if [ -n "$HTTP_PROXY" ]; then
        PROXY_URL="$HTTP_PROXY"
        log "Прокси обнаружен: $PROXY_URL"
        return 0
    elif [ -n "$HTTPS_PROXY" ]; then
        PROXY_URL="$HTTPS_PROXY"
        log "Прокси обнаружен: $PROXY_URL"
        return 0
    elif [ -n "$http_proxy" ]; then
        PROXY_URL="$http_proxy"
        log "Прокси обнаружен: $PROXY_URL"
        return 0
    elif [ -n "$https_proxy" ]; then
        PROXY_URL="$https_proxy"
        log "Прокси обнаружен: $PROXY_URL"
        return 0
    fi
    
    # Check git config
    if command -v git &>/dev/null; then
        local git_proxy=$(git config --global --get http.proxy 2>/dev/null || echo "")
        if [ -n "$git_proxy" ]; then
            PROXY_URL="$git_proxy"
            log "Прокси обнаружен из Git: $PROXY_URL"
            return 0
        fi
    fi
    
    return 1
}

# Setup proxy for git
setup_proxy() {
    if [ -n "$PROXY_URL" ]; then
        export HTTP_PROXY="$PROXY_URL"
        export HTTPS_PROXY="$PROXY_URL"
        export http_proxy="$PROXY_URL"
        export https_proxy="$PROXY_URL"
        
        git config --global http.proxy "$PROXY_URL" 2>/dev/null || true
        git config --global https.proxy "$PROXY_URL" 2>/dev/null || true
        
        log "Прокси настроен для установки"
    fi
}

# Check dependencies
check_dependencies() {
    log "Проверка зависимостей..."
    
    local missing=()
    
    # Git is required
    if ! command -v git &>/dev/null; then
        missing+=("git")
    fi
    
    # At least one of jq or python3 is required
    if ! command -v jq &>/dev/null && ! command -v python3 &>/dev/null; then
        missing+=("jq или python3")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        error "Отсутствующие зависимости: ${missing[*]}\n  Установите их и повторите установку."
    fi
    
    log "Все необходимые зависимости найдены"
}

# Clone QArness repository
clone_qarness() {
    log "Клонирование QArness..."
    
    # Remove old installation if exists
    if [ -d "$INSTALL_DIR" ]; then
        warn "Обнаружена существующая установка QArness"
        
        read -p "Удалить и переустановить? [y/N] " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log "Удаление старой установки..."
            rm -rf "$INSTALL_DIR"
        else
            log "Обновление существующей установки..."
            cd "$INSTALL_DIR"
            git pull origin main
            return 0
        fi
    fi
    
    # Clone repository
    mkdir -p "$(dirname "$INSTALL_DIR")"
    
    if [ -n "$PROXY_URL" ]; then
        git -c http.proxy="$PROXY_URL" clone "$REPO_URL" "$INSTALL_DIR"
    else
        git clone "$REPO_URL" "$INSTALL_DIR"
    fi
    
    if [ $? -eq 0 ]; then
        log "QArness успешно клонирован в $INSTALL_DIR"
    else
        error "Ошибка клонирования репозитория"
    fi
}

# Install dependencies
install_dependencies() {
    log "Установка зависимостей..."
    
    # Source the install-deps script
    if [ -f "$INSTALL_DIR/scripts/install-deps.sh" ]; then
        bash "$INSTALL_DIR/scripts/install-deps.sh" || warn "Некоторые зависимости не установлены"
    else
        warn "Скрипт установки зависимостей не найден"
    fi
}

# Detect AI assistants
detect_ai_assistants() {
    log "Поиск установленных AI-ассистентов..."
    
    if [ -f "$INSTALL_DIR/scripts/detect-ai.sh" ]; then
        bash "$INSTALL_DIR/scripts/detect-ai.sh" || warn "AI-ассистенты не обнаружены"
    fi
}

# Integrate with AI assistants
integrate_ai_assistants() {
    log "Настройка интеграции с AI-ассистентами..."
    
    # Source detection script
    if [ -f "$INSTALL_DIR/scripts/detect-ai.sh" ]; then
        source "$INSTALL_DIR/scripts/detect-ai.sh"
        
        # Detect assistants
        local assistants=$(detect_ai_assistants)
        
        if [ -n "$assistants" ]; then
            while IFS= read -r assistant; do
                local ai_name="${assistant%%:*}"
                local ai_path="${assistant#*:}"
                
                echo
                read -p "Интегрировать QArness с $ai_name? [Y/n] " -n 1 -r
                echo
                
                if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
                    bash "$INSTALL_DIR/scripts/integrate-ai.sh" "$ai_name" "$ai_path"
                fi
            done <<< "$assistants"
        else
            warn "AI-ассистенты не обнаружены. Вы сможете настроить интеграцию позже через команду 'qarness integrate'"
        fi
    fi
}

# Setup CLI
setup_cli() {
    log "Настройка CLI команды..."
    
    local qarness_bin="$INSTALL_DIR/qarness"
    
    # Make qarness executable
    chmod +x "$qarness_bin"
    
    # Try to add to PATH
    local bin_link="/usr/local/bin/qarness"
    
    if [ -w "/usr/local/bin" ]; then
        ln -sf "$qarness_bin" "$bin_link"
        log "CLI команда 'qarness' добавлена в /usr/local/bin"
    else
        warn "Нет прав записи в /usr/local/bin"
        info "Добавьте вручную: sudo ln -s $qarness_bin /usr/local/bin/qarness"
        info "Или добавьте в PATH: export PATH=\"$INSTALL_DIR:\$PATH\""
    fi
}

# Show next steps
show_next_steps() {
    echo
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}║  ✓ QArness успешно установлен!                        ║${NC}"
    echo -e "${GREEN}║                                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo
    echo "Следующие шаги:"
    echo
    echo "  1. Проверьте статус:"
    echo "     qarness status"
    echo
    echo "  2. Интегрируйте с AI-ассистентами:"
    echo "     qarness integrate opencode"
    echo "     qarness integrate claude"
    echo
    echo "  3. Настройте прокси (если требуется):"
    echo "     qarness config proxy set http://proxy.company.com:8080"
    echo
    echo "  4. Проверьте обновления:"
    echo "     qarness update"
    echo
    echo "  5. Диагностика проблем:"
    echo "     qarness doctor"
    echo
    echo "Документация: https://github.com/vnewhatson-code/QArness"
    echo
}

# Cleanup
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}

# Main installation flow
main() {
    print_banner
    
    check_root
    detect_os
    detect_proxy
    setup_proxy
    check_dependencies
    
    clone_qarness
    
    # Source libraries for rest of installation
    if [ -f "$INSTALL_DIR/lib/common.sh" ]; then
        source "$INSTALL_DIR/lib/common.sh"
        source "$INSTALL_DIR/lib/config-manager.sh"
        
        # Initialize config
        init_config "$VERSION"
    fi
    
    install_dependencies
    detect_ai_assistants
    integrate_ai_assistants
    setup_cli
    
    show_next_steps
    
    cleanup
}

# Trap errors and cleanup
trap cleanup EXIT

# Run main
main "$@"
