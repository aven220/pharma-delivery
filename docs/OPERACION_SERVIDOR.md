# Operación del servidor — arranque y respaldos

Guía para el equipo **192.168.20.26** (Windows, servidor compartido).

---

## Si se fue la luz o reinició el PC

### Paso 1 — Encender y abrir Docker

1. Inicie sesión en Windows.
2. Abra **Docker Desktop** y espere a que diga **Running** (verde).

### Paso 2 — Iniciar A-AS Delivery

Doble clic en:

```text
G:\PROGRAMAS\pharma-delivery\scripts\INICIAR-SERVICIO.bat
```

O en PowerShell:

```powershell
cd G:\PROGRAMAS\pharma-delivery
scripts\INICIAR-SERVICIO.bat
```

Eso hace automáticamente:

1. Espera a que Docker esté listo  
2. Levanta PostgreSQL + Redis (contenedores `pharma-*`)  
3. Abre dos ventanas: **API** y **Panel web**

### Paso 3 — Verificar que funciona

En el navegador:

| Qué | URL |
|-----|-----|
| Panel | http://192.168.20.26:5517 |
| API health | http://192.168.20.26:4410/health |

Debe responder `{"status":"ok",...}`.

---

## Solo base de datos (sin abrir panel)

Si solo necesita la BD corriendo:

```powershell
scripts\INICIAR-SOLO-BD.bat
```

Luego en otra terminal puede iniciar API/web manualmente:

```powershell
npm run dev:backend
npm run dev:web
```

---

## Arranque automático al encender Windows (opcional)

### A) Docker al iniciar sesión

Docker Desktop → **Settings** → **General** → marcar **Start Docker Desktop when you sign in**.

### B) A-AS al iniciar sesión (Programador de tareas)

1. `Win + R` → `taskschd.msc` → **Crear tarea básica**
2. Nombre: `A-AS Delivery inicio`
3. Desencadenador: **Al iniciar sesión**
4. Retrasar **2 minutos** (para que Docker arranque antes)
5. Acción: **Iniciar programa**
   - Programa: `G:\PROGRAMAS\pharma-delivery\scripts\INICIAR-SERVICIO.bat`
   - Iniciar en: `G:\PROGRAMAS\pharma-delivery`
6. Marcar **Ejecutar con los privilegios más altos** solo si Docker lo requiere.

> Requiere que alguien haya iniciado sesión en Windows (no funciona sin usuario logueado, salvo configurar servicio Windows avanzado).

---

## Backup manual (cuando usted quiera)

### Opción rápida — doble clic

```text
scripts\BACKUP.bat
```

O:

```powershell
cd G:\PROGRAMAS\pharma-delivery
npm run backup:windows
```

### Dónde queda el archivo

```text
G:\PROGRAMAS\pharma-delivery\backups\local\
pharma_delivery_YYYYMMDD_HHMMSS.sql.zip
```

### Recomendación

| Frecuencia | Acción |
|------------|--------|
| Diario (si hay mucho movimiento) | `scripts\BACKUP.bat` al final del día |
| Semanal | Copiar la carpeta `backups\local` a USB u otro disco |
| Antes de actualizar código | Siempre un backup |

**Copie los `.zip` fuera del servidor** (OneDrive, USB, otro PC). Si falla el disco, los backups en la misma máquina no sirven.

---

## Backup automático programado (Windows)

1. `taskschd.msc` → **Crear tarea**
2. Nombre: `A-AS Backup diario`
3. Desencadenador: **Diariamente** a las 22:00
4. Acción:
   - Programa: `G:\PROGRAMAS\pharma-delivery\scripts\BACKUP.bat`
   - Iniciar en: `G:\PROGRAMAS\pharma-delivery`
5. Condición: marcar **Iniciar solo si hay red** (opcional)

Antes del backup automático, la BD debe estar arriba (`INICIAR-SOLO-BD` o dejar Docker + postgres en tarea previa).

---

## Restaurar un backup (emergencia)

**Cuidado:** sobrescribe los datos actuales.

```powershell
cd G:\PROGRAMAS\pharma-delivery

# 1. Detener API (cierre ventanas A-AS API/Web)

# 2. Asegurar postgres corriendo
docker compose up -d postgres

# 3. Descomprimir backup (ejemplo)
#    Extraiga el .sql del .zip a backups\local\restore.sql

# 4. Restaurar
Get-Content backups\local\restore.sql | docker compose exec -T postgres psql -U pharma -d pharma_delivery

# Si la BD no existe aún:
# docker compose exec postgres psql -U pharma -c "DROP DATABASE IF EXISTS pharma_delivery;"
# docker compose exec postgres psql -U pharma -c "CREATE DATABASE pharma_delivery;"
# luego el Get-Content de arriba
```

Después: `scripts\INICIAR-SERVICIO.bat`

---

## Resumen de scripts

| Script | Cuándo usarlo |
|--------|----------------|
| `INICIAR-SERVICIO.bat` | Tras corte de luz — inicia todo |
| `INICIAR-SOLO-BD.bat` | Solo PostgreSQL + Redis |
| `BACKUP.bat` | Respaldo manual de la BD |
| `FIX-P1000.bat` | Error de conexión a base de datos |
| `check-ports.bat` | Ver si hay conflicto de puertos |

---

## Qué NO se pierde al reiniciar

| Dato | Dónde vive |
|------|------------|
| Pacientes, entregas, llamadas | Volumen Docker `postgres_data` (persistente) |
| Archivos subidos (fotos) | Carpeta `uploads` / volumen Docker |
| Configuración IP/puertos | `config\dev-host.env` (en el proyecto) |

## Qué SÍ se pierde si no hay backup

- Cambios en BD si borra volúmenes con `docker compose down -v`
- Datos si falla el disco sin copia externa

**Por eso:** backup semanal fuera del servidor.

---

## Producción Docker completa (futuro)

Si algún día usa `docker-compose.prod.yml`:

```bash
npm run backup:run
```

Backups automáticos diarios a las 02:00 en volumen `postgres_backups`.
