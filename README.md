# A-AS Delivery — Sistema Empresarial de Logística Farmacéutica

Sistema completo de trazabilidad farmacéutica, logística, entregas, control de domiciliarios, GPS, llamadas, incidencias, sincronización offline y dashboard administrativo en tiempo real.

## Stack

| Capa | Tecnologías |
|------|-------------|
| Backend | Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis, Socket.io, JWT |
| Web Admin | React 19, Vite, Tailwind, Shadcn-style UI, Zustand, React Query |
| Mobile | Expo SDK 54, React Native, Expo Router, SQLite offline-first |
| Infra prod | Docker Compose, NGINX (HA), backups cron, Winston logs |

## Estructura Monorepo

```
pharma-delivery/
├── apps/
│   ├── backend/          # API REST + WebSockets
│   ├── web-admin/        # Dashboard administrativo
│   └── mobile-expo/      # App domiciliarios
├── packages/
│   ├── types/            # Tipos compartidos
│   ├── utils/            # Utilidades
│   ├── api-client/       # Cliente HTTP con refresh token
│   └── ui/               # Componentes compartidos
├── infra/nginx/          # NGINX interno API + edge HTTPS (443)
├── ops/backup/           # Scripts backup / restore PostgreSQL
├── docker-compose.yml    # Desarrollo local
├── docker-compose.prod.yml
├── .env.production.example
└── docs/DEPLOYMENT.md    # Guía paso a paso producción
```

---

## Requisitos

- Node.js >= 20.19.4
- npm >= 10
- Docker & Docker Compose v2
- PostgreSQL 16 + Redis 7 (si no usas Docker)

---

## Instalación (desarrollo)

### Red local — equipo `192.168.20.26`

Ver guía completa: [docs/SETUP_EQUIPO_LAN.md](docs/SETUP_EQUIPO_LAN.md)

```bash
npm run setup:lan          # aplica IP a todos los .env
bash scripts/setup-lan.sh  # setup completo (Mac/Linux)
# Windows: powershell -File scripts\setup-lan.ps1
```

### Desarrollo genérico (localhost)

```bash
cd pharma-delivery
npm install
```

### Backend

```bash
cp apps/backend/.env.example apps/backend/.env
# Editar DATABASE_URL y JWT secrets (mínimo 32 caracteres)

docker compose up -d postgres redis   # opcional
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:backend                   # http://localhost:4000
```

### Web Admin

```bash
cp apps/web-admin/.env.example apps/web-admin/.env
npm run dev:web                       # http://localhost:5173
```

### Mobile Expo

```bash
cp apps/mobile-expo/.env.example apps/mobile-expo/.env
# EXPO_PUBLIC_API_URL → IP o URL del backend (puerto 4000)
npm run dev:mobile
```

---

## Configuración

### Variables de entorno — desarrollo

Ver `apps/backend/.env.example` y `apps/web-admin/.env.example`.

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL |
| `REDIS_URL` | Conexión Redis |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secretos JWT (≥32 chars) |
| `CORS_ORIGIN` | Orígenes permitidos (admin web) |
| `WEB_PUBLIC_URL` | URL HTTPS del panel admin (producción) |
| `WEB_API_URL` | URL HTTPS del API para build web-admin |
| `MOBILE_API_URL` | URL HTTPS del API para build móvil (EAS) |
| `SMTP_*` | Correo recuperación contraseña |
| `EXPO_ACCESS_TOKEN` | Push notifications Expo |
| `LOG_LEVEL` / `LOG_DIR` | Nivel y directorio de logs |
| `INSTANCE_ID` | Identificador instancia (HA) |

### Variables de entorno — producción

Copie y edite:

```bash
cp .env.production.example .env.production
```

Documentación completa en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) y checklist en [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md).

---

## Migraciones

```bash
npm run db:migrate          # desarrollo (migrate dev)
npm run db:generate         # regenerar cliente Prisma
```

En Docker producción, `prisma migrate deploy` se ejecuta al iniciar cada backend.

---

## Seed inicial

```bash
npm run db:seed
```

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@pharma.local | Admin123! |
| Domiciliario | driver@pharma.local | Driver123! |
| Auditor | auditor@pharma.local | Auditor123! |

---

