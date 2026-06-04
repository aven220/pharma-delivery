#!/bin/sh
set -e

echo "[entrypoint] Iniciando A-AS Delivery API..."

echo "[entrypoint] Aplicando migraciones Prisma..."
npx prisma migrate deploy

echo "[entrypoint] Arrancando servidor..."
exec node dist/index.js
