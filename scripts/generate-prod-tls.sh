#!/usr/bin/env bash
# Genera certificado TLS autofirmado para el proxy edge (IP o dominio).
# En producción con dominio público, sustituya por Let's Encrypt en infra/ssl/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSL_DIR="${ROOT}/infra/ssl"
DAYS="${TLS_CERT_DAYS:-365}"
CN="${TLS_CN:-a-as-delivery}"
SAN="${TLS_SAN:-DNS:localhost,IP:127.0.0.1}"

mkdir -p "$SSL_DIR"

if [[ -f "${SSL_DIR}/fullchain.pem" && -f "${SSL_DIR}/privkey.pem" ]]; then
  echo "Certificados ya existen en ${SSL_DIR}"
  echo "Elimine fullchain.pem y privkey.pem para regenerar."
  exit 0
fi

echo "Generando certificado (${DAYS} días, CN=${CN}, SAN=${SAN})..."
openssl req -x509 -nodes -days "$DAYS" -newkey rsa:4096 \
  -keyout "${SSL_DIR}/privkey.pem" \
  -out "${SSL_DIR}/fullchain.pem" \
  -subj "/CN=${CN}" \
  -addext "subjectAltName=${SAN}"

chmod 600 "${SSL_DIR}/privkey.pem"
echo "OK: ${SSL_DIR}/fullchain.pem y privkey.pem"
echo ""
echo "Para IP pública, regenere con:"
echo "  TLS_CN=20.5.19.8 TLS_SAN='IP:20.5.19.8' bash scripts/generate-prod-tls.sh"
echo ""
echo "Con dominio + Let's Encrypt, copie fullchain.pem y privkey.pem a infra/ssl/"
