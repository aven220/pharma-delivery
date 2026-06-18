# Stack 100% gratuito — A-AS Delivery

## Resumen

**Este proyecto ya usa PostgreSQL gratis.** No requiere Azure Database for PostgreSQL, Neon, Supabase ni servicios de pago.

| Componente | Tecnología | Costo |
|------------|------------|-------|
| Base de datos | `postgres:16-alpine` en Docker | **$0** |
| Cache | `redis:7-alpine` en Docker | **$0** |
| API / NGINX | Contenedores en su VM | Solo costo de la **VM Azure** (si aplica) |

La app se conecta internamente a:

```
postgresql://pharma:PASSWORD@postgres:5432/pharma_delivery
```

(`postgres` = nombre del servicio Docker, **no** internet.)

---

## ¿Por qué llegó un cobro de PostgreSQL?

Suele ser uno de estos (ninguno es obligatorio para este proyecto):

1. **Azure Database for PostgreSQL** creado en el Portal por error → **eliminar ese recurso**
2. Factura de la **VM** (Compute + disco), no de Postgres en Docker
3. Correo comercial de Microsoft sugiriendo un servicio gestionado

---

## Verificar que usa Docker (no Azure pagado)

En el servidor (`20.5.19.8` o su VM):

```bash
cd ~/pharma-delivery
bash scripts/docker-prod.sh ps
```

Debe aparecer `pharma-postgres-prod` en estado **running**.

```bash
bash scripts/docker-prod.sh exec backend printenv DATABASE_URL
```

Debe contener `@postgres:5432` (host Docker), **no** `.postgres.database.azure.com`.

---

## Cancelar PostgreSQL de pago en Azure (si existe)

1. Portal Azure → **Todos los recursos**
2. Buscar: `PostgreSQL flexible server` o `Azure Database for PostgreSQL`
3. Si **no** lo usa este proyecto → **Eliminar** el recurso
4. Mantener solo la **VM** donde corre `docker compose`

> Eliminar el servidor gestionado **no afecta** A-AS Delivery si la BD vive en Docker (`pharma-postgres-prod`).

---

## Calidad de PostgreSQL en Docker

- Imagen oficial **PostgreSQL 16 Alpine** (misma familia que producción enterprise)
- Datos en volumen `postgres_data` (persistente)
- Backups automáticos diarios → volumen `postgres_backups`
- Prisma + migraciones sin cambios

No hace falta cambiar código ni `DATABASE_URL` si ya despliega con:

```bash
bash scripts/docker-prod.sh up -d --build
```

---

## Otros costos opcionales (no son Postgres)

| Servicio | ¿Obligatorio? |
|----------|----------------|
| VM Azure | Sí, para hosting (tiene capa gratuita limitada / créditos) |
| Expo EAS Build | Opcional (plan free limitado) |
| SMTP Office365 | Opcional (recuperación contraseña) |
| Dominio + Let's Encrypt | Opcional (HTTPS con dominio) |

---

## Backup antes de eliminar cualquier recurso Azure

```bash
bash scripts/docker-prod.sh exec backup /usr/local/bin/pharma-backup.sh
bash scripts/docker-prod.sh exec backup ls -lh /backups
```
