$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$log = Join-Path $root '.genius-launch.log'

function Write-LaunchLog([string]$text) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $log -Value "[$stamp] $text" -Encoding UTF8
}

function Test-GeniusPort {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect('127.0.0.1', 3000, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(250)
    if ($ok -and $client.Connected) { $client.EndConnect($iar); $client.Close(); return $true }
    $client.Close()
  } catch {}
  return $false
}

function Test-GeniusApi {
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8787/api/health' -TimeoutSec 2
    return $health.ok -and $health.service -eq 'genius-api'
  } catch {
    return $false
  }
}

function Test-GeniusBuildNeeded {
  $buildId = Join-Path $root '.next\BUILD_ID'
  if (-not (Test-Path $buildId)) { return $true }

  $sourcePaths = @('app', 'worker', 'shared', 'bank', 'public', 'scripts', 'package.json', 'package-lock.json', 'next.config.mjs', 'wrangler.jsonc')
  $sourceFiles = @()
  foreach ($relativePath in $sourcePaths) {
    $sourcePath = Join-Path $root $relativePath
    if (-not (Test-Path $sourcePath)) { continue }
    $item = Get-Item $sourcePath
    if ($item.PSIsContainer) {
      $sourceFiles += Get-ChildItem -Path $sourcePath -Recurse -File
    } else {
      $sourceFiles += $item
    }
  }

  if ($sourceFiles.Count -eq 0) { return $false }
  $newestSource = $sourceFiles | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  return $newestSource.LastWriteTimeUtc -gt (Get-Item $buildId).LastWriteTimeUtc
}

try {
  Write-LaunchLog 'Запуск Genius.'
  if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    throw 'Node.js не найден. Установите Node.js и запустите Genius ещё раз.'
  }
  if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'npm не найден. Проверьте установку Node.js.'
  }

  if (-not (Test-Path (Join-Path $root 'node_modules\next\dist\bin\next'))) {
    Write-LaunchLog 'Устанавливаю зависимости (первый запуск).'
    & npm.cmd ci *>> $log
    if ($LASTEXITCODE -ne 0) { throw 'Не удалось установить зависимости. Откройте .genius-launch.log.' }
  }

  if (-not (Test-Path (Join-Path $root '.dev.vars'))) {
    throw 'Сначала настройте локальную авторизацию: откройте PowerShell в папке Genius, выполните npm run setup:local и затем снова запустите Genius.'
  }
  $localConfig = Get-Content (Join-Path $root '.dev.vars') -Raw
  $requiredVars = @('APP_ORIGIN','TEACHER_EMAIL','TEACHER_ACCESS_SECRET','RATE_LIMIT_SECRET')
  $missingVars = @($requiredVars | Where-Object { $localConfig -notmatch "(?m)^$($_)=.+$" })
  if ($missingVars.Count -gt 0) {
    throw 'Локальная авторизация устарела. Выполните npm run setup:local, затем снова запустите Genius.'
  }

  if (Test-GeniusBuildNeeded) {
    Write-LaunchLog 'Собираю приложение (первая сборка или исходный код обновлён).'
    & npm.cmd run build *>> $log
    if ($LASTEXITCODE -ne 0) { throw 'Не удалось собрать Genius. Откройте .genius-launch.log.' }
  }

  if (-not (Test-GeniusApi)) {
    Write-LaunchLog 'Запускаю локальный API для входа, дневника и прогресса.'
    $apiCmd = 'npm.cmd run dev:api >> ".genius-launch.log" 2>&1'
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c',$apiCmd -WorkingDirectory $root -WindowStyle Hidden
  } else {
    Write-LaunchLog 'Локальный API уже работает.'
  }

  $apiReady = $false
  for ($i=0; $i -lt 60; $i++) {
    if (Test-GeniusApi) { $apiReady = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $apiReady) { throw 'Локальный API не запустился. Проверьте настройки авторизации и файл .genius-launch.log.' }

  if (-not (Test-GeniusPort)) {
    Write-LaunchLog 'Запускаю локальный веб-сервер.'
    $cmd = 'npm.cmd run start:web >> ".genius-launch.log" 2>&1'
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/d','/c',$cmd -WorkingDirectory $root -WindowStyle Hidden
  } else {
    Write-LaunchLog 'Сервер уже работает.'
  }

  $ready = $false
  for ($i=0; $i -lt 120; $i++) {
    if (Test-GeniusPort) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Сервер Genius не успел запуститься. Откройте .genius-launch.log.' }

  Write-LaunchLog 'Открываю браузер.'
  Start-Process 'http://127.0.0.1:3000'
} catch {
  Write-LaunchLog ("ОШИБКА: " + $_.Exception.Message)
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($_.Exception.Message + "`n`nПодробности: " + $log, 'Genius') | Out-Null
}
