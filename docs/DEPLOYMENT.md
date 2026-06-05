# Guía de despliegue — A-AS Delivery (Producción)

Despliegue con **proxy edge HTTPS**, backend único, backups automáticos y Socket.io detrás de NGINX.

## Arquitectura

```
                         ┌──────────────────┐
  Internet ─────────────►│  edge (NGINX)    │ :443 HTTPS, :80 → redirect
                         │  pharma-edge     │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
     /api, /socket.io      /health, /metrics      / (resto)
              │                                       │
              ▼                                       ▼
     ┌────────────────┐                    ┌────────────────┐
     │ nginx (interno)│                    │  web-admin     │
     │  sin puerto    │                    │  sin puerto    │
     │  en el host    │                    │  en el host    │
     └───────┬────────┘                    └────────────────┘
             ▼
     ┌────────────────┐
     │    backend     │ :4000 (solo red Docker)
     └───────┬────────┘
             │
     ┌───────┴───────┐
     ▼               ▼
 PostgreSQL       Redis
     │
     ▼
 backup (cron 02:00)
```

- **8080** y **8081** ya no se publican en el host; solo **80** y **443** del servicio `edge`.
- Rutas API: `https://TU-HOST/api/...`
- WebSocket: `https://TU-HOST/socket.io/`
- Panel admin: `https://TU-HOST/`

---

## Requisitos del servidor

| Recurso | Mínimo recomendado |
|---------|-------------------|
| CPU | 4 vCPU |
| RAM | 8 GB |
| Disco | 80 GB SSD |
| SO | Linux (Ubuntu 22.04+) |
| Software | Docker 24+, Docker Compose v2 |

Puertos en firewall / Azure NSG:

| Puerto | Uso |
|--------|-----|
| **443** | HTTPS (API + admin + Socket.io) |
| **80** | Redirección a HTTPS |

---

## Paso 1 — Clonar y preparar entorno

```bash
git clone <repo-url> pharma-delivery
cd pharma-delivery
npm install
```

---

## Paso 2 — Variables de entorno

```bash
cp .env.production.example .env.production
nano .env.production
```

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_PASSWORD` | Clave fuerte PostgreSQL |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secretos JWT (≥32 chars, distintos) |
| `WEB_PUBLIC_URL` | URL HTTPS del panel admin |
| `WEB_API_URL` | URL HTTPS del API (mismo host en despliegue por IP) |
| `MOBILE_API_URL` | Igual que `WEB_API_URL` (build APK) |
| `CORS_ORIGIN` | Normalmente igual que `WEB_PUBLIC_URL` |
| `SMTP_*` | Correo recuperación de contraseña |
| `EXPO_ACCESS_TOKEN` | Push Expo (opcional) |
| `TRUST_PROXY` | `true` (default) |

Generar secretos: `openssl rand -base64 48`

---

## Paso 3 — Certificados TLS

**Opción A — Autofirmado (pruebas / IP sin dominio):**

```bash
TLS_CN=20.5.19.8 TLS_SAN='IP:20.5.19.8' bash scripts/generate-prod-tls.sh
```

**Opción B — Let's Encrypt (recomendado producción):**

Copie `fullchain.pem` y `privkey.pem` a `infra/ssl/`.

> La app móvil Android confía en certificados del sistema. Con autofirmado, el usuario debe instalar/confiar el certificado o usar dominio con LE.

---

## Paso 4 — Levantar stack

```bash
bash scripts/docker-prod.sh up -d --build
```

Verificación:

```bash
curl -k https://localhost/health
curl -k https://localhost/ready
bash scripts/verify-production.sh
```

Migraciones Prisma se aplican al iniciar el backend (`prisma migrate deploy`).

---

## Paso 5 — Seed inicial (solo primera vez)

```bash
bash scripts/docker-prod.sh exec backend npx prisma db seed
```

**Cambie inmediatamente** las contraseñas creadas por el seed. No deje credenciales por defecto en producción.

---

## Paso 6 — Reconstruir admin si cambian URLs

```bash
bash scripts/docker-prod.sh up -d --build web-admin
```

`WEB_API_URL` se inyecta en build como `VITE_API_URL`.

---

## App móvil (APK)

Defina la URL HTTPS antes del build (misma que `MOBILE_API_URL`):

```bash
cd apps/mobile-expo
EXPO_PUBLIC_API_URL=https://TU-HOST eas build --profile preview --platform android
```

O en EAS: variable de entorno `EXPO_PUBLIC_API_URL` en el perfil `preview` / `production`.

Checklist completo: [docs/PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

---

## Backups automáticos

Contenedor `backup` — cron diario 02:00 → volumen `postgres_backups`.

```bash
npm run backup:run
```

Restauración:

```bash
bash scripts/docker-prod.sh exec backup ls -lh /backups
bash scripts/docker-prod.sh restart backend
```

---

## Monitoreo

| Endpoint | Uso |
|----------|-----|
| `GET /live` | Liveness |
| `GET /ready` | Readiness (Postgres + Redis) |
| `GET /health` | Estado agregado |
| `GET /metrics` | Métricas Prometheus |

```bash
bash scripts/docker-prod.sh logs -f backend edge nginx
```

---

## Solución de problemas

### Admin no conecta al API

- Reconstruya `web-admin` con `WEB_API_URL` correcto (HTTPS, sin `:8080`).
- `CORS_ORIGIN` debe coincidir con `WEB_PUBLIC_URL`.

### App móvil no conecta

- `MOBILE_API_URL` / `EXPO_PUBLIC_API_URL` debe ser **HTTPS** y coincidir con el host del edge.
- Regenere el APK tras cambiar la URL.
- Certificado: use Let's Encrypt o certificado confiable en el dispositivo.

### Socket.io desconecta

- Verifique `curl -k "https://TU-HOST/socket.io/?EIO=4&transport=polling"`.
- Tras expirar JWT, la app reintenta refresh y reconexión automática.

### `edge` no arranca

- Faltan archivos en `infra/ssl/` → ejecute `scripts/generate-prod-tls.sh`.

---

## Detener el stack

```bash
npm run docker:prod:down
```
