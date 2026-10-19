@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Shadows of the Iron Crown - Preparar jogo
cd /d "%~dp0"
set "IRON_GAME_ROOT=%~dp0"
if exist "Jogo-PC\IronCrown-Windows-x64\Shadows of the Iron Crown.exe" goto jogar
echo Preparando o jogo. Isto pode levar alguns minutos na primeira vez.
echo Mantenha todos os arquivos da pasta windows-package juntos.
copy /b /y "windows-package\IronCrown-PC.zip.001"+"windows-package\IronCrown-PC.zip.002"+"windows-package\IronCrown-PC.zip.003"+"windows-package\IronCrown-PC.zip.004"+"windows-package\IronCrown-PC.zip.005"+"windows-package\IronCrown-PC.zip.006" "IronCrown-PC.zip" >nul
if errorlevel 1 goto erro
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $root=$env:IRON_GAME_ROOT; $zip=Join-Path $root 'IronCrown-PC.zip'; if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne '444175d5544c47756a3883f0af5cc06ced93902cce3239585750c68a85e088d8'){throw 'O pacote esta incompleto ou corrompido. Baixe o repositorio inteiro novamente.'}; Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $root 'Jogo-PC') -Force"
if errorlevel 1 goto erro
:jogar
start "" "Jogo-PC\IronCrown-Windows-x64\Shadows of the Iron Crown.exe"
exit /b 0
:erro
echo.
echo Nao foi possivel preparar o jogo. Confira a mensagem acima.
pause
exit /b 1
