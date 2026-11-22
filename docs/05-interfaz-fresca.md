# Vilai · Interfaz más fresca (UI-1 a UI-6)

Seis prompts para Copilot que dan a Vilai una identidad pixel coherente: tipografía, componentes con profundidad, animaciones, iconos de videojuego, avatares, tema por estación y sonido.

## Qué cambia y con qué

| Fase | Resultado | Librerías nuevas | Riesgo |
|---|---|---|---|
| **UI-1** | Tokens ordenados y tipografía pixel | `expo-font`, `@expo-google-fonts/*` | Bajo |
| **UI-2** | Paneles, botones y barras con estilo pixel y gradientes | `expo-linear-gradient` | Bajo |
| **UI-3** | Animaciones y detalles de juego | `react-native-reanimated`, `react-native-worklets` | Medio (rendimiento en web) |
| **UI-4** | Iconos de game-icons.net y pantalla de Créditos | `react-native-svg` | Bajo (licencia: hay que dar crédito) |
| **UI-5** | Avatares de aldeanos y tema por estación y edad | `@dicebear/core` + un estilo | Medio (tamaño del bundle) |
| **UI-6** | Sonidos, ajustes y auditoría de rendimiento | `expo-audio` | Medio (audio en web) |

## Instalación (la hace Copilot, pero tú puedes verificarlo)

Las librerías de Expo siempre con `npx expo install`, para que se instale la versión que corresponde a SDK 58:

```bash
npx expo install expo-font expo-linear-gradient react-native-svg expo-audio
npx expo install react-native-reanimated react-native-worklets
npx expo install @expo-google-fonts/<fuente-elegida>
```

DiceBear no es de Expo, así que va con `npm install` y siguiendo su documentación vigente (los nombres de paquetes cambiaron entre versiones).

## Reglas para todas las fases

Agrega esto a `.github/copilot-instructions.md` del front:

```markdown
- Ninguna librería nueva sin avisarme antes con su nombre, peso aproximado en el bundle y licencia.
  Las de Expo se instalan solo con `npx expo install`.
- Todo recurso con licencia que exija crédito (por ejemplo game-icons.net, CC BY 3.0) debe quedar
  registrado en src/data/creditos.js y mostrarse en la pantalla de Créditos.
- Las animaciones usan valores compartidos (no re-renderizan componentes en cada tick de 1 s),
  respetan "reducir movimiento" y nunca bloquean la interacción.
- No cambies la lógica de juego ni la API en estas fases: solo presentación.
- Antes de dar una fase por terminada: `npx expo lint`, `npx expo-doctor` y
  `npx expo export -p web` sin errores, y dime el tamaño de dist/ antes y después.
```

## Orden y calendario sugerido (≈ 1 a 1,5 semanas)

| Orden | Fase | Depende de |
|---|---|---|
| 1 | UI-1 | — |
| 2 | UI-2 | UI-1 |
| 3 | UI-3 | UI-2 |
| 4 | UI-4 | UI-1 (puede ir en paralelo con UI-2 y UI-3) |
| 5 | UI-5 | UI-2 y UI-3 |
| 6 | UI-6 | todas |

**Ramas y conflictos:** estas fases tocan los mismos archivos que las del árbol (T4 en adelante). Haz esto en una rama `ui-fresca`, termínala y únela antes de seguir con T4. Así evitas conflictos. A partir de UI-4, **cada nodo nuevo del árbol (T4) debe llevar su icono y su crédito**; agrega esta línea al prompt de T4:

```
Cada nodo nuevo del catálogo lleva el campo icono con un id de src/data/gameIcons.js (y su
entrada en src/data/creditos.js), siguiendo lo hecho en UI-4.
```

---

## UI-1 · Tokens ordenados y tipografía pixel

**Objetivo:** dejar `theme.js` con nombres que se entiendan y estrenar tipografía, sin que la app cambie de aspecto salvo por las fuentes.

