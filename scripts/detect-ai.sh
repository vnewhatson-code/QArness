#!/bin/bash
# Detect installed AI assistants

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QARNESS_DIR="$(dirname "$SCRIPT_DIR")"

# Source common functions
source "${QARNESS_DIR}/lib/common.sh"

AI_DETECTORS_FILE="${QARNESS_DIR}/config/ai-detectors.json"
DETECTED_ASSISTANTS=()

# Detect AI assistants
detect_ai_assistants() {
    init_logging
    detect_os
    
    log "Поиск установленных AI-ассистентов..."
    
    # Detect OpenCode
    detect_opencode
    
    # Detect Claude Desktop
    detect_claude
    
    # Return results
    if [ ${#DETECTED_ASSISTANTS[@]} -gt 0 ]; then
        log "Обнаружено AI-ассистентов: ${#DETECTED_ASSISTANTS[@]}"
        for assistant in "${DETECTED_ASSISTANTS[@]}"; do
            echo "$assistant"
        done
        return 0
    else
        warn "AI-ассистенты не обнаружены"
        return 1
    fi
}

# Detect OpenCode
detect_opencode() {
    log "Проверка OpenCode..."
    
    # Check if command exists
    if command_exists opencode; then
        local opencode_version=$(opencode --version 2>/dev/null || echo "unknown")
        log "OpenCode найден в PATH (версия: $opencode_version)"
    fi
    
    # Check configuration paths based on OS
    local config_paths=()
    
    case "$OS_TYPE" in
        linux)
            config_paths=(
                "$HOME/.config/opencode"
                "/usr/local/share/opencode"
            )
            ;;
        macos)
            config_paths=(
                "$HOME/.config/opencode"
                "$HOME/Library/Application Support/opencode"
            )
            ;;
        windows)
            config_paths=(
                "$APPDATA/opencode"
                "$LOCALAPPDATA/opencode"
            )
            ;;
    esac
    
    # Search for config files
    for config_path in "${config_paths[@]}"; do
        local expanded_path=$(expand_path "$config_path")
        
        if dir_exists "$expanded_path"; then
            # Check for config files
            if file_exists "$expanded_path/opencode.json" || file_exists "$expanded_path/opencode.jsonc"; then
                log "OpenCode конфигурация найдена: $expanded_path"
                DETECTED_ASSISTANTS+=("opencode:$expanded_path")
                return 0
            fi
        fi
    done
    
    return 1
}

# Detect Claude Desktop
detect_claude() {
    log "Проверка Claude Desktop..."
    
    # Check configuration paths based on OS
    local config_paths=()
    
    case "$OS_TYPE" in
        linux)
            config_paths=(
                "$HOME/.config/claude"
            )
            ;;
        macos)
            config_paths=(
                "$HOME/Library/Application Support/Claude"
            )
            ;;
        windows)
            config_paths=(
                "$APPDATA/Claude"
            )
            ;;
    esac
    
    # Search for config files
    for config_path in "${config_paths[@]}"; do
        local expanded_path=$(expand_path "$config_path")
        
        if dir_exists "$expanded_path"; then
            # Check for config file
            if file_exists "$expanded_path/claude_desktop_config.json"; then
                log "Claude Desktop конфигурация найдена: $expanded_path"
                DETECTED_ASSISTANTS+=("claude:$expanded_path")
                return 0
            fi
        fi
    done
    
    return 1
}

# Get config path for specific AI assistant
get_ai_config_path() {
    local ai="$1"
    
    for assistant in "${DETECTED_ASSISTANTS[@]}"; do
        if [[ "$assistant" == "$ai:"* ]]; then
            echo "${assistant#*:}"
            return 0
        fi
    done
    
    return 1
}

# Main execution
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    detect_ai_assistants
fi
