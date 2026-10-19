# NEXO POS — publicación de pruebas en Android

## Estado del proyecto

- Código: https://github.com/lsnoglos/POS-phone
- Plataforma: TanStack Start/React, servidor Nitro, PostgreSQL.
- Automatización existente: GitHub Actions `NEXO POS checks` verifica TypeScript, lint, pruebas de negocio/autenticación y compilación de desarrollo.
- El flujo web desplegado **no** es una aplicación Android nativa. El APK se construirá después de disponer de un origen HTTPS estable.

## 1. Publicar la web en Vercel

1. En Vercel, crear o seleccionar un workspace y conectar la cuenta GitHub con acceso a `lsnoglos/POS-phone`.
2. Importar el repositorio. Directorio raíz: `/`. Framework TanStack Start (con Nitro en modo Vercel).
3. `vercel.json` establece `npm ci --no-audit --no-fund` y `npm run build`; la compilación ejecuta migraciones SQL si está configurado `DATABASE_URL`.
4. Crear **una base PostgreSQL exclusiva para pruebas**. Configurar `DATABASE_URL` como variable secreta para el despliegue. La base local PGLite no es persistente ni apropiada para funciones serverless de producción.
5. Configurar `BETTER_AUTH_URL=https://<dominio-real>` y un `BETTER_AUTH_SECRET` largo generado de forma segura.
6. Mantener `VITE_AUTH_ENABLED=true` (NO usar la cuenta local de desarrollo).
7. **Autenticación directa con Google:** crear un cliente OAuth 2.0 de tipo **Aplicación web** en Google Cloud, configurar la pantalla de consentimiento y añadir el dominio del proyecto a los orígenes autorizados. En las variables de Vercel, configurar:
   - `VITE_AUTH_ENABLED=true`
   - `VITE_GOOGLE_DIRECT_AUTH=true`
   - `GOOGLE_CLIENT_ID` (server-side)
   - `GOOGLE_CLIENT_SECRET` (server-side, secreto)
   - `BETTER_AUTH_URL=https://<dominio-real>`
   - `BETTER_AUTH_SECRET` (secreto)
   - `DATABASE_URL` (secreto PostgreSQL)
8. Registrar el URI de redirección autorizado **exacto**: `https://<dominio-real>/api/auth/callback/google`. No usar la credencial OAuth de vista previa de Grok para el dominio Vercel. La aplicación conserva el broker anterior solamente cuando `VITE_GOOGLE_DIRECT_AUTH` no está activado.
9. Publicar un despliegue de **Preview** y verificar el login, la base, la integridad del inventario y la descarga de tickets.
10. Restringir el acceso a la versión de pruebas y usar datos ficticios.

## 2. Probar en Android sin APK

1. Abrir la dirección HTTPS estable en Google Chrome Android.
2. Probar Google Sign-In y cerrar/reabrir el navegador. Comprobar que los registros siguen almacenados en PostgreSQL.
3. Desde Chrome, elegir «Instalar aplicación» si se ofrece, o «Añadir a pantalla de inicio».
4. Probar alta consecutiva, registro múltiple, impresión de etiquetas carta, búsqueda, carrito, lectura QR y facturación.
5. Permitir acceso a la cámara solo al sitio de pruebas; probar en condiciones reales con etiquetas impresas.
6. El escáner web actual depende de `BarcodeDetector`. En teléfonos incompatibles se muestra captura manual; implementar un decodificador con compatibilidad Android más amplia antes de considerarlo finalizado.

## 3. Ruta al APK

Cuando el despliegue HTTPS, el inicio Google, la base de datos y los QR hayan superado pruebas:

- Preparar un manifiesto web/íconos consistentes y accesibles desde el dominio elegido.
- Empaquetar como Trusted Web Activity (TWA) usando Bubblewrap / Android SDK. Esto usa Chrome y es preferible a un WebView simple para OAuth.
- Publicar `/.well-known/assetlinks.json` con el nombre de paquete Android y huella SHA-256 del certificado de firma para asociar la TWA con el origen web.
- Generar APK de depuración para pruebas y, después, APK firmado o AAB para distribución.
- Para reproducibilidad, crear un workflow GitHub Actions que construya y publique el APK como artefacto, **una vez definidos dominio, nombre del paquete, keystore y firma**.
- No introducir el keystore ni credenciales de Google/servidor en el repositorio: usar secrets.

## 4. Criterios mínimos para una prueba de negocio

- [ ] Inicio real con Google y sesión persistente.
- [ ] Base de datos remota con aislamiento por negocio y restauración probada.
- [ ] Crear 20 productos seguidos; recargar y verificar persistencia.
- [ ] Crear etiquetas de 10 productos y verificar ajuste e impresión en carta.
- [ ] Leer cada QR con cámara Android. Escanear tres veces el mismo producto **retirándolo entre lecturas**.
- [ ] Añadir/quitar cantidades; verificar descuentos, totales y cambios.
- [ ] Vender y confirmar exactamente una rebaja de inventario y una factura.
- [ ] Interrumpir la red y reconciliar ventas sin duplicados.
- [ ] Abrir/cerrar navegador y app sin perder sesión ni datos.
- [ ] Verificar fiados y restricciones de productos vencidos/controlados.

**No cargar inventario ni dinero reales hasta superar estas pruebas.**
