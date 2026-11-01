# Plan: escena visual de la aldea

## 1. Alcance y principio rector

Implementar en la pestaña `Aldea` una sola escena de dibujo que solo observe el estado de simulación.

- La simulación continúa siendo propietaria de `posicion`, `destino`, `estadoVida`, `accion`, `carga`, necesidades y emotes.
- La vista no cambia aldeanos, destinos, decisiones, recursos ni edificios.
- No se añadirá lógica autónoma ni posiciones simuladas dentro de React.
- Se leerá hasta el máximo de 30 aldeanos individuales. Los extras agregados no tendrán sprites.
- La UI conservará elementos React Native (controles, acceso a ajustes y sheets); el mapa, terreno, edificios, criaturas, emotes y partículas compartirán una sola superficie de dibujo.

## 2. Comparativa del motor visual

### Shopify React Native Skia

**Ventajas**

- Una única capa `Canvas` puede dibujar mapa, edificios, 30 aldeanos, efectos y partículas.
- Permite atlas/imágenes, recortes, transforms, tintes, filtros nearest-neighbor y una sola pintura por frame.
- Puede leer valores compartidos sin montar 30 Views animadas.
- CanvasKit proporciona una ruta web compatible con React Native Web.
- Se integra bien con Reanimated para cámara y gestos.

**Costes y riesgos**

- Añade un módulo nativo y CanvasKit para web.
- Requiere desarrollo/compilación nativa; no queda garantizada por Expo Go.
- Hay que validar compatibilidad exacta de Expo SDK 58 y React Native 0.88 con `expo install`.
- Requiere soporte explícito de carga/resolución de CanvasKit en web.

### Reanimated con sprites en Views

**Ventajas**

- Ya está instalado y funcionará en Expo Go.
- Hay componentes pixel art existentes reutilizables.
- El trabajo con eventos React Native e interfaces convencionales es sencillo.

**Costes y riesgos**

- 30 aldeanos producen al menos 30 nodos animados, además de edificios, partículas y overlays.
- Cada shared value o nodo añade trabajo del árbol y favorece layouts y re-renders.
- No hay una única capa de dibujo; el mapa y los sprites siguen siendo cajas RN independientes.
- Mezclar sprites de gran cantidad con `ScrollView`, `Animated` y Reanimated complica el clip, zoom y ordenamiento.

### Decisión recomendada

**Usar `@shopify/react-native-skia` como motor de la escena.**

Mantener Reanimated para shared values y gestos de cámara, porque Skia ya dibuja a partir de valores compartidos. No continuar el enfoque actual de vistas individuales. Antes de instalar se probará la versión compatible mediante la herramienta de Expo, no fijando una versión manual; también se ejecutará la exportación web.

Fallback operativo: si Expo SDK 58 o React Native Web impide una build estable, no degradar automáticamente a 30 Views. Se detendrá la integración de nuevas dependencias y se resolverá primero compatibilidad/build. Este proyecto no debe terminar con dos motores visuales activos simultáneamente.

## 3. Arquitectura

```text
src/
  simulacion/
    decidir.js
    simularAldeanos.js
    villagerStore.js       # posiciones y estado mutable; no se modifica visualmente
  components/
    scene/
      EscenaAldeaSkia.js   # Canvas único y conexión de lectura al store
      atlasEscena.js       # bitmaps procedurales e imágenes precalculadas
      mundoIsometrico.js   # baldosas, profundidad y coordenadas de escena
      spritesAldeano.js    # dibujo y selección de frames
      spritesEdificio.js   # variantes por tipo y nivel
      spritesEmote.js      # emotes pixel art
      particulasEscena.js  # nieve, hojas, polvo y explosión
      cameraGestures.js    # arrastre, zoom y doble toque
  hooks/
    useEscenaAldea.js      # suscripción temporal sin setState por frame
    usePreferenciasEscena.js
  app/(tabs)/
    index.js               # monta la escena
    ajustes.js             # ahorro de batería y partículas
```

### Flujo de datos

