@echo off
REM ============================================================
REM  A-AS Delivery — Arranque completo tras corte de luz / reinicio
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

echo [1/4] Esperando Docker Desktop...
:waitdocker
docker info >nul 2>&1
if errorlevel 1 (
  timeout /t 5 /nobreak >nul
  goto waitdocker
)
echo       Docker listo.

echo [2/4] Aplicando configuracion (puertos / .env)...
call npm run setup:lan >nul 2>&1

echo [3/4] Base de datos y Redis (Docker)...
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

echo [4/4] Iniciando API y panel web...
echo.

type config\dev-host.env | findstr /r "DEV_HOST= DEV_API_PORT= DEV_WEB_PORT="

echo.
echo Abriendo ventanas de API y Web...
start "A-AS API" cmd /k "cd /d %~dp0.. && npm run dev:backend"
timeout /t 3 /nobreak >nul
start "A-AS Web" cmd /k "cd /d %~dp0.. && npm run dev:web"

echo.
echo ============================================
echo   SERVICIO INICIADO
echo.
for /f "tokens=2 delims==" %%a in ('findstr DEV_HOST config\dev-host.env') do set H=%%a
for /f "tokens=2 delims==" %%a in ('findstr DEV_API_PORT config\dev-host.env') do set API=%%a
for /f "tokens=2 delims==" %%a in ('findstr DEV_WEB_PORT config\dev-host.env') do set WEB=%%a
echo   Panel: http://%H%:%WEB%
echo   API:   http://%H%:%API%
echo   Health: http://%H%:%API%/health
echo ============================================
echo.
echo Deje abiertas las ventanas "A-AS API" y "A-AS Web".
echo Para solo BD sin panel: scripts\INICIAR-SOLO-BD.bat
echo.
pause