```
UI-1: tokens y tipografía (front).

Contexto: theme.js tiene colores con nombres automáticos como c467b51, cc7803f o c596574 (se
generaron al extraer los hex del código). La app no usa fuentes propias. Instalo y uso fuentes
solo con las librerías oficiales: expo-font y @expo-google-fonts/*. La app también se publica
como PWA, así que las fuentes se cargan con el hook useFonts (el plugin de configuración de
expo-font no aplica a web).

Tareas (plan primero; implementa tras mi "ok"):
1. Tokens de color con sentido:
   - Lista todos los colores de theme.js con su hex y dónde se usan (archivos).
   - Propón un nombre semántico para cada uno (por ejemplo bosque, dorado, nieve, madera,
     hierro, cielo.primavera...). Agrupa en: superficies, textos, estados, recursos, estaciones,
     edades, ramas del árbol, y deja sin duplicados los que tengan el mismo hex.
   - Aplica el renombre en TODO el código con una búsqueda y reemplazo controlado (sin
     cambiar ningún valor). Al terminar, no queda ninguna referencia a los nombres antiguos
     y la app se ve igual.
2. Pantalla temporal de pruebas (solo en __DEV__) src/app/dev-tipografia.js que muestre una
   frase de interfaz real, un título, una cifra grande ("1.750") y un párrafo de 14 px con
   3 combinaciones: una fuente pixel para títulos y cifras (candidatas: Press Start 2P,
   Silkscreen y Pixelify Sans; confirma que existe el paquete @expo-google-fonts de cada una)
   más una fuente legible para el texto (candidatas: Inter, Nunito, Rubik). Espera que yo
   elija.
3. Con mi elección: carga las fuentes en el layout raíz con useFonts. Reglas:
   - Máximo 2 pesos de la fuente pixel y 3 de la de texto (peso del bundle).
   - Mientras cargan, mostrar la pantalla de carga de Vilai (no texto en otra fuente
     parpadeando); si fallan, usar una familia de respaldo del sistema.
   - Tokens tipograficos en theme.js: tipografia.titulo, tipografia.cifra, tipografia.cuerpo,
     tipografia.cuerpoNegrita, con tamaños y alturas de línea.
4. Aplica la fuente pixel solo a: títulos de pantalla, encabezados de sección, cifras grandes de
   recursos y nombres de edad y estación. NO la uses en párrafos ni en textos de 14 px o menos.
5. Respeta el tamaño de letra del sistema (accesibilidad): ningún layout debe romperse al
   escalar el texto al 130 %. Revisa HUD, tarjetas de edificio y nodos del árbol.
6. Borra la pantalla temporal al terminar.

Sin cambios de lógica.
```

**Verificación:** no queda ningún nombre tipo `c467b51`; los títulos y cifras estrenan la fuente pixel, y el texto largo sigue legible; la PWA no muestra parpadeos de fuente.

---

## UI-2 · Componentes pixel base y gradientes

```
UI-2: componentes base con estilo pixel (front).

Contexto: ya hay tokens semánticos y tipografía (UI-1). Quiero una identidad coherente con la
escena pixel art: bordes duros, esquinas escalonadas, sombras sin desenfoque. Sin imágenes ni
librerías de UI de terceros; solo Views, StyleSheet y expo-linear-gradient (compatible con
Android, iOS y web).

Tareas:
1. Crea src/components/pixel/ con:
   - PixelPanel: superficie con borde exterior oscuro de 2 px, bisel (luz arriba/izquierda,
     sombra abajo/derecha usando colores de borde por lado), esquinas escalonadas y variantes
     (normal, elevada, acento, peligro). Debe aceptar children, estilo y accessibilityLabel.
   - PixelButton: botón con efecto físico (al presionar baja 2 px y la sombra desaparece),
     variantes (primario dorado con gradiente sutil, secundario, peligro, fantasma), estados
     deshabilitado y cargando, mínimo 44x44 px de área táctil y anillo de foco visible en web.
   - PixelBar: barra de progreso por segmentos (por ejemplo 20 bloques) con modo continuo
     para valores muy finos; usada para recursos, integridad, investigación y año.
   - PixelDivider y PixelBadge (etiquetas "NUEVO", "SUGERIDO", "MÁX").
2. Gradientes con expo-linear-gradient: fondo del HUD, cielo de la escena según estación (usa
   los tokens de estaciones), brillo del botón primario y fondo de los encabezados de pantalla.
   Mantén los contrastes AA con el texto encima.
3. Reemplaza el uso ad hoc de tarjetas y botones por estos componentes en: HUD, tarjetas de
   recursos, BuildingCard, tarjeta de aldeano, nodos y detalle del árbol de investigación,
   toasts y modales. Hazlo pantalla por pantalla y muéstrame la lista de archivos tocados al
   terminar cada una.
4. En web: cursor pointer en botones, userSelect none en elementos de juego, y respeta
   prefers-reduced-motion en cualquier transición.
5. Catálogo temporal (solo __DEV__): src/app/dev-componentes.js con todas las variantes y
   estados para revisarlas de un vistazo. Bórralo al terminar.
6. Rendimiento: ningún componente nuevo debe re-renderizarse con el tick de 1 s si sus
   props no cambian (React.memo donde corresponda).

Sin cambios de lógica ni de datos.
```

