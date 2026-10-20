# NEXO POS Android — edición gratuita de pruebas

Esta carpeta contiene una **aplicación Android nativa de prueba**, separada de la aplicación web TanStack Start en la raíz del repositorio. **No utiliza Vercel, Neon, Firebase ni servidores de pago.**

## Cómo descargar el APK

1. En GitHub abre **Actions** → **Android APK — NEXO POS gratuito**.
2. Selecciona la ejecución de la rama `feature/android-google-free-mvp` (o `main` cuando esté incorporada).
3. Verifica el estado verde y abre la ejecución.
4. Descarga el artefacto `nexo-pos-gratis-debug-apk` (ZIP).
5. Extrae `app-debug.apk`, pásalo a tu teléfono e instálalo autorizando temporalmente a tu administrador de archivos para instalar aplicaciones externas.
6. Desactiva esa autorización cuando termines. Esta APK es experimental, no la utilices aún con información económica real.

## Versión Android 0.2: módulos y mejoras

- **Inicio:** dashboard oscuro con accesos directos y totales reales de ventas, cuentas por cobrar/pagar, compras e inventario.
- **Venta:** catálogo, búsqueda instantánea, carrito visible que se conserva entre pantallas, editor de cantidades y diálogo de cobro con cliente/fiado.
- **Escanear:** cámara abierta en modo continuo, carrito visible, edición +/− y protección contra duplicación de fotogramas; se confirma la venta al volver al POS.
- **Compras:** seleccionar o registrar proveedor, añadir productos registrados o nuevos, editar cantidades, costo/venta, factura, flete y crédito, y recibir mercancía en una sola transacción.
- **Caja:** fondo inicial, entradas, retiros, efectivo esperado, arqueo y cierre, junto con movimientos de cobros, compras y abonos al usar caja abierta.
- **Inventario:** registro y edición; etiquetas QR en papel carta con productos seleccionados, fotografía opcional, copias, márgenes, columnas y filas.
- **Negocio:** ajustes de nombre, dirección, contacto, identificación fiscal y días de crédito, guardados en SQLite.
- **Proveedores:** cuentas pendientes y abonos; asociación a productos recibidos.
- **Google:** diagnóstico preciso de errores OAuth con identificación y huella SHA-1 del APK instalado; Drive se autoriza solamente cuando se sincroniza. Sheets y los respaldos incluyen los nuevos módulos.

Los cambios usan la base local SQLite versión 2 y una migración que **conserva las tablas anteriores**. No se asegura compatibilidad con archivos JSON de respaldo creados con una versión anterior de la estructura; las copias nuevas sí incluyen los módulos añadidos.

### Resolver el inicio de sesión de Google (DEVELOPER_ERROR, código 10)

1. Instala la **versión exacta del APK** que utilizarás para las pruebas.
2. Abre la pestaña **Más → Cuenta de Google**.
3. Pulsa **Copiar datos para Google Cloud**. Verás el paquete `com.nexopos.free` y la **huella SHA-1 real de ese APK instalado**. No reutilices una huella de otra compilación.
4. En [Google Cloud Console](https://console.cloud.google.com/), crea o selecciona un proyecto. En **Google Auth Platform**, completa **Branding** y **Audience**, selecciona aplicación externa en fase de prueba y agrega la cuenta Gmail con la que entrarás como usuario de prueba.
5. En **Clients → Create client**, elige **Android**, introduce el paquete y el SHA-1 exactos que muestra el teléfono. Esto crea un **OAuth client ID Android**, no un ID web.
6. Habilita **Google Drive API** y **Google Sheets API** en la biblioteca de APIs del proyecto. Para la sincronización, concede `https://www.googleapis.com/auth/drive.file` en Data Access/consentimiento cuando se solicite.
7. Espera unos minutos si las credenciales acaban de crearse y vuelve a iniciar sesión. Si falla, abre el cuadro de error y anota el **código numérico**; código 10 suele indicar error de firma/identidad o configuración del proyecto.

No se debe poner un **Client Secret** en una APK. La sesión Google no depende de una base de datos externa. El acceso a Drive se solicita al sincronizar, no durante el inicio de sesión básico.

### Firma Android estable para actualizaciones

Por defecto, GitHub Actions usa un certificado de depuración **nuevo en cada ejecutor**. Esto significa que un APK más reciente puede mostrar `Aplicación no instalada` si conserva el mismo paquete pero usa otra firma. No desinstales si tienes datos valiosos sin copia recuperable.

El workflow admite una clave privada de firma estable en el **GitHub Actions Secret** `NEXO_DEBUG_KEYSTORE_BASE64`, que debe contener una codificación Base64 del archivo `debug.keystore` generado por ti. Debe ser un almacén compatible con el alias `androiddebugkey` y las contraseñas de depuración de Android. Guarda el keystore original en un lugar seguro: **nunca lo publiques ni lo subas al repositorio**.

Cuando se configure ese Secret, compila e instala una vez la APK con firma permanente. Después registra el SHA-1 mostrado en Google Cloud, y las siguientes compilaciones utilizarán esa firma mientras se mantenga el Secret.

### Límite de uso

Es una versión de desarrollo **para un solo dispositivo / un solo propietario**. La autenticación Google vincula el respaldo a una cuenta; Google Sheets actúa como réplica legible, **no** como sistema multi-caja transaccional. Para múltiples teléfonos compartiendo inventario simultáneamente hará falta un diseño diferente.

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
