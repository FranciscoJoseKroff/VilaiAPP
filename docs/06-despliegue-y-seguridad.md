# Vilai · Despliegue: instalable en cualquier celular

Guía de prompts por fases (D1 a D8) para Copilot, más los pasos que tienes que hacer tú a mano (cuentas, claves, comandos que piden login).

## Plan general: tres formas de instalar

| Qué | Dónde corre | Cómo se instala | Cubre |
|---|---|---|---|
| **API (back)** | Render (servicio web) + MongoDB Atlas | No se instala; es el servidor | Todo |
| **Web / PWA** | Hosting estático (Vercel, Netlify, Cloudflare Pages o EAS Hosting) | Abrir el enlace y "Añadir a pantalla de inicio" | **Android e iPhone**, sin cuentas de pago |
| **APK Android** | EAS Build, perfil `preview` con distribución interna | Descargar el APK desde un enlace o QR | Android |

**Sobre iPhone:** una app nativa instalable fuera de la tienda (ad hoc o TestFlight) exige una cuenta de pago de Apple Developer. Expo Go sirve para desarrollar, no para entregar. Por eso la **PWA es tu vía para iPhone**: se instala desde Safari como si fuera una app, y es gratis.

### Datos verificados al preparar esta guía (revísalos antes de contar con ellos)

- **Render, plan gratuito:** los servicios web se duermen tras unos 15 minutos sin tráfico y la primera petición puede tardar hasta unos 30 segundos (otras fuentes dicen 30-60 s). Hay un cupo de 750 horas al mes. Los pings externos para mantenerlo despierto son un truco de la comunidad, **no** una solución soportada por Render.
- **EAS Build, plan gratuito:** cupo mensual limitado y cola de baja prioridad. Las fuentes discrepan en el cupo (15 builds Android + 15 iOS según una guía de septiembre de 2026; 30 en total según otras). Mira `expo.dev/pricing`. Una guía reporta esperas de 90 minutos o más en horas punta, así que **no dejes el primer build para el último día**.
- **Expo web:** `npx expo export -p web` genera la carpeta `dist` y sirve para cualquier hosting estático. Expo recomienda EAS Hosting, pero Vercel, Netlify y Cloudflare Pages funcionan igual.
- **Android release:** bloquea tráfico HTTP sin cifrar. La API tiene que ser **HTTPS**.

## Antes de empezar

1. **Contraseña de Atlas.** Si aún no la cambiaste (el `.env.example` original traía una conexión real), hazlo ahora. Para el despliegue crearás un usuario nuevo y limitado.
2. Crea una rama por repo: `git checkout -b despliegue`.
3. Agrega a `.github/copilot-instructions.md` de **ambos** repos:

```markdown
- Nunca imprimas, copies ni escribas secretos (contraseñas, URI de base de datos, claves de
  API, JWT_SECRET) en código, logs, commits ni documentación. Usa variables de entorno.
- Nada secreto en variables EXPO_PUBLIC_*: se incrustan en el bundle y cualquiera las lee.
- La lógica de juego no se toca en las fases de despliegue.
```

## Orden y calendario sugerido (≈ 1,5 semanas)

| Orden | Fase | Quién |
|---|---|---|
| 1 | D1 · Back listo para producción | Copilot |
| 2 | D2 · Atlas + Render | Copilot prepara; **tú** creas las cuentas |
| 3 | D3 · Front de producción | Copilot |
| 4 | D4 · Web/PWA | Copilot prepara; **tú** conectas el hosting |
| 5 | D5 · APK con EAS | Copilot prepara; **tú** ejecutas el build |
| 6 | D6 · Página de instalación y QR | Copilot |
| 7 | D7 · CI y pruebas de humo | Copilot |
| 8 | D8 · Checklist del demo-day | Tú, con apoyo de Copilot |

**Despliega pronto**, aunque falte pulido. Probar en teléfonos reales ahora te ahorra sorpresas en las últimas semanas, y cada despliegue posterior es solo un `git push`.

---

## D1 · Back listo para producción

