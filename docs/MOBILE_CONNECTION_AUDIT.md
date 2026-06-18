# Informe técnico — App Expo no conecta en producción

**Fecha de análisis:** 2026-06-05  
**Entorno:** `https://20.5.19.8` (Azure VM, Docker + edge NGINX)  
**Verificación externa:** `health:200`, `login:400` (validación), `socket.io polling:200`

---

## Conclusión (causa raíz)

| Prioridad | Causa | Impacto |
|-----------|-------|---------|
| **CRÍTICA** | Certificado TLS **autofirmado** (`issuer=CN=20.5.19.8`) | Android rechaza HTTPS → Axios devuelve `Network Error` sin `response` |
| **ALTA** | `certs/server.crt` **no está en Git** (`??` untracked) | EAS Build en nube puede compilar APK **sin** cert embebido si no corre `fetch-server-cert.sh` |
| **HISTÓRICA** | APKs anteriores con URL incorrecta (`:8080`, HTTP, sin `EXPO_PUBLIC_API_URL`) | Crash o mixed-content; ya corregido en código actual |

**El backend, Docker, NGINX, rutas API, JWT y Socket.io están operativos.**  
El fallo ocurre **antes** de que la petición llegue al servidor (capa TLS del dispositivo).

---

## 1. Problemas encontrados

### P1 — Certificado SSL autofirmado (CAUSA RAÍZ)

| Campo | Valor |
|-------|-------|
| **Archivos** | `infra/ssl/fullchain.pem`, `scripts/generate-prod-tls.sh`, `apps/mobile-expo/plugins/withAndroidNetworkSecurity.js` |
| **Riesgo** | **CRÍTICO** — bloquea 100% de conexiones HTTPS desde Android |
| **Evidencia** | `openssl`: `subject=CN=20.5.19.8`, `issuer=CN=20.5.19.8` (autofirmado). `curl -k` funciona; Android sin cert embebido falla con `Trust anchor not found` |
| **Solución** | (A) Embeber `certs/server.crt` en APK vía plugin Android **y** regenerar APK; (B) **Definitivo:** dominio + Let's Encrypt |
| **Cambio mínimo** | Asegurar que EAS ejecute `fetch-server-cert.sh` en **prebuild** y que `server.crt` llegue al builder |

---

### P2 — Certificado no versionado en Git

| Campo | Valor |
|-------|-------|
| **Archivos** | `apps/mobile-expo/certs/server.crt` (existe local, **untracked**), `.gitignore` (no lo ignora) |
| **Riesgo** | **ALTO** — builds EAS desde otro equipo/CI sin `npm run build:apk` → plugin sin cert → SSL falla |
| **Solución** | Commitear `server.crt` (es certificado **público**, no secreto) o `prebuildCommand` en `eas.json` |
| **Cambio mínimo** | `prebuildCommand` en `eas.json` + validación en `prepare-eas-build.js` |

---

### P3 — APK desactualizado (histórico)

| Campo | Valor |
|-------|-------|
| **Archivos** | `eas.json`, `config/api.ts`, builds anteriores |
| **Riesgo** | **ALTO** si el APK instalado es viejo |
| **Evidencia** | Errores previos: `MOBILE_API_URL no configurada`, URL `http://20.5.19.8:8080` en web-admin |
| **Solución** | Instalar APK ≥ **1.1.3** generado con `npm run build:apk` |
| **Cambio mínimo** | Ninguno en código; solo redeploy APK |

---

### P4 — CORS (NO es causa del móvil)

| Campo | Valor |
|-------|-------|
| **Archivos** | `apps/backend/src/index.ts`, `docker-compose.prod.yml` (`CORS_ORIGIN`) |
| **Riesgo** | **BAJO** para Expo nativo — CORS aplica a navegadores, no a Axios en React Native |
| **Estado** | `CORS_ORIGIN=https://20.5.19.8` correcto para web-admin |
| **Cambio mínimo** | Ninguno |

---

### P5 — JWT / Auth (NO es causa de “no conecta”)

| Campo | Valor |
|-------|-------|
| **Archivos** | `apps/mobile-expo/services/api.ts`, `apps/backend/src/modules/auth/` |
| **Riesgo** | **BAJO** para error de conexión inicial |
| **Evidencia** | `POST /api/auth/login` responde 200 con credenciales válidas vía `curl -k` |
| **Nota** | 401 = credenciales incorrectas, no fallo de red |
| **Cambio mínimo** | Ninguno |

---

### P6 — Axios (configuración correcta)

