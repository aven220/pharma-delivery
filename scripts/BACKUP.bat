@echo off
REM ============================================================
REM  Backup manual base de datos A-AS Delivery (Windows)
REM  Guarda en: backups\local\
REM  Uso: scripts\BACKUP.bat  o  npm run backup:windows
REM ============================================================
cd /d "%~dp0.."

set BACKUP_DIR=backups\local
set RETENTION_DAYS=14
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i
set FILE=%BACKUP_DIR%\pharma_delivery_%TS%.sql

echo.
echo === Backup A-AS Delivery ===
echo Fecha: %date% %time%
echo.

docker compose ps postgres 2>nul | findstr /i "running" >nul
if errorlevel 1 (
  echo ERROR: PostgreSQL Docker no esta corriendo.
  echo Ejecute primero: scripts\INICIAR-SOLO-BD.bat
  pause
  exit /b 1
)

echo Volcando base de datos...
docker compose exec -T postgres pg_dump -U pharma -d pharma_delivery --no-owner --no-acl > "%FILE%"
if errorlevel 1 (
  echo ERROR en pg_dump
  del "%FILE%" 2>nul
  pause
  exit /b 1
)

set UPLOADS=apps\backend\uploads
set STAGE=%BACKUP_DIR%\stage_%TS%
mkdir "%STAGE%" >nul 2>&1
move "%FILE%" "%STAGE%\pharma_delivery.sql" >nul
if exist "%UPLOADS%" (
  echo Copiando evidencias / uploads...
  xcopy "%UPLOADS%" "%STAGE%\uploads\" /E /I /Q >nul
)

echo Comprimiendo SQL + uploads...
powershell -NoProfile -Command "Compress-Archive -Path '%STAGE%\*' -DestinationPath '%FILE%.zip' -Force"
rmdir /s /q "%STAGE%"
set FINAL=%FILE%.zip

for %%A in ("%FINAL%") do echo.
echo OK Backup guardado:
echo   %%~fA
echo   Tamanio: %%~zA bytes
echo.

echo Backups en %BACKUP_DIR%:
dir /b /o-d "%BACKUP_DIR%\pharma_delivery_*.zip" 2>nul
echo.
echo Copie los .zip a otro disco o USB para mayor seguridad.
echo Retencion local: %RETENTION_DAYS% dias (borrar viejos manualmente si desea).
echo.
pause
