# Vilai · contexto del proyecto para Claude Code

> Este archivo resume el proyecto para que cualquier asistente (Claude Code, Copilot) trabaje con el mismo contexto. Se armó a partir de las conversaciones de desarrollo y de la última revisión del código (zip del 1 de noviembre de 2026), no de una auditoría completa del repositorio actual. **Verifica con `git log` y leyendo el código antes de afirmar que algo existe o no existe.**

## 1. Qué es

**Vilai** es un juego incremental de construcción de aldea para móviles, hecho por **Francisco José Kroff Inzunza** (Ingeniería Civil en Informática, Universidad de Los Lagos, Chiloé) para el curso **Tecnologías Web y Móviles**. La aldea crece de forma semi-autónoma: los aldeanos eligen su oficio con una IA de utilidad, el tiempo avanza por años, estaciones y edades, y el servidor calcula el progreso mientras la app está cerrada (tope de 8 horas).

- Repositorio (monorepo, público, licencia MIT): https://github.com/FranciscoJoseKroff/VilaiAPP
- Informe del proyecto: "VILAI: Diseño y arquitectura de una aldea incremental con aldeanos autónomos" (26 de septiembre de 2026).
- Objetivos: (1) Avance N°1 del curso (rúbrica de Diseño UI/UX y Frontend Móvil: defensa 60 pts + producto 40 pts; se entrega repositorio, enlace a Figma o Penpot y `docs/bitacora.md`); (2) presentarlo en un **demo-day** de la carrera, donde el ganador recibe un premio.
- El juego debe sentirse **simple pero adictivo**.

## 2. Cómo trabajar con Francisco

- **Responde en español.** Es estudiante de 6.º semestre; es la **primera vez que despliega una app móvil**.
- **Explica el plan antes de implementar y espera su "ok".** Prefiere guía paso a paso, con ejemplos concretos y entregables claros (archivos, código que funcione).
- Los prompts usan la convención **"ALTO Y REPORTA"**: cuando aparezca, detente, muestra el diagnóstico o la tabla y espera confirmación.
- Trabaja en **Windows (PowerShell)** y en una laptop con **CachyOS (Arch)**; da comandos para ambos cuando difieran.
- Va a **defender el código en vivo** frente a su profesor: prefiere soluciones que pueda entender y explicar, y no te saltes la explicación de por qué.
- **Los commits los hace Francisco:** no ejecutes `git commit` ni `git push`. Cuando un cambio esté listo y verificado, avisa "Momento de commit" con los archivos y un mensaje sugerido. Trabaja desde dos equipos (PC con Windows y laptop con CachyOS), así que recuérdale hacer `git pull` antes de empezar.
- Commits pequeños y descriptivos. Sin librerías nuevas sin avisar (nombre, peso y licencia); las de Expo se instalan con `npx expo install`.

## 3. Stack y estructura

| Parte | Tecnología |
|---|---|
| App | Expo **SDK 58**, React Native 0.88, React 19, **Expo Router**, JavaScript (sin TypeScript) |
| Escena | `@shopify/react-native-skia` (necesita `public/canvaskit.wasm` en web) |
| Animación y UI | Reanimated + worklets, `expo-audio`, `react-native-svg`, `@gorhom/bottom-sheet`, DiceBear (avatares), `expo-secure-store` |
| Servidor | Node.js (`engines` 24.x), Express, Mongoose, JWT + bcrypt, `helmet`, `express-rate-limit` |
| Base de datos | MongoDB Atlas (plan gratuito) |

```
VilaiAPP/
├── src/app/            Expo Router: _layout, (tabs)/{index,aldeanos,construir,investigacion,ajustes}, creditos
├── src/components/     PixelPanel/PixelButton/PixelBar, CostChips, BuildingCard, PixelVillage (Skia), GameFeedback…
├── src/screens/        LoginScreen
├── src/game/           Lógica compartida: tiempo, cerebro (IA), investigacion, simulation, frases, format
├── src/simulacion/     Simulación visual de aldeanos (decidir, mundo, villagerStore)
├── src/hooks/useAldea  Estado, tick de 1 s y guardado
├── src/context/        GameContext
├── src/data/           gameIcons.js, creditos.js
├── src/audio/          sfx.js
├── theme.js            Tokens de color y tipografía
├── backend/            API REST (src/{server.js,controllers,models,routes,utils})
├── fixtures/ scripts/  Vectores de paridad y scripts de verificación
├── e2e/                Pruebas Playwright
└── docs/               bitacora.md, img/, prompts/
```

