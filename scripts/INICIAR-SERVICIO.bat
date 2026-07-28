@echo off
REM ============================================================
REM  A-AS Delivery — Arranque completo (LAN)
REM  Uso: doble clic o  scripts\INICIAR-SERVICIO.bat
REM ============================================================
cd /d "%~dp0.."

echo.
echo ============================================
echo   A-AS Delivery - Iniciando servicios
echo   %date% %time%
echo ============================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker no encontrado. Abra Docker Desktop primero.
  pause
  exit /b 1
)

echo [1/5] Esperando Docker Desktop...
:waitdocker
docker info >nul 2>&1
if errorlevel 1 (
  timeout /t 5 /nobreak >nul
  goto waitdocker
)
echo       Docker listo.

echo [2/5] Aplicando configuracion LAN (IP/puertos)...
call npm run setup:lan
if errorlevel 1 (
  echo ERROR: npm run setup:lan fallo.
  pause
  exit /b 1
)

echo [3/5] Firewall LAN (API 4410 / Web 5517)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Get-NetFirewallRule -DisplayName 'A-AS Delivery API 4410' -EA SilentlyContinue | Remove-NetFirewallRule -EA SilentlyContinue; New-NetFirewallRule -DisplayName 'A-AS Delivery API 4410' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4410 -Profile Any | Out-Null; Get-NetFirewallRule -DisplayName 'A-AS Delivery Web 5517' -EA SilentlyContinue | Remove-NetFirewallRule -EA SilentlyContinue; New-NetFirewallRule -DisplayName 'A-AS Delivery Web 5517' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5517 -Profile Any | Out-Null; Write-Host '      Firewall OK' } catch { Write-Host '      AVISO: ejecute como Administrador scripts\ABRIR-FIREWALL-LAN.bat' }"

echo [4/5] Base de datos y Redis (Docker)...
docker compose up -d postgres redis

echo       Esperando PostgreSQL (25 seg)...
timeout /t 25 /nobreak >nul

docker compose exec -T postgres pg_isready -U pharma -d pharma_delivery >nul 2>&1
if errorlevel 1 (
  echo ERROR: PostgreSQL no respondio. Ejecute scripts\FIX-P1000.bat
  pause
  exit /b 1
)
echo       PostgreSQL OK.

echo [5/5] Iniciando API y panel web...
echo.
type config\dev-host.env | findstr /r "DEV_HOST= DEV_API_PORT= DEV_WEB_PORT="
echo.
findstr /b "PORT=" apps\backend\.env
echo.

echo Cierre ventanas viejas "A-AS API" / "A-AS Web" si quedaron abiertas.
timeout /t 2 /nobreak >nul

start "A-AS API" cmd /k "cd /d %~dp0.. && npm run dev:backend"
timeout /t 5 /nobreak >nul
start "A-AS Web" cmd /k "cd /d %~dp0.. && npm run dev:web"

for /f "tokens=2 delims==" %%a in ('findstr DEV_HOST config\dev-host.env') do set H=%%a
for /f "tokens=2 delims==" %%a in ('findstr DEV_API_PORT config\dev-host.env') do set API=%%a
for /f "tokens=2 delims==" %%a in ('findstr DEV_WEB_PORT config\dev-host.env') do set WEB=%%a

echo.
echo Esperando API (8 seg)...
timeout /t 8 /nobreak >nul
curl.exe -s -m 5 http://127.0.0.1:%API%/health
echo.

echo ============================================
echo   SERVICIO INICIADO
echo.
echo   Panel:  http://%H%:%WEB%
echo   API:    http://%H%:%API%
echo   Health: http://%H%:%API%/health
echo.
echo   En la ventana "A-AS API" debe decir:
echo   Server running on port %API% (0.0.0.0)
echo ============================================
echo.
echo Deje abiertas las ventanas "A-AS API" y "A-AS Web".
echo Celular: misma WiFi, APK build:apk:lan
echo.
pause
