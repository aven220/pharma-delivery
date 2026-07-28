#!/usr/bin/env bash
# Wrapper para Docker Compose producción — carga .env.production automáticamente
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: No existe $ENV_FILE"
  echo "Ejecute: cp .env.production.example .env.production && nano .env.production"
  exit 1
fi

if [[ "${1:-}" == "up" ]]; then
  if [[ ! -f infra/ssl/fullchain.pem || ! -f infra/ssl/privkey.pem ]]; then
    echo "ERROR: Faltan certificados TLS en infra/ssl/"
    echo "Ejecute: bash scripts/generate-prod-tls.sh"
    echo "O copie fullchain.pem y privkey.pem (Let's Encrypt) en infra/ssl/"
    exit 1
  fi
fi

exec docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" "$@"
