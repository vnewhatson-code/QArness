#!/bin/bash
# Configuration management for QArness

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Initialize config file
init_config() {
    local version="${1:-1.0.0}"
    
    mkdir -p "$(dirname "$CONFIG_FILE")"
    
    if ! file_exists "$CONFIG_FILE"; then
        cat > "$CONFIG_FILE" << EOF
{
  "version": "$version",
  "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "integrations": {
    "opencode": {
      "enabled": false,
      "configPath": null
    },
    "claude": {
      "enabled": false,
      "configPath": null
    }
  },
  "dependencies": {
    "nodejs": null,
    "npm": null,
    "git": null
  },
  "proxy": {
    "url": null,
    "enabled": false
  },
  "settings": {
    "autoUpdate": true,
    "checkUpdateInterval": 86400
  }
}
EOF
        log "Создан файл конфигурации: $CONFIG_FILE"
    fi
}

# Get config value
get_config() {
    local key="$1"
    local default="${2:-}"
    
    if ! file_exists "$CONFIG_FILE"; then
        echo "$default"
        return 1
    fi
    
    local value=$(json_get "$CONFIG_FILE" ".$key")
    
    if [ -z "$value" ] || [ "$value" = "null" ]; then
        echo "$default"
        return 1
    fi
    
    echo "$value"
    return 0
}

# Set config value
set_config() {
    local key="$1"
    local value="$2"
    
    if ! file_exists "$CONFIG_FILE"; then
        init_config
    fi
    
    # Backup before modification
    backup_file "$CONFIG_FILE"
    
    if command_exists jq; then
        local tmp=$(mktemp)
        jq ".$key = \"$value\"" "$CONFIG_FILE" > "$tmp" && mv "$tmp" "$CONFIG_FILE"
        log "Установлен параметр $key = $value"
        return 0
    elif command_exists python3; then
        python3 << EOF
import json
with open('$CONFIG_FILE', 'r') as f:
    data = json.load(f)

keys = '$key'.split('.')
obj = data
for k in keys[:-1]:
    if k not in obj:
        obj[k] = {}
    obj = obj[k]
obj[keys[-1]] = '$value'

with open('$CONFIG_FILE', 'w') as f:
    json.dump(data, f, indent=2)
EOF
        log "Установлен параметр $key = $value"
        return 0
    else
        warn "jq или python3 не найдены, невозможно изменить конфигурацию"
        return 1
    fi
}

# Set boolean config value
set_config_bool() {
    local key="$1"
    local value="$2"
    
    if ! file_exists "$CONFIG_FILE"; then
        init_config
    fi
    
    backup_file "$CONFIG_FILE"
    
    if command_exists jq; then
        local tmp=$(mktemp)
        jq ".$key = $value" "$CONFIG_FILE" > "$tmp" && mv "$tmp" "$CONFIG_FILE"
        log "Установлен параметр $key = $value"
        return 0
    elif command_exists python3; then
        python3 << EOF
import json
with open('$CONFIG_FILE', 'r') as f:
    data = json.load(f)

keys = '$key'.split('.')
obj = data
for k in keys[:-1]:
    if k not in obj:
        obj[k] = {}
    obj = obj[k]
obj[keys[-1]] = $value

with open('$CONFIG_FILE', 'w') as f:
    json.dump(data, f, indent=2)
EOF
        log "Установлен параметр $key = $value"
        return 0
    else
        warn "jq или python3 не найдены, невозможно изменить конфигурацию"
        return 1
    fi
}

# Unset config value
unset_config() {
    local key="$1"
    
    if ! file_exists "$CONFIG_FILE"; then
        return 1
    fi
    
    backup_file "$CONFIG_FILE"
    
    if command_exists jq; then
        local tmp=$(mktemp)
        jq ".$key = null" "$CONFIG_FILE" > "$tmp" && mv "$tmp" "$CONFIG_FILE"
        log "Удален параметр $key"
        return 0
    elif command_exists python3; then
        python3 << EOF
import json
with open('$CONFIG_FILE', 'r') as f:
    data = json.load(f)

keys = '$key'.split('.')
obj = data
for k in keys[:-1]:
    if k not in obj:
        break
    obj = obj[k]
else:
    obj[keys[-1]] = None

with open('$CONFIG_FILE', 'w') as f:
    json.dump(data, f, indent=2)
EOF
        log "Удален параметр $key"
        return 0
    else
        warn "jq или python3 не найдены, невозможно изменить конфигурацию"
        return 1
    fi
}