```
D1: backend listo para producción (AldeaIncrementalBack).

Contexto: Node + Express + Mongoose. Hoy usa cors() abierto, no tiene límite de peticiones
y el arranque depende de variables de entorno (MONGODB_URI, JWT_SECRET, PORT).

Tareas (lee primero el código actual y dime el plan antes de implementar):
1. Validación de entorno al arrancar: si faltan MONGODB_URI o JWT_SECRET (o JWT_SECRET tiene
   menos de 32 caracteres en producción), el proceso falla con un mensaje claro que NO
   imprime valores. PORT usa process.env.PORT con un valor por defecto solo en desarrollo.
2. Seguridad básica:
   - helmet.
   - express-rate-limit: límite general razonable y uno más estricto para /api/auth/*
     (por ejemplo 10 intentos por 15 minutos por IP).
   - app.set('trust proxy', 1) (Render está detrás de un proxy; sin esto el límite por IP falla).
   - express.json({ limit: '100kb' }) y rechazo claro (413) si se excede.
   - CORS con lista de orígenes desde CORS_ORIGINS (separados por comas). Las apps nativas no
     envían Origin y deben seguir funcionando. En desarrollo permite localhost.
3. Endpoint GET /health (sin autenticación, sin tocar la base de datos de forma pesada):
   responde { ok: true, uptime, version } y 503 si Mongo no está conectado. Úsalo como
   health check de Render.
4. Arranque ordenado: conecta a Mongo (con reintentos y backoff) antes de escuchar el
   puerto. Cierre ordenado con SIGTERM (cierra servidor y conexión).
5. Logs: una línea por petición (método, ruta, estado, ms). Sin cuerpos, sin cabeceras
   Authorization, sin secretos.
6. package.json: script "start": "node src/server.js" (o el archivo real), campo "engines"
   con la versión de Node que usas hoy, y asegúrate de que nodemon/dev dependencies no se
   necesitan para producción.
7. Actualiza .env.example con TODAS las variables (MONGODB_URI, JWT_SECRET, PORT,
   CORS_ORIGINS, NODE_ENV) con placeholders, y .gitignore con .env.
8. Pruebas: node test-logic.js sigue pasando; agrega pruebas para /health, para el límite
   de /api/auth/* y para CORS (origen permitido, no permitido y sin Origin).

No cambies la lógica de juego ni el contrato de la API.
```

**Verificación:** el servidor no arranca si falta un secreto; `/health` responde; el sexto intento de login seguido recibe 429.

---

## D2 · Atlas + Render (el servidor en internet)

**Lo que haces tú (en orden):**
1. **Atlas:** crea un clúster gratuito (M0) o reutiliza el actual. En *Database Access* crea un usuario **nuevo** con permiso `readWrite` solo sobre la base de Vilai y una contraseña larga generada. En *Network Access*: Render en plan gratuito no tiene IP fija, así que revisa en la documentación de Render si publica rangos de IP de salida para tu región; si no puedes limitarlo, tendrás que permitir `0.0.0.0/0` y compensarlo con el usuario de mínimos privilegios y la contraseña fuerte.
2. Pon la **API y la base de datos en la misma región** (cualquiera de EE. UU. sirve) para que las consultas no sean lentas.
3. **Render:** crea una cuenta, conecta el repo del back y crea el servicio desde el `render.yaml` que prepara Copilot. Carga `MONGODB_URI`, `JWT_SECRET` y `CORS_ORIGINS` en el panel (no en el repo).

```
D2: preparar el despliegue del backend en Render (AldeaIncrementalBack).

1. Crea render.yaml (Blueprint de Render) con un servicio web Node: plan free, comando de
   build "npm ci", comando de inicio "npm start", healthCheckPath /health, autoDeploy activo
   y variables de entorno: NODE_VERSION (según engines), NODE_ENV=production, y MONGODB_URI,
   JWT_SECRET y CORS_ORIGINS con sync: false (se cargan a mano en el panel). Verifica el
   formato contra la documentación vigente de Render antes de escribirlo.
2. Crea docs/DESPLIEGUE-BACK.md en español con pasos numerados: crear usuario y red en Atlas,
   crear el servicio en Render desde el Blueprint, cargar variables, primer despliegue,
   cómo ver logs y cómo hacer rollback. Sin ningún secreto real.
3. Crea scripts/smoke.mjs que reciba BASE_URL y ejecute: GET /health, GET /api/catalogo,
   registro de un usuario con correo único (smoke+<timestamp>@example.com), login, GET
   /api/aldea, PUT /api/aldea (con el mismo documento), y verifique que edad, ciclo y las
   decisiones de aldeanos se conservan tras el PUT y un nuevo GET. Imprime una tabla
   OK/FALLO con los milisegundos de cada paso. Debe poder borrar el usuario de prueba o
   marcarlo claramente.
4. En el script de smoke, mide por separado la primera petición (posible arranque en frío) y
   las siguientes, e imprime ambas.
```