Los nombres exactos pueden haber cambiado: confirma leyendo el repositorio.

## 4. Reglas que no se pueden romper

1. **Paridad front/back.** La lógica de tiempo (`tiempo.js`), IA (`cerebro.js`, `frases.js`) e investigación (`investigacion.js`) existe en el front y en el back (el servidor la usa para el progreso offline) y debe ser **idéntica**, salvo la sintaxis de módulos. Se verifica con vectores en `fixtures/` y `scripts/verificar-paridad.mjs`.
2. **Determinismo.** Prohibido `Math.random()` en la simulación. Se usa el generador determinista de `tiempo.js` (semilla = `_id` de la aldea + clave).
3. **Esquema estricto de Mongoose.** Todo campo nuevo se declara en el esquema (lo no declarado se descarta en silencio), con migración idempotente y una prueba de guardar y leer. Los valores nuevos de un enum se agregan en el esquema, en `aldeanoEnums.js` del front y en los vectores.
4. **Dos conceptos de "estado" del aldeano:** `aldeano.estado` (enum que acepta el servidor: `buscando_arbol`, `talando`, `cultivando`, `minando`, `vigilando`, `descansando`, `yendo_a_construir`, `construyendo`) y `estadoVida` (acción de la simulación visual: `vagar`, `trabajar`, etc., que **no se persiste**). Nunca escribas valores de `estadoVida` en `estado`. `trabajo` solo acepta `libre`, `lenador`, `agricultor`, `minero`, `guardia`. `guardar()` pasa los aldeanos por `prepararParaGuardar` como red de seguridad.
5. **`ciclo.dia` significa AÑO** (no se renombra el campo, para no dejar huérfanas las aldeas guardadas).
6. **API aditiva:** no quites campos del catálogo ni de las respuestas, y no cambies el formato de `progresoInactivo`.
7. **Secretos solo en variables de entorno del servidor.** Nada secreto en `EXPO_PUBLIC_*`. El repositorio es público: nunca escribas cadenas de conexión, contraseñas ni claves en archivos, logs ni commits.
8. **Skia en web:** la prop `style` del `Canvas` debe ser un objeto plano (`StyleSheet.flatten`), no una lista; si no, la web falla con `Failed to set an indexed property`.
9. **Efectos de investigación** solo se calculan en `investigacion.js`, nunca bonos escritos a mano en la simulación, la IA o la interfaz.
10. **Interfaz:** colores y tipografía desde `theme.js`; cuerpo de texto de 16 sp; áreas táctiles de al menos 44 pt; respetar zonas seguras; respetar "reducir animaciones"; animaciones sin re-renderizar pantallas completas en cada tick de 1 s; contraste AA.

## 5. Dominio del juego

- **Tiempo:** 1 año = 180 s. Estaciones: primavera (0–40 s), verano (40–80), otoño (80–120), invierno (120–180), cada una con multiplicadores de producción (el invierno equivale a la antigua "noche": ×0,8). El **evento del año** se genera al entrar al invierno (segundo 120).
- **Edades:** Calma, Abundancia, Hielo, Ceniza, Sombras y Descubrimientos (6 a 14 años cada una), con modificadores de producción, pesos de eventos y daño. Al completarse una edad se entrega **1 reliquia**.
- **Eventos:** bestias, helada, recaudador. Se resuelven solo en el front (`resolverEventoNocturno`).
- **Recursos:** madera, comida, oro, hierro, trigo, harina, pan. **Edificios (9):** aserradero, granja, casa, granero, almacén, molino, horno, mina, observatorio (más el Centro de Investigación).
- **IA de aldeanos (utilidad):** cada 10 s un aldeano en modo automático puntúa leñador, agricultor, minero y guardia: `puntaje = necesidad / (1 + k·conteo) + rasgo + contexto + inercia + variedad`; si el mejor es menor a 0,2 queda libre. Guarda `aldeano.decision` con los factores (se muestra en el panel "Por qué lo hizo"). El pensamiento sale de un banco de frases determinista (`frases.js`).
- **Rasgos:** maderero, hortelano, minero nato, polivalente.
- **Árbol de investigación:** catálogo de datos (`ARBOL_INVESTIGACION`) servido por `/api/catalogo`, con tipos de efecto cerrados (producción, capacidad, daño de eventos, etc.). Nodos actuales: herramientas, logística, defensa, metalurgia y planos antiguos.
- **Crónica**, **estadísticas** y **progreso offline** (máximo 8 h, calculado por el servidor al abrir la app).

