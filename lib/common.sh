#!/bin/bash
# Common functions for QArness installer and CLI

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
QARNESS_DIR="${HOME}/.qarness"
CONFIG_FILE="${QARNESS_DIR}/config.json"
LOG_DIR="${QARNESS_DIR}/logs"
LOG_FILE="${LOG_DIR}/qarness.log"

# Initialize log directory
init_logging() {
    mkdir -p "${LOG_DIR}"
    touch "${LOG_FILE}"
}

# Logging functions
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[INFO]${NC} ${message}"
    echo "[${timestamp}] [INFO] ${message}" >> "${LOG_FILE}"
}

warn() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[WARN]${NC} ${message}"
    echo "[${timestamp}] [WARN] ${message}" >> "${LOG_FILE}"
}

error() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[ERROR]${NC} ${message}" >&2
    echo "[${timestamp}] [ERROR] ${message}" >> "${LOG_FILE}"
    exit 1
}

info() {
    local message="$1"
    echo -e "${BLUE}[INFO]${NC} ${message}"
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check if directory exists
dir_exists() {
    [ -d "$1" ]
}

# Check if file exists
file_exists() {
    [ -f "$1" ]
}

# Detect operating system
detect_os() {
    case "$(uname -s)" in
        Linux*)
            OS_TYPE="linux"
            ;;
        Darwin*)
            OS_TYPE="macos"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            OS_TYPE="windows"
            ;;
        *)
            error "Неподдерживаемая операционная система: $(uname -s)"
            ;;
    esac
    export OS_TYPE
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)
            ARCH="x64"
            ;;
        arm64|aarch64)
            ARCH="arm64"
            ;;
        *)
            ARCH="unknown"
            ;;
    esac
    export ARCH
}

# Check dependency
check_dependency() {
    local cmd="$1"
    local name="${2:-$1}"
    
    if command_exists "$cmd"; then
        return 0
    else
        return 1
    fi
}

# Get version of a command
get_version() {
    local cmd="$1"
    
    case "$cmd" in
        node)
            node --version 2>/dev/null | sed 's/v//'
            ;;
        npm)
            npm --version 2>/dev/null
            ;;
        git)
            git --version 2>/dev/null | awk '{print $3}'
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Expand tilde in paths
expand_path() {
    local path="$1"
    
    # Replace ~ with $HOME
    path="${path/#\~/$HOME}"
    
    # Handle %APPDATA% and similar Windows variables
    if [ "$OS_TYPE" = "windows" ]; then
        path="${path//%APPDATA%/$APPDATA}"
        path="${path//%LOCALAPPDATA%/$LOCALAPPDATA}"
        path="${path//%USERPROFILE%/$HOME}"
    fi
    
    echo "$path"
}

# Create backup of a file
backup_file() {
    local file="$1"
    
    if file_exists "$file"; then
        local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$file" "$backup"
        log "Создан бэкап: $backup"
    fi
}

# Check if jq is available, use python as fallback
json_get() {
    local file="$1"
    local key="$2"
    
    if ! file_exists "$file"; then
        return 1
    fi
    
    if command_exists jq; then
        jq -r "$key" "$file" 2>/dev/null
    elif command_exists python3; then
        python3 -c "import json; print(json.load(open('$file'))$key)" 2>/dev/null
    else
        warn "jq или python3 не найдены, невозможно прочитать JSON"
        return 1
    fi
}

json_set() {
    local file="$1"
    local key="$2"
    local value="$3"
    
    if command_exists jq; then
        local tmp=$(mktemp)
        jq "$key = \"$value\"" "$file" > "$tmp" && mv "$tmp" "$file"
    elif command_exists python3; then
        python3 -c "
import json
with open('$file', 'r') as f:
    data = json.load(f)
keys = '$key'.strip('.').split('.')
obj = data
for k in keys[:-1]:
    obj = obj.setdefault(k, {})
obj[keys[-1]] = '$value'
with open('$file', 'w') as f:
    json.dump(data, f, indent=2)
"
    else
        warn "jq или python3 не найдены, невозможно изменить JSON"
        return 1
    fi
}

# Ask user for confirmation
confirm() {
    local prompt="$1"
    local default="${2:-y}"
    
    if [ "$default" = "y" ]; then
        prompt="${prompt} [Y/n] "
    else
        prompt="${prompt} [y/N] "
    fi
    
    read -p "$prompt" -n 1 -r
    echo
    
    if [ -z "$REPLY" ]; then
        [ "$default" = "y" ] && return 0 || return 1
    fi
    
    [[ $REPLY =~ ^[Yy]$ ]] && return 0 || return 1
}

# Print section header
print_header() {
    local text="$1"
    echo
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  $text${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo
}

# Print success message
print_success() {
    local text="$1"
    echo
    echo -e "${GREEN}✓ $text${NC}"
    echo
}

# Print error message
print_error() {
    local text="$1"
    echo
    echo -e "${RED}✗ $text${NC}"
    echo
}

# Export functions
export -f log warn error info
export -f command_exists dir_exists file_exists
export -f detect_os detect_arch
export -f check_dependency get_version
export -f expand_path backup_file
export -f json_get json_set
export -f confirm print_header print_success print_error
