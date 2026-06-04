#!/bin/sh
set -eu

if [ $# -lt 1 ]; then
  echo "Uso: restore.sh /backups/pharma_delivery_YYYYMMDD_HHMMSS.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Archivo no encontrado: $BACKUP_FILE"
  exit 1
fi

echo "[restore] ADVERTENCIA: esto sobrescribirá la base de datos actual."
echo "[restore] Archivo: $BACKUP_FILE"
echo "[restore] Continuando en 5 segundos..."
sleep 5

gunzip -c "$BACKUP_FILE" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "${POSTGRES_HOST:-postgres}" \
  -U "${POSTGRES_USER:-pharma}" \
  -d "${POSTGRES_DB:-pharma_delivery}"

echo "[restore] Restauración completada."
