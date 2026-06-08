#!/bin/bash
# Integrate QArness with AI assistants

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QARNESS_DIR="$(dirname "$SCRIPT_DIR")"

# Source required libraries
source "${QARNESS_DIR}/lib/common.sh"
source "${QARNESS_DIR}/lib/config-manager.sh"

AGENTS_PATH="${QARNESS_DIR}/agents"
SKILLS_PATH="${QARNESS_DIR}/skills"

# Integrate with OpenCode
integrate_opencode() {
    local config_path="$1"
    local config_file=""
    
    print_header "Интеграция с OpenCode"
    
    # Determine config file
    if file_exists "$config_path/opencode.json"; then
        config_file="$config_path/opencode.json"
    elif file_exists "$config_path/opencode.jsonc"; then
        config_file="$config_path/opencode.jsonc"
    else
        # Create new config
        config_file="$config_path/opencode.json"
        mkdir -p "$config_path"
        cat "${QARNESS_DIR}/config/opencode-template.json" > "$config_file"
        log "Создан новый файл конфигурации: $config_file"
    fi
    
    # Backup existing config
    backup_file "$config_file"
    
    # Update configuration
    if command_exists jq; then
        local tmp=$(mktemp)
        
        # Add agents path
        jq --arg agentsPath "$AGENTS_PATH" \
           '.agents.paths += [$agentsPath] | .agents.paths |= unique' \
           "$config_file" > "$tmp" && mv "$tmp" "$config_file"
        
        # Add skills path
        jq --arg skillsPath "$SKILLS_PATH" \
           '.skills.paths += [$skillsPath] | .skills.paths |= unique' \
           "$config_file" > "$tmp" && mv "$tmp" "$config_file"
        
        # Add MCP server for XMind
        jq '.mcpServers.xmind = {"command": "npx", "args": ["-y", "xmind-mcp-server"]}' \
           "$config_file" > "$tmp" && mv "$tmp" "$config_file"
        
        print_success "OpenCode интегрирован: $config_file"
        
        # Update QArness config
        enable_integration "opencode" "$config_path"
        
        return 0
    elif command_exists python3; then
        python3 << EOF
import json
import sys

try:
    with open('$config_file', 'r') as f:
        data = json.load(f)
    
    # Initialize structures if not present
    if 'agents' not in data:
        data['agents'] = {}
    if 'paths' not in data['agents']:
        data['agents']['paths'] = []
    
    if 'skills' not in data:
        data['skills'] = {}
    if 'paths' not in data['skills']:
        data['skills']['paths'] = []
    
    if 'mcpServers' not in data:
        data['mcpServers'] = {}
    
    # Add paths if not already present
    if '$AGENTS_PATH' not in data['agents']['paths']:
        data['agents']['paths'].append('$AGENTS_PATH')
    
    if '$SKILLS_PATH' not in data['skills']['paths']:
        data['skills']['paths'].append('$SKILLS_PATH')
    
    # Add XMind MCP server
    data['mcpServers']['xmind'] = {
        'command': 'npx',
        'args': ['-y', 'xmind-mcp-server']
    }
    
    with open('$config_file', 'w') as f:
        json.dump(data, f, indent=2)
    
    print("Success")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
EOF
        
        if [ $? -eq 0 ]; then
            print_success "OpenCode интегрирован: $config_file"
            enable_integration "opencode" "$config_path"
            return 0
        else
            print_error "Ошибка интеграции с OpenCode"
            return 1
        fi
    else
        error "jq или python3 не найдены. Невозможно обновить конфигурацию OpenCode"
        return 1
    fi
}