**Verificación:** botones, paneles y barras tienen el mismo lenguaje en todas las pantallas; el texto sigue siendo legible sobre los gradientes.

---

## UI-3 · Animaciones y detalles de juego

```
UI-3: animaciones con Reanimated (front).

Contexto: instala con `npx expo install react-native-reanimated react-native-worklets` (el plugin
de Babel ya viene configurado por babel-preset-expo; no agregues configuración extra salvo que
la documentación de SDK 58 lo pida). En web Reanimated se ejecuta en JavaScript y rinde menos
que en nativo, así que la regla es pocas animaciones, ligeras, y siempre sobre valores
compartidos. El juego tiene un tick de 1 s: prohibido provocar re-renderizados de pantallas
enteras por animar.

Tareas (plan primero):
1. Hook useMovimientoReducido: combina el ajuste del sistema (useReducedMotion de Reanimated, o
   prefers-reduced-motion en web; confirma la API en la documentación) con un interruptor
   "Reducir animaciones" en Ajustes (persistido). Todas las animaciones lo consultan: si está
   activo, cambian de valor sin movimiento.
2. Números que suben: en ResourceChip, la cifra anima de 300 ms al nuevo valor SOLO cuando
   el cambio es notable (por ejemplo, más de 2 % de la capacidad o venir de una acción del
   jugador); los cambios pequeños del tick se muestran directo, sin animar.
3. Textos flotantes "+5 madera": componente efímero (máximo 5 a la vez, pool reutilizable) que
   sube y se desvanece al construir, mejorar, completar una investigación o resolver un
   evento. Con color del recurso.
4. Entradas y salidas: toasts (deslizan y se desvanecen), bottom sheets (resorte suave),
   paneles del árbol y banners de evento y de edad.
5. Nodos del árbol: pulso suave en el nodo "Sugerido" y en los nodos alcanzables; destello
   al completarse; anillo de progreso animado durante una investigación.
6. Celebraciones: al cambiar de edad y al completar una investigación importante, una
   explosión breve de partículas hechas con Views (máximo 24 partículas, 1,2 s, sin
   librerías de confeti).
7. Escena: transición de color del cielo entre estaciones (interpolación de color) y un
   movimiento sutil (nubes lentas, hojas en otoño, nieve en invierno) con un número limitado
   de elementos. La escena no debe re-renderizar los aldeanos cada segundo por esto.
8. Medición: en web y en un teléfono medio, reporta fps durante una animación de edad con
   la escena activa. Si baja de 50 fps, reduce partículas o simplifica antes de continuar.

Nada de animaciones que bloqueen botones ni que oculten información crítica.
```

**Verificación:** con "Reducir animaciones" activo todo funciona sin movimiento; cambiar de edad se siente como un evento, no un parpadeo; la PWA mantiene la fluidez.

---

## UI-4 · Iconos de game-icons.net y Créditos

**Lo que haces tú:** los iconos son CC BY 3.0, así que hay que dar crédito y conviene que tú elijas los que te gusten. Entra a game-icons.net (o su listado en Iconify), busca con las palabras clave del prompt y descarga el SVG de cada uno. Si Copilot puede descargarlos desde la terminal, déjalo; si no, pásalos tú a una carpeta `assets/game-icons/`.

