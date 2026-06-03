# Pharma Delivery — Sistema Empresarial

Sistema completo de trazabilidad farmacéutica, logística, entregas, control de domiciliarios, GPS, llamadas, incidencias, sincronización offline y dashboard administrativo en tiempo real.

## Stack

| Capa | Tecnologías |
|------|-------------|
| Backend | Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis, Socket.io, JWT |
| Web Admin | React 19, Vite, Tailwind, Shadcn-style UI, Zustand, React Query |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router, SQLite offline-first |
| Infra | Docker, Docker Compose, EAS Build |

## Estructura Monorepo

```
pharma-delivery/
├── apps/
│   ├── backend/          # API REST + WebSockets
│   ├── web-admin/        # Dashboard administrativo
│   └── mobile-expo/      # App domiciliarios
├── packages/
│   ├── types/            # Tipos compartidos
│   ├── utils/            # Utilidades (hash, paginación)
│   ├── api-client/       # Cliente HTTP con refresh token
│   └── ui/               # Componentes compartidos
├── docker-compose.yml
└── package.json
```

## Requisitos

- Node.js >= 20.19.4
- npm >= 10
- Docker & Docker Compose (opcional)
- PostgreSQL 16 + Redis 7 (si no usas Docker)

## Instalación

```bash
cd pharma-delivery
npm install
```

### Backend

```bash
cp apps/backend/.env.example apps/backend/.env
# Editar DATABASE_URL y JWT secrets

# Con Docker (PostgreSQL + Redis)
docker compose up -d postgres redis

# Migraciones y seed
npm run db:generate
npm run db:migrate
npm run db:seed
```

### Web Admin

```bash
cp apps/web-admin/.env.example apps/web-admin/.env
npm run dev:web
# http://localhost:5173
```

### Mobile Expo

```bash
cp apps/mobile-expo/.env.example apps/mobile-expo/.env
# Ajustar EXPO_PUBLIC_API_URL a tu IP local para dispositivo físico
npm run dev:mobile
```

## Credenciales de prueba (seed)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@pharma.local | Admin123! |
| Domiciliario | courier@pharma.local | Courier123! |
| Operador | operator@pharma.local | Operator123! |

## Comandos

```bash
npm run dev              # Backend + Web + Mobile en paralelo
npm run dev:backend      # Solo API (puerto 4000)
npm run dev:web          # Solo admin (puerto 5173)
npm run dev:mobile       # Solo Expo
npm run build            # Build producción
npm run docker:up        # Levantar stack Docker completo
npm run db:migrate       # Migraciones Prisma
npm run db:seed          # Datos iniciales
```

## Docker (producción local)

```bash
docker compose up -d
# Backend:  http://localhost:4000
# Admin:    http://localhost:5173
# Swagger:  http://localhost:4000/api/docs
# Postgres: localhost:5432
# Redis:    localhost:6379
```

## Módulos Backend

- **auth** — JWT + Refresh Token, roles y permisos
- **deliveries** — CRUD entregas, cambio de estado con validación GPS/foto/firma
- **excel-imports** — Carga masiva Excel, agrupación por cédula/documento, hash único, deduplicación
- **assignments** — Asignación múltiple, reasignación, historial, notificaciones
- **calls** — Registro llamadas, actualización teléfonos/direcciones, reagendamiento
- **incidents** — Reporte incidencias con GPS y evidencia
- **evidence** — Fotos y firmas con compresión Sharp
- **gps-logs** — Trazabilidad GPS en tiempo real
- **offline-sync** — Cola de sincronización offline desde mobile
- **dashboard** — Estadísticas, gráficas, rendimiento operadores/domiciliarios

## Importación Excel

Columnas soportadas:

`Cedula`, `NroDocumento`, `Nombre`, `Apellido`, `Telefono`, `Direccion`, `Ciudad`, `Barrio`, `CodigoMedicamento`, `Medicamento`, `Cantidad`, `Lote`, `Prioridad`, `FechaEntrega`, `HoraEntrega`, `Observaciones`

**Agrupación:** Un paciente con varios medicamentos genera **un delivery** con **varios delivery_items**, agrupados por `Cedula + NroDocumento`.

## Mobile Offline-First

- SQLite local: `deliveries`, `patients`, `sync_queue`, `incidents`, `gps_logs`, `evidence`
- Cola offline con reintentos automáticos
- Sincronización al reconectar
- Validación: no permite ENTREGADO sin foto + firma + GPS

## Socket.io Events

- `delivery.created`, `delivery.updated`, `delivery.completed`
- `assignment.created`, `assignment.updated`
- `incident.created`
- `gps:update` / `courier:location`

## EAS Build (Mobile)

```bash
cd apps/mobile-expo
npx eas build --platform android --profile preview    # APK
npx eas build --platform android --profile production # AAB
npx eas build --platform ios --profile production
```

Configurar `projectId` en `app.json` → `extra.eas.projectId`.

## API Docs

Swagger disponible en: `http://localhost:4000/api/docs`

## Seguridad

- Helmet, Rate Limiting, CORS
- JWT Access (15m) + Refresh (7d)
- RBAC con roles y permisos granulares
- Auditoría de acciones
- Validación Zod en todos los endpoints
- Compresión de imágenes con Sharp

## Licencia

Privado — Uso empresarial interno.
