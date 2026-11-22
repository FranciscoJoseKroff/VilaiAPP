# Vilai · Plan de mejora UX/UI por fases

Guía para trabajar con una IA de código (Claude Code, Cursor, etc.) sobre `AldeaIncrementalFront`.
Cada fase es **una sesión independiente**: pegas el bloque de CONTEXTO + el prompt de la fase.

## Cómo usar esta guía

1. Antes de empezar: `git checkout -b ux-redesign`. Haz un commit al terminar **cada fase** (si algo sale mal, vuelves atrás sin perder nada).
2. Abre una conversación nueva por fase y pega primero el **CONTEXTO**, luego el prompt de la fase.
3. Pide siempre el plan antes del código. Si el plan no te convence, corrígelo antes de decir "ok".
4. Al terminar, haz la **Verificación** de la fase a mano (web y teléfono). Solo cuando pase, haz commit y sigue.
5. Orden sugerido para 2 meses (≈ 8 semanas):

| Semana | Fase |
|---|---|
| 1 | Fase 0 (base) + Fase 1 (dividir App.js) |
| 2 | Fase 2 (navegación y layout) |
| 3 | Fase 3 (HUD de recursos y metas) |
| 4 | Fase 4 (edificios) |
| 5 | Fase 5 (aldeanos) |
| 6 | Fase 6 (feedback y eventos) |
| 7 | Fase 7 (escena pixel art) + Fase 8 (login/onboarding) |
| 8 | Fase 9 (accesibilidad, rendimiento, QA) y colchón |

---

## CONTEXTO (pegar al inicio de CADA sesión)

```
Trabajas sobre "Vilai" (Village + AI), un juego incremental de construcción de aldea
para móviles. Frontend: AldeaIncrementalFront (Expo, React Native 0.88, React 19,
JavaScript sin TypeScript). Backend: Node/Express/MongoDB, NO se toca.

Estado del código: casi todo vive en App.js (~2400 líneas): lógica de simulación
(simularProduccionActiva, avanzarCicloActivo, actualizarAgentesAutonomos), componentes
pixel art (PixelHouse, PixelTree, PixelVillager, PixelVillage), GoalTrack, estados de
login, pantallas "aldea" e "investigacion" y un StyleSheet gigante.

Identidad visual a conservar: fondo verde bosque (#0d1f1a), acento dorado (#e7b85c),
escena pixel art hecha con Views.

Reglas generales:
- Antes de implementar, explícame el plan de la fase (qué archivos tocas y por qué) y
  espera mi "ok".
- NO cambies la lógica de juego ni las llamadas a la API ni el guardado automático.
  Solo presentación y estructura. Si crees que algo de lógica debe cambiar, avísame.
- Antes de usar cualquier API de Expo/React Native, consulta la documentación de la
  versión instalada (revisa package.json y AGENTS.md). Instala paquetes con
  `npx expo install <paquete>`.
- Archivos en UTF-8; textos de UI en español.
- Al final de la fase: ejecuta `npx expo lint`, dime cómo probarla (`npx expo start --web`
  y en el teléfono) y qué debería ver exactamente.
- No avances a otras fases ni "aproveches" para refactorizar cosas fuera del alcance.
```

---

## Fase 0 · Base: codificación, tokens de diseño y línea base

**Objetivo:** arreglar el texto roto y dejar un sistema de diseño mínimo, sin tocar el comportamiento.

**Problemas que ataca:** símbolos como `â†’`, `â—†`, `âœ§`, `â€º` y "Ãrbol de habilidades"; ~25 colores hex repetidos; `userInterfaceStyle: "light"` en una app oscura; nombre "ALDEA INCREMENTAL" en vez de Vilai.

