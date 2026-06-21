@echo off
REM Verifica puertos A-AS Delivery vs otros programas en el servidor
cd /d "%~dp0.."

echo.
echo === Puertos A-AS Delivery ===
type config\dev-host.env 2>nul | findstr /r "PORT="
echo.

echo === Estado en este servidor ===
call :chk 4401 "API backend"
call :chk 5517 "Panel web"
call :chk 5433 "PostgreSQL Docker"
call :chk 6380 "Redis Docker"

echo.
echo Contenedores pharma (este proyecto):
docker ps --filter "name=pharma-" --format "table {{.Names}}\t{{.Ports}}" 2>nul
echo.
echo Si OCUPADO y NO es pharma: edite config\dev-host.env y ejecute npm run setup:lan
pause
exit /b 0

:chk
netstat -ano | findstr ":%1 " | findstr LISTENING >nul 2>&1
if errorlevel 1 (echo   [LIBRE]    %1 %~2) else (echo   [OCUPADO]  %1 %~2)
exit /b 0
