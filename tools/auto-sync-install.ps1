# Bat che do tu dong cap nhat: chay ngam tools/auto-sync.mjs moi khi dang nhap Windows, va chay ngay bay gio.
# Tat: powershell -ExecutionPolicy Bypass -File tools/auto-sync-uninstall.ps1
# (File nay chi dung ky tu ASCII de Windows PowerShell 5.1 doc dung.)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source
$startup = [Environment]::GetFolderPath('Startup')
$vbs = Join-Path $startup 'FPT-Campus-3D-auto-sync.vbs'

$content = @"
' FPT Campus 3D - tu dong cap nhat web khi sua Excel (tao boi tools/auto-sync-install.ps1)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "$root"
sh.Run """$node"" ""$root\tools\auto-sync.mjs""", 0, False
"@
# Ghi UTF-16 de WSH doc dung ca duong dan co dau
[IO.File]::WriteAllText($vbs, $content, [Text.Encoding]::Unicode)
Write-Host "Da tao: $vbs"
Start-Process -FilePath 'wscript.exe' -ArgumentList "`"$vbs`""
Write-Host 'Da bat tu dong cap nhat. Nhat ky: logs\auto-sync.log'
