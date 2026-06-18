#@echo off
REM Configuracion inicial A-AS Delivery — red local (Windows)
REM Uso: scripts\setup-lan.ps1

cd /d "%~dp0.."
echo.
echo === A-AS Delivery - Setup LAN ===
echo.

where node >nul 2>&1 || (echo Error: instale Node.js 20+ & exit /b 1)
where docker >nul 2>&1 || (echo Error: instale Docker Desktop & exit /b 1)

echo [1/6] Aplicando IP desde config\dev-host.env...
node scripts\apply-lan-config.mjs
if errorlevel 1 exit /b 1

echo [2/6] npm install...
call npm install
if errorlevel 1 exit /b 1

echo [3/6] Docker postgres + redis...
docker compose up -d postgres redis
timeout /t 12 /nobreak >nul

echo [4/6] Diagnostico base de datos...
node scripts\diagnose-db.mjs
if errorlevel 1 (
  echo.
  echo Si falla P1000: edite config\dev-host.env y ponga DEV_DB_PORT=5433
  echo Luego en docker-compose.yml cambie postgres ports a "5433:5432"
  echo y vuelva a ejecutar este script.
  exit /b 1
)

echo [5/6] Migraciones y seed...
call npm run db:generate
call npm run db:migrate
call npm run db:seed

echo.
echo [6/6] Listo!
echo.
echo   Panel web:  http://192.168.20.26:5173
echo   API:        http://192.168.20.26:4000
echo   Login:      admin@pharma.local / Admin123!
echo.
echo   Terminal 1: npm run dev:backend
echo   Terminal 2: npm run dev:web
echo   Movil:      npm run dev:mobile  (misma WiFi)
echo.
pause
