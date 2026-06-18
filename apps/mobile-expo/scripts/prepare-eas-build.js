#!/usr/bin/env node
/**
 * EAS Build (nube) NO recibe variables del shell ni sube .env (gitignore).
 * Este script escribe EXPO_PUBLIC_API_URL en eas.json antes del build.
 */
const fs = require('fs');
const path = require('path');

const mobileRoot = path.join(__dirname, '..');
const repoRoot = path.join(mobileRoot, '../..');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const rootProd = readEnvFile(path.join(repoRoot, '.env.production'));
const mobileEnv = readEnvFile(path.join(mobileRoot, '.env'));

const easPath = path.join(mobileRoot, 'eas.json');
const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));

const fromEas = eas.build?.preview?.env?.EXPO_PUBLIC_API_URL?.trim() || '';

const resolved = (
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.MOBILE_API_URL ||
  mobileEnv.EXPO_PUBLIC_API_URL ||
  mobileEnv.MOBILE_API_URL ||
  rootProd.MOBILE_API_URL ||
  rootProd.WEB_API_URL ||
  fromEas ||
  ''
).trim();

if (!resolved) {
  console.error('ERROR: Defina la URL HTTPS del API antes del build EAS.');
  console.error('');
  console.error('  EXPO_PUBLIC_API_URL=https://20.5.19.8 npm run build:apk');
  console.error('');
  console.error('O MOBILE_API_URL en .env.production (raíz) o EXPO_PUBLIC_API_URL en apps/mobile-expo/.env');
  process.exit(1);
}

if (!resolved.startsWith('https://')) {
  console.error('ERROR: La URL debe ser HTTPS en producción.');
  console.error(`  Valor: ${resolved}`);
  process.exit(1);
}

for (const profile of ['preview', 'production']) {
  if (!eas.build[profile]) continue;
  eas.build[profile].env = {
    ...(eas.build[profile].env || {}),
    EXPO_PUBLIC_API_URL: resolved,
  };
}

fs.writeFileSync(easPath, `${JSON.stringify(eas, null, 2)}\n`);
console.log(`OK  EXPO_PUBLIC_API_URL=${resolved} (escrito en eas.json para EAS Build)`);

const certPath = path.join(mobileRoot, 'certs', 'server.crt');
if (!fs.existsSync(certPath)) {
  console.error('');
  console.error('ADVERTENCIA: Falta apps/mobile-expo/certs/server.crt');
  console.error('Ejecute: bash scripts/fetch-server-cert.sh');
  console.error('Sin este archivo Android no confiará el certificado autofirmado del servidor.');
  process.exit(1);
}
console.log('OK  certs/server.crt presente para embeber en Android');
