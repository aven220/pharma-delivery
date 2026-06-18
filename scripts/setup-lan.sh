#!/usr/bin/env bash
# Setup completo en red local (Mac/Linux)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=== A-AS Delivery — Setup LAN ==="
echo ""

node scripts/apply-lan-config.mjs
npm install

docker compose up -d postgres redis
echo "Esperando PostgreSQL..."
sleep 10

node scripts/diagnose-db.mjs || {
  echo "Si P1000: cambie DEV_DB_PORT=5433 en config/dev-host.env y puerto en docker-compose.yml"
  exit 1
}

npm run db:generate
npm run db:migrate
npm run db:seed

source config/dev-host.env 2>/dev/null || true
HOST="${DEV_HOST:-192.168.20.26}"

echo ""
echo "Listo!"
echo "  Panel: http://${HOST}:5173"
echo "  API:   http://${HOST}:4000"
echo "  Admin: admin@pharma.local / Admin123!"
echo ""
echo "  npm run dev:backend"
echo "  npm run dev:web"
echo ""
