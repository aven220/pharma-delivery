# Abrir puertos A-AS Delivery en Firewall de Windows (solo red privada)
# Ejecutar como Administrador:
#   powershell -ExecutionPolicy Bypass -File scripts\open-lan-firewall.ps1

$ErrorActionPreference = 'Stop'

$rules = @(
  @{ Name = 'A-AS Delivery API 4410'; Port = 4410 },
  @{ Name = 'A-AS Delivery Web 5517'; Port = 5517 }
)

Write-Host 'Configurando reglas de entrada (TCP, Perfil Private)...' -ForegroundColor Cyan

foreach ($r in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
  if ($existing) {
    Remove-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
  }
  New-NetFirewallRule `
    -DisplayName $r.Name `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $r.Port `
    -Profile Private `
    -Description 'Permite acceso LAN a A-AS Delivery' | Out-Null
  Write-Host "  OK  $($r.Name) (TCP $($r.Port))" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Prueba desde otro equipo o el celular (misma WiFi):' -ForegroundColor Yellow
Write-Host '  http://192.168.20.26:4410/health'
Write-Host ''
Write-Host 'Si el celular sigue sin conectar:' -ForegroundColor Yellow
Write-Host '  1) Confirme que el backend escucha: netstat -ano | findstr :4410'
Write-Host '  2) Desactive "aislamiento de clientes / AP isolation" en el router'
Write-Host '  3) No use WiFi de invitados'