# Update dependency version in config
update_dependency_version() {
    local dep="$1"
    local version="$2"
    
    set_config "dependencies.$dep" "$version"
}

# Enable integration
enable_integration() {
    local ai="$1"
    local config_path="$2"
    
    set_config_bool "integrations.$ai.enabled" "true"
    set_config "integrations.$ai.configPath" "$config_path"
    log "Интеграция $ai включена"
}

# Disable integration
disable_integration() {
    local ai="$1"
    
    set_config_bool "integrations.$ai.enabled" "false"
    set_config "integrations.$ai.configPath" "null"
    log "Интеграция $ai отключена"
}

# Check if integration is enabled
is_integration_enabled() {
    local ai="$1"
    local enabled=$(get_config "integrations.$ai.enabled" "false")
    
    [ "$enabled" = "true" ]
}

# Get integrated assistants
get_integrated_assistants() {
    if ! file_exists "$CONFIG_FILE"; then
        return 1
    fi
    
    local assistants=()
    
    if [ "$(get_config 'integrations.opencode.enabled')" = "true" ]; then
        assistants+=("opencode")
    fi
    
    if [ "$(get_config 'integrations.claude.enabled')" = "true" ]; then
        assistants+=("claude")
    fi
    
    if [ ${#assistants[@]} -gt 0 ]; then
        echo "${assistants[@]}"
        return 0
    fi
    
    return 1
}

# Set proxy configuration
set_proxy_config() {
    local proxy_url="$1"
    
    set_config "proxy.url" "$proxy_url"
    set_config_bool "proxy.enabled" "true"
    log "Прокси установлен: $proxy_url"
}

# Clear proxy configuration
clear_proxy_config() {
    unset_config "proxy.url"
    set_config_bool "proxy.enabled" "false"
    log "Прокси удален из конфигурации"
}

# Get proxy from config
get_proxy_config() {
    get_config "proxy.url"
}

# Check if auto-update is enabled
is_auto_update_enabled() {
    local enabled=$(get_config "settings.autoUpdate" "true")
    [ "$enabled" = "true" ]
}

# Set auto-update
set_auto_update() {
    local enabled="$1"
    set_config_bool "settings.autoUpdate" "$enabled"
}

# Get last update check time
get_last_update_check() {
    get_config "settings.lastUpdateCheck" "0"
}

# Set last update check time
set_last_update_check() {
    local timestamp=$(date +%s)
    set_config "settings.lastUpdateCheck" "$timestamp"
}

# Check if update check is needed
should_check_update() {
    if ! is_auto_update_enabled; then
        return 1
    fi
    
    local last_check=$(get_last_update_check)
    local interval=$(get_config "settings.checkUpdateInterval" "86400")
    local current=$(date +%s)
    
    local diff=$((current - last_check))
    
    [ $diff -ge $interval ]
}

# Display current configuration
show_config() {
    if ! file_exists "$CONFIG_FILE"; then
        warn "Файл конфигурации не найден"
        return 1
    fi
    
    echo "Конфигурация QArness:"
    echo "-------------------"
    cat "$CONFIG_FILE"
}

# Reset configuration to defaults
reset_config() {
    if file_exists "$CONFIG_FILE"; then
        backup_file "$CONFIG_FILE"
        rm "$CONFIG_FILE"
    fi
    
    init_config
    log "Конфигурация сброшена к значениям по умолчанию"
}

# Export functions
export -f init_config get_config set_config set_config_bool unset_config
export -f update_dependency_version
export -f enable_integration disable_integration is_integration_enabled
export -f get_integrated_assistants
export -f set_proxy_config clear_proxy_config get_proxy_config
export -f is_auto_update_enabled set_auto_update
export -f get_last_update_check set_last_update_check should_check_update
export -f show_config reset_config
