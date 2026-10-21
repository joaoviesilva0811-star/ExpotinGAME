@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Shadows of the Iron Crown 1.11.0 - Preparar jogo
cd /d "%~dp0"
set "IRON_GAME_ROOT=%~dp0"
if not exist "Jogo-PC\IronCrown-Windows-x64\Shadows of the Iron Crown.exe" goto preparar
powershell.exe -NoProfile -Command "$p=Join-Path $env:IRON_GAME_ROOT 'Jogo-PC\.iron-crown-package.sha256'; if((Test-Path -LiteralPath $p) -and ((Get-Content -LiteralPath $p -Raw).Trim() -eq 'd3486f6419b822f800484238e70a1fd87bcdef9ebd7ce855bf2eeb8399ca2ef0')){exit 0}; exit 1"
if not errorlevel 1 goto jogar
:preparar
echo Preparando o jogo 1.11.0. Isto pode levar alguns minutos na primeira vez.
echo Mantenha todos os arquivos da pasta windows-package juntos.
copy /b /y "windows-package\IronCrown-PC.zip.001"+"windows-package\IronCrown-PC.zip.002"+"windows-package\IronCrown-PC.zip.003"+"windows-package\IronCrown-PC.zip.004"+"windows-package\IronCrown-PC.zip.005"+"windows-package\IronCrown-PC.zip.006"+"windows-package\IronCrown-PC.zip.007"+"windows-package\IronCrown-PC.zip.008"+"windows-package\IronCrown-PC.zip.009"+"windows-package\IronCrown-PC.zip.010"+"windows-package\IronCrown-PC.zip.011"+"windows-package\IronCrown-PC.zip.012"+"windows-package\IronCrown-PC.zip.013"+"windows-package\IronCrown-PC.zip.014"+"windows-package\IronCrown-PC.zip.015"+"windows-package\IronCrown-PC.zip.016" "IronCrown-PC.zip" >nul
if errorlevel 1 goto erro
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $root=$env:IRON_GAME_ROOT; $zip=Join-Path $root 'IronCrown-PC.zip'; if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne 'd3486f6419b822f800484238e70a1fd87bcdef9ebd7ce855bf2eeb8399ca2ef0'){throw 'O pacote esta incompleto ou corrompido. Baixe o repositorio inteiro novamente.'}; Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $root 'Jogo-PC') -Force; Set-Content -LiteralPath (Join-Path $root 'Jogo-PC\.iron-crown-package.sha256') -Value 'd3486f6419b822f800484238e70a1fd87bcdef9ebd7ce855bf2eeb8399ca2ef0'"
if errorlevel 1 goto erro
:jogar
start "" "Jogo-PC\IronCrown-Windows-x64\Shadows of the Iron Crown.exe"
exit /b 0
:erro
echo.
echo Nao foi possivel preparar o jogo. Confira a mensagem acima.
pause
exit /b 1
