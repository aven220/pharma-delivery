@echo off
:: Abrir firewall LAN para API/Web. Ejecutar como Administrador.
cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-lan-firewall.ps1"
pause
