# NEXO POS Android — edición gratuita de pruebas

Esta carpeta contiene una **aplicación Android nativa de prueba**, separada de la aplicación web TanStack Start en la raíz del repositorio. **No utiliza Vercel, Neon, Firebase ni servidores de pago.**

## Cómo descargar el APK

1. En GitHub abre **Actions** → **Android APK — NEXO POS gratuito**.
2. Selecciona la ejecución de la rama `feature/android-google-free-mvp` (o `main` cuando esté incorporada).
3. Verifica el estado verde y abre la ejecución.
4. Descarga el artefacto `nexo-pos-gratis-debug-apk` (ZIP).
5. Extrae `app-debug.apk`, pásalo a tu teléfono e instálalo autorizando temporalmente a tu administrador de archivos para instalar aplicaciones externas.
6. Desactiva esa autorización cuando termines. Esta APK es experimental, no la utilices aún con información económica real.

## Qué permite probar sin Google

- Crear y editar productos, costos, precios, existencias, categorías y fotografías locales.
- Registrar ventas y descontar stock en una transacción SQLite atómica.
- Buscar productos, mantener un carrito y sumar unidades iguales.
- Escanear QR `nexo:p:<ID>` y códigos de barras con la cámara.
- Generar un PDF de etiquetas 2 × 5 en tamaño carta, con fotografías si están disponibles.
- Gestionar clientes, proveedores, saldos fiados y abonos.
- Consultar historial local.
- Preparar un recordatorio de cobro para Google Calendar desde la ficha de un cliente con saldo.

## Google Drive y Sheets: configuración de OAuth para pruebas

**Google Cloud no necesita facturación para el volumen de esta prueba**, dentro de cuotas y almacenamiento de tu cuenta. El registro del cliente OAuth Android es un paso obligatorio:

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilita **Google Drive API** y **Google Sheets API**.
3. Configura **Google Auth Platform**, marca la aplicación como de pruebas, agrega la cuenta de Google que utilizarás como usuario de prueba y declara el acceso limitado a archivos creados por la aplicación: `https://www.googleapis.com/auth/drive.file`.
4. Crea un **OAuth Client ID de tipo Android** con:
   - Package name: `com.nexopos.free`
   - SHA-1: **huella del certificado que firmó el APK instalado**.
5. No es necesario incluir un client secret en el APK. Nunca agregues claves privadas ni tokens al repositorio.
6. Instala el APK firmado con ese certificado y selecciona **Google → Entrar con Google**.
7. Pulsa **Guardar registros en Google Sheets**. La aplicación creará una hoja con Productos, Ventas, DetalleVentas, Clientes, Proveedores y Abonos; subirá fotografías a `NEXO POS/Imágenes/<categoría>` y generará una copia JSON fechada en Drive.
8. Para recuperar una copia, abre **Google → Recuperar copia de seguridad de Drive**. Confirma expresamente el reemplazo total de los datos locales. Prueba esta función con información ficticia antes de confiarle un negocio.

**Atención a la firma de depuración:** GitHub puede crear un certificado debug distinto por ejecución. Una huella OAuth registrada para un APK no necesariamente funciona con un APK construido después. Para pruebas repetibles hay que configurar un keystore de firma estable en GitHub Secrets. Nunca publiques el keystore de una APK de producción.

## Límites actuales del prototipo

- Un solo teléfono / un usuario principal. Google Sheets es una **copia sincronizada**, no una base de datos transaccional compartida entre múltiples cajas.
- Sin cronometraje automático de la sincronización; debes presionar «Guardar registros en Google Sheets».
- La restauración de la copia JSON y fotografías está implementada; **todavía no se ha validado en un teléfono con una cuenta Google real**. No se debe confiar en ella hasta superar esa prueba.
- Los recordatorios abren Google Calendar para confirmar; no se publican eventos sin tu consentimiento.
- No se han implementado todos los módulos de la aplicación web anterior: libro mayor, compras complejas, facturación fiscal y múltiples sucursales siguen pendientes.
- El primer APK no se debe usar aún para el cobro real. Es para comprobar pantallas, almacenamiento local, QR, respaldo/restauración de pruebas y primeros permisos Google.
- `GoogleSignIn` se usa provisionalmente para la prueba nativa; para una edición final se migrará a la API moderna Google Identity / Credential Manager.

Para compilar localmente con Android SDK y Gradle 8.9:

```bash
cd android
gradle :app:assembleDebug
```

El APK de depuración queda en `android/app/build/outputs/apk/debug/app-debug.apk`.
