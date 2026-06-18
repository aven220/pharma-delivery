#@echo off
REM Repara error P1000 — PostgreSQL en puerto 5433 (sin conflicto con Windows)
cd /d "%~dp0.."

echo.
echo === Reparar base de datos (P1000) ===
echo.

echo [1] Puerto 5433 en config...
powershell -Command "(Get-Content config\dev-host.env) -replace 'DEV_DB_PORT=.*','DEV_DB_PORT=5433' | Set-Content config\dev-host.env"
node scripts\apply-lan-config.mjs

echo [2] Reiniciar PostgreSQL Docker...
docker compose down
docker volume rm pharma-delivery_postgres_data 2>nul
docker compose up -d postgres redis

echo [3] Esperando PostgreSQL (20 seg)...
timeout /t 20 /nobreak >nul

echo [4] Probar conexion Docker...
docker compose exec -T postgres psql -U pharma -d pharma_delivery -c "SELECT 1"
if errorlevel 1 (
  echo ERROR: Docker postgres no responde. Verifique Docker Desktop.
  pause
  exit /b 1
)

echo [5] Migrar base de datos...
call npm run db:generate
call npm run db:migrate
if errorlevel 1 (
  echo.
  echo Si sigue fallando, ejecute: npm run db:diagnose
  pause
  exit /b 1
)

echo [6] Seed...
call npm run db:seed

echo.
echo === LISTO ===
echo DATABASE_URL usa localhost:5433
echo Ejecute: npm run dev:backend
echo.
pause
