#!/usr/bin/env bash
# Checklist automatizado post-despliegue A-AS Delivery
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
BASE_URL="${WEB_API_URL:-}"
PUBLIC_URL="${WEB_PUBLIC_URL:-}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  BASE_URL="${WEB_API_URL:-$BASE_URL}"
  PUBLIC_URL="${WEB_PUBLIC_URL:-$PUBLIC_URL}"
fi

if [[ -z "$BASE_URL" ]]; then
  echo "Uso: WEB_API_URL=https://host WEB_PUBLIC_URL=https://host bash scripts/verify-production.sh"
  echo "O defina las variables en .env.production"
  exit 1
fi

fail=0
ok() { echo "OK  $1"; }
bad() { echo "FAIL $1"; fail=1; }

echo "=== Checklist producción A-AS Delivery ==="
echo "API:   $BASE_URL"
echo "Admin: ${PUBLIC_URL:-$BASE_URL}"
echo ""

if [[ "$BASE_URL" != https://* ]]; then
  bad "WEB_API_URL debe ser HTTPS"
else
  ok "WEB_API_URL usa HTTPS"
fi

if curl -kfsS "${BASE_URL}/health" >/dev/null 2>&1; then
  ok "GET /health"
else
  bad "GET /health"
fi

if curl -kfsS "${BASE_URL}/ready" >/dev/null 2>&1; then
  ok "GET /ready"
else
  bad "GET /ready"
fi

if curl -kfsS -o /dev/null -w '' "${BASE_URL}/socket.io/?EIO=4&transport=polling" 2>/dev/null; then
  ok "Socket.io polling endpoint"
else
  bad "Socket.io polling endpoint"
fi

ADMIN="${PUBLIC_URL:-$BASE_URL}"
if curl -kfsS "$ADMIN" | head -c 200 | grep -qi 'html\|<!DOCTYPE'; then
  ok "Panel admin responde HTML"
else
  bad "Panel admin ($ADMIN)"
fi

if grep -q "admin@pharma.local" apps/web-admin/src/pages/LoginPage.tsx 2>/dev/null; then
  bad "Login web con credenciales precargadas"
else
  ok "Login web sin credenciales demo"
fi

if grep -q "courier@pharma.local" apps/mobile-expo/app/login.tsx 2>/dev/null; then
  bad "Login móvil con credenciales precargadas"
else
  ok "Login móvil sin credenciales demo"
fi

if docker compose -f docker-compose.prod.yml ps 2>/dev/null | grep -q '8080->'; then
  bad "Puerto 8080 expuesto en host (debe usar solo 443)"
else
  ok "Puerto 8080 no publicado en host"
fi

if docker compose -f docker-compose.prod.yml ps 2>/dev/null | grep -q '8081->'; then
  bad "Puerto 8081 expuesto en host"
else
  ok "Puerto 8081 no publicado en host"
fi

echo ""
if [[ $fail -eq 0 ]]; then
  echo "=== Todas las comprobaciones pasaron ==="
else
  echo "=== Hay fallos — revise docs/PRODUCTION_CHECKLIST.md ==="
  exit 1
fi
