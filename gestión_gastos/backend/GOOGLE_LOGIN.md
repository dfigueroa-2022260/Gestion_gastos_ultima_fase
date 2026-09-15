# Activar Google en Cash Track

El login con correo y contrasena sigue disponible. Google es un acceso adicional.

1. Abre https://console.cloud.google.com/auth/clients y selecciona o crea el proyecto Cash Track.
2. Completa la configuracion de Google Auth Platform (nombre Cash Track y correo de soporte).
3. Crea un cliente OAuth de tipo Aplicacion web.
4. Agrega ambos origenes JavaScript autorizados:
   - http://localhost
   - http://localhost:4200
5. Copia el ID terminado en .apps.googleusercontent.com a GOOGLE_CLIENT_ID en backend/.env.
6. Reinicia el backend con pnpm dev y abre http://localhost:4200/login.

Este flujo usa el boton oficial con popup y callback: no requiere un client secret ni una API key. Si cambia el puerto o se publica la app, agrega el origen exacto en Google y GOOGLE_ALLOWED_ORIGINS (separados por comas).

La migracion 20260916010000_google_login ya se aplico en la base local. En otra base ejecuta pnpm exec prisma migrate deploy y pnpm prisma:generate antes de iniciar.

## Comportamiento

- Cuenta local existente: Google pide confirmar la contrasena de Cash Track la primera vez para vincularla. Conserva el usuario, sus movimientos y su contrasena.
- Cuenta vinculada: Google inicia sesion directamente. El login local sigue funcionando.
- Cuenta nueva: Google crea un usuario con rol USUARIO.
- Sin configuracion de Google: el acceso local funciona normalmente.

Guia oficial: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
