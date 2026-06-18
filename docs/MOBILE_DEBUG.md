# Diagnóstico — App móvil no conecta

## Causa más frecuente

El servidor usa certificado **autofirmado** (`CN=20.5.19.8`).  
El navegador del PC permite aceptarlo manualmente; **Android no** (error SSL silencioso).

Síntoma: mensaje "Sin conexión con el sistema" **con WiFi/datos activos**.

---

## 1. Ver logs en el celular Android (ADB)

### Requisitos
- Cable USB o depuración inalámbrica
- [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools) (`adb`)

### Pasos

```bash
# Ver dispositivos conectados
adb devices

# Logs en vivo (filtrar React Native / errores de red)
adb logcat -c
adb logcat *:S ReactNativeJS:V ReactNative:V chromium:V | grep -iE 'error|ssl|cert|network|axios|connect|pharma|API'
```

Abra la app, intente **login**, y observe la salida.

### Errores típicos

| En logcat | Significado |
|-----------|-------------|
| `Trust anchor for certification path not found` | Certificado SSL no confiable |
| `SSLHandshakeException` | Fallo handshake TLS |
| `Network Error` / `ERR_NETWORK` | Sin ruta al servidor o SSL bloqueado |
| `ECONNREFUSED` | Puerto/firewall cerrado |
| `401` / `Invalid credentials` | Red OK; usuario/contraseña mal |

### Guardar logs en archivo

```bash
adb logcat -d > ~/Desktop/pharma-app-log.txt
```

---

## 2. Probar desde el celular (sin la app)

1. Abra **Chrome** en el Android.
2. Visite: `https://20.5.19.8/health`
3. Si aparece advertencia de certificado → **ese es el problema** de la app.

---

## 3. Logs del servidor

En Azure VM:

```bash
cd ~/pharma-delivery
bash scripts/docker-prod.sh logs --tail=100 edge nginx backend
```

Durante un intento de login desde la app debería verse:

```
POST /api/auth/login
```

Si **no aparece** la petición → el celular no llega al servidor (SSL/red/firewall).

---

## 4. Pruebas desde su Mac

```bash
# API responde
curl -k https://20.5.19.8/health

# Login
curl -k -X POST https://20.5.19.8/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pharma.local","password":"Admin123!"}'

# Ver certificado
echo | openssl s_client -connect 20.5.19.8:443 -servername 20.5.19.8 2>/dev/null | openssl x509 -noout -subject -issuer
```

---

## 5. Actualizar certificado en el APK

Cuando regenere el certificado en el servidor:

```bash
cd apps/mobile-expo
bash scripts/fetch-server-cert.sh
npm run build:apk
```

---

## 6. Solución definitiva (producción)

Usar **dominio + Let's Encrypt** en lugar de IP + certificado autofirmado.
