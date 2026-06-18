#@echo off
REM Arreglo P1000 — copiar a apps\backend\.env y levantar Postgres en 5433
cd /d "%~dp0.."

echo.
echo === Fix P1000 (puerto 5433) ===
echo.

powershell -NoProfile -Command ^
  "$c = @'
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://pharma:pharma_secret@localhost:5433/pharma_delivery?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars!!
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars!
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=http://localhost:5173,http://192.168.20.26:5173,http://localhost:8081
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
APP_PUBLIC_URL=http://192.168.20.26:5173
'@; [System.IO.File]::WriteAllText((Join-Path (Get-Location) 'apps\backend\.env'), $c.TrimStart())"

powershell -NoProfile -Command ^
  "[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), 'POSTGRES_HOST_PORT=5433')"

echo OK apps\backend\.env  -^> localhost:5433
echo OK .env               -^> POSTGRES_HOST_PORT=5433
echo.

docker compose down 2>nul
docker compose up -d postgres redis

echo Esperando 20 segundos...
timeout /t 20 /nobreak >nul

docker compose exec -T postgres psql -U pharma -d pharma_delivery -c "SELECT 1"
if errorlevel 1 (
  echo.
  echo ERROR: Postgres Docker no responde. Abra Docker Desktop y reintente.
  pause
  exit /b 1
)

echo.
echo Migrando (deploy, sin prompts)...
call npm run db:generate
cd apps\backend
call npx prisma migrate deploy
if errorlevel 1 (
  cd ..\..
  echo MIGRATE FALLO - revise el mensaje arriba
  pause
  exit /b 1
)
cd ..\..

call npm run db:seed

echo.
echo ========================================
echo LISTO. Base de datos en localhost:5433
echo   npm run dev:backend
echo   npm run dev:web
echo ========================================
pause
