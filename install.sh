#!/usr/bin/env bash
set -euo pipefail

# QArness Bootstrap Installer
# Clones repo to ~/.qarness/repo if run from curl, checks bun, runs install.ts

SCRIPT_SOURCE="${BASH_SOURCE[0]-}"
REPO_ROOT=""

if [[ -n "$SCRIPT_SOURCE" && -f "$SCRIPT_SOURCE" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd)"
  REPO_ROOT="$SCRIPT_DIR"
fi

is_qarness_checkout() {
  [[ -n "$REPO_ROOT" ]] \
    && [[ -f "${REPO_ROOT}/install.ts" ]] \
    && [[ -f "${REPO_ROOT}/package.json" ]]
}

# If not run from checkout, clone to permanent location
if ! is_qarness_checkout; then
  if ! command -v git >/dev/null 2>&1; then
    echo "git необходим для установки QArness" >&2
    exit 1
  fi

  REPO_URL="${QARNESS_REPO_URL:-https://github.com/vnewhatson-code/QArness.git}"
  REF="${QARNESS_REF:-main}"
  INSTALL_DIR="${HOME}/.qarness/repo"

  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    echo "Обновление QArness..."
    cd "$INSTALL_DIR"
    git fetch --quiet origin "$REF" 2>/dev/null || true
    git reset --quiet --hard "origin/${REF}" 2>/dev/null || true
  else
    echo "Клонирование QArness..."
    rm -rf "$INSTALL_DIR"
    if ! git clone --quiet --depth 1 --branch "$REF" "$REPO_URL" "$INSTALL_DIR" 2>/dev/null; then
      echo "Ошибка клонирования QArness" >&2
      exit 1
    fi
  fi

  REPO_ROOT="$INSTALL_DIR"
fi

cd "$REPO_ROOT"

# Check/install bun
if ! command -v bun >/dev/null 2>&1; then
  echo "Bun не найден. Установка..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

# Install deps and run installer
bun install --silent 2>/dev/null || true
bun run install.ts "$@"
