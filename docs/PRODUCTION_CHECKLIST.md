# Checklist de validación — Producción A-AS Delivery

Use esta lista después de cada despliegue. Automatización parcial:

```bash
bash scripts/verify-production.sh
```

## Infraestructura y puertos

- [ ] Solo están publicados **80** (redirect) y **443** (HTTPS) en el firewall de Azure/hosting.
- [ ] **8080** y **8081** NO aparecen en `docker compose ps` como puertos mapeados al host.
- [ ] Certificados TLS en `infra/ssl/fullchain.pem` y `privkey.pem` (Let's Encrypt o autofirmados para pruebas).
- [ ] Servicio `pharma-edge-prod` en estado `running`.

## HTTPS y API

- [ ] `curl -k https://TU-HOST/health` responde OK.
- [ ] `curl -k https://TU-HOST/ready` responde OK.
- [ ] `curl -k "https://TU-HOST/socket.io/?EIO=4&transport=polling"` no devuelve error 502.
- [ ] Swagger/documentación interna no expuesta públicamente sin autenticación (opcional endurecer).

## Variables de entorno (`.env.production`)

- [ ] `WEB_PUBLIC_URL` = URL HTTPS del panel admin (sin `:8081`).
- [ ] `WEB_API_URL` = URL HTTPS del API (mismo host; rutas `/api/...`).
- [ ] `MOBILE_API_URL` = misma URL HTTPS que `WEB_API_URL` (para build APK).
- [ ] `CORS_ORIGIN` = `WEB_PUBLIC_URL`.
- [ ] `JWT_*` y `POSTGRES_PASSWORD` únicos y fuertes.
- [ ] Sin referencias a `localhost`, `127.0.0.1`, `:8080`, `:8081`, `:4000` en URLs públicas.

## Panel web admin

- [ ] `https://TU-HOST/` carga el login.
- [ ] Formulario de login **vacío** (sin email/contraseña precargados).
- [ ] Login con usuario real funciona.
- [ ] Recuperación de contraseña usa `WEB_PUBLIC_URL` en el enlace del correo.

## Aplicación móvil

- [ ] APK construido con `EXPO_PUBLIC_API_URL` = `MOBILE_API_URL` (HTTPS).
- [ ] Login vacío, contraseña con asteriscos y botón ver/ocultar.
- [ ] Login y sincronización de entregas OK.
- [ ] Socket.io conecta tras login (revisar logs: "Socket connected").
- [ ] Notificaciones de asignación/ruta actualizan la lista.

## Seguridad

- [ ] Contraseñas del seed cambiadas en producción.
- [ ] Sin credenciales demo en código ni en pantallas.
- [ ] `TRUST_PROXY=true` en backend detrás del edge NGINX.

## Comandos útiles

```bash
bash scripts/generate-prod-tls.sh
bash scripts/docker-prod.sh up -d --build
bash scripts/docker-prod.sh ps
bash scripts/verify-production.sh

# APK (definir URL antes del build)
cd apps/mobile-expo
EXPO_PUBLIC_API_URL=https://TU-HOST eas build --profile preview --platform android
```