```
FASE 0: base visual.

Tareas:
1. Corrige la codificación rota en App.js (mojibake). Lista primero todas las
   ocurrencias que encontraste (con número de línea) y qué texto correcto corresponde.
   Los símbolos usados como iconos (◆ ● ✧ ▲ ▰ ▣ ⬟ ♟ ⌂ › ✓ ○ →) déjalos como texto Unicode
   válido por ahora; los reemplazaremos por iconos reales en la Fase 3.
2. Crea theme.js en la raíz con tokens:
   - colors: fondo, superficie, superficieAlta, borde, textoPrimario, textoSecundario,
     acento (#e7b85c), exito, peligro, aviso, y colores por recurso (madera, comida, oro,
     trigo, harina, pan, hierro).
   - spacing (4, 8, 12, 16, 24, 32), radius (6, 10, 16), typography (tamaños 14/16/20/24/32
     y pesos). Mínimo 14 px para texto normal.
   Extrae los colores hex que ya existen en App.js (#0d1f1a, #e7b85c, #f2ede0, #9fb8ae,
   #244536, ...) hacia esos tokens, sin cambiar cómo se ve la app.
   Si algún texto secundario tiene contraste bajo contra el fondo (por ejemplo #6c8178
   o #9fb8ae en 11 px), propón un valor corregido con su ratio de contraste calculado.
3. En app.json cambia userInterfaceStyle a "dark" y el nombre visible a "Vilai".
4. Cambia el eyebrow "ALDEA INCREMENTAL" por "VILAI".

No muevas componentes ni cambies layouts en esta fase.
```

**Verificación:** no queda ningún `â` ni `Ã` en la app; la app se ve igual que antes (salvo el nombre); `grep -c "#[0-9a-f]\{6\}" App.js` baja de forma notable.

---

## Fase 1 · Dividir App.js sin cambiar el comportamiento

**Objetivo:** que el código sea mantenible antes de rediseñar. Es la fase más importante para que las siguientes salgan bien.

```
FASE 1: refactor estructural sin cambios visibles.

Divide App.js en esta estructura (ajústala si ves una razón, explicándola primero):

  src/
    api/client.js            apiFetch, API_URL, guardarToken/leerTokenGuardado
    game/
      simulation.js          calcularCapacidadesAldea, simularProduccionActiva,
                             avanzarCicloActivo, actualizarAgentesAutonomos,
                             redondearADecima, puedePagar, progresoDeCosto, costoTecnologia
      format.js              formatearCosto, describirEdificio, aportePorOficio, textoTasa
    hooks/useAldea.js        estado de la aldea, tick de 1 s, guardado automático,
                             acciones (construir, mejorar, asignarTrabajo, reparar,
                             resolverEventoNocturno, investigar...)
    hooks/useAuth.js         token, login, registro, cierre de sesión
    components/              PixelHouse, PixelTree, PixelVillager, PixelVillage, GoalTrack
    screens/                 LoginScreen, AldeaScreen, InvestigacionScreen
  theme.js                   (ya existe)
  App.js                     solo compone: verifica sesión -> Login o pantallas

Reglas:
- Mueve el código tal cual (copiar/pegar con ajustes de imports/exports). No "mejores"
  nada mientras mueves.
- Los estilos pasan junto a cada componente/pantalla (StyleSheet por archivo).
- Hazlo en pasos pequeños: primero src/game y src/api, luego hooks, luego componentes,
  luego pantallas. Después de cada paso, confirma que la app sigue arrancando.
- Al final dame una tabla: función original -> archivo nuevo.
```

**Verificación:** juegas 5 minutos (construir, mejorar, asignar oficios, recargar la página) y todo se comporta igual que en la rama original.

---

## Fase 2 · Navegación y layout general

**Objetivo:** eliminar la página única larguísima.

**Nota de decisión:** `AGENTS.md` pide Expo Router (rutas en `src/app/`). Pídele a la IA que lo use, a menos que prefieras React Navigation. Si eliges Expo Router, la estructura de la Fase 1 cambia ligeramente (las pantallas pasan a `src/app/`).

