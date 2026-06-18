# Puesta en marcha — equipo `192.168.20.26` (red local)

Guía para clonar el proyecto en el PC servidor y trabajar desde otros equipos/celulares en la misma red WiFi.

## Requisitos en el PC `192.168.20.26`

| Software | Versión |
|----------|---------|
| Node.js | ≥ 20.19 |
| Docker Desktop | Activo |
| Git | Para clonar |

Firewall Windows: permitir **entrada** en puertos **4000**, **5173** y **5432** (solo red privada).

---

## Instalación automática (Windows)

```powershell
git clone <tu-repo> pharma-delivery
cd pharma-delivery
powershell -ExecutionPolicy Bypass -File scripts\setup-lan.ps1
```

## Instalación manual

```bash
git clone <tu-repo> pharma-delivery
cd pharma-delivery

# 1. Aplica IP 192.168.20.26 a todos los .env
npm run setup:lan

# 2. Dependencias
npm install

# 3. Base de datos
docker compose up -d postgres redis
# Esperar 10-15 segundos

# 4. Si error P1000 en migrate:
npm run db:diagnose

# 5. Migrar y datos iniciales
npm run db:generate
npm run db:migrate
npm run db:seed
```

---

## Arrancar cada día

Abra **3 terminales** en el PC servidor:

```bash
# Terminal 1 — API
npm run dev:backend

# Terminal 2 — Panel web
npm run dev:web

# Terminal 3 — App móvil (opcional)
npm run dev:mobile
```

---

## URLs de acceso

| Qué | URL | Desde dónde |
|-----|-----|-------------|
| Panel admin | http://192.168.20.26:5173 | Cualquier PC/celular en la WiFi |
| API / Swagger | http://192.168.20.26:4000 | Directo |
| Health | http://192.168.20.26:4000/health | Verificar que API responde |

### Login inicial

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@pharma.local | Admin123! |
| Supervisor | supervisor@pharma.local | Supervisor123! |
| Operador | operator@pharma.local | Operator123! |
| Domiciliario | courier@pharma.local | Courier123! |

**Cambie las contraseñas** después del primer acceso.

---

## App móvil (celular Android)

1. Celular en la **misma WiFi** que el PC.
2. En el PC: `cd apps/mobile-expo && npx expo start -c --lan`
3. Escanear QR con Expo Go, o instalar APK con:
   ```bash
   npm run build:apk
   ```
4. La app usa `http://192.168.20.26:4000` (HTTP en red local, sin certificado).

---

## Si la IP del PC cambia

Edite `config/dev-host.env`:

```env
DEV_HOST=192.168.20.26
```

Luego:

```bash
npm run setup:lan
```

Reinicie backend, web y Expo con `-c`.

---

## Error P1000 (autenticación PostgreSQL)

1. `npm run db:diagnose`
2. Si otro PostgreSQL usa el puerto 5432 en Windows:
   - En `config/dev-host.env`: `DEV_DB_PORT=5433`
   - En `docker-compose.yml` → postgres `ports: "5433:5432"`
   - `docker compose down && docker compose up -d postgres redis`
   - `npm run setup:lan && npm run db:migrate`

---

## Archivos de configuración

| Archivo | Propósito |
|---------|-----------|
| `config/dev-host.env` | IP y puertos del equipo (fuente única) |
| `apps/backend/.env` | API, CORS, DATABASE_URL |
| `apps/web-admin/.env` | VITE_API_URL |
| `apps/mobile-expo/.env` | EXPO_PUBLIC_API_URL |

Todos se regeneran con `npm run setup:lan`.
