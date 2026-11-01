# Diagnostico de UI y arquitectura frontend

Fecha de analisis: 2026-10-30

## 1. Mapa del proyecto

### Estructura relevante

- `src/app/`
  - Raiz de rutas de Expo Router.
  - `src/app/_layout.js`: proveedores globales, barra de estado y `Stack`.
  - `src/app/(tabs)/`: navegacion principal por pestañas.
    - `index.js`: aldea, ciclo, edad, cronica, recursos y escena.
    - `aldeanos.js`: poblacion, filtros, trabajos y decisiones.
    - `construir.js`: catalogo de edificios y construcciones/mejoras.
    - `investigacion.js`: arbol de tecnologias y ficha de investigacion.
    - `ajustes.js`: preferencias, version y cierre de sesion.
    - `_layout.js`: HUD superior, barra inferior, metas, onboarding y eventos globales.
  - `src/app/+html.js`: HTML y fondo inicial para web.
- `src/context/`: contexto global.
  - `GameContext.js`: fachada de acciones y estado derivado del juego.
  - `HapticsContext.js`: preferencia y llamadas de vibracion.
  - `ToastContext.js`: cola visual de mensajes.
- `src/hooks/`
  - `useAldea.js`: carga, tick, guardado online y progreso de la partida.
  - `useAuth.js`: sesion, autenticacion y logout.
  - `useMetas.js`: evaluacion, persistencia local y reclamacion de metas.
- `src/components/`: UI reutilizable.
  - Escena pixel: `PixelVillage.js`, `PixelBuilding.js`, `PixelHouse.js`, `PixelTree.js`, `PixelVillager.js`.
  - Recursos y acciones: `ResourceChip.js`, `CostChips.js`, `BuildingCard.js`, `NodoInvestigacion.js`.
  - Feedback global: `GameFeedback.js`, `OnboardingModal.js`, `InvestigacionBottomSheet.js`, `PanelMetas.js`.
- `src/game/`: logica simulada en frontend.
  - `simulation.js`: ciclo, capacidades, tasas y simulacion activa.
  - `investigacion.js`: costos, niveles y disponibilidad.
  - `tiempo.js`: estaciones, edades y generadores deterministas.
  - `format.js`, `cerebro.js`, `migracionInvestigacion.js`.
- `src/screens/`: `LoginScreen.js` y componentes auxiliares de investigacion.
- `src/metas/metas.js`: catalogo de metas.
- `theme.js`: tokens visuales compartidos.
- Backend relacionado:
  - `AldeaIncrementalBack/src/controllers/villageController.js`: carga y guardado del documento.
  - `AldeaIncrementalBack/src/utils/offlineProgress.js`: simulacion offline.
  - `AldeaIncrementalBack/src/models/Village.js`: persistencia MongoDB.
  - `AldeaIncrementalBack/src/utils/gameSimulation.js`: reglas backend de cada segundo.

### Estado del juego

La fuente principal vive en `useAldea` dentro de `src/hooks/useAldea.js`, cuyo estado `aldea` se distribuye mediante `GameContext`.

#### Tick de 1 segundo

`useAldea` tiene un `setInterval(..., 1000)` cuando existe una aldea cargada. Cada tick ejecuta, en orden:

1. `avanzarCicloActivo`.
2. `actualizarAgentesAutonomos`.
3. `simularProduccionActiva`.
4. Crecimiento de poblacion cuando hay suficientes recursos.
5. Actualizacion del estado completo mediante `setAldea`.

El estado cambia cada segundo, por lo que todo consumidor de `GameContext` recibe una nueva referencia o propiedades derivadas del mismo contexto.

#### Guardado

- Guardado inmediato en acciones como construir, mejorar, investigar, asignar trabajo o reclamar metas.
- Guardado consolidado cada 5 segundos si `hayGuardadoPendiente.current` esta activo.
- `guardar()` intenta PUT tres veces al endpoint `/aldea`, con espera de 1.5 segundos entre reintentos.
- El backend sobrescribe el estado con `$set` en el documento MongoDB y actualiza `ultimoGuardado`.

#### Progreso offline

- Frontend: al abrir `/aldea`, `GameFeedback` recibe `progresoInactivo` y muestra `OfflineModal`.
- La ultima actividad se guarda en `AsyncStorage` bajo `vilai_last_active`.
- Backend: `aplicarProgresoInactivo()` compara `ultimoGuardado` con ahora, limita el intervalo a 8 horas y ejecuta la simulacion por segundo.
- El controlador devuelve recursos ganados, aldea actualizada, `resumenTiempo` y cambios de cronica/edad.