```
FASE 2: navegación por pestañas y layout.

1. Implementa navegación inferior con 4 pestañas: Aldea, Aldeanos, Construir,
   Investigación (esta última solo visible/activa cuando el Centro de Investigación está
   construido o el árbol está desbloqueado, igual que la condición actual del botón
   "Abrir árbol de habilidades"; si no, mostrar la pestaña bloqueada con un candado).
   Usa Expo Router siguiendo AGENTS.md (confirma versión y docs primero).
2. Cada pestaña es una pantalla con su propio scroll:
   - Aldea: escena pixel art + ciclo día/noche + metas.
   - Aldeanos: lista de aldeanos (por ahora igual que hoy, se rediseña en la Fase 5).
   - Construir: lista de edificios + reparaciones (por ahora igual, se rediseña en la Fase 4).
   - Investigación: lo que hoy es la pantalla "investigacion".
3. Barra superior fija (HUD) visible en todas las pestañas con los recursos principales
   (madera, comida, oro, población). Los demás recursos (trigo, harina, pan, hierro)
   se muestran en la pestaña Aldea. En esta fase el HUD puede ser simple; se rediseña en la Fase 3.
4. Usa SafeAreaView / react-native-safe-area-context. Elimina paddingTop: 64 fijo.
5. El botón "Cerrar sesión" sale de la pantalla principal y pasa a un menú/ajustes
   accesible desde el HUD (icono de engranaje).
6. El estado del juego (useAldea) debe vivir por encima de la navegación, para que
   cambiar de pestaña no reinicie el tick ni el guardado automático.

Importante: comprueba que el tick de 1 s y el guardado automático siguen funcionando al
cambiar de pestaña.
```

**Verificación:** cambiar de pestaña no reinicia nada; los recursos siguen subiendo; en iPhone con notch el contenido no queda tapado.

---

## Fase 3 · HUD de recursos, iconos y metas

**Objetivo:** que el jugador entienda de un vistazo cuánto tiene, cuánto produce y qué hacer ahora.

```
FASE 3: recursos, iconos y metas.

1. Instala @expo/vector-icons (npx expo install @expo/vector-icons) y reemplaza los
   iconos de texto Unicode por iconos reales. Un icono distinto por recurso
   (madera, comida, oro, trigo, harina, pan, hierro) y por tipo de edificio
   (los de catalogo.tiposEdificio). Centraliza el mapeo en src/components/icons.js.
2. Crea el componente ResourceChip: icono + cantidad + tasa por segundo (+1.2/s) y
   una barra fina de capacidad. Cuando el almacén está lleno, la barra se pone en
   color aviso y se muestra "Lleno". Úsalo en el HUD fijo y en la cuadrícula completa.
3. Cuadrícula completa de recursos en la pestaña Aldea: 2 columnas, ordenada en cadenas
   (trigo -> harina -> pan, y hierro aparte) para que se entienda la producción.
4. GoalTrack: rediseña con mejor jerarquía. La meta "AHORA" debe destacar (acento dorado,
   tamaño mayor); las otras dos más discretas. Si la meta tiene botón de acción
   (investigar metalurgia), el botón muestra los costos como chips por recurso
   (verde si alcanza, rojo si falta).
5. Panel día/noche: icono de sol/luna, barra de progreso y tiempo restante legibles
   (mínimo 14 px). Cuando faltan <15 s para la noche, la barra cambia de color.

Respeta los tokens de theme.js. Sin librerías de componentes externas.
```

**Verificación:** puedes decir cuál es la próxima meta y qué recurso está lleno sin leer párrafos.

---

## Fase 4 · Pestaña Construir: tarjetas de edificio

**Objetivo:** que construir y mejorar sea evidente, y que se entienda por qué no puedes.

```
FASE 4: pestaña Construir.

Rediseña cada tarjeta de edificio:
- Icono grande del edificio (de icons.js), nombre, nivel actual como "Nv. 3" y,
  si existe, una barra de integridad.
- Una sola línea de efecto (usa describirEdificio) y debajo la fila de costos como
  chips por recurso: verde si alcanza, rojo si falta, con la cantidad faltante
  (ej. "Madera 40/60").
- Botón explícito: "Construir" o "Mejorar a Nv. N" (deshabilitado con motivo claro si no
  alcanzan los recursos). Quitar el patrón de "toca la tarjeta".
- Estado bloqueado: tarjeta atenuada con candado y texto "Requiere: <tecnología>".
- Ordena la lista: primero lo que se puede construir/mejorar ahora, luego lo que falta
  poco, al final lo bloqueado. Agrega encabezados de sección.
- Sección "Reparaciones": tarjetas con barra de integridad y botón "Reparar" con su costo.
- Estado de carga del costo de mejora ("Calculando costo...") como skeleton, no texto.
- Si no hay edificios construidos, mostrar un estado vacío amistoso con la primera
  recomendación (por ejemplo, construir una casa).

Extrae un componente BuildingCard y uno CostChips reutilizable (también servirá en
Investigación). No cambies las funciones de construir/mejorar/reparar.
```