# Integrate with Claude Desktop
integrate_claude() {
    local config_path="$1"
    local config_file="$config_path/claude_desktop_config.json"
    
    print_header "Интеграция с Claude Desktop"
    
    # Create config directory if not exists
    mkdir -p "$config_path"
    
    # Create or update config file
    if ! file_exists "$config_file"; then
        cat "${QARNESS_DIR}/config/claude-template.json" > "$config_file"
        log "Создан новый файл конфигурации: $config_file"
    else
        backup_file "$config_file"
    fi
    
    # Update configuration (Claude doesn't have agents/skills concept, only MCP servers)
    if command_exists jq; then
        local tmp=$(mktemp)
        
        # Add MCP server for XMind
        jq '.mcpServers.xmind = {"command": "npx", "args": ["-y", "xmind-mcp-server"]}' \
           "$config_file" > "$tmp" && mv "$tmp" "$config_file"
        
        print_success "Claude Desktop интегрирован: $config_file"
        
        # Update QArness config
        enable_integration "claude" "$config_path"
        
        # Note for user about manual setup
        info "Примечание: Claude Desktop не поддерживает прямую интеграцию агентов и навыков."
        info "Вы можете использовать QArness через MCP серверы."
        
        return 0
    elif command_exists python3; then
        python3 << EOF
import json
import sys

try:
    with open('$config_file', 'r') as f:
        data = json.load(f)
    
    # Initialize structures if not present
    if 'mcpServers' not in data:
        data['mcpServers'] = {}
    
    # Add XMind MCP server
    data['mcpServers']['xmind'] = {
        'command': 'npx',
        'args': ['-y', 'xmind-mcp-server']
    }
    
    with open('$config_file', 'w') as f:
        json.dump(data, f, indent=2)
    
    print("Success")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
EOF
        
        if [ $? -eq 0 ]; then
            print_success "Claude Desktop интегрирован: $config_file"
            enable_integration "claude" "$config_path"
            info "Примечание: Claude Desktop не поддерживает прямую интеграцию агентов и навыков."
            return 0
        else
            print_error "Ошибка интеграции с Claude Desktop"
            return 1
        fi
    else
        error "jq или python3 не найдены. Невозможно обновить конфигурацию Claude"
        return 1
    fi
}

# Update all existing integrations
update_all_integrations() {
    print_header "Обновление всех интеграций"
    
    local assistants=$(get_integrated_assistants)
    
    if [ -z "$assistants" ]; then
        warn "Нет активных интеграций для обновления"
        return 1
    fi
    
    for assistant in $assistants; do
        local config_path=$(get_config "integrations.$assistant.configPath")
        
        if [ -n "$config_path" ] && [ "$config_path" != "null" ]; then
            log "Обновление интеграции: $assistant"
            
            case "$assistant" in
                opencode)
                    integrate_opencode "$config_path"
                    ;;
                claude)
                    integrate_claude "$config_path"
                    ;;
            esac
        fi
    done
    
    print_success "Все интеграции обновлены"
}

# Remove integration
remove_integration() {
    local ai="$1"
    local config_path=$(get_config "integrations.$ai.configPath")
    
    if [ -z "$config_path" ] || [ "$config_path" = "null" ]; then
        warn "Интеграция $ai не найдена"
        return 1
    fi
    
    print_header "Удаление интеграции: $ai"
    
    case "$ai" in
        opencode)
            local config_file=""
            
            if file_exists "$config_path/opencode.json"; then
                config_file="$config_path/opencode.json"
            elif file_exists "$config_path/opencode.jsonc"; then
                config_file="$config_path/opencode.jsonc"
            fi
            
            if [ -n "$config_file" ]; then
                backup_file "$config_file"
                
                if command_exists jq; then
                    local tmp=$(mktemp)
                    
                    # Remove agents path
                    jq --arg agentsPath "$AGENTS_PATH" \
                       '.agents.paths -= [$agentsPath]' \
                       "$config_file" > "$tmp" && mv "$tmp" "$config_file"
                    
                    # Remove skills path
                    jq --arg skillsPath "$SKILLS_PATH" \
                       '.skills.paths -= [$skillsPath]' \
                       "$config_file" > "$tmp" && mv "$tmp" "$config_file"
                    
                    # Remove MCP server
                    jq 'del(.mcpServers.xmind)' \
                       "$config_file" > "$tmp" && mv "$tmp" "$config_file"
                fi
            fi
            ;;
        claude)
            local config_file="$config_path/claude_desktop_config.json"
            
            if file_exists "$config_file"; then
                backup_file "$config_file"
                
                if command_exists jq; then
                    local tmp=$(mktemp)
                    jq 'del(.mcpServers.xmind)' "$config_file" > "$tmp" && mv "$tmp" "$config_file"
                fi
            fi
            ;;
    esac
    
    disable_integration "$ai"
    print_success "Интеграция $ai удалена"
}

# Main execution
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    case "$1" in
        --update-all)
            update_all_integrations
            ;;
        opencode)
            if [ -z "$2" ]; then
                error "Использование: $0 opencode <config-path>"
            fi
            integrate_opencode "$2"
            ;;
        claude)
            if [ -z "$2" ]; then
                error "Использование: $0 claude <config-path>"
            fi
            integrate_claude "$2"
            ;;
        --remove)
            if [ -z "$2" ]; then
                error "Использование: $0 --remove <ai-name>"
            fi
            remove_integration "$2"
            ;;
        *)
            echo "Использование: $0 <opencode|claude|--update-all|--remove> [config-path|ai-name]"
            exit 1
            ;;
    esac
fi