```text
useAldea
  +-- aldea.edificios ----------+
  +-- aldea.ciclo/estacion ------+
  +-- aldea.aldeanos (persistido)-+
                                  +--> EscenaAldeaSkia
                                          |
villagerStore.subscribe -----------------------+
                                          |
                                          v
                                   redraw de Skia
                                          |
                                  sin setState React por frame
```

La escena podrá usar snapshots memorizados para terrenos y edificios. Los cambios de aldeanos se leerán directamente desde el store mutable. Las suscripciones activarán pintura; solo React medirá cambios estructurales de edificios, población o preferencias, no cada movimiento.

## 4. Mapa, terreno y edificios

- Mundo lógico con baldosas cuadradas y coordenadas consistentes con `pathfinding.js`.
- Variantes visuales procedurales: pasto, tierra, agua y bosque.
- Terreno estático en un bitmap o atlas separado para evitar redibujar tiles sin cambios.
- Edificios se dibujarán por `tipoId`, posición persistida, nivel y estado `completo`.
- Los cambios de nivel tendrán variantes procedurales: silueta y detalles.
- El HUD, hojas de edificios y acciones seguirán siendo componentes RN fuera del Canvas; el Canvas no abrirá ni mutará datos de juego.
- Mantener claves visuales estables derivadas de `_id`, con fallback a `tipoId:x:y`.

## 5. Aldeanos procedurales y animación

### Atlas y sprites

- Dibujar cada variante de sprite una vez en un atlas de texturas de tamaño potencia de dos.
- Tamaño lógico 8x8 a 16x16, escalado entero para preservación del pixel art.
- Usar filtro nearest-neighbor en móvil y web.
- El esquema de color dependerá de profesión; piel y pelo variarán por identidad estable.
- Cuatro piezas mínimas: pelo/cabeza, piel, cuerpo, ropa/accesorio. Herramientas y carga pueden ser frames independientes.

### Estados derivados de la simulación

| Estado simulado | Presentación |
|---|---|
| caminar / destino activo | 2-4 frames de piernas y desplazamiento |
| vagar / idle | respiración mínima |
| descansar | sprite tumbado o sentado |
| trabajar | hacha, cosecha o pico según profesión |
| llevar_recurso | carga visible sobre la cabeza |
| comer | animación breve y emote de comida |
| socializar | giro hacia vecino y emote de conversación |
| huir | caminar rápido con orientación contraria |
| noche/descanso | dormir |

El frame se elegirá a partir del estado y un reloj visual local; la escena nunca escribe esos campos en el store. La dirección horizontal se obtendrá de `destino - posicion` o de su último vector.

## 6. Emotes

Crear imágenes procedurales de 16x16 bits con una paleta limitada y outline pixelado. No usar emoji de sistema.

- Hambre: manzana.
- Cansancio: sueño.
- Conversación: burbuja/dialogo.
- Contento: corazón.
- Peligro: señal de exclamación.
- Emotes nacen del campo `emote` y de necesidades críticas.
- Se calcularán en vivo: fade-in, subida breve y fade-out.
- Cada emote tendrá alpha y altura en tablas precalculadas; no se instanciará texto por frame.

## 7. Entradas, obra y efectos

- Detectar nuevos aldeanos comparando IDs persistentes en una firma visual efímera.
- Entrarán desde el borde derecho o izquierdo caminando hacia su posición inicial; la ruta se genera solo visualmente y debe seguir al mapa.
- Construcción/modificación:
  - detectar aparición o cambio de nivel;
  - mostrar andamio, polvo y sprite incompleto por 1.5-2 s;
  - terminar con una ráfaga breve de partículas.
- Estos eventos serán locales al componente visual. No modificarán `progreso`, `completo`, cronica ni recursos.
- Mantener un pool pequeño de partículas y reciclar objetos; no crear objetos por frame.

## 8. Cámara y gestos

- Una superficie Skia con transformación de escena única por shared values.
- Arrastrar un dedo: actualizar pan.
- Pellizco: calcular el zoom alrededor del punto central del gesto, con límites definidos.
- Doble toque: animar a la posición central.
- Limitar pan al rectángulo del mapa.
- Los gestos deben traducir coordenadas de viewport a mundo y escalar hit targets de edificios.
- En web, soporte con gestos touch equivalentes y rueda del ratón opcional como zoom.

