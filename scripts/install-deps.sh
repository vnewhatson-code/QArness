#!/bin/bash
# Install dependencies for QArness

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QARNESS_DIR="$(dirname "$SCRIPT_DIR")"

# Source required libraries
source "${QARNESS_DIR}/lib/common.sh"
source "${QARNESS_DIR}/lib/proxy-handler.sh"
source "${QARNESS_DIR}/lib/config-manager.sh"

# Install Node.js
install_nodejs() {
    print_header "Установка Node.js"
    
    if command_exists node; then
        local version=$(get_version node)
        log "Node.js уже установлен (версия: $version)"
        update_dependency_version "nodejs" "$version"
        return 0
    fi
    
    detect_os
    
    case "$OS_TYPE" in
        linux)
            install_nodejs_linux
            ;;
        macos)
            install_nodejs_macos
            ;;
        windows)
            install_nodejs_windows
            ;;
    esac
}

# Install Node.js on Linux
install_nodejs_linux() {
    log "Установка Node.js на Linux..."
    
    # Detect package manager
    if command_exists apt-get; then
        log "Используется apt package manager"
        
        # Install using NodeSource repository
        if confirm "Установить Node.js через официальный репозиторий NodeSource?"; then
            export_proxy_vars
            
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            
            if [ $? -eq 0 ]; then
                print_success "Node.js установлен"
                update_dependency_version "nodejs" "$(get_version node)"
                return 0
            fi
        fi
    elif command_exists yum; then
        log "Используется yum package manager"
        
        if confirm "Установить Node.js через официальный репозиторий NodeSource?"; then
            export_proxy_vars
            
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo yum install -y nodejs
            
            if [ $? -eq 0 ]; then
                print_success "Node.js установлен"
                update_dependency_version "nodejs" "$(get_version node)"
                return 0
            fi
        fi
    elif command_exists pacman; then
        log "Используется pacman package manager"
        
        if confirm "Установить Node.js через pacman?"; then
            sudo pacman -S --noconfirm nodejs npm
            
            if [ $? -eq 0 ]; then
                print_success "Node.js установлен"
                update_dependency_version "nodejs" "$(get_version node)"
                return 0
            fi
        fi
    fi
    
    # Fallback: suggest manual installation
    warn "Не удалось автоматически установить Node.js"
    info "Пожалуйста, установите Node.js вручную:"
    info "  https://nodejs.org/en/download/"
    return 1
}

# Install Node.js on macOS
install_nodejs_macos() {
    log "Установка Node.js на macOS..."
    
    if command_exists brew; then
        if confirm "Установить Node.js через Homebrew?"; then
            export_proxy_vars
            
            brew install node
            
            if [ $? -eq 0 ]; then
                print_success "Node.js установлен"
                update_dependency_version "nodejs" "$(get_version node)"
                return 0
            fi
        fi
    else
        warn "Homebrew не найден"
        info "Установите Homebrew: https://brew.sh/"
        info "Или установите Node.js вручную: https://nodejs.org/en/download/"
        return 1
    fi
}

# Install Node.js on Windows
install_nodejs_windows() {
    log "Установка Node.js на Windows..."
    
    if command_exists choco; then
        if confirm "Установить Node.js через Chocolatey?"; then
            export_proxy_vars
            
            choco install nodejs -y
            
            if [ $? -eq 0 ]; then
                print_success "Node.js установлен"
                update_dependency_version "nodejs" "$(get_version node)"
                return 0
            fi
        fi
    elif command_exists scoop; then
        if confirm "Установить Node.js через Scoop?"; then
            export_proxy_vars
            
            scoop install nodejs
            
            if [ $? -eq 0 ]; then
                print_success "Node.js установлен"
                update_dependency_version "nodejs" "$(get_version node)"
                return 0
            fi
        fi
    else
        warn "Chocolatey или Scoop не найдены"
        info "Пожалуйста, установите Node.js вручную:"
        info "  https://nodejs.org/en/download/"
        return 1
    fi
}

