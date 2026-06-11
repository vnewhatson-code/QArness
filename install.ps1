#!/usr/bin/env pwsh
<#
.SYNOPSIS
QArness Bootstrap Installer (PowerShell)
Clones repo to ~/.qarness/repo if run from web, checks bun, runs install.ts

Usage:
  irm https://raw.githubusercontent.com/vnewhatson-code/QArness/main/install.ps1 | iex
#>

$ErrorActionPreference = "Stop"

$ScriptPath = if ($MyInvocation.MyCommand.Path) {
  $MyInvocation.MyCommand.Path
} elseif ($PSScriptRoot -and (Test-Path "$PSScriptRoot\install.ps1")) {
  "$PSScriptRoot\install.ps1"
} else {
  $null
}

$RepoRoot = if ($ScriptPath) {
  $dir = Split-Path $ScriptPath -Parent
  if ($dir) { [System.IO.Path]::GetFullPath($dir) } else { $null }
} else {
  $null
}

function Is-QArnessCheckout {
  param($root)
  ($root) -and (Test-Path (Join-Path $root "install.ts")) -and (Test-Path (Join-Path $root "package.json"))
}

function Clone-QArness {
  $RepoUrl = if ($env:QARNESS_REPO_URL) { $env:QARNESS_REPO_URL } else { "https://github.com/vnewhatson-code/QArness.git" }
  $Ref = if ($env:QARNESS_REF) { $env:QARNESS_REF } else { "main" }

  $HomeDir = [System.Environment]::GetFolderPath('UserProfile')
  $InstallDir = Join-Path $HomeDir ".qarness\repo"

  # If already cloned, update instead of re-cloning
  if (Test-Path (Join-Path $InstallDir ".git")) {
    Write-Host "Обновление QArness..."
    Push-Location $InstallDir
    git fetch --quiet origin $Ref
    if ($LASTEXITCODE -eq 0) {
      git reset --quiet --hard "origin/$Ref"
    }
    Pop-Location
  }
  else {
    Write-Host "Клонирование QArness..."
    if (Test-Path $InstallDir) {
      Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue
    }
    git clone --quiet --depth 1 --branch $Ref $RepoUrl $InstallDir
    if ($LASTEXITCODE -ne 0) {
      throw "Ошибка клонирования QArness"
    }
  }

  return $InstallDir
}

# --- Main ---

if (-not (Is-QArnessCheckout $RepoRoot)) {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git необходим для установки QArness"
  }
  $RepoRoot = Clone-QArness
}

Set-Location $RepoRoot

# Check/install bun
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host "Bun не найден. Установка..."
  irm bun.sh/install.ps1 | iex
  $BunBin = Join-Path ([System.Environment]::GetFolderPath('UserProfile')) ".bun\bin"
  $env:PATH = "$BunBin;$env:PATH"
}

# Install deps and run installer
bun install --silent
bun run install.ts @args
