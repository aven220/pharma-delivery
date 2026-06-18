#@echo off
REM Arreglo P1000 + aplicar puertos de config\dev-host.env (sin conflicto con otros programas)
cd /d "%~dp0.."

echo.
echo === Fix P1000 + configuracion LAN ===
echo.

call npm run setup:lan

docker compose down 2>nul
docker compose up -d postgres redis

echo Esperando 20 segundos...
timeout /t 20 /nobreak >nul

docker compose exec -T postgres psql -U pharma -d pharma_delivery -c "SELECT 1"
if errorlevel 1 (
  echo ERROR: Postgres Docker no responde. Abra Docker Desktop.
  pause
  exit /b 1
)

echo.
echo Migrando...
call npm run db:generate
cd apps\backend
call npx prisma migrate deploy
if errorlevel 1 (
  cd ..\..
  pause
  exit /b 1
)
cd ..\..

call npm run db:seed

echo.
echo ========================================
echo LISTO
type config\dev-host.env | findstr PORT=
echo   npm run dev:backend
echo   npm run dev:web
echo ========================================
pause