# Check and install npm
check_npm() {
    if command_exists npm; then
        local version=$(get_version npm)
        log "npm установлен (версия: $version)"
        update_dependency_version "npm" "$version"
        return 0
    else
        warn "npm не найден (должен быть установлен вместе с Node.js)"
        return 1
    fi
}

# Install XMind MCP Server
install_xmind_mcp() {
    print_header "Установка XMind MCP Server"
    
    if ! command_exists npm; then
        error "npm не найден. Сначала установите Node.js"
        return 1
    fi
    
    # Setup proxy for npm
    detect_proxy
    if [ "$PROXY_DETECTED" = "yes" ]; then
        setup_proxy_for_npm
    fi
    
    # Check if xmind-mcp-server is available
    log "Проверка доступности xmind-mcp-server..."
    
    if npm view xmind-mcp-server version &>/dev/null; then
        if confirm "Установить xmind-mcp-server глобально?"; then
            npm install -g xmind-mcp-server
            
            if [ $? -eq 0 ]; then
                print_success "XMind MCP Server установлен"
                return 0
            else
                print_error "Ошибка установки XMind MCP Server"
                return 1
            fi
        fi
    else
        warn "Пакет xmind-mcp-server не найден в npm registry"
        info "XMind MCP Server будет запускаться через npx при необходимости"
        return 0
    fi
}

# Check Git
check_git() {
    print_header "Проверка Git"
    
    if command_exists git; then
        local version=$(get_version git)
        log "Git установлен (версия: $version)"
        update_dependency_version "git" "$version"
        return 0
    else
        error "Git не найден. Пожалуйста, установите Git:"
        info "  https://git-scm.com/downloads"
        return 1
    fi
}

# Install all dependencies
install_all_dependencies() {
    print_header "Установка зависимостей QArness"
    
    local failed=0
    
    # Check Git (required)
    check_git || failed=$((failed + 1))
    
    # Install Node.js if not present
    if ! command_exists node; then
        install_nodejs || failed=$((failed + 1))
    else
        log "Node.js уже установлен"
        update_dependency_version "nodejs" "$(get_version node)"
    fi
    
    # Check npm
    check_npm || failed=$((failed + 1))
    
    # Install XMind MCP Server
    install_xmind_mcp || warn "XMind MCP Server не установлен (не критично)"
    
    if [ $failed -eq 0 ]; then
        print_success "Все зависимости установлены"
        return 0
    else
        print_error "Не удалось установить некоторые зависимости ($failed)"
        return 1
    fi
}

# Check all dependencies
check_all_dependencies() {
    print_header "Проверка зависимостей"
    
    local missing=()
    
    # Git
    if ! command_exists git; then
        missing+=("git")
        echo "  ✗ Git не установлен"
    else
        echo "  ✓ Git $(get_version git)"
    fi
    
    # Node.js
    if ! command_exists node; then
        missing+=("nodejs")
        echo "  ✗ Node.js не установлен"
    else
        echo "  ✓ Node.js $(get_version node)"
    fi
    
    # npm
    if ! command_exists npm; then
        missing+=("npm")
        echo "  ✗ npm не установлен"
    else
        echo "  ✓ npm $(get_version npm)"
    fi
    
    # jq or python3 (at least one)
    if ! command_exists jq && ! command_exists python3; then
        missing+=("jq или python3")
        echo "  ✗ jq или python3 не установлены (нужен хотя бы один)"
    else
        if command_exists jq; then
            echo "  ✓ jq"
        fi
        if command_exists python3; then
            echo "  ✓ python3"
        fi
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo
        warn "Отсутствующие зависимости: ${missing[*]}"
        return 1
    else
        echo
        print_success "Все зависимости установлены"
        return 0
    fi
}

# Main execution
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    case "$1" in
        --check)
            check_all_dependencies
            ;;
        --nodejs)
            install_nodejs
            ;;
        --xmind)
            install_xmind_mcp
            ;;
        *)
            install_all_dependencies
            ;;
    esac
fi
