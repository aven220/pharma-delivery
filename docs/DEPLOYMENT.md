# Guía de despliegue — A-AS Delivery (Producción)

Esta guía describe el despliegue empresarial con **alta disponibilidad**, balanceador NGINX, backends redundantes, backups automáticos y monitoreo básico.

## Arquitectura

```
                    ┌─────────────┐
  Usuarios ────────►│   NGINX     │ :8080 (API + WebSockets)
                    │  (balanceo) │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐           ┌─────────────┐
       │  backend-1  │           │  backend-2  │
       └──────┬──────┘           └──────┬──────┘
              │                         │
              └────────────┬────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        PostgreSQL      Redis      uploads (vol.)
              │
              ▼
        backup (cron 02:00)

  Admin web ──► web-admin :8081 (SPA estática)
```

- **ip_hash** en NGINX mantiene afinidad de sesión Socket.io entre instancias.
- **Volúmenes compartidos** (`uploads_data`, `backend_logs`) entre backend-1 y backend-2.
- **Health checks**: `/live`, `/ready`, `/health`, `/metrics`.

---

## Requisitos del servidor

| Recurso | Mínimo recomendado |
|---------|-------------------|
| CPU | 4 vCPU |
| RAM | 8 GB |
| Disco | 80 GB SSD |
| SO | Linux (Ubuntu 22.04+) |
| Software | Docker 24+, Docker Compose v2 |

Puertos a publicar:

| Puerto | Servicio |
|--------|----------|
| 8080 | API (NGINX → backends) |
| 8081 | Panel web admin |

En producción real, coloque un reverse proxy TLS (Cloudflare, Caddy, Traefik) delante de estos puertos.

---

## Paso 1 — Clonar y preparar entorno

```bash
git clone <repo-url> pharma-delivery
cd pharma-delivery
npm install
```

---

## Paso 2 — Configurar variables de entorno

```bash
cp .env.production.example .env.production
```

Edite `.env.production` y **cambie todos los valores por defecto**:

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_PASSWORD` | Clave fuerte para PostgreSQL |
| `JWT_ACCESS_SECRET` | Secreto JWT acceso (≥32 chars, aleatorio) |
| `JWT_REFRESH_SECRET` | Secreto JWT refresh (≥32 chars, distinto) |
| `CORS_ORIGIN` | URL del admin (`https://admin.tu-dominio.com`) |
| `VITE_API_URL` | URL pública de la API (`https://api.tu-dominio.com`) |
| `APP_PUBLIC_URL` | URL del admin (enlaces de recuperación de contraseña) |
| `SMTP_*` | Correo para reset de contraseña |
| `EXPO_ACCESS_TOKEN` | Token Expo (push móvil, opcional) |
| `BACKUP_RETENTION_DAYS` | Días de retención de backups (default 14) |

Generar secretos:

```bash
openssl rand -base64 48
```

---

## Paso 3 — Levantar stack de producción

```bash
npm run docker:prod
# equivalente:
# docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Verificar servicios:

```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8080/health
curl http://localhost:8080/ready
curl http://localhost:8081
```

La primera ejecución aplica migraciones Prisma automáticamente (`prisma migrate deploy`).

---

## Paso 4 — Seed inicial (solo primera vez)

```bash
docker compose -f docker-compose.prod.yml exec backend-1 \
  npx prisma db seed
```

Credenciales por defecto del seed:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@pharma.local | Admin123! |
| Domiciliario | driver@pharma.local | Driver123! |
| Auditor | auditor@pharma.local | Auditor123! |

**Cambie estas contraseñas inmediatamente en producción.**

---

## Paso 5 — TLS y dominio (recomendado)

Ejemplo con Caddy delante del stack:

```
api.tu-dominio.com {
  reverse_proxy localhost:8080
}
admin.tu-dominio.com {
  reverse_proxy localhost:8081
}
```

Actualice `CORS_ORIGIN`, `VITE_API_URL` y `APP_PUBLIC_URL`, luego reconstruya web-admin:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build web-admin
```

---

## Backups automáticos

El contenedor `backup` ejecuta `pharma-backup.sh` **diariamente a las 02:00**.

Los archivos se guardan en el volumen `postgres_backups`:

```
/backups/pharma_delivery_YYYYMMDD_HHMMSS.sql.gz
```

Backup manual:

```bash
npm run backup:run
```

---

## Restauración de backup

```bash
# Listar backups
docker compose -f docker-compose.prod.yml exec backup ls -lh /backups

# Restaurar (SOBRESCRIBE la BD actual)
docker compose -f docker-compose.prod.yml exec backup \
  /usr/local/bin/pharma-restore.sh /backups/pharma_delivery_20250601_020000.sql.gz
```

> Copie el script `restore.sh` como `pharma-restore.sh` si aún no está en la imagen, o ejecute:
>
> ```bash
> docker compose -f docker-compose.prod.yml exec backup sh -c \
>   'gunzip -c /backups/pharma_delivery_XXXXXX.sql.gz | PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB'
> ```

Tras restaurar, reinicie backends:

```bash
docker compose -f docker-compose.prod.yml restart backend-1 backend-2
```

---

## Monitoreo

| Endpoint | Uso |
|----------|-----|
| `GET /live` | Liveness (proceso activo) |
| `GET /ready` | Readiness (Postgres + Redis) |
| `GET /health` | Estado agregado |
| `GET /metrics` | Métricas Prometheus básicas |

Logs centralizados (JSON en producción):

```bash
docker compose -f docker-compose.prod.yml logs -f backend-1 backend-2 nginx
# Archivos en volumen backend_logs → /app/logs dentro de cada backend
```

Configure alertas externas (Uptime Kuma, Datadog, etc.) sobre `/health` y `/ready`.

---

## Actualizaciones (rolling)

```bash
git pull
npm run docker:prod
```

Docker reconstruye imágenes y reinicia contenedores. Las migraciones se aplican al arrancar cada backend.

Para cero downtime en despliegues frecuentes:

1. Actualice backend-1, espere `/ready`.
2. Actualice backend-2, espere `/ready`.
3. NGINX enruta tráfico solo a instancias sanas.

---

## App móvil (APK/AAB)

```bash
cd apps/mobile-expo
# EXPO_PUBLIC_API_URL debe apuntar a la API pública (https://api.tu-dominio.com)
npm run build:apk
```

Configure `EXPO_ACCESS_TOKEN` en `.env.production` para notificaciones push.

---

## Solución de problemas

### `curl /ready` devuelve 503

- Verifique Postgres: `docker compose -f docker-compose.prod.yml logs postgres`
- Verifique Redis: `docker compose -f docker-compose.prod.yml logs redis`

### Admin no conecta al backend

- Confirme `VITE_API_URL` en build time (reconstruir `web-admin`).
- Verifique `CORS_ORIGIN` incluye la URL del admin.

### Recuperación de contraseña no envía correo

- Configure `SMTP_*` en `.env.production`.
- Sin SMTP, el enlace aparece en logs del backend (solo desarrollo).

### Socket.io desconecta al cambiar de backend

- NGINX usa `ip_hash`; no cambie a round-robin sin sticky sessions.
- Verifique que ambos backends comparten el volumen `uploads_data`.

### Backups vacíos o fallidos

```bash
docker compose -f docker-compose.prod.yml logs backup
docker compose -f docker-compose.prod.yml exec backup /usr/local/bin/pharma-backup.sh
```

---

## Detener el stack

```bash
npm run docker:prod:down
```

Los volúmenes (`postgres_data`, `uploads_data`, `postgres_backups`) persisten hasta eliminarlos explícitamente.
