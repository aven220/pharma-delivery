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

# Docker Compose solo lee .env por defecto; --env-file resuelve ${VAR} en el YAML
exec docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" "$@"
