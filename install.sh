#!/usr/bin/env bash
set -euo pipefail

# QArness Bootstrap Installer
# Clones repo if run from curl, checks bun, runs install.ts

SCRIPT_SOURCE="${BASH_SOURCE[0]-}"
SCRIPT_DIR=""
REPO_ROOT=""

if [[ -n "$SCRIPT_SOURCE" && -f "$SCRIPT_SOURCE" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd)"
  REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi

is_qarness_checkout() {
  [[ -n "$REPO_ROOT" ]] \
    && [[ -f "${REPO_ROOT}/install.ts" ]] \
    && [[ -f "${REPO_ROOT}/package.json" ]]
}

clone_qarness() {
  local repo_url="${QARNESS_REPO_URL:-https://github.com/vnewhatson-code/QArness.git}"
  local ref="${QARNESS_REF:-main}"
  local temp_dir
  temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/qarness-install.XXXXXX")"
  local clone_dir="${temp_dir}/qarness"

  cleanup() { rm -rf "$temp_dir"; }
  trap cleanup EXIT INT TERM

  if ! git clone --quiet --depth 1 --branch "$ref" "$repo_url" "$clone_dir" 2>/dev/null; then
    echo "Ошибка клонирования QArness" >&2
    exit 1
  fi

  cd "$clone_dir"
  bash "${clone_dir}/install.sh" "$@"
}

# If not run from checkout, clone and delegate
if ! is_qarness_checkout; then
  if ! command -v git >/dev/null 2>&1; then
    echo "git необходим для установки QArness" >&2
    exit 1
  fi
  clone_qarness "$@"
  exit $?
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