**Verificación:** con pocos recursos, ves exactamente qué falta para cada edificio sin tocar nada.

---

## Fase 5 · Pestaña Aldeanos

**Objetivo:** que gestionar 10+ aldeanos no sea un muro de botones.

```
FASE 5: pestaña Aldeanos.

Hoy cada aldeano muestra 5-6 botones de oficio (Auto, Leñador, Agricultor, Minero,
Guardia, Libre). Con muchos aldeanos esto se vuelve inmanejable.

1. Tarjeta compacta de aldeano: avatar pixel (reutiliza el sprite de PixelVillager),
   nombre, rasgo, oficio actual con icono, aporte por segundo (aportePorOficio) y una
   insignia "Auto" o "Manual".
2. Al tocar la tarjeta se abre un bottom sheet (Modal de React Native, sin dependencias
   nuevas salvo que justifiques una) con: pensamiento actual del aldeano, rasgo y su
   efecto, y el selector de oficio como lista de opciones con icono y aporte estimado.
   "Auto" se explica en una línea: "El aldeano decide solo según las necesidades".
3. Encabezado con resumen: oficios actuales como contadores (Leñadores 3 · Agricultores 4
   · Mineros 1 · Libres 2) y botón "Poner a todos en Auto".
4. Filtros por oficio con chips horizontales (Todos, Leñador, Agricultor, ...).
5. Si hay muchos aldeanos, usa FlatList (no map dentro de ScrollView).
6. Estado vacío cuando todavía no llegan aldeanos: explica que llegan al juntar comida
   y muestra el progreso hacia el siguiente aldeano.

No modifiques actualizarAgentesAutonomos ni asignarTrabajo.
```

**Verificación:** con 10 aldeanos puedes cambiar el oficio de uno en 2 toques y ver cuántos hay por oficio.

---

## Fase 6 · Feedback: toasts, haptics, animaciones y evento nocturno

**Objetivo:** que el juego "se sienta" vivo. Es lo que más aporta al factor adictivo.

```
FASE 6: feedback y eventos.

1. Sistema de toasts: componente ToastHost montado en App.js + hook useToast().
   Reemplaza la caja `mensaje` del final de la pantalla. Tipos: éxito, info, aviso, error.
   Aparecen arriba bajo el HUD, se apilan máximo 3 y desaparecen solos en ~3 s
   (animación con Animated o Reanimated si ya está instalado).
2. Haptics: instala expo-haptics. Vibración ligera al construir/mejorar, media al llegar
   un aldeano o completar una meta, de error al fallar. Que se pueda desactivar desde
   Ajustes (guardar la preferencia).
3. Animaciones:
   - Los números de recursos hacen un pequeño "pulso" al subir de forma notable
     (por ejemplo, al terminar offline progress o al completar una meta).
   - Al reabrir la app, un modal "Mientras no estabas" con lo generado offline
     (recursos ganados y tiempo, tope 8 h) en vez de un cambio silencioso.
   - Llegada de aldeano: toast + el aldeano aparece caminando en la escena.
4. Evento nocturno: cuando hay un evento (bestias, helada, recaudador) muestra un banner
   fijo bajo el HUD con icono, descripción, y los botones "Defender · costo" /
   "Aceptar daños", visible desde cualquier pestaña. Usa chips de costo (de la Fase 4).
   Tras resolverlo, toast con el resultado.
5. Mensajes de error de red: banner discreto "Sin conexión, reintentando..." en vez de
   errores sueltos; el guardado se reintenta sin perder progreso.

No cambies la lógica de resolverEventoNocturno ni del progreso offline; solo cómo se muestran.
```

**Verificación:** nunca te pierdes un evento nocturno aunque estés en otra pestaña; al volver a abrir la app ves el resumen de lo ganado.

---

## Fase 7 · Escena pixel art

**Objetivo:** que la escena refleje el estado real de la aldea (es tu mejor elemento de identidad).

