#!/bin/bash
# Proxy handling functions for QArness

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Global proxy variables
PROXY_URL=""
PROXY_SOURCE=""
PROXY_DETECTED=""

# Detect proxy from various sources
detect_proxy() {
    init_logging
    
    # 1. Check environment variables
    if [ -n "$HTTP_PROXY" ]; then
        PROXY_URL="$HTTP_PROXY"
        PROXY_SOURCE="environment (HTTP_PROXY)"
        PROXY_DETECTED="yes"
        log "Прокси обнаружен из переменной окружения HTTP_PROXY: $PROXY_URL"
        return 0
    fi
    
    if [ -n "$HTTPS_PROXY" ]; then
        PROXY_URL="$HTTPS_PROXY"
        PROXY_SOURCE="environment (HTTPS_PROXY)"
        PROXY_DETECTED="yes"
        log "Прокси обнаружен из переменной окружения HTTPS_PROXY: $PROXY_URL"
        return 0
    fi
    
    if [ -n "$http_proxy" ]; then
        PROXY_URL="$http_proxy"
        PROXY_SOURCE="environment (http_proxy)"
        PROXY_DETECTED="yes"
        log "Прокси обнаружен из переменной окружения http_proxy: $PROXY_URL"
        return 0
    fi
    
    if [ -n "$https_proxy" ]; then
        PROXY_URL="$https_proxy"
        PROXY_SOURCE="environment (https_proxy)"
        PROXY_DETECTED="yes"
        log "Прокси обнаружен из переменной окружения https_proxy: $PROXY_URL"
        return 0
    fi
    
    # 2. Check Git configuration
    local git_proxy
    if command_exists git; then
        git_proxy=$(git config --global --get http.proxy 2>/dev/null)
        if [ -n "$git_proxy" ]; then
            PROXY_URL="$git_proxy"
            PROXY_SOURCE="git config"
            PROXY_DETECTED="yes"
            log "Прокси обнаружен из Git конфигурации: $PROXY_URL"
            return 0
        fi
    fi
    
    # 3. Check system settings based on OS
    detect_os
    
    case "$OS_TYPE" in
        linux)
            detect_proxy_linux
            ;;
        macos)
            detect_proxy_macos
            ;;
        windows)
            detect_proxy_windows
            ;;
    esac
    
    if [ "$PROXY_DETECTED" = "yes" ]; then
        log "Прокси обнаружен из системных настроек: $PROXY_URL"
        return 0
    fi
    
    # 4. Check QArness config
    if file_exists "$CONFIG_FILE"; then
        local config_proxy=$(json_get "$CONFIG_FILE" ".proxy.url")
        if [ -n "$config_proxy" ] && [ "$config_proxy" != "null" ]; then
            PROXY_URL="$config_proxy"
            PROXY_SOURCE="qarness config"
            PROXY_DETECTED="yes"
            log "Прокси обнаружен из конфигурации QArness: $PROXY_URL"
            return 0
        fi
    fi
    
    PROXY_DETECTED="no"
    return 1
}

