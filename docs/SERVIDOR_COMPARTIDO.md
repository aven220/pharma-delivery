# Servidor compartido — convivir con otros programas

A-AS Delivery está diseñado para **no interferir** con otros servicios en el mismo PC (`192.168.20.26`).

## Aislamiento que ya tiene el proyecto

| Recurso | Aislamiento |
|---------|-------------|
| **PostgreSQL** | Solo Docker, puerto **5433** (no usa el 5432 de Windows) |
| **Redis** | Solo Docker, puerto **6380** (no usa el 6379 estándar) |
| **Base de datos** | Nombre `pharma_delivery`, usuario `pharma` — separado de otras BDs |
| **Contenedores** | Prefijo `pharma-postgres`, `pharma-redis` |
| **Volúmenes Docker** | `pharma-delivery_postgres_data` — datos solo de este proyecto |
| **API / Web** | Puertos **4400** y **5517** (evitan 4000/5173/80/443) |

**No modifica** instalaciones globales de PostgreSQL, IIS, Apache ni otros Docker ajenos.

---

## Mapa de puertos (por defecto en este servidor)

| Servicio | Puerto host | URL ejemplo |
|----------|-------------|-------------|
| API backend | **4410** | http://192.168.20.26:4410 |
| Panel web | **5517** | http://192.168.20.26:5517 |
| PostgreSQL (Docker) | **5433** | solo interno / Prisma |
| Redis (Docker) | **6380** | solo interno / backend |

Puertos que **no tocamos**: 80, 443, 5432 (PostgreSQL Windows), 6379 (Redis global), 3306 (MySQL), etc.

---

## Si algún puerto ya está ocupado

1. Ver qué usa cada puerto:

```powershell
cd G:\PROGRAMAS\pharma-delivery
powershell -File scripts\check-ports.ps1
```

2. Editar `config/dev-host.env` — cambiar solo el puerto en conflicto:

```env
DEV_API_PORT=4410
DEV_WEB_PORT=5518
DEV_DB_PORT=5434
REDIS_HOST_PORT=6381
```

3. Aplicar y reiniciar:

```powershell
npm run setup:lan
docker compose down
docker compose up -d postgres redis
scripts\FIX-P1000.bat
```

---

## Qué levanta cada comando (evita sorpresas)

| Comando | Qué inicia | Qué NO inicia |
|---------|------------|----------------|
| `docker compose up -d postgres redis` | Solo BD + cache pharma | Backend, nginx, otros stacks |
| `npm run dev:backend` | API Node en puerto 4400 | No toca Docker completo |
| `npm run dev:web` | Vite en 5517 | No usa puerto 80 |
| `docker compose up -d` (sin servicios) | Todo el stack dev Docker | Solo si usted lo pide |

**Recomendación en servidor compartido:** usar solo `postgres` + `redis` en Docker y el resto con `npm run dev:*`.

---

## Git pull sin perder configuración local

Los archivos con IP/puertos **no están en Git** (`.env` está ignorado). Tras `git pull`:

```powershell
git stash push -m "env" .env.production.example
git pull origin main
npm run setup:lan
```

Sus puertos en `config/dev-host.env` **sí están en Git** — si cambió puertos locales, guarde copia antes del pull.

---

## Checklist servidor compartido

- [ ] `scripts\check-ports.ps1` — puertos libres
- [ ] `npm run setup:lan` — regenerar `.env`
- [ ] `docker compose up -d postgres redis` — solo pharma
- [ ] `findstr DATABASE_URL apps\backend\.env` — debe mostrar `:5433`
- [ ] `findstr REDIS apps\backend\.env` — debe mostrar `:6380`
- [ ] Firewall: abrir **4410** y **5517** (red privada), no hace falta abrir 5433/6380 al exterior

---

## Resumen

Otros programas en el servidor **siguen igual**. A-AS Delivery usa su propio bloque de puertos y contenedores `pharma-*`. Si hay conflicto, solo cambia números en `config/dev-host.env` y ejecuta `npm run setup:lan`.