```
UI-4: iconos de videojuego y pantalla de Créditos (front).

Contexto: los iconos de game-icons.net tienen licencia CC BY 3.0 (uso comercial permitido, pero se
debe acreditar al autor original). Los SVG se guardan en el repositorio; nada de pedirlos a una
API en tiempo de ejecución. Se pintan con react-native-svg (instálalo con npx expo install).

Tareas (plan primero):
1. src/data/gameIcons.js: registro { id: { viewBox, paths, autor, urlOrigen } } con los iconos
   que se usen. Un script scripts/importar-icono.mjs que, dado un SVG de game-icons, extraiga
   viewBox y paths y los agregue al registro (sin tocar los demás). Los SVG originales quedan en
   assets/game-icons/ con su nombre original.
2. Componente GameIcon ({ id, size, color }): dibuja el registro con react-native-svg, acepta
   color de tema, y si el id no existe muestra un icono de respaldo y avisa en __DEV__.
3. Iconos para el árbol de investigación y las doctrinas (campo icono de cada nodo del
   catálogo = un id del registro). Palabras clave de búsqueda (en inglés) para elegirlos:
   herramientas (hammer, pickaxe), logística (cart, road), rotación de cultivos (wheat, sprout),
   graneros (barn, grain), metalurgia (anvil, ingot), altos hornos (furnace, forge),
   ventilación (fan, mine), guardia (shield), atalayas (watchtower), hogueras (campfire),
   murallas (brick wall, castle wall), escuela de oficios (graduation, scroll), mentores
   (teacher, book), almanaque (calendar, star chart), planos antiguos (blueprint, map),
   doctrinas (scales, banner). Si falta alguno, propón alternativas y no inventes ids.
2b. Opcional: iconos de edificios y edades con el mismo mecanismo. Deja los iconos de la
   interfaz (pestañas, ajustes, cerrar, volver) con @expo/vector-icons.
3. src/data/creditos.js: fuente única con todo lo que exige atribución (iconos con autor y enlace
   por icono, fuentes con su licencia, librerías relevantes, y más adelante avatares y sonidos).
4. Pantalla Créditos (Ajustes > Créditos): lista por categoría, con un texto introductorio,
   enlaces tocables y una frase tipo "Iconos de game-icons.net, licencia CC BY 3.0. Autores:
   ...". Que sea accesible (títulos, etiquetas, contraste).
5. scripts/verificar-creditos.mjs: falla si hay un icono en gameIcons.js sin autor o sin
   aparecer en creditos.js. Agrégalo al CI si ya existe.
6. Árbol (T3): sustituye los iconos de los nodos por GameIcon, con color por rama y estado
   (apagado si está bloqueado, dorado si está completado).

Sin cambios de lógica.
```

**Verificación:** los nodos del árbol se ven distintos entre sí a simple vista; la pantalla de Créditos lista a los autores y el script de verificación pasa.

---

## UI-5 · Avatares de aldeanos y tema por estación y edad

```
UI-5: avatares y tema dinámico (front).

PARTE A · Avatares
Contexto: DiceBear genera avatares deterministas a partir de una semilla; el diseño del estilo
Pixel Art es CC0 y el núcleo es MIT. Debe funcionar sin internet (usar la librería, NO la API
web). Los nombres de paquete cambiaron entre versiones: sigue la documentación vigente de
DiceBear y dime qué paquetes elegiste. Instala solo el estilo pixel-art (no la colección
completa, para no inflar el bundle).
1. Componente AvatarAldeano ({ aldeano, size }): semilla = _id del aldeano (si no existe, nombre
   + índice), render del SVG con SvgXml de react-native-svg, caché en memoria por semilla (no
   regenerar en cada render ni en cada tick), y respaldo con la inicial del nombre si falla.
2. Úsalo en: tarjeta del aldeano, bottom sheet con "Por qué lo hizo", entradas de la crónica
   ("Llegó Marta") y el toast de llegada de un aldeano.
3. Mide el aporte al bundle (web) y avísame si supera el 5 %.
4. Agrega a src/data/creditos.js la entrada de DiceBear (estilo CC0, código MIT).

PARTE B · Tema por estación y edad
5. Tokens por estación (primavera, verano, otoño, invierno) con: color de acento, par de colores
   del degradado del cielo y tinte del HUD. Punto de partida usando colores que ya existen en
   theme.js: primavera #8ab96d, verano #f5c762, otoño #d57957, invierno #79b9bd.
6. Tinte sutil por edad (Calma sin tinte; Abundancia #e7b85c; Hielo #79b9bd; Ceniza #9b5961;
   Sombras #76629a; Descubrimientos #47728b) aplicado con baja opacidad (≈ 0,08) sobre el HUD
   y el borde de las tarjetas destacadas.
7. Hook useTemaTiempo() que devuelva los colores actuales y se anime entre estaciones con
   interpolateColor de Reanimated (sin re-renderizar pantallas enteras). Aplícalo a: encabezado
   de la pestaña Aldea, HUD, PixelPanel con variante "acento", cielo de la escena.
8. Verifica el contraste AA del texto sobre cada combinación (estación x edad) y corrige
   los casos que fallen.

Sin cambios de lógica.
```

