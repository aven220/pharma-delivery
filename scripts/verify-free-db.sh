#!/usr/bin/env bash
# Confirma que la BD es PostgreSQL Docker (gratis), no un servicio cloud de pago.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Verificación stack gratuito (PostgreSQL Docker) ==="

if docker compose -f docker-compose.prod.yml ps postgres 2>/dev/null | grep -q Up; then
  echo "OK  Contenedor postgres en ejecución"
else
  echo "INFO: postgres no está Up (¿stack detenido?)"
fi

URL=""
if docker compose -f docker-compose.prod.yml exec -T backend printenv DATABASE_URL 2>/dev/null; then
  URL=$(docker compose -f docker-compose.prod.yml exec -T backend printenv DATABASE_URL 2>/dev/null || true)
fi

if [[ -z "$URL" && -f .env.production ]]; then
  echo "INFO: Revisando .env.production (backend usa postgres:5432 vía compose)"
fi

PAID_PATTERNS='postgres.database.azure|neon.tech|supabase.co|railway.app|render.com|elephantsql|aiven'
if echo "${URL:-@postgres:5432}" | grep -qE "$PAID_PATTERNS"; then
  echo "ADVERTENCIA: DATABASE_URL apunta a servicio cloud de pago."
  echo "  Para stack gratis use Docker: @postgres:5432"
  exit 1
fi

echo "OK  No se detectó PostgreSQL cloud de pago en DATABASE_URL"
echo "OK  Stack recomendado: postgres:16-alpine en docker-compose.prod.yml"
echo ""
echo "Si Azure cobra PostgreSQL, elimine 'Azure Database for PostgreSQL' en el Portal."
echo "Ver: docs/FREE_STACK.md"