```
FASE 7: escena de la aldea.

Hoy PixelVillage muestra máximo 3 casas, 6 aldeanos y siempre el mismo refugio. Mejora:
1. Cada tipo de edificio construido aparece en la escena con su propio sprite simple
   hecho con Views (aserradero, granja, molino, panadería, mina, centro de investigación...
   según el catálogo). Los edificios dañados se ven agrietados o con humo.
2. Transición suave entre día y noche (interpolación de color del cielo, sol -> luna,
   ventanas encendidas de noche) usando Animated.
3. Los aldeanos se colocan según su oficio (leñadores en el bosque, agricultores en el
   cultivo, mineros en la mina, guardias con antorcha de noche) y caminan con la animación
   existente. Muestra un globo de pensamiento al tocar un aldeano (pensamientoActual).
4. Más aldeanos visibles (hasta 10), con scroll horizontal de la escena o un contador
   "+N" tocable que lleva a la pestaña Aldeanos.
5. Rendimiento: envuelve los sprites con React.memo, evita recrear arrays/estilos en
   cada tick de 1 s y verifica que no baje de 60 fps en un teléfono medio.

Mantén el estilo pixel art y la paleta actual.
```

---

## Fase 8 · Login, onboarding y sesión

```
FASE 8: entrada a la app.

1. Login/registro: logo o mini escena de Vilai arriba, título "Vilai", subtítulo claro,
   campos con etiqueta visible (no solo placeholder), botón mostrar/ocultar contraseña,
   validación en línea (email válido, contraseña mínima) y mensajes de error del servidor
   traducidos a frases amables. Maneja el teclado con KeyboardAvoidingView.
2. Sesión persistente en el teléfono: hoy el token solo se guarda en memoria en nativo,
   así que hay que iniciar sesión cada vez. Usa expo-secure-store (confirmar API en la
   documentación) para guardarlo en iOS/Android y deja localStorage en web.
3. Onboarding de 3 pasos la primera vez que se entra (se guarda que ya se vio):
   (1) "Tu aldea crece sola: los aldeanos llegan al juntar comida",
   (2) "Construye casas para aumentar la población máxima",
   (3) "Mejora edificios: cada nivel cuesta 1,6× más". Con botón "Saltar".
4. Pantalla de carga inicial con la marca Vilai en vez de solo un spinner.
5. Pantalla de Ajustes: haptics on/off, cerrar sesión (con confirmación) y versión de la app.
```

---

## Fase 9 · Accesibilidad, rendimiento y QA

```
FASE 9: pulido final.

1. Accesibilidad: accessibilityLabel y accessibilityRole en todos los botones e iconos
   sin texto, accessibilityState en estados (seleccionado/deshabilitado), áreas táctiles
   mínimas de 44x44, orden de foco lógico, y comprueba el contraste de todos los pares
   texto/fondo de theme.js (WCAG AA, 4.5:1 en texto normal). Respeta el tamaño de fuente
   del sistema sin romper el layout.
2. Rendimiento: el tick de 1 s no debe re-renderizar toda la app. Separa el estado que
   cambia cada segundo (recursos/ciclo) del que casi no cambia, usa React.memo,
   useCallback/useMemo donde corresponda y FlatList en listas. Mide antes y después
   (React DevTools Profiler o conteo de renders) y reporta resultados.
3. Tablet: app.json tiene supportsTablet true, así que revisa el layout en pantalla ancha
   (contenido centrado con ancho máximo, cuadrícula de 3-4 columnas).
4. Revisa estados límite: sin conexión, token vencido, aldea sin edificios, 0 aldeanos,
   almacenes llenos, nombre largo de aldeano, textos largos en español.
5. Entrega una checklist de QA manual (web, Android, iPhone) con los pasos y el resultado
   esperado de cada uno, y una lista de problemas conocidos que queden pendientes.
```

---

## Prompt de revisión (úsalo al cerrar cualquier fase)

```
Revisa los cambios de esta fase como un code reviewer exigente:
1. ¿Se cambió algo de la lógica de juego o de la API? (No debería.)
2. ¿Hay colores, tamaños o espaciados hardcodeados que deberían venir de theme.js?
3. ¿Hay textos con codificación rota o sin tilde donde corresponde?
4. ¿Algún botón o icono sin accessibilityLabel o con área táctil < 44x44?
5. ¿Qué podría romperse en iPhone/Android que en web funciona?
Dame la lista de hallazgos por severidad y propón los arreglos, sin aplicarlos hasta que yo diga "ok".
```