Hay dos representantes de persistencia local en la UI, ambos con `AsyncStorage`: preferencias/onboarding en el layout y estados de metas en `useMetas`.

## 2. Estilo actual

### Tema central

Existe `theme.js` con tokens para fondos, superficies, bordes, texto, acento, estados, recursos, estaciones, espaciado, radios y tipografia.

El sistema ya usa tokens de tema en la mayor parte de las pantallas. El acento predominante es `#e7b85c`, el fondo `#0d1f1a` y las superficies usan verdes oscuros.

### Problemas de organización visual

- `theme.js` contiene tambien decenas de colores pixel llamados `c...`, mezclando semantica y valor hexadecimal. Esto dificulta saber que representa cada color.
- Hay colores hardcodeados fuera del tema. Ejemplos principales:
  - `src/components/PixelBuilding.js`: paletas por edificio y bordes/fondos directos.
  - `src/components/PixelVillager.js`: herramientas, burbuja de pensamiento y colores directos.
  - `src/app/+html.js`: fondo web repetido.
  - Sombras en `ToastContext.js` usan `#000` directamente.
- Cada archivo declara su propio `StyleSheet.create`, incluso para patrones repetidos.
- Existen estilos duplicados entre pantallas:
  - tarjetas con fondo superficie/borde/radio;
  - botones principales dorados;
  - botones deshabilitados con opacidad;
  - filas con icono, copia y accion;
  - indicadores y tracks de progreso;
  - headers, descripciones y titulos secundarios.
- La mayoria de las hojas usa estilos compactados en una sola linea. Son dificiles de revisar visualmente y generan errores de consistencia.
- Se repiten medidas tactiles, aunque varios controles no cumplen consistentemente 44 px.
- Los bottom sheets siguen patrones similares (`InvestigacionBottomSheet.js` y `PanelMetas.js`) pero tienen copias separadas de overlay, handle, header, backdrop y close.
- El proyecto no usa CSS web: todo el estilo es `StyleSheet` de React Native, con pocos valores responsivos y no hay tokens de elevacion ni animacion.

## 3. Rendimiento y rerenderizado por tick

Los siguientes componentes se suscriben al contexto completo y se rerenderizan cuando cambia `GameContext`:

- Pantalla principal `src/app/(tabs)/index.js`.
- Aldeanos `src/app/(tabs)/aldeanos.js`.
- Construir `src/app/(tabs)/construir.js`.
- Investigacion `src/app/(tabs)/investigacion.js`.
- Ajustes `src/app/(tabs)/ajustes.js`.
- Layout `src/app/(tabs)/_layout.js`.
- `GameFeedback.js` y componentes que llamen `useGame`.

Causa principal: cada segundo `setAldea` cambia `aldeaEstado`; `GameContext` reconstruye `valorContexto` y sus consumidores se actualizan. Aunque varias pantallas estan fuera de la pestaña activa, Expo Router puede mantenerlas montadas segun su cache/navegador.

### Riesgos concretos

- El layout recalcula recurso, poblacion, estacion, metas y el objeto enviado a `PanelMetas` en cada tick.
- `GameFeedback` depende de `game.catalogo`, mensaje y valores de aldea, aunque gran parte de sus efectos solo necesita cambios puntuales.
- La pantalla principal recalcula estaciones, capacidades, recursos, cronica y varios bloques de UI en cada tick.
- `ConstruirTab` recalcula entrada por entrada, costes disponibles, ordenamientos y tarjetas aun con recursos que cambian poco.
- `AldeanosTab` usa listas y detalles derivados de toda la aldea; vale separar filas memoizadas y filtrar solo cuando cambian aldeanos.
- `InvestigacionTab` conserva calculos costosos del arbol, efectos y requisitos sobre cambios de cada segundo.
- `PixelVillage` tiene una firma memoizada y por tanto evita algunos rerenders, pero su padre puede seguir renderizando; los arrays por defecto dentro del componente pueden crear work innecesario y al final la escena completa vuelve a reconciliarse al cambiar edificio, aldeano o dia.
- La propia simulacion hace trabajo pesado en el backend offline en bucle por cada segundo, hasta 28,800 iteraciones para 8 horas.
- `useMetas` evalua en intervalos de 1.5 segundos. Es adecuado para evitar trabajo por tick y esta desacoplado, aunque el objeto de aldea y los callbacks deben estabilizarse para evitar intervalos/evaluaciones redundantes.

### Oportunidades prioritarias

1. Separar el contexto en `VillageState`, `GameActions`, catalogo/derivados.
2. Consumir solo el selector necesario en cada pantalla o implementar un hook selector.
3. Memoizar listas y callback/action props, especialmente aldeanos, construcciones y nodos.
4. En el layout, derivar recursos/HUD solo con cambios relevantes y evitar pasar el objeto `game` completo al contexto/UI.
5. Mantener la simulacion en un worker o interval mas amplio solo si la carga activa se demuestra alta, ya que evitar trabajo por cada tick en UI tiene mas impacto primero.