## Docker

### Desarrollo local

```bash
npm run docker:up
# Backend:  http://localhost:4000
# Admin:    http://localhost:5173
# Swagger:  http://localhost:4000/api/docs
```

### Producción (HTTPS único)

```bash
cp .env.production.example .env.production
bash scripts/generate-prod-tls.sh   # o certs Let's Encrypt en infra/ssl/
bash scripts/docker-prod.sh up -d --build

# API y admin:  https://TU-HOST/
# Health:       https://TU-HOST/health
bash scripts/verify-production.sh
```

Solo se publican puertos **80** y **443**. API y admin son internos en Docker.

Detalle: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Backups

Backups automáticos diarios (02:00) del contenedor `backup`.

```bash
npm run backup:run    # backup manual
```

Archivos: volumen `postgres_backups` → `/backups/pharma_delivery_*.sql.gz`

Retención configurable: `BACKUP_RETENTION_DAYS` (default 14).

---

## Restore

```bash
docker compose -f docker-compose.prod.yml exec backup ls /backups
docker compose -f docker-compose.prod.yml exec backup \
  /usr/local/bin/pharma-restore.sh /backups/pharma_delivery_YYYYMMDD_HHMMSS.sql.gz
docker compose -f docker-compose.prod.yml restart backend-1 backend-2
```

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para procedimiento completo.

---

## Actualizaciones

```bash
git pull
npm run docker:prod
```

Migraciones se aplican al reiniciar backends. Reconstruya `web-admin` si cambió `VITE_API_URL`.

---

## Comandos útiles

```bash
npm run dev              # Backend + Web + Mobile
npm run dev:backend      # Solo API (4000)
npm run dev:web          # Solo admin (5173)
npm run build            # Build producción
npm run docker:prod:down # Detener stack prod
npm run typecheck        # Verificación TypeScript
```

---

## Health checks y monitoreo

| Endpoint | Propósito |
|----------|-----------|
| `GET /live` | Proceso vivo (liveness) |
| `GET /ready` | Postgres + Redis OK (readiness) |
| `GET /health` | Estado agregado |
| `GET /metrics` | Métricas Prometheus básicas |

Logs JSON en producción (`LOG_DIR=/app/logs`). Consulte logs:

```bash
docker compose -f docker-compose.prod.yml logs -f backend-1 nginx
```

---

## Seguridad empresarial

- Helmet, rate limiting, CORS restrictivo en producción
- JWT access (15m) + refresh (7d) con revocación
- RBAC granular (roles y permisos)
- Auditoría completa (`/api/audit-logs`, panel web `/audit`)
- Recuperación de contraseña por correo (`/forgot-password`, `/reset-password`)
- Validación Zod en endpoints
- Evidencias (fotos/firmas) en **filesystem** (`UPLOAD_DIR`), no en SQLite móvil para persistencia servidor

---

## Notificaciones

- **Centro web**: `/notifications` en admin
- **Push móvil**: Expo (`EXPO_ACCESS_TOKEN` + registro automático al iniciar sesión)
- API: `GET /api/notifications`, `PATCH /api/notifications/read-all`

---

## Mobile offline-first

- SQLite local para cola offline y cache
- Sincronización al reconectar
- Validación: ENTREGADO requiere foto + firma + GPS
- Push token registrado en `_layout.tsx` al autenticarse

---

## EAS Build (APK/AAB)

```bash
cd apps/mobile-expo
EXPO_PUBLIC_API_URL=https://TU-HOST npm run build:apk
# MOBILE_API_URL = misma URL HTTPS que WEB_API_URL
```

---

## API Docs

Swagger: `http://localhost:4000/api/docs`

---

## Solución de problemas

| Problema | Acción |
|----------|--------|
| Admin: "verifique backend activo" | Postgres + Redis + backend :4000 activos |
| `/ready` 503 | Revisar logs postgres/redis |
| CORS error | Ajustar `CORS_ORIGIN` |
| Reset password sin email | Configurar `SMTP_*` o revisar logs backend |
| Socket.io inestable | Mantener `ip_hash` en NGINX |
| Build TS6059 seed | Ya excluido de `tsconfig` backend |

Más detalle: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Licencia

Privado — Uso empresarial interno.
