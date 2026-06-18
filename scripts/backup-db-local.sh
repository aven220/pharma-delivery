#!/usr/bin/env bash
# Respaldo local PostgreSQL (desarrollo con Docker Compose)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${BACKUP_DIR:-./backups/local}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/pharma_delivery_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup-local] Volcando base de datos..."
docker compose exec -T postgres pg_dump \
  -U pharma \
  -d pharma_delivery \
  --no-owner --no-acl | gzip > "$FILE"

echo "[backup-local] Guardado: $FILE"
find "$BACKUP_DIR" -name 'pharma_delivery_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
echo "[backup-local] Retención: ${RETENTION_DAYS} días"