## 9. Día/noche, estaciones y batería

- Un overlay de noche se dibujará sobre el atlas/render final con alpha y color uniforme.
- Edificios encendidos recibirán pequeños rectángulos de luz cálida.
- Primavera/verano/otoño/invierno controlarán paleta de terreno y partículas:
  - nieve,
  - hojas,
  - polvo/polen o lluvia ligera,
  - selección de densidad.
- El interruptor de ahorro de batería vive en `ajustes.js` y se persiste con la preferencia de escena.
- Con ahorro activo:
  - 15 FPS de escena, frecuencia reducida de partículas;
  - sin bloom ni overlays redundantes;
  - idle de alta calidad solo en una criatura a la vez;
  - interacción y dibujo del estado actual permanecen activos.

## 10. Performance y orden de dibujado

1. Atlas estático de terreno.
2. Agua y decoraciones inferiores.
3. Edificios ordenados por coordenada Y.
4. Aldeanos y objetos ordenados por posición Y.
5. Emotes y carga sobre la cabeza.
6. Efectos nocturnos y partículas.

- Buffer de `Paint`, `Image`, `Skia.Path` y collares de sprite reutilizable.
- No construir objetos, arrays ni colores dentro del callback principal de 60 FPS.
- 30 aldeanos individuales, máximo; extras serán agregados y no visibles.
- Usar culling por viewport antes de dibujar.
- Dibujar una vez el terreno/atlas estático; recomponer solo cuando cambien estación, tamaño o mapa.
- Objetivo móvil: 60 FPS en gama media con escalado/render normal; ahorro pasa a 15/30 FPS.
- La simulación sigue con su propio loop de 100 ms y los recursos siguen con tick de 1 segundo.

## 11. Archivos a modificar o crear

### Reemplazar

- `src/components/PixelVillage.js`: transformarlo en contenedor fino o reemplazarlo por la escena Skia.
- `src/components/PixelVillager.js`: conservar para el listado de aldeanos, no usar en el Canvas.
- `src/hooks/useMovimientoAldeanos.js`: reemplazar por adaptadores visuales sin duplicar movimiento de simulación.
- `src/app/(tabs)/index.js`: pasar al scene shell, resolviendo y consumiendo datos ya existentes.

### Crear

- `src/components/scene/EscenaAldeaSkia.js`
- `src/components/scene/atlasEscena.js`
- `src/components/scene/spritesAldeano.js`
- `src/components/scene/spritesEdificio.js`
- `src/components/scene/spritesEmote.js`
- `src/components/scene/particulasEscena.js`
- `src/components/scene/gestosCamara.js`
- `src/hooks/useEscenaAldea.js`

### Ajustes

- Revisar `src/app/(tabs)/ajustes.js` y `src/hooks/usePreferenciasEscena.js` para añadir ahorro y densidad visual sin persistir datos de la aldea.

## 12. Dependencias y validación

Instalar con Expo, tras validar el plan:

```text
npx expo install @shopify/react-native-skia
```

Comprobaciones:

1. Lint y typecheck.
2. `npx expo export --platform web`.
3. Prueba Android: 30 aldeanos, pan, zoom, doble toque y emotes.
4. Prueba web: CanvasKit carga, gesto equivalente y nearest-neighbor.
5. Medición de frames con ahorro desactivado y activo.

## 13. Criterios de aceptación

- Ningún módulo visual importa funciones de decisión o modifica el store de simulación.
- Hasta 30 aldeanos individualizados usan `posicion` real sin re-renders.
- Terreno, edificio y criaturas se dibujan dentro de una única superficie.
- El sprite refleja profesión, estado, dirección, carga y emote.
- Cámara con límites, zoom, doble toque y entrada/salida de nuevos aldeanos.
- Día/noche y estaciones se muestran sin persistencia visual.
- Modo ahorro funcional.
- No hay errores de compatibilidad Expo/web y no hay regresiones en los tests de la simulación.

## 14. Estado de aprobación

Este documento reemplaza el plan anterior. La implementación visual queda bloqueada hasta la aprobación del usuario.
