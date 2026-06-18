#!/usr/bin/env node
/**
 * Diagnóstico conexión PostgreSQL — error P1000
 * Uso: node scripts/diagnose-db.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, 'apps/backend/.env');

console.log('\n=== Diagnóstico PostgreSQL (P1000) ===\n');

if (!existsSync(envPath)) {
  console.log('❌ Falta apps/backend/.env');
  console.log('   Mac/Linux: cp apps/backend/.env.example apps/backend/.env');
  console.log('   Windows:   copy apps\\backend\\.env.example apps\\backend\\.env\n');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.log('❌ DATABASE_URL no encontrada en apps/backend/.env\n');
  process.exit(1);
}

const url = match[1].trim().replace(/^["']|["']$/g, '');
let parsed;
try {
  parsed = new URL(url);
} catch {
  console.log('❌ DATABASE_URL inválida\n');
  process.exit(1);
}

console.log('✓ apps/backend/.env existe');
console.log(`  Host:    ${parsed.hostname}`);
console.log(`  Puerto:  ${parsed.port || '5432'}`);
console.log(`  Usuario: ${decodeURIComponent(parsed.username)}`);
console.log(`  Base:    ${parsed.pathname.replace(/^\//, '').split('?')[0]}\n`);

console.log('--- Docker ---');
try {
  const ps = execSync('docker compose ps postgres', { cwd: root, encoding: 'utf8' });
  if (ps.includes('Up') || ps.includes('running')) {
    console.log('✓ Contenedor pharma-postgres está corriendo\n');
  } else {
    console.log('❌ Postgres NO está corriendo');
    console.log('   Ejecute: docker compose up -d postgres redis\n');
  }
} catch {
  console.log('❌ Docker no responde. ¿Docker Desktop está abierto?\n');
}

console.log('--- Prueba dentro de Docker (credenciales pharma/pharma_secret) ---');
try {
  execSync(
    'docker compose exec -T postgres psql -U pharma -d pharma_delivery -c "SELECT 1"',
    { cwd: root, stdio: 'pipe' }
  );
  console.log('✓ Docker acepta usuario pharma / pharma_secret\n');
} catch {
  console.log('❌ Docker rechaza pharma / pharma_secret');
  console.log('   Volumen viejo con otra clave. Solución (BORRA datos locales):');
  console.log('   docker compose down -v');
  console.log('   docker compose up -d postgres redis\n');
}

console.log('--- Prueba Prisma (misma URL que migrate) ---');
try {
  execSync('npx prisma migrate status', {
    cwd: join(root, 'apps/backend'),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  console.log('✓ Prisma conecta correctamente');
  console.log('\nEjecute: npm run db:migrate\n');
} catch (e) {
  const err = String(e.stderr || e.message || e);
  console.log('❌ Prisma NO conecta');
  if (err.includes('P1000') || err.includes('Authentication')) {
    console.log('\n>>> P1000: Prisma llega a localhost:5432 pero las credenciales NO coinciden.\n');
    console.log('Causa más común en PC nuevo: OTRO PostgreSQL en el puerto 5432');
    console.log('(instalado en Windows), NO el de Docker.\n');
    console.log('SOLUCIÓN A — Usar puerto 5433 para Docker:');
    console.log('  1. En docker-compose.yml cambie postgres ports a: "5433:5432"');
    console.log('  2. En apps/backend/.env:');
    console.log('     DATABASE_URL=postgresql://pharma:pharma_secret@localhost:5433/pharma_delivery?schema=public');
    console.log('  3. docker compose down && docker compose up -d postgres redis');
    console.log('  4. npm run db:migrate\n');
    console.log('SOLUCIÓN B — Apagar PostgreSQL de Windows:');
    console.log('  Servicios → postgresql → Detener');
    console.log('  Luego: docker compose up -d postgres redis\n');
    console.log('SOLUCIÓN C — .env debe ser exactamente:');
    console.log('  DATABASE_URL=postgresql://pharma:pharma_secret@localhost:5432/pharma_delivery?schema=public\n');
  } else if (err.includes('ECONNREFUSED') || err.includes('connect')) {
    console.log('\n>>> No hay nada escuchando en ese puerto.');
    console.log('   docker compose up -d postgres redis\n');
  } else {
    console.log(err.slice(0, 500));
  }
  process.exit(1);
}
