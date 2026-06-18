#!/usr/bin/env node
/**
 * Aplica config/dev-host.env a todos los .env del proyecto.
 * Uso: node scripts/apply-lan-config.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hostFile = join(root, 'config/dev-host.env');

function loadHostConfig() {
  if (!existsSync(hostFile)) {
    console.error('Falta config/dev-host.env');
    process.exit(1);
  }
  const vars = {};
  for (const line of readFileSync(hostFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

function writeIfMissing(path, content) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content, 'utf8');
  console.log(`  ✓ ${path.replace(root + '/', '')}`);
}

const cfg = loadHostConfig();
const HOST = cfg.DEV_HOST || '192.168.20.26';
const API_PORT = cfg.DEV_API_PORT || '4000';
const WEB_PORT = cfg.DEV_WEB_PORT || '5173';
const DB_PORT = cfg.DEV_DB_PORT || cfg.POSTGRES_HOST_PORT || '5433';
const REDIS_PORT = cfg.REDIS_HOST_PORT || '6380';

const API_URL = `http://${HOST}:${API_PORT}`;
const WEB_URL = `http://${HOST}:${WEB_PORT}`;
const CORS = `http://localhost:${WEB_PORT},http://${HOST}:${WEB_PORT},http://localhost:8081`;

console.log(`\nAplicando configuración LAN: ${HOST}\n`);
console.log(`  API:   ${API_URL}`);
console.log(`  Web:   ${WEB_URL}`);
console.log(`  DB:    localhost:${DB_PORT}`);
console.log(`  Redis: localhost:${REDIS_PORT}\n`);

writeIfMissing(
  join(root, '.env'),
  `# Docker Compose — puertos en el HOST (no chocan con otros servicios)
POSTGRES_HOST_PORT=${DB_PORT}
REDIS_HOST_PORT=${REDIS_PORT}
`
);

writeIfMissing(
  join(root, 'apps/backend/.env'),
  `NODE_ENV=development
PORT=${API_PORT}
DATABASE_URL=postgresql://pharma:pharma_secret@localhost:${DB_PORT}/pharma_delivery?schema=public
REDIS_URL=redis://localhost:${REDIS_PORT}
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars!!
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars!
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=${CORS}
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
APP_PUBLIC_URL=${WEB_URL}
`
);

writeIfMissing(
  join(root, 'apps/web-admin/.env'),
  `# Panel admin — red local ${HOST}
# Vacío = usa proxy Vite (mismo origen). Con URL = llama directo al API.
VITE_API_URL=${API_URL}
VITE_PROXY_TARGET=http://localhost:${API_PORT}
`
);

writeIfMissing(
  join(root, 'apps/mobile-expo/.env'),
  `# App móvil — mismo WiFi que el servidor (${HOST})
EXPO_PUBLIC_API_URL=${API_URL}
`
);

writeIfMissing(
  join(root, '.env.lan'),
  `# Generado por scripts/apply-lan-config.mjs — no commitear secretos de prod
DEV_HOST=${HOST}
QA_API_URL=${API_URL}
`
);

console.log('\nListo. Siguiente:');
console.log('  docker compose up -d postgres redis');
console.log('  npm install');
console.log('  npm run db:generate && npm run db:migrate && npm run db:seed');
console.log(`  npm run dev:backend   → ${API_URL}`);
console.log(`  npm run dev:web       → ${WEB_URL}`);
console.log(`  npm run dev:mobile    → Expo (API ${API_URL})\n`);