**Verificación:** `BASE_URL=https://<tu-servicio>.onrender.com node scripts/smoke.mjs` termina en verde. Anota cuánto tarda la primera petición tras 20 minutos sin tráfico: es el tiempo de arranque en frío que verá un usuario.

---

## D3 · Front de producción

```
D3: configuración de producción del front (AldeaIncrementalFront).

Contexto: src/api/client.js define API_URL. La app debe apuntar a la API desplegada sin
tocar código y sin secretos en el bundle.

Tareas (plan primero, implementación después de mi "ok"):
1. API_URL sale de process.env.EXPO_PUBLIC_API_URL. En desarrollo, valor por defecto del
   .env.development local; en producción NO hay valor por defecto (si falta, la app muestra
   un error claro en lugar de apuntar a localhost). Documenta en .env.example.
2. app.json: name "Vilai", slug, version, android.package (por ejemplo cl.ulagos.vilai o el
   que yo indique), ios.bundleIdentifier, icon, adaptiveIcon (foreground y color de fondo),
   splash con el verde #0d1f1a, scheme, userInterfaceStyle "dark", orientation "portrait".
   Permisos de Android solo los necesarios. Genera los iconos/splash faltantes con
   un diseño simple basado en la paleta (verde bosque y dorado) y dime dónde quedan para
   que yo pueda reemplazarlos.
3. Arranque en frío del servidor (Render gratis tarda decenas de segundos en despertar):
   - Si una petición tarda más de 4 s, mostrar un banner/pantalla "Despertando el servidor,
     puede tardar hasta un minuto" con animación suave (no un spinner mudo).
   - Reintentos con backoff (3 intentos) en login/registro y en la carga inicial de la aldea.
   - Si el guardado automático falla, reintentar sin perder el estado y mostrar el banner
     "Sin conexión, reintentando..." (si ya existe, reutilízalo).
4. Error boundary global con pantalla amable y botón "Reintentar".
5. Quita console.log de producción (o envuélvelos en una función que solo escriba en
   __DEV__). Revisa que no se imprima el token ni datos personales.
6. Revisa que la app funciona con HTTPS (sin http:// ni IPs locales en el código) y con el
   catálogo de /api/catalogo vacío o lento (estados de carga).

No cambies la lógica de juego.
```

**Verificación:** con el back dormido, la app muestra "Despertando el servidor" en lugar de congelarse; sin `EXPO_PUBLIC_API_URL` en producción, el error es explícito.

---

## D4 · Web / PWA desplegada

**Lo que haces tú:** conecta el repo del front a Vercel, Netlify o Cloudflare Pages (o usa EAS Hosting), con comando de build `npx expo export -p web` y directorio de salida `dist`. Carga `EXPO_PUBLIC_API_URL` en el panel del hosting. Luego agrega la URL final a `CORS_ORIGINS` en Render y redespliega el back.

```
D4: web instalable como PWA (AldeaIncrementalFront).

Contexto: Expo Router en web. El juego exige login, así que no necesita posicionamiento
en buscadores; el renderizado estático ejecuta el código en Node al compilar y podría fallar
con window/localStorage.

Tareas:
1. Revisa web.output en app.json. Usa "single" (SPA) salvo que me muestres una razón
   concreta para otra cosa. Comprueba que `npx expo export -p web` termina sin errores y que
   dist/ se sirve bien con un servidor local (npx serve dist) incluyendo recargar en
   cualquier ruta.
2. Archivos de hosting (crea los que correspondan a Vercel y a Netlify; yo elijo uno):
   - vercel.json con buildCommand, outputDirectory "dist" y rewrite de todas las rutas a
     /index.html.
   - public/_redirects para Netlify (/* /index.html 200) o netlify.toml equivalente.
   - Cabeceras de caché: archivos en _expo/static/* con caché larga e inmutable;
     index.html sin caché.
3. PWA instalable:
   - public/manifest.webmanifest: name "Vilai", short_name "Vilai", start_url "/",
     display "standalone", orientation "portrait", theme_color y background_color #0d1f1a,
     iconos 192, 512 y maskable 512.
   - Enlázalo y agrega meta tags para iOS (apple-touch-icon, apple-mobile-web-app-capable,
     apple-mobile-web-app-title, theme-color) con el mecanismo que corresponda a web.output
     (public/index.html para "single", o +html.js para estático). Verifica en la
     documentación de Expo cómo se hace en esta versión.
   - Verifica la instalabilidad con Lighthouse (categoría PWA / installability) sobre el
     build servido por HTTPS o localhost, e imprime el resultado.
4. Service worker: NO agregues caché offline (el juego necesita el servidor y la
   simulación depende de la hora real). Si algún paso lo requiere para la instalación en
   Android, explícamelo antes de añadirlo.
5. Revisa en navegador móvil (viewport 390x844): safe areas, barra de pestañas inferior
   visible sobre la barra del navegador, fondo oscuro en toda la pantalla y sin scroll
   horizontal.
6. docs/DESPLIEGUE-WEB.md con los pasos (hosting, variable de entorno, CORS) y cómo
   instalarla en Android (Chrome: menú > Instalar app) y en iPhone (Safari: Compartir >
   Añadir a pantalla de inicio).
```

