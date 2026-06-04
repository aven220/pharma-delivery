#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/pharma_delivery_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Iniciando respaldo PostgreSQL..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST:-postgres}" \
  -U "${POSTGRES_USER:-pharma}" \
  -d "${POSTGRES_DB:-pharma_delivery}" \
  --no-owner --no-acl | gzip > "$FILE"

echo "[backup] Guardado: $FILE"

find "$BACKUP_DIR" -name 'pharma_delivery_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "[backup] Retención aplicada (${RETENTION_DAYS} días)"
