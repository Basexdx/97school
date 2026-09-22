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

  if (-not (Test-Path (Join-Path $root '.next\BUILD_ID'))) {
    Write-LaunchLog 'Собираю приложение (первый запуск или новая версия).'
    & npm.cmd run build *>> $log
    if ($LASTEXITCODE -ne 0) { throw 'Не удалось собрать Genius. Откройте .genius-launch.log.' }
  }

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
