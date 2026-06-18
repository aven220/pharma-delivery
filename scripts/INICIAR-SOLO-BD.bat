@echo off
REM Solo base de datos + Redis (sin abrir API ni panel web)
cd /d "%~dp0.."

echo Iniciando PostgreSQL + Redis (A-AS Delivery)...

where docker >nul 2>&1 || (echo Instale Docker Desktop & pause & exit /b 1)

:waitdocker
docker info >nul 2>&1 || (timeout /t 5 /nobreak >nul & goto waitdocker)

call npm run setup:lan >nul 2>&1
docker compose up -d postgres redis
timeout /t 20 /nobreak >nul
docker compose exec -T postgres pg_isready -U pharma -d pharma_delivery

echo.
echo BD lista. Para API y panel: scripts\INICIAR-SERVICIO.bat
pause
