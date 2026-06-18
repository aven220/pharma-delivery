# Certificado del servidor (obligatorio para Android)

Android no confía en certificados autofirmados. Este archivo (`server.crt`) se embebe en el APK.

**Debe estar en Git** para que EAS Build lo incluya en el monorepo.

```bash
cd apps/mobile-expo
bash scripts/fetch-server-cert.sh
git add certs/server.crt
```

Regenerar si el certificado del servidor cambia.
