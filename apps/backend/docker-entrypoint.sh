#!/bin/sh
set -eu

echo "[entrypoint] instance=${INSTANCE_ID:-unknown}"

if [ "${INSTANCE_ID:-backend-1}" = "backend-1" ]; then
  echo "[entrypoint] Aplicando migraciones Prisma..."
  npx prisma migrate deploy
else
  echo "[entrypoint] Esperando migraciones de backend-1..."
  sleep 20
fi

echo "[entrypoint] Iniciando API..."
exec node dist/index.js
