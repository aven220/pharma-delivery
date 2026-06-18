#!/usr/bin/env bash
# Descarga el certificado TLS del servidor y lo guarda para confiar en Android.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="${SCRIPT_DIR}/../certs/server.crt"
HOST="${1:-20.5.19.8}"

mkdir -p "$(dirname "$OUT")"

if [[ -f "$OUT" ]] && openssl x509 -in "$OUT" -noout -subject &>/dev/null; then
  echo "Certificado existente válido: $OUT"
  openssl x509 -in "$OUT" -noout -subject -issuer -dates
  exit 0
fi

echo "Descargando certificado de ${HOST}:443 ..."
if ! echo | openssl s_client -connect "${HOST}:443" -servername "$HOST" 2>/dev/null \
  | openssl x509 -outform PEM > "$OUT"; then
  echo "ERROR: No se pudo descargar el certificado de ${HOST}" >&2
  exit 1
fi

if ! openssl x509 -in "$OUT" -noout -subject &>/dev/null; then
  echo "ERROR: Archivo de certificado inválido en $OUT" >&2
  rm -f "$OUT"
  exit 1
fi

openssl x509 -in "$OUT" -noout -subject -issuer -dates
echo "OK: $OUT"
