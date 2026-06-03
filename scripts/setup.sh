#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Pharma Delivery Setup"

if ! command -v node &>/dev/null; then
  echo "Error: Node.js >= 20.19.4 required"
  exit 1
fi

echo "==> Installing dependencies..."
npm install

echo "==> Building shared packages..."
npm run build -w @pharma/types
npm run build -w @pharma/utils
npm run build -w @pharma/api-client

echo "==> Setting up backend..."
if [ ! -f apps/backend/.env ]; then
  cp apps/backend/.env.example apps/backend/.env
  echo "Created apps/backend/.env"
fi

echo "==> Setting up web-admin..."
if [ ! -f apps/web-admin/.env ]; then
  cp apps/web-admin/.env.example apps/web-admin/.env
fi

echo "==> Setting up mobile..."
if [ ! -f apps/mobile-expo/.env ]; then
  cp apps/mobile-expo/.env.example apps/mobile-expo/.env
fi

echo "==> Starting Docker services (postgres + redis)..."
docker compose up -d postgres redis

echo "==> Waiting for PostgreSQL..."
sleep 5

echo "==> Running Prisma migrations..."
npm run db:generate
npm run db:migrate
npm run db:seed

echo ""
echo "Setup complete!"
echo ""
echo "  Backend:  npm run dev:backend  → http://localhost:4000"
echo "  Web:      npm run dev:web      → http://localhost:5173"
echo "  Mobile:   npm run dev:mobile"
echo ""
echo "  Admin:    admin@pharma.local / Admin123!"
echo "  Courier:  courier@pharma.local / Courier123!"