**Verificación:** abres la URL en un iPhone con Safari, la añades a la pantalla de inicio y se abre a pantalla completa con el icono de Vilai; en Android, Chrome ofrece "Instalar app".

---

## D5 · APK de Android con EAS

**Lo que haces tú:** crea una cuenta en expo.dev, `npm i -g eas-cli`, `eas login` y `eas build:configure`. Ejecuta el build que prepare Copilot. Revisa tu cupo gratuito en `expo.dev/pricing`.

```
D5: perfiles de EAS Build y distribución del APK (AldeaIncrementalFront).

Tareas:
1. eas.json con estos perfiles:
   - development: developmentClient true, distribution internal.
   - preview: distribution internal, android.buildType "apk", channel "preview",
     env EXPO_PUBLIC_API_URL apuntando a la URL de la API desplegada.
   - demo: igual que preview pero channel "demo" y la URL de producción. Será el APK que
     reparto el día del demo.
   Usa appVersionSource "remote" y autoIncrement para el número de versión.
   (Verifica el formato de eas.json contra la documentación vigente; las variables
   públicas se declaran en el campo env de cada perfil.)
2. Si instalo expo-updates, configura runtimeVersion con la política recomendada y channels
   por perfil; si lo consideras más riesgoso que útil para mi caso, dime por qué y
   déjalo como paso opcional documentado.
3. docs/DESPLIEGUE-APK.md: comandos exactos (eas build --platform android --profile demo),
   dónde descargar el APK, cómo compartir el enlace/QR, cómo instalar (activar "instalar
   apps desconocidas" para el navegador) y cómo desinstalar la versión anterior.
4. Lista de comprobación antes de cada build: app.json/versión, URL de la API, tests del
   back en verde, sin console.log con datos sensibles.
5. NO hagas builds de iOS: sin cuenta de Apple Developer de pago no se pueden instalar
   fuera del simulador; la vía para iPhone es la PWA.
```

**Verificación:** instalas el APK en un Android real, creas cuenta, juegas, cierras la app, la reabres y recuperas tu aldea.

---

## D6 · Página de instalación y QR

```
D6: página de instalación (AldeaIncrementalFront).

Crea public/instalar.html (se copia tal cual a dist/ y queda en /instalar.html), sin
dependencias externas, con la paleta de Vilai (fondo #0d1f1a, acento #e7b85c), responsive y
legible en móvil:
1. Título "Instala Vilai" y una frase de qué es el juego.
2. Tres tarjetas:
   - "Abrir en el navegador" (enlace a /).
   - "Android: descargar APK" (enlace configurable en una constante al inicio del archivo,
     con aviso de que hay que permitir instalar desde esta fuente).
   - "iPhone: añadir a pantalla de inicio" con los pasos en 3 viñetas (abrir en Safari,
     Compartir, Añadir a pantalla de inicio).
3. QR de la propia URL de la página, generado en el navegador sin librerías externas
   (implementación mínima inline) o como imagen SVG estática que dejes en public/.
   Dime cuál elegiste y por qué.
4. Detecta Android/iOS por userAgent y destaca la tarjeta correspondiente.
5. Sin analítica, sin cookies, sin fuentes externas.
```

