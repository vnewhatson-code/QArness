#!/usr/bin/env pwsh
<#
.SYNOPSIS
QArness Bootstrap Installer (PowerShell)
Clones repo if run from web, checks bun, runs install.ts
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
  if ($dir) { $dir } else { $null }
} else {
  $null
}

function Is-QArnessCheckout {
  param($root)
  ($root) -and (Test-Path "$root\install.ts") -and (Test-Path "$root\package.json")
}

function Clone-QArness {
  $RepoUrl = if ($env:QARNESS_REPO_URL) { $env:QARNESS_REPO_URL } else { "https://github.com/vnewhatson-code/QArness.git" }
  $Ref = if ($env:QARNESS_REF) { $env:QARNESS_REF } else { "main" }

  $TempDir = Join-Path $env:TEMP "qarness-install-$([System.Guid]::NewGuid().ToString('N').Substring(0, 8))"
  $CloneDir = Join-Path $TempDir "qarness"

  try {
    git clone --quiet --depth 1 --branch $Ref $RepoUrl $CloneDir 2>$null
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Ошибка клонирования QArness"
      exit 1
    }

    Push-Location $CloneDir
    & "$CloneDir\install.ps1" @args
    Pop-Location
  }
  finally {
    Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
  }
}

# If not run from checkout, clone and delegate
if (-not (Is-QArnessCheckout $RepoRoot)) {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git необходим для установки QArness"
    exit 1
  }
  Clone-QArness @args
  exit $LASTEXITCODE
}

Set-Location $RepoRoot

# Check/install bun
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host "Bun не найден. Установка..."
  irm bun.sh/install.ps1 | iex
  $env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
}

# Install deps and run installer
bun install --silent 2>$null
if ($LASTEXITCODE -ne 0) { $null }
bun run install.ts @args
exit $LASTEXITCODE
