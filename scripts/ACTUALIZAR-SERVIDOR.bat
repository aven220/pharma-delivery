@echo off
REM ============================================================
REM  A-AS Delivery — Actualizar codigo desde GitHub (servidor)
REM  Uso: scripts\ACTUALIZAR-SERVIDOR.bat
REM ============================================================
cd /d "%~dp0.."

echo.
echo ============================================
echo   A-AS Delivery - Actualizacion desde Git
echo   %date% %time%
echo ============================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git no encontrado.
  pause
  exit /b 1
)

echo [1/6] Guardando .env locales...
git stash push -m "config local %date% %time%" -- apps/backend/.env apps/web-admin/.env apps/mobile-expo/.env docker-compose.yml .env .env.lan 2>nul

echo [2/6] Descargando cambios (git pull)...
git pull origin main
if errorlevel 1 (
  echo ERROR en git pull. Revise conflictos.
  pause
  exit /b 1
)

echo [3/6] npm install...
call npm install
if errorlevel 1 (
  echo ERROR en npm install.
  pause
  exit /b 1
)

echo [4/6] Configuracion LAN (.env)...
call npm run setup:lan

echo [5/6] Compilando API (dist actualizado)...
call npm run build -w @pharma/backend
if errorlevel 1 (
  echo ADVERTENCIA: build fallo. Use npm run dev:backend en su lugar.
)

echo [6/6] Docker postgres + redis...
docker compose up -d postgres redis

echo.
echo ============================================
echo   ACTUALIZACION COMPLETA
echo.
echo   IMPORTANTE:
echo   1. Cierre ventanas viejas "A-AS API" y "A-AS Web"
echo   2. Ejecute: scripts\INICIAR-SERVICIO.bat
echo   3. En el panel: Importacion Excel -^> REPROCESAR su archivo
echo      (o suba de nuevo la plantilla)
echo   4. Verifique: scripts\VERIFICAR-DISPENSACION.bat DISP-2024-001
echo ============================================
echo.
pause