# Detect proxy on Linux
detect_proxy_linux() {
    # Check GNOME settings
    if command_exists gsettings; then
        local proxy_mode=$(gsettings get org.gnome.system.proxy mode 2>/dev/null | tr -d "'")
        if [ "$proxy_mode" = "manual" ]; then
            local proxy_host=$(gsettings get org.gnome.system.proxy.http host 2>/dev/null | tr -d "'")
            local proxy_port=$(gsettings get org.gnome.system.proxy.http port 2>/dev/null)
            
            if [ -n "$proxy_host" ] && [ -n "$proxy_port" ] && [ "$proxy_port" != "0" ]; then
                PROXY_URL="http://${proxy_host}:${proxy_port}"
                PROXY_SOURCE="gsettings"
                PROXY_DETECTED="yes"
                return 0
            fi
        fi
    fi
    
    # Check environment files
    local env_files=(
        "/etc/environment"
        "$HOME/.bashrc"
        "$HOME/.profile"
    )
    
    for env_file in "${env_files[@]}"; do
        if file_exists "$env_file"; then
            local proxy=$(grep -i "http_proxy" "$env_file" 2>/dev/null | head -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
            if [ -n "$proxy" ]; then
                PROXY_URL="$proxy"
                PROXY_SOURCE="$env_file"
                PROXY_DETECTED="yes"
                return 0
            fi
        fi
    done
    
    return 1
}

# Detect proxy on macOS
detect_proxy_macos() {
    if command_exists networksetup; then
        # Try different network services
        local services=("Wi-Fi" "Ethernet")
        
        for service in "${services[@]}"; do
            local proxy_info=$(networksetup -getwebproxy "$service" 2>/dev/null)
            
            if echo "$proxy_info" | grep -q "Enabled: Yes"; then
                local proxy_host=$(echo "$proxy_info" | grep "Server:" | awk '{print $2}')
                local proxy_port=$(echo "$proxy_info" | grep "Port:" | awk '{print $2}')
                
                if [ -n "$proxy_host" ] && [ -n "$proxy_port" ]; then
                    PROXY_URL="http://${proxy_host}:${proxy_port}"
                    PROXY_SOURCE="networksetup ($service)"
                    PROXY_DETECTED="yes"
                    return 0
                fi
            fi
        done
    fi
    
    return 1
}

# Detect proxy on Windows
detect_proxy_windows() {
    # Check Windows registry using reg query
    if command_exists reg; then
        local proxy_enable=$(reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable 2>/dev/null | grep "ProxyEnable" | awk '{print $3}')
        
        if [ "$proxy_enable" = "0x1" ]; then
            local proxy_server=$(reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer 2>/dev/null | grep "ProxyServer" | awk '{print $3}')
            
            if [ -n "$proxy_server" ]; then
                # Add http:// if not present
                if [[ ! "$proxy_server" =~ ^https?:// ]]; then
                    proxy_server="http://${proxy_server}"
                fi
                
                PROXY_URL="$proxy_server"
                PROXY_SOURCE="windows registry"
                PROXY_DETECTED="yes"
                return 0
            fi
        fi
    fi
    
    return 1
}

# Setup proxy for Git
setup_proxy_for_git() {
    if [ -z "$PROXY_URL" ]; then
        detect_proxy
    fi
    
    if [ "$PROXY_DETECTED" = "yes" ] && [ -n "$PROXY_URL" ]; then
        git config --global http.proxy "$PROXY_URL"
        git config --global https.proxy "$PROXY_URL"
        log "Git настроен для использования прокси: $PROXY_URL"
        return 0
    fi
    
    return 1
}

# Setup proxy for npm
setup_proxy_for_npm() {
    if [ -z "$PROXY_URL" ]; then
        detect_proxy
    fi
    
    if [ "$PROXY_DETECTED" = "yes" ] && [ -n "$PROXY_URL" ]; then
        npm config set proxy "$PROXY_URL"
        npm config set https-proxy "$PROXY_URL"
        log "npm настроен для использования прокси: $PROXY_URL"
        return 0
    fi
    
    return 1
}

# Clear proxy settings for Git
clear_proxy_for_git() {
    git config --global --unset http.proxy 2>/dev/null
    git config --global --unset https.proxy 2>/dev/null
    log "Прокси удален из конфигурации Git"
}

# Clear proxy settings for npm
clear_proxy_for_npm() {
    npm config delete proxy 2>/dev/null
    npm config delete https-proxy 2>/dev/null
    log "Прокси удален из конфигурации npm"
}

# Test proxy connection
test_proxy() {
    local proxy="${1:-$PROXY_URL}"
    
    if [ -z "$proxy" ]; then
        # Try to get from config
        if file_exists "$CONFIG_FILE"; then
            proxy=$(json_get "$CONFIG_FILE" ".proxy.url")
        fi
    fi
    
    if [ -z "$proxy" ] || [ "$proxy" = "null" ]; then
        error "Прокси не настроен"
        return 1
    fi
    
    log "Проверка прокси: $proxy"
    
    # Try to connect to GitHub through proxy
    if command_exists curl; then
        if curl --proxy "$proxy" --connect-timeout 10 -s -o /dev/null -w "%{http_code}" https://github.com | grep -q "200\|301\|302"; then
            print_success "Прокси работает корректно"
            return 0
        else
            print_error "Не удалось подключиться через прокси"
            return 1
        fi
    elif command_exists wget; then
        if wget --proxy="$proxy" --timeout=10 -q -O /dev/null https://github.com 2>&1; then
            print_success "Прокси работает корректно"
            return 0
        else
            print_error "Не удалось подключиться через прокси"
            return 1
        fi
    else
        warn "curl или wget не найдены, невозможно проверить прокси"
        return 2
    fi
}

# Export proxy environment variables
export_proxy_vars() {
    if [ -z "$PROXY_URL" ]; then
        detect_proxy
    fi
    
    if [ "$PROXY_DETECTED" = "yes" ] && [ -n "$PROXY_URL" ]; then
        export HTTP_PROXY="$PROXY_URL"
        export HTTPS_PROXY="$PROXY_URL"
        export http_proxy="$PROXY_URL"
        export https_proxy="$PROXY_URL"
        log "Переменные окружения прокси установлены"
        return 0
    fi
    
    return 1
}

# Clear proxy environment variables
clear_proxy_vars() {
    unset HTTP_PROXY
    unset HTTPS_PROXY
    unset http_proxy
    unset https_proxy
    log "Переменные окружения прокси очищены"
}

# Get proxy info
get_proxy_info() {
    detect_proxy
    
    if [ "$PROXY_DETECTED" = "yes" ]; then
        echo "Прокси: $PROXY_URL"
        echo "Источник: $PROXY_SOURCE"
        return 0
    else
        echo "Прокси не обнаружен"
        return 1
    fi
}

# Export functions
export -f detect_proxy detect_proxy_linux detect_proxy_macos detect_proxy_windows
export -f setup_proxy_for_git setup_proxy_for_npm
export -f clear_proxy_for_git clear_proxy_for_npm
export -f test_proxy export_proxy_vars clear_proxy_vars
export -f get_proxy_info
