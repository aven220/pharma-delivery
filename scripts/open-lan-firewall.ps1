# Abrir puertos A-AS Delivery en Firewall de Windows (todos los perfiles)
# Ejecutar como Administrador:
#   powershell -ExecutionPolicy Bypass -File scripts\open-lan-firewall.ps1

$ErrorActionPreference = 'Stop'

$rules = @(
  @{ Name = 'A-AS Delivery API 4410'; Port = 4410 },
  @{ Name = 'A-AS Delivery Web 5517'; Port = 5517 }
)

Write-Host 'Configurando reglas de entrada (TCP, todos los perfiles)...' -ForegroundColor Cyan

foreach ($r in $rules) {
  Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
  New-NetFirewallRule `
    -DisplayName $r.Name `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $r.Port `
    -Profile Any `
    -Description 'Permite acceso LAN a A-AS Delivery' | Out-Null
  Write-Host "  OK  $($r.Name) (TCP $($r.Port))" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Prueba en el celular (misma WiFi):' -ForegroundColor Yellow
Write-Host '  http://192.168.20.26:4410/health'
Write-Host ''
