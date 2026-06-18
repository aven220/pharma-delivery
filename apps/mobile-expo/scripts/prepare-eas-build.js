#!/usr/bin/env node
/**
 * EAS Build — escribe EXPO_PUBLIC_API_URL en eas.json antes del build.
 * HTTPS: servidor producción (requiere certs/server.crt)
 * HTTP LAN: IP privada 192.168.x.x (perfil preview-lan, sin certificado)
 */
const fs = require('fs');
const path = require('path');

const mobileRoot = path.join(__dirname, '..');
const repoRoot = path.join(mobileRoot, '../..');
const lanMode = process.argv.includes('--lan');

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

function isPrivateLanHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function isLanHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' && isPrivateLanHost(u.hostname);
  } catch {
    return false;
  }
}

function lanUrlFromDevHost() {
  const devHost = readEnvFile(path.join(repoRoot, 'config/dev-host.env'));
  const host = devHost.DEV_HOST;
  const port = devHost.DEV_API_PORT || '4400';
  if (!host) return '';
  return `http://${host}:${port}`;
}

const rootProd = readEnvFile(path.join(repoRoot, '.env.production'));
const mobileEnv = readEnvFile(path.join(mobileRoot, '.env'));
const devHostUrl = lanUrlFromDevHost();

const easPath = path.join(mobileRoot, 'eas.json');
const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));

const fromEas = eas.build?.preview?.env?.EXPO_PUBLIC_API_URL?.trim() || '';
const fromEasLan = eas.build?.['preview-lan']?.env?.EXPO_PUBLIC_API_URL?.trim() || '';

const resolved = (
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.MOBILE_API_URL ||
  (lanMode ? devHostUrl : '') ||
  mobileEnv.EXPO_PUBLIC_API_URL ||
  mobileEnv.MOBILE_API_URL ||
  rootProd.MOBILE_API_URL ||
  rootProd.WEB_API_URL ||
  fromEasLan ||
  fromEas ||
  devHostUrl ||
  ''
).trim();

if (!resolved) {
  console.error('ERROR: Defina la URL del API antes del build EAS.');
  console.error('');
  console.error('  Red local (HTTP):');
  console.error('    npm run build:apk:lan');
  console.error('  o: EXPO_PUBLIC_API_URL=http://192.168.20.26:4400 npm run build:apk:lan');
  console.error('');
  console.error('  Producción (HTTPS):');
  console.error('    EXPO_PUBLIC_API_URL=https://TU-SERVIDOR npm run build:apk');
  process.exit(1);
}

const lanHttp = isLanHttpUrl(resolved);

if (!resolved.startsWith('https://') && !lanHttp) {
  console.error('ERROR: Use HTTPS para servidor público, o HTTP solo con IP LAN (192.168.x.x).');
  console.error(`  Valor: ${resolved}`);
  console.error('  Para red local: npm run build:apk:lan');
  process.exit(1);
}

if (lanMode && !lanHttp) {
  console.error('ERROR: build:apk:lan requiere URL HTTP con IP privada.');
  console.error(`  Valor: ${resolved}`);
  console.error('  Ejemplo: http://192.168.20.26:4400');
  process.exit(1);
}

const profiles = lanHttp || lanMode ? ['preview-lan'] : ['preview', 'production'];

for (const profile of profiles) {
  if (!eas.build[profile]) continue;
  eas.build[profile].env = {
    ...(eas.build[profile].env || {}),
    EXPO_PUBLIC_API_URL: resolved,
  };
}

fs.writeFileSync(easPath, `${JSON.stringify(eas, null, 2)}\n`);
console.log(`OK  EXPO_PUBLIC_API_URL=${resolved}`);
console.log(`OK  Perfil EAS: ${profiles.join(', ')}`);

if (lanHttp || lanMode) {
  console.log('OK  Modo LAN HTTP — no se requiere certificado SSL');
  process.exit(0);
}

const certPath = path.join(mobileRoot, 'certs', 'server.crt');
if (!fs.existsSync(certPath)) {
  console.error('');
  console.error('ADVERTENCIA: Falta apps/mobile-expo/certs/server.crt');
  console.error('Ejecute: bash scripts/fetch-server-cert.sh TU-SERVIDOR');
  process.exit(1);
}
console.log('OK  certs/server.crt presente para embeber en Android');