## 4. Librerias disponibles

Segun `package.json`:

- Expo SDK `58`.
- React 19.
- React Native 0.88.
- Expo Router para navegacion.
- `expo-haptics`: vibracion y feedback tactil; esta integrado en `HapticsContext`.
- `@expo/vector-icons`: iconografia MaterialCommunityIcons.
- `@react-native-async-storage/async-storage`: persistencia local para onboarding, preferencias y metas.
- `expo-secure-store`: disponible para datos sensibles.
- `expo-status-bar`: barra de estado.
- `react-native-safe-area-provider`/`safe-area-context`.
- React Native Web y Metro Runtime.
- No hay libreria audio instalada.
- No hay motor grafico ni animacion externa instalado.
- Las animaciones actuales usan el modulo nativo `Animated` de React Native.
- Los bottom sheets/modales usan componentes `Modal`/`Animated` de React Native.

No hay dependencias de Lottie, Reanimated, Rive, Three.js, React Native Skia, Expo AV ni expo-video/audio.

## 5. Diez mejoras de UI por impacto/esfuerzo

Ordenadas por impacto/esfuerzo, de mayor oportunidad a menor.

1. **Separar ritmo visual del valor real de recursos**
   - Mostrar cambios con numeros que suben una vez por segundo, con animacion breve, sin forzar toda la pantalla a animar.
   - Mejorar feedback de ganancia/pérdida y capacidad casi llena.
   - Archivos: `src/app/(tabs)/_layout.js`, `src/components/ResourceChip.js`, `src/context/GameFeedback.js`.

2. **Pulsear y dar brillo al edificio/aldeano que cambia**
   - Construcciones nuevas, mejoras, llegada de aldeanos y eventos deben generar una animacion breve en la escena.
   - Archivos: `src/components/PixelVillage.js`, `PixelBuilding.js`, `PixelVillager.js`, `index.js`.

3. **Reducir y acotar burbujas de accion/contexto**
   - Sustituir mensajes generales por toasts con accion (`Construir`, `Abrir`, `Reintentar`) y limitar la escena a eventos relevantes.
   - Archivos: `src/context/ToastContext.js`, `src/components/GameFeedback.js`, `src/app/(tabs)/_layout.js`.

4. **Unificar tarjetas, botones y filas del sistema visual**
   - Crear componentes reutilizables para tarjeta, accion primaria, fila y estado de recurso.
   - Archivos nuevos: `src/components/ui/Card.js`, `PrimaryButton.js`, `SectionHeader.js`; integrar en pantallas actuales y en metas/sheets.

5. **Etiquetas y badges en navegacion por estado**
   - Poblacion, construcciones disponibles, alertas e investigaciones tendran indicadores puntuales sin saturar.
   - Archivos: `src/app/(tabs)/_layout.js`, `index.js`, `construir.js`, `investigacion.js`.

6. **Vista de progreso de ciclo mas legible**
   - Mostrar estacion con icono, barra, tiempo y dos o tres microefectos; evitar recalcular con textos dispersos.
   - Archivos: `src/app/(tabs)/index.js`, `src/game/tiempo.js`, componentes UI nuevos.

7. **Bottom sheets consistentes y tactiles**
   - Extraer un `AppBottomSheet` comun con handle, overlay, header y zonas de cierre de 44 px.
   - Archivos: `src/components/InvestigacionBottomSheet.js`, `PanelMetas.js`, nuevo `AppBottomSheet.js`.

8. **Offline summary con visualizacion de impacto**
   - En lugar de solo texto, mostrar recursos ganados con iconos y barras compactas; diferencias de edad/cronica antes.
   - Archivos: `src/components/GameFeedback.js`, `src/components/ResourceChip.js`, posiblemente nuevos componentes.

9. **Estados vacios y casi disponibles mas orientados a accion**
   - En construir/aldenos/investigacion, explicar que falta, cuanto falta y la ruta para conseguirlo.
   - Archivos: `construir.js`, `aldeanos.js`, `investigacion.js`, `CostChips.js`, `NodoInvestigacion.js`.

10. **Tokens pixel, motion y accesibilidad**
    - Crear nombres semanticos para colores pixel, duraciones y easing; reducir animacion cuando el sistema lo pida.
    - Archivos: `theme.js`, `src/components/PixelVillage.js`, `PixelBuilding.js`, `PixelVillager.js`, `PanelMetas.js`.