| Campo | Valor |
|-------|-------|
| **Archivos** | `apps/mobile-expo/services/api.ts`, `config/api.ts` |
| **Estado** | `baseURL: https://20.5.19.8`, rutas `/api/...` — correcto |
| **Riesgo** | **NINGUNO** en configuración; fallo es TLS previo a HTTP |
| **Cambio mínimo** | Ninguno |

---

### P7 — Socket.io (secundario al login)

| Campo | Valor |
|-------|-------|
| **Archivos** | `sockets/client.ts`, `infra/nginx/edge.prod.conf`, `apps/backend/src/index.ts` |
| **Estado** | `path: /socket.io/`, proxy NGINX OK, polling `200` |
| **Riesgo** | **MEDIO** — mismo bloqueo TLS que REST; no impide login |
| **Cambio mínimo** | Ninguno (se resuelve con P1) |

---

### P8 — Docker / NGINX (operativos)

| Campo | Valor |
|-------|-------|
| **Archivos** | `docker-compose.prod.yml`, `infra/nginx/edge.prod.conf`, `infra/nginx/nginx.prod.conf` |
| **Estado** | Solo 443 público; `/api`, `/socket.io/`, `/health` enrutan al backend |
| **Riesgo** | **NINGUNO** detectado |
| **Cambio mínimo** | Ninguno |

---

### P9 — iOS (si aplica)

| Campo | Valor |
|-------|-------|
| **Archivos** | `app.json` → `NSAppTransportSecurity` sin excepción para IP autofirmada |
| **Riesgo** | **ALTO** en iOS con cert autofirmado |
| **Solución** | Let's Encrypt o pinning iOS (fuera de alcance mínimo Android) |

---

## 2. Archivos afectados (resumen)

| Archivo | Rol en el problema |
|---------|-------------------|
| `infra/ssl/fullchain.pem` | Cert autofirmado en servidor |
| `apps/mobile-expo/plugins/withAndroidNetworkSecurity.js` | Confianza TLS Android |
| `apps/mobile-expo/certs/server.crt` | Cert embebido en APK (falta en Git) |
| `apps/mobile-expo/eas.json` | URL API + pipeline EAS |
| `apps/mobile-expo/scripts/fetch-server-cert.sh` | Descarga cert antes del build |
| `apps/mobile-expo/config/api.ts` | Resolución `API_URL` |
| `apps/mobile-expo/services/api.ts` | Cliente Axios |

**Sin problemas:** `apps/backend/package.json`, rutas API, rate-limit auth, JWT, CORS (móvil), Docker edge.

---

## 3. Matriz de riesgo

| ID | Problema | Riesgo | ¿Bloquea login? |
|----|----------|--------|-----------------|
| P1 | SSL autofirmado | Crítico | Sí |
| P2 | Cert no en Git / EAS sin fetch | Alto | Sí |
| P3 | APK viejo | Alto | Sí |
| P4 | CORS | Bajo | No |
| P5 | JWT | Bajo | No (solo post-conexión) |
| P6–P8 | Infra OK | Ninguno | No |

---

## 4. Solución recomendada (orden)

1. **Inmediato:** Regenerar APK con cert embebido (`npm run build:apk` → v1.1.3+).
2. **Pipeline:** `prebuildCommand` en EAS para descargar cert en builders.
3. **Versionar:** Commitear `apps/mobile-expo/certs/server.crt`.
4. **Producción:** Dominio + Let's Encrypt (elimina dependencia de cert embebido).
5. **Diagnóstico:** `adb logcat | grep -iE 'A-AS|ssl|Trust anchor'` — ver `docs/MOBILE_DEBUG.md`.

---

## 5. Cambios mínimos aplicados

| Archivo | Cambio |
|---------|--------|
| `eas.json` | `prebuildCommand` → descarga cert en EAS Build |
| `scripts/prepare-eas-build.js` | Valida existencia de `certs/server.crt` |
| `certs/README.md` | Documenta obligatoriedad del cert |

**No se modifican:** backend, Docker, NGINX, Axios, Socket.io, CORS, JWT.

---

## Comandos de verificación

```bash
# Servidor OK
curl -k https://20.5.19.8/health

# Certificado
echo | openssl s_client -connect 20.5.19.8:443 2>/dev/null | openssl x509 -noout -subject -issuer

# Build APK
cd apps/mobile-expo && npm run build:apk

# Logs Android
adb logcat *:S ReactNativeJS:V | grep -iE 'A-AS|ssl|Trust'
```
