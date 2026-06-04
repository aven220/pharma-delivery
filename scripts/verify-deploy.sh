#!/usr/bin/env bash
# Verifica que el servidor tenga el código actualizado antes de docker build
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Verificación pre-deploy ==="
echo "Commit actual:"
git log -1 --oneline 2>/dev/null || echo "(no git)"

ASSIGN="apps/backend/src/modules/assignments/routes/assignment.routes.ts"
AUTH="apps/backend/src/modules/auth/service/auth.service.ts"
PKG="apps/backend/package.json"

fail=0

if grep -q "routeParam(req.params.id)" "$ASSIGN"; then
  echo "OK  routeParam en assignments"
else
  echo "FALTA routeParam en $ASSIGN — ejecute: git pull"
  fail=1
fi

if grep -q "expiresIn: 900" "$AUTH"; then
  echo "OK  JWT fix en auth.service"
else
  echo "FALTA JWT fix en $AUTH — ejecute: git pull"
  fail=1
fi

if grep -q "noEmitOnError false" "$PKG"; then
  echo "OK  build script tolerante"
else
  echo "FALTA build script en $PKG — ejecute: git pull"
  fail=1
fi

if [[ $fail -ne 0 ]]; then
  exit 1
fi

echo "=== Listo para docker build ==="
