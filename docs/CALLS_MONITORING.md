# Monitoreo de llamadas — guía rápida

## Qué cambió

1. **Flujo guiado** en Mis llamadas: 1 Abrir → 2 Llamar → 3 Resultado → 4 Guardar  
2. Botón **Llamar ahora** registra la marcación en el servidor y arranca cronómetro  
3. No se puede completar una gestión sin marcar (o justificar con ≥10 caracteres)  
4. En **Historial**: tabla de monitoreo por operador (hoy) con alertas  

## En el servidor `192.168.20.26`

```powershell
cd G:\PROGRAMAS\pharma-delivery
git pull   # si aplica

# Migración BD (columnas dial_clicked_at / dial_click_count)
cd apps\backend
npx prisma migrate deploy
cd ..\..

# Reiniciar
docker compose up -d postgres redis
npm run dev:backend
npm run dev:web
```

## Cómo probar

### Operador (`operator@pharma.local` / `Operator123!`)

1. Ir a **Llamadas → Mis llamadas**
2. Abrir una entrega pendiente
3. Pulsar **Llamar ahora** (abre el teléfono y registra el clic)
4. Ver el cronómetro
5. Elegir resultado y **Paso 4 — Guardar**

Probar bloqueo: intentar guardar **sin** llamar → debe pedir justificación.

### Supervisor / Admin

1. **Llamadas → Historial**
2. Ver sección **Monitoreo de operadores (hoy)**
3. Semáforo: OK / Atención / Revisar

## URLs locales

| Servicio | URL |
|----------|-----|
| Panel | http://192.168.20.26:5517 |
| API | http://192.168.20.26:4410/health |
