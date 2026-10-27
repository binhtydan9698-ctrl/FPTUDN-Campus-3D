# Tat che do tu dong cap nhat: go khoi Startup va dung tien trinh dang chay.
# (File nay chi dung ky tu ASCII de Windows PowerShell 5.1 doc dung.)
$root = Split-Path -Parent $PSScriptRoot
$vbs = Join-Path ([Environment]::GetFolderPath('Startup')) 'FPT-Campus-3D-auto-sync.vbs'
if (Test-Path $vbs) { Remove-Item $vbs -Force; Write-Host "Da go: $vbs" }
$pidFile = Join-Path $root 'logs\auto-sync.pid'
if (Test-Path $pidFile) {
  $p = [int](Get-Content $pidFile)
  try { Stop-Process -Id $p -Force -ErrorAction Stop; Write-Host "Da dung tien trinh $p" } catch { }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
Write-Host 'Da tat tu dong cap nhat.'