**Verificación:** cada aldeano tiene siempre la misma cara; cambiar de estación tiñe el HUD sin tirones; todas las combinaciones de estación y edad tienen texto legible.

---

## UI-6 · Sonido, ajustes y auditoría final

```
UI-6: sonido y auditoría final (front).

PARTE A · Sonido
Contexto: expo-audio reemplazó a expo-av desde el SDK 55. Sigue la documentación del SDK 58
(reproductores, modo de audio, comportamiento en iOS con el interruptor de silencio). Los
sonidos son de Kenney (paquetes Interface Sounds y UI Audio, licencia CC0, crédito no
obligatorio pero lo agregamos). Los archivos los descargo yo y los dejo en assets/sounds/.
1. src/audio/sfx.js con playSfx(nombre) y un catálogo: clic, construir, mejorar,
   investigación completada, aldeano llega, evento, edad nueva, error. Archivos cortos
   (idealmente menos de 200 ms), pequeños de peso, precargados al inicio.
2. Ajustes: interruptor "Sonido" y control de volumen simple (bajo / medio / alto), persistidos.
   Por defecto sonido activado a volumen bajo. Si el sistema está en silencio, no suena.
3. Web: los navegadores solo reproducen audio tras un gesto del usuario; desbloquea el audio con
   el primer toque y no muestres errores si aún no está permitido.
4. Conecta los sonidos a las acciones ya existentes (PixelButton, toasts, eventos) sin tocar la
   lógica de juego, y con un límite de sonidos simultáneos (por ejemplo 3).
5. Créditos: agrega Kenney a src/data/creditos.js.

PARTE B · Ajustes en un solo lugar
6. Pantalla Ajustes ordenada: Sonido, Vibración (el ajuste de haptics que ya existe), Reducir
   animaciones, Créditos, versión de la app y cerrar sesión con confirmación.

PARTE C · Auditoría de rendimiento y calidad
7. Reporta antes y después de toda la rama ui-fresca: tamaño de dist/ (web), puntaje de
   Lighthouse (Performance y Accessibility) en móvil, y fps en una animación de edad.
8. Si una librería nueva suma más del 15 % del bundle, dime cuál y proponme una alternativa
   antes de dejarla.
9. Elimina dependencias y archivos sin usar (incluye pantallas de prueba de las fases
   anteriores). Ejecuta `npx expo-doctor` y deja el resultado sin advertencias o explica las
   que queden.
10. Auditoría de accesibilidad: contrastes AA, tamaño mínimo de texto de 14 px (salvo etiquetas
    pixel decorativas), áreas táctiles de 44x44, orden de lectura y etiquetas en los componentes
    nuevos, tamaño de letra del sistema al 130 %.
11. Checklist de QA manual (web, Android y iPhone con la PWA): fuentes cargan, animaciones y
    modo reducido, sonido con y sin gesto previo, créditos accesibles, estaciones y edades.
```

**Verificación:** con el sonido apagado todo funciona igual; Lighthouse y el tamaño del bundle quedan registrados como línea base para el despliegue.

---

## Prompt de revisión (al cerrar cada fase)

```
Revisa los cambios de esta fase como un revisor exigente:
1. ¿Se tocó la lógica de juego o la API? (No debería.)
2. ¿Hay colores, tamaños o espaciados escritos a mano fuera de theme.js?
3. ¿Alguna animación se dispara en cada tick de 1 s o re-renderiza pantallas completas?
4. ¿Todo recurso con licencia que exige crédito está en creditos.js y en la pantalla de Créditos?
5. ¿Se instaló alguna librería sin avisar, o sin `npx expo install` cuando corresponde?
6. ¿Qué podría verse o sonar distinto en web, Android o iPhone?
Dame los hallazgos por severidad y propón arreglos sin aplicarlos hasta que yo diga "ok".
```