**Verificación:** escaneas el QR con otro celular y llegas a la página; cada plataforma ve su opción destacada.

---

## D7 · CI y pruebas de humo

```
D7: integración continua (GitHub Actions) en ambos repos.

BACK (.github/workflows/ci.yml):
1. En cada push y pull request: instalar con npm ci, ejecutar node test-logic.js y los
   tests que existan. Cachea npm.
2. Workflow aparte "smoke" (manual, workflow_dispatch) que ejecuta scripts/smoke.mjs contra
   BASE_URL (variable del repositorio, no secreto) y falla si algún paso falla.

FRONT (.github/workflows/ci.yml):
3. En cada push y pull request: npm ci, npx expo lint y scripts/verificar-paridad.mjs
   (paridad de tiempo e IA con los vectores del back). Intenta también `npx expo export -p web`
   para detectar errores de compilación.

REGLAS:
4. Los vectores de paridad viven en el back (fixtures/*.json) y se copian al front. Agrega un
   chequeo que falle si las copias difieren (comparación de hash) para evitar que se
   desincronicen.
5. No guardes secretos en los workflows. Si necesitas alguno, usa GitHub Secrets y dime
   cuál y para qué.
6. Opcional (déjalo documentado, no activado): un workflow programado que haga GET a /health
   cada 10 minutos para reducir el arranque en frío de Render. Explícame sus límites
   (puede retrasarse y no es una solución soportada por Render).
```

**Verificación:** un push al repo ejecuta los tests; si cambias la IA en el back y no actualizas los vectores del front, el CI lo marca.

---

## D8 · Checklist del demo-day (para ti)

Pídele a Copilot que lo convierta en `docs/DEMO-DAY.md`, o úsalo tal cual:

**Una semana antes**
- [ ] Back, base de datos y web desplegados; `smoke.mjs` en verde.
- [ ] APK `demo` instalado en al menos 2 Android distintos; PWA instalada en al menos 1 iPhone.
- [ ] Cuenta de demostración con la aldea ya avanzada (varios edificios, 8-10 aldeanos, edad en curso, evento próximo).
- [ ] Copia de seguridad de la base de datos con `mongodump` (el plan gratuito de Atlas puede no incluir copias automáticas; confírmalo en tu panel).
- [ ] Video de respaldo de 60-90 s de la demo, guardado en el teléfono y en el computador.
- [ ] Página `/instalar.html` y QR impresos o en la última diapositiva.

**El día anterior**
- [ ] Congela el código: sin despliegues nuevos después de la última prueba completa.
- [ ] Prueba completa en frío: dormir el servicio 20 minutos, abrir la app y medir cuánto tarda en despertar.
- [ ] Revisa cupos: horas de Render del mes y builds de EAS.
- [ ] Batería, cargador, modo avión desactivado, brillo al máximo, notificaciones silenciadas.

**Una hora antes**
- [ ] Despierta el servidor (abre la app o `curl` a `/health`) y repite cada 10 minutos hasta tu turno.
- [ ] Abre la sesión de demostración y deja la app en la pestaña Aldea.
- [ ] Si usas el modo demostración de la Fase 9, comprueba que la etiqueta "MODO DEMO" se ve y que la velocidad ×20 funciona.

**Si algo falla en vivo**
- Sin internet o con servidor caído: pasa al video de respaldo sin disculparte, y explica que el juego guarda en la nube.
- Servidor despertando: usa esos 30 segundos para presentar el problema y la idea (el banner "Despertando el servidor" te da cobertura).
- Teléfono con problemas: abre la PWA en el segundo dispositivo.

---

## Prompt de revisión (al cerrar cada fase)

```
Revisa los cambios de esta fase como un revisor exigente de seguridad y operaciones:
1. ¿Hay algún secreto en el código, en los logs, en archivos de ejemplo o en variables
   EXPO_PUBLIC_*? (No debería.)
2. ¿La app y la API funcionan solo con HTTPS en producción y fallan de forma clara si falta
   configuración?
3. ¿Qué pasa si el servidor está dormido, si Mongo no responde o si el token venció?
4. ¿Cambió algo del contrato de la API o de la lógica de juego? (No debería.)
5. ¿Qué dependería de mi máquina local y no funcionaría en otro computador o en CI?
Dame los hallazgos por severidad y propón arreglos sin aplicarlos hasta que yo diga "ok".
```
