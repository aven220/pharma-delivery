@echo off
REM Verifica medicamentos de una dispensación en la base de datos
cd /d "%~dp0.."
if "%~1"=="" (
  echo Uso: scripts\VERIFICAR-DISPENSACION.bat NroDispensacion
  echo      scripts\VERIFICAR-DISPENSACION.bat Cedula NroDispensacion
  pause
  exit /b 1
)
node scripts/verify-dispensacion.mjs %*
pause
