# QArness Installer for Windows (PowerShell)
# Version: 1.0.0

$VERSION = "1.0.0"
$REPO_URL = "https://github.com/vnewhatson-code/QArness.git"
$INSTALL_DIR = "$env:USERPROFILE\.qarness"

# Functions
function Write-ColorLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $color = switch ($Level) {
        "INFO"    { "Green" }
        "WARN"    { "Yellow" }
        "ERROR"   { "Red" }
        default   { "White" }
    }
    
    Write-Host "[$Level] $Message" -ForegroundColor $color
}

function Print-Banner {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║                                       ║" -ForegroundColor Blue
    Write-Host "║         QArness Installer v$VERSION       ║" -ForegroundColor Blue
    Write-Host "║                                       ║" -ForegroundColor Blue
    Write-Host "║  AI-инструмент автоматизации QA       ║" -ForegroundColor Blue
    Write-Host "║                                       ║" -ForegroundColor Blue
    Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Detect-Proxy {
    $proxy = $null
    
    # Check environment variables
    if ($env:HTTP_PROXY) {
        $proxy = $env:HTTP_PROXY
        Write-ColorLog "Прокси обнаружен из HTTP_PROXY: $proxy" "INFO"
        return $proxy
    }
    
    if ($env:HTTPS_PROXY) {
        $proxy = $env:HTTPS_PROXY
        Write-ColorLog "Прокси обнаружен из HTTPS_PROXY: $proxy" "INFO"
        return $proxy
    }
    
    # Check Git config
    try {
        $gitProxy = git config --global --get http.proxy 2>$null
        if ($gitProxy) {
            Write-ColorLog "Прокси обнаружен из Git: $gitProxy" "INFO"
            return $gitProxy
        }
    } catch {}
    
    # Check Windows registry
    try {
        $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
        $proxyEnable = Get-ItemProperty -Path $regPath -Name ProxyEnable -ErrorAction SilentlyContinue
        
        if ($proxyEnable.ProxyEnable -eq 1) {
            $proxyServer = Get-ItemProperty -Path $regPath -Name ProxyServer -ErrorAction SilentlyContinue
            if ($proxyServer.ProxyServer) {
                $proxy = "http://$($proxyServer.ProxyServer)"
                Write-ColorLog "Прокси обнаружен из реестра Windows: $proxy" "INFO"
                return $proxy
            }
        }
    } catch {}
    
    return $null
}

function Setup-Proxy {
    param([string]$ProxyUrl)
    
    if ($ProxyUrl) {
        $env:HTTP_PROXY = $ProxyUrl
        $env:HTTPS_PROXY = $ProxyUrl
        
        git config --global http.proxy $ProxyUrl 2>$null
        git config --global https.proxy $ProxyUrl 2>$null
        
        Write-ColorLog "Прокси настроен для установки" "INFO"
    }
}

function Test-Dependency {
    param([string]$Command)
    
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Install-QArness {
    Write-ColorLog "Клонирование QArness..." "INFO"
    
    # Check if already installed
    if (Test-Path $INSTALL_DIR) {
        Write-ColorLog "Обнаружена существующая установка QArness" "WARN"
        $response = Read-Host "Удалить и переустановить? [y/N]"
        
        if ($response -eq "y" -or $response -eq "Y") {
            Write-ColorLog "Удаление старой установки..." "INFO"
            Remove-Item -Recurse -Force $INSTALL_DIR
        } else {
            Write-ColorLog "Обновление существующей установки..." "INFO"
            Set-Location $INSTALL_DIR
            git pull origin main
            return
        }
    }
    
    # Clone repository
    $parentDir = Split-Path $INSTALL_DIR -Parent
    if (!(Test-Path $parentDir)) {
        New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
    }
    
    git clone $REPO_URL $INSTALL_DIR
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorLog "QArness успешно клонирован в $INSTALL_DIR" "INFO"
    } else {
        Write-ColorLog "Ошибка клонирования репозитория" "ERROR"
        exit 1
    }
}

function Install-Dependencies {
    Write-ColorLog "Проверка зависимостей..." "INFO"
    
    # Check Node.js
    if (!(Test-Dependency "node")) {
        Write-ColorLog "Node.js не установлен" "WARN"
        
        if (Test-Dependency "choco") {
            $response = Read-Host "Установить Node.js через Chocolatey? [Y/n]"
            if ($response -eq "" -or $response -eq "y" -or $response -eq "Y") {
                choco install nodejs -y
            }
        } elseif (Test-Dependency "scoop") {
            $response = Read-Host "Установить Node.js через Scoop? [Y/n]"
            if ($response -eq "" -or $response -eq "y" -or $response -eq "Y") {
                scoop install nodejs
            }
        } else {
            Write-ColorLog "Установите Node.js вручную: https://nodejs.org/" "WARN"
        }
    } else {
        $nodeVersion = node --version
        Write-ColorLog "Node.js установлен: $nodeVersion" "INFO"
    }
    
    # Check npm
    if (Test-Dependency "npm") {
        $npmVersion = npm --version
        Write-ColorLog "npm установлен: $npmVersion" "INFO"
    }
}

function Setup-CLI {
    Write-ColorLog "Настройка CLI..." "INFO"
    
    # Add to PATH
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($userPath -notlike "*$INSTALL_DIR*") {
        $newPath = "$userPath;$INSTALL_DIR"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        $env:Path = $newPath
        Write-ColorLog "QArness добавлен в PATH" "INFO"
    }
    
    # Create qarness.cmd wrapper
    $cmdWrapper = @"
@echo off
bash "$INSTALL_DIR\qarness" %*
"@
    
    $cmdWrapper | Out-File -FilePath "$INSTALL_DIR\qarness.cmd" -Encoding ASCII
    Write-ColorLog "CLI команда 'qarness' настроена" "INFO"
}

function Show-NextSteps {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                       ║" -ForegroundColor Green
    Write-Host "║  ✓ QArness успешно установлен!                        ║" -ForegroundColor Green
    Write-Host "║                                                       ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Следующие шаги:"
    Write-Host ""
    Write-Host "  1. Перезапустите PowerShell для обновления PATH"
    Write-Host ""
    Write-Host "  2. Проверьте статус:"
    Write-Host "     qarness status"
    Write-Host ""
    Write-Host "  3. Интегрируйте с AI-ассистентами:"
    Write-Host "     qarness integrate opencode"
    Write-Host ""
    Write-Host "  4. Настройте прокси (если требуется):"
    Write-Host "     qarness config proxy set http://proxy.company.com:8080"
    Write-Host ""
    Write-Host "Документация: https://github.com/vnewhatson-code/QArness"
    Write-Host ""
}

# Main execution
Print-Banner

# Check dependencies
Write-ColorLog "Проверка системных требований..." "INFO"

if (!(Test-Dependency "git")) {
    Write-ColorLog "Git не найден. Установите Git: https://git-scm.com/download/win" "ERROR"
    exit 1
}

# Detect and setup proxy
$proxy = Detect-Proxy
if ($proxy) {
    Setup-Proxy $proxy
}

# Install
Install-QArness
Install-Dependencies
Setup-CLI

Show-NextSteps

Write-ColorLog "Установка завершена!" "INFO"