## 6. Estado del trabajo

**Aplicado:** mejora UX/UI (fases 0–9), sistema de tiempo (años, estaciones, edades), IA de aldeanos (IA-1 a IA-4), árbol de investigación **T1 a T3**, interfaz fresca (UI-1 a UI-6, con sonidos pendientes), seguridad del servidor (D1), bitácora, README y logo e íconos propios (se entregan como archivos para copiar).

**No aplicado:** árbol **T4 a T8** (nodos como atalayas, tiempo de investigación, doctrinas, refundar colonia), ideas extra E2 a E8 (voz con LLM, estadísticas ampliadas, logros, ranking, contenido nuevo, ciclo de vida, robustez). **En curso:** E1a (escenarios de demostración); en el último plan Copilot preguntó cómo representar las atalayas y se eligió no incluirlas.

**Despliegue:** MongoDB Atlas configurado (clúster `Cluster0`, AWS São Paulo, base `vilai_dev` para desarrollo y `vilai_beta` para el servidor; usuarios `vilai_dev_user` y `vilai_app` con `readWrite` solo sobre su base; el usuario administrador antiguo debía borrarse). **Render, Vercel y el APK de EAS aún no están creados.** Hay una guía en `docs/prompts/06-despliegue-y-seguridad.md`.

## 7. Deuda y problemas conocidos

- Los sonidos son 8 WAV sintetizados por `scripts/generar-sonidos.mjs` (los MP3 originales pesaban 0 bytes y nunca sonaron). Para cambiarlos, edita el script y vuelve a ejecutarlo.
- `app.json`: no configura el splash (falta el plugin `expo-splash-screen`) y el ícono adaptativo tenía fondo `#E6F4FE`.
- La carpeta `test-results/` (salida de Playwright) apareció subida al repositorio.
- Tests y vectores: se detectaron pruebas desactualizadas y un vector de paridad de IA que fallaba; confirma que `npm test` y `node scripts/verificar-paridad.mjs` pasan.
- Pocos commits en el historial (los primeros fueron masivos).
- Faltan `src/constants/` (los tokens están en `theme.js`), `FlatList` en las listas largas (solo `aldeanos.js` la usa) y bordes de campos de texto con contraste de 1,6:1.
- El aviso `useNativeDriver` en la consola web es inofensivo (en web cae a JavaScript).
- La app necesita el servidor para iniciar sesión: sin despliegue, la defensa se hace con el servidor local en la misma red que el teléfono.

## 8. Comandos y configuración

```bash
npm install && cd backend && npm install && cd ..    # instalar
cd backend && cp .env.example .env                   # luego completar (Windows: copy)
cd backend && npm run dev                            # servidor en :4000 (health: /api/salud)
npx expo start                                       # app (Expo Go); --web para el navegador
npm test                                             # app: simulación
cd backend && npm test                               # servidor: lógica y seguridad
node scripts/verificar-paridad.mjs                   # paridad front/back
npx expo export -p web && npx serve -s dist          # probar el build de producción web
npx expo-doctor && npx expo lint
```

- **Servidor (`backend/.env`):** `MONGODB_URI` (con el nombre de la base), `JWT_SECRET` (32 caracteres o más en producción), `PORT`, `CORS_ORIGINS`, `NODE_ENV`. El servidor se niega a arrancar sin los secretos.
- **App (`.env` en la raíz):** `EXPO_PUBLIC_API_URL`, por ejemplo `http://IP_LOCAL:4000/api` para probar desde el teléfono.
- **Seguridad del servidor:** `helmet`, `trust proxy`, límite de 20 intentos fallidos de login cada 15 min por IP, límite de 240 por minuto **por usuario** en `/api/aldea` (después de verificar el token), límite de 300 por minuto por IP en las rutas públicas, cuerpo JSON de hasta 1 MB, CORS por lista. `PUT /api/aldea` responde 400 con el detalle ante errores de validación y 500 ante el resto.
- **Rutas principales:** `POST /api/auth/registro`, `POST /api/auth/login`, `GET /api/aldea`, `PUT /api/aldea`, `GET /api/catalogo`, `GET /api/salud`.

## 9. Referencias en el repositorio

- `docs/bitacora.md`: identidad, flujo, evidencia, justificación y bitácora de IA.
- `docs/prompts/`: guías de prompts por fases (UX/UI, tiempo, IA, árbol, interfaz, despliegue, mejoras extra).
- `.github/copilot-instructions.md`: reglas para Copilot (mismas que la sección 4).
