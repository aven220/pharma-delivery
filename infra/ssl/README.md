# Certificados TLS (proxy edge)

Coloque aquí:

- `fullchain.pem` — cadena del certificado
- `privkey.pem` — clave privada

Generar autofirmado (pruebas):

```bash
bash scripts/generate-prod-tls.sh
```

Con dominio público, use Let's Encrypt (certbot) y copie los archivos a esta carpeta antes de `docker-prod.sh up`.
