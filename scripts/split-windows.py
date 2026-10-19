#!/usr/bin/env python3
"""Prepare verified Windows release parts and its portable Windows launcher."""
from pathlib import Path
import hashlib, json
root=Path(__file__).resolve().parent.parent
archive=root/'dist/IronCrown-Windows-x64.zip'
version=json.loads((root/'package.json').read_text())['version']
folder=root/'windows-package';folder.mkdir(exist_ok=True)
for old in folder.glob('IronCrown-PC.zip.[0-9][0-9][0-9]'):old.unlink()
parts=[];full=hashlib.sha256();total=0
with archive.open('rb') as source:
 while data:=source.read(32*1024*1024):
  name=f'IronCrown-PC.zip.{len(parts)+1:03d}';(folder/name).write_bytes(data)
  parts.append({'name':name,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()});full.update(data);total+=len(data)
digest=full.hexdigest()
(folder/'manifest.json').write_text(json.dumps({'version':version,'filename':archive.name,'size':total,'sha256':digest,'parts':parts},indent=2)+'\n')
joined='+'.join('"windows-package\\'+p['name']+'"' for p in parts)
cmd=f'''@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Shadows of the Iron Crown {version} - Preparar jogo
cd /d "%~dp0"
set "IRON_GAME_ROOT=%~dp0"
if not exist "Jogo-PC\\IronCrown-Windows-x64\\Shadows of the Iron Crown.exe" goto preparar
powershell.exe -NoProfile -Command "$p=Join-Path $env:IRON_GAME_ROOT 'Jogo-PC\\.iron-crown-package.sha256'; if((Test-Path -LiteralPath $p) -and ((Get-Content -LiteralPath $p -Raw).Trim() -eq '{digest}')){{exit 0}}; exit 1"
if not errorlevel 1 goto jogar
:preparar
echo Preparando o jogo {version}. Isto pode levar alguns minutos na primeira vez.
echo Mantenha todos os arquivos da pasta windows-package juntos.
copy /b /y {joined} "IronCrown-PC.zip" >nul
if errorlevel 1 goto erro
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $root=$env:IRON_GAME_ROOT; $zip=Join-Path $root 'IronCrown-PC.zip'; if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne '{digest}'){{throw 'O pacote esta incompleto ou corrompido. Baixe o repositorio inteiro novamente.'}}; Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $root 'Jogo-PC') -Force; Set-Content -LiteralPath (Join-Path $root 'Jogo-PC\\.iron-crown-package.sha256') -Value '{digest}'"
if errorlevel 1 goto erro
:jogar
start "" "Jogo-PC\\IronCrown-Windows-x64\\Shadows of the Iron Crown.exe"
exit /b 0
:erro
echo.
echo Nao foi possivel preparar o jogo. Confira a mensagem acima.
pause
exit /b 1
'''
(root/'JOGAR-WINDOWS.cmd').write_bytes(cmd.replace('\n','\r\n').encode('ascii'))
print(f'{len(parts)} parts, {total} bytes, SHA-256 {digest}')
