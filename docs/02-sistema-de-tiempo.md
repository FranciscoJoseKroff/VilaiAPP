# Vilai · Sistema de tiempo: años, estaciones y edades (inspirado en WorldBox)

Guía de prompts por fases para Copilot. Cada fase toca **back y front** (dos proyectos) y se prueba por separado.

## Idea general

| Capa | Duración | Qué hace |
|---|---|---|
| **Año** | 180 s (igual que el ciclo actual de 120 s día + 60 s noche) | Reemplaza al "Día N" como unidad de tiempo |
| **Estación** | 40 / 40 / 40 / 60 s | Primavera, verano, otoño, invierno: pequeños modificadores y mirada distinta de la escena |
| **Edad** | 6-14 años (≈ 18-42 min de juego) | Eras largas que ayudan y perjudican (Calma, Abundancia, Hielo, Ceniza, Sombras, Descubrimientos) |

Decisiones de diseño que conviene no cambiar a mitad de camino:

- El **invierno ocupa el lugar de la noche actual** (segundos 120-180) y el evento anual sigue apareciendo en el segundo 120. Así la economía queda casi idéntica a la de hoy.
- **No se renombra `ciclo.dia` en la base de datos**: ahora significa "año". Si se renombrara, las aldeas guardadas quedarían huérfanas (Mongoose descarta campos que no están en el esquema).
- **Nada de `Math.random()` en la simulación.** Front y back simulan lo mismo (el back lo hace en el progreso offline), así que el azar debe ser **determinista**: una semilla (`_id` de la aldea) + una clave dan siempre el mismo resultado en los dos lados.
- Los cambios en la API son **aditivos**: no se quitan `segundosDia` ni `segundosNoche` del catálogo, ni se cambia el formato de `progresoInactivo` (el front hoy lo usa como mapa de recursos).

## Antes de empezar (tú, a mano)

1. En Atlas, cambia la contraseña del usuario de la base de datos. El `.env.example` del back tenía una conexión real; lo dejamos limpio en la Fase 0, pero la contraseña vieja hay que invalidarla.
2. Crea una rama en **cada repo**: `git checkout -b tiempo-anios`.
3. Haz un commit por fase, en cada repo.
4. **Actualiza `.github/copilot-instructions.md`** del front (y el del back, si lo tienes). La regla vieja decía "No cambies la lógica de juego", y estas fases sí tocan la lógica del tiempo. Reemplaza esa línea por:

```markdown
- La lógica de juego no se toca, salvo la lógica de tiempo (ciclo, años, estaciones, edades)
  cuando la fase lo indique. Producción base, costos, población y contrato de la API no cambian.
- La lógica de tiempo debe ser idéntica en front y back (misma fórmula). Prohibido Math.random()
  en la simulación: usa el generador determinista de tiempo.js.
- Los cambios de API son aditivos; no quites campos existentes del catálogo ni cambies el
  formato de progresoInactivo.
- No renombres campos del esquema de Mongoose (ciclo.dia pasa a significar "año").
```

## Calendario sugerido (≈ 4-5 semanas)

| Semana | Fases |
|---|---|
| 1 | Fase 0 (limpieza) + Fase 1 (módulo de tiempo) |
| 2 | Fase 2 (catálogo y datos) + Fase 3 (UI de años y estaciones) |
| 3 | Fase 4 (efectos de estación) + Fase 5 (edades) |
| 4 | Fase 6 (eventos) + Fase 7 (crónica y offline) |
| 5 | Fase 8 (edades en la IA, **después** del paso 2 de la IA) + Fase 9 (modo demo y pulido) |

---

## Fase 0 · Limpieza y línea base

**Objetivo:** partir sin código muerto, sin secretos y con los tests en verde.

```
FASE 0: limpieza y línea base (front y back).

FRONT (AldeaIncrementalFront):
1. App.js, index.js y src/screens/AldeaScreen.js ya no se usan (package.json tiene
   "main": "expo-router/entry"). Antes de borrarlos, demuestra con búsquedas que nada los
   importa desde src/app/ ni desde el resto de src/. Si es así, bórralos.
2. Elimina las carpetas dist/, dist-phase1/, dist-phase2/, dist-phase3/ y agrega
   dist*/ y .expo/ al .gitignore.

BACK (AldeaIncrementalBack):
3. Elimina la carpeta .expo/ (no corresponde al back) y agrégala al .gitignore.
4. En .env.example reemplaza MONGODB_URI por un placeholder del estilo
   mongodb+srv://usuario:password@cluster.mongodb.net/aldea_incremental.
   No imprimas ni copies en tu respuesta el valor anterior.
5. Ejecuta `node test-logic.js` y dime si pasa. Si falla, NO lo arregles todavía:
   muéstrame el error y espera mi decisión.

No toques nada más. Al terminar, dime cómo comprobar que la app sigue arrancando
(`npx expo start --web`) y que el back sigue levantando (`npm run dev`).
```

**Verificación:** el front arranca igual; `node test-logic.js` pasa (o sabes por qué falla); `.env.example` solo tiene placeholders.

---

## Fase 1 · Módulo de tiempo compartido (sin cambios visibles)

**Objetivo:** un solo lugar con la lógica de años y estaciones, igual en front y back, y demostrar que no cambió el comportamiento.

```
FASE 1: módulo de tiempo (sin cambios visibles para el jugador).

Contexto: hoy el ciclo vive en dos copias que deben mantenerse iguales:
- Back: avanzarCiclo() en src/utils/gameSimulation.js, con SEGUNDOS_DIA=120 y
  SEGUNDOS_NOCHE=60 de src/utils/villageDefaults.js.
- Front: avanzarCicloActivo() en src/game/simulation.js, que lee catalogo.segundosDia
  y catalogo.segundosNoche.
El evento nocturno se genera al cruzar el segundo 120 y elige
['bestias','helada','recaudador'][(ciclo.dia - 1) % 3]. Esa lógica NO debe cambiar ahora.

Tareas:
1. Crea un módulo puro de tiempo con lógica idéntica en ambos proyectos:
   - Back: src/utils/tiempo.js (CommonJS).
   - Front: src/game/tiempo.js (ESM).
   Mismo código salvo la sintaxis de módulos. Contenido:
   - ANIO_SEGUNDOS = 180.
   - ESTACIONES (solo tiempos por ahora): primavera 0-40, verano 40-80, otoño 80-120,
     invierno 120-180.
   - estacionEn(segundos) -> { id, indice, segundosEnEstacion, duracion, restante }.
   - esInvierno(segundos) (equivale al "esNoche" actual).
   - avanzarTiempo(ciclo, duracion) -> nuevo ciclo { segundos, dia } y un objeto
     { cruzoEstacion, cruzoInvierno, cruzoAnio } para usarlo después.
     Aquí "dia" significa AÑO (no renombres el campo).
2. Reemplaza el avance interno de avanzarCiclo (back) y avanzarCicloActivo (front) por
   avanzarTiempo, conservando exactamente el mismo comportamiento y el mismo evento a los
   120 s. Sustituye los usos de "esNoche >= segundosDia" por esInvierno() en la producción
   (multiplicador 0.8), en la IA de guardias y en agentBrain.js, que hoy tiene el 120 fijo.
3. Pruebas en el back (test-logic.js o un archivo nuevo):
   a. Golden test: copia la función antigua como "referencia legada" dentro del test y
      compara ciclo y eventoNocturno contra la nueva durante 100.000 pasos de 1 s y de 0,5 s.
   b. 180 pasos de 1 s = 1 año exacto; estacionEn(0), (39), (40), (120), (179) devuelven lo esperado.
4. Crea fixtures/tiempo-vectores.json en el back con casos (segundos -> estación) y
   copia ese JSON al front junto a un script scripts/verificar-paridad.mjs que importe
   src/game/tiempo.js y compruebe los mismos casos.

No cambies textos, pantallas ni economía. Entrega la lista de archivos tocados y los
resultados de las pruebas.
```

**Verificación:** los tests pasan; jugar 5 minutos se siente idéntico; el evento sigue apareciendo a los 120 s.

---

## Fase 2 · Catálogo y modelo de datos

**Objetivo:** que estaciones y edades vivan en el catálogo y en el esquema, sin efectos todavía.

```
FASE 2: catálogo y modelo de datos (sin efectos de juego todavía).

BACK:
1. En src/utils/villageDefaults.js agrega estas constantes y expórtalas:

ESTACIONES = {
  primavera: { nombre: 'Primavera', inicio: 0,   duracion: 40, generacion: 1.00, recursos: { comida: 1.10 }, icono: 'flower' },
  verano:    { nombre: 'Verano',    inicio: 40,  duracion: 40, generacion: 1.05, recursos: { madera: 1.10 }, icono: 'white-balance-sunny' },
  otono:     { nombre: 'Otoño',     inicio: 80,  duracion: 40, generacion: 1.00, recursos: { comida: 1.15, trigo: 1.15 }, icono: 'leaf' },
  invierno:  { nombre: 'Invierno',  inicio: 120, duracion: 60, generacion: 0.80, recursos: { comida: 0.90 }, icono: 'snowflake' },
}

EDADES = {
  calma:           { nombre: 'Edad de la Calma',          duracionAnios: [8, 14], pesoSeleccion: 2, generacion: 1,    recursos: {},                                  danoEventos: 1,   guardiaEficacia: 1, pesosEventos: { bestias: 1,   helada: 1,   recaudador: 1 },   icono: 'weather-partly-cloudy', descripcion: 'Tiempos tranquilos. Nada cambia.' },
  abundancia:      { nombre: 'Edad de la Abundancia',     duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 1,    recursos: { comida: 1.2, trigo: 1.2 },         danoEventos: 0.8, guardiaEficacia: 1, pesosEventos: { bestias: 0.5, helada: 0.5, recaudador: 2 },   icono: 'basket',               descripcion: 'Las cosechas rinden más, pero atraes a los recaudadores.' },
  hielo:           { nombre: 'Edad del Hielo',            duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 1,    recursos: { comida: 0.85, madera: 0.9 },       danoEventos: 1,   guardiaEficacia: 1, pesosEventos: { bestias: 0.5, helada: 3,   recaudador: 0.5 }, icono: 'snowflake-variant',    descripcion: 'Heladas frecuentes y cosechas escasas.' },
  ceniza:          { nombre: 'Edad de la Ceniza',         duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 1,    recursos: { madera: 0.8, hierro: 1.25 },       danoEventos: 1.3, guardiaEficacia: 1, pesosEventos: { bestias: 1,   helada: 0.5, recaudador: 1.5 }, icono: 'volcano',              descripcion: 'La tierra arde: menos madera, más hierro y más daño.' },
  sombras:         { nombre: 'Edad de las Sombras',       duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 0.95, recursos: {},                                  danoEventos: 1,   guardiaEficacia: 2, pesosEventos: { bestias: 3,   helada: 0.5, recaudador: 1 },   icono: 'weather-night',        descripcion: 'Más bestias, pero los guardias valen el doble.' },
  descubrimientos: { nombre: 'Edad de los Descubrimientos', duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 1,  recursos: { hierro: 1.2, oro: 1.3, comida: 0.95 }, danoEventos: 1, guardiaEficacia: 1, pesosEventos: { bestias: 1,   helada: 1,   recaudador: 1 },   icono: 'telescope',            descripcion: 'Más hierro y oro, a costa de algo de comida.' },
}

2. src/controllers/catalogController.js: agrega estaciones: ESTACIONES, edades: EDADES y
   anioSegundos: 180 a la respuesta de GET /api/catalogo. NO quites segundosDia ni segundosNoche.
3. src/models/Village.js: agrega al aldeaSchema (sin tocar ciclo ni eventoNocturno):
   - edad: { id: String (enum con las claves de EDADES, default 'calma'), numero: Number
     (default 1), inicioAnio: Number (default 1), duracionAnios: Number (default 10) }
   - cronica: [{ anio: Number, tipo: String, texto: String }]  (se limitará a 50 entradas)
4. Crea src/utils/migracionTiempo.js con asegurarEdad(aldea): si la aldea no tiene edad
   válida, le asigna { id: 'calma', numero: 1, inicioAnio: ciclo.dia, duracionAnios: 10 }.
   Debe ser idempotente. Llámala en obtenerAldea (villageController.js) antes de guardar.
5. Helper registrarCronica(aldea, { anio, tipo, texto }) que agrega la entrada y recorta a las
   últimas 50.
6. Tests: guardar y leer una aldea con edad y cronica (el PUT no debe perderlas), migración
   idempotente sobre una aldea antigua sin esos campos.

FRONT:
7. Nada de lógica todavía. Solo asegúrate de que GameContext/useAldea conservan aldea.edad y
   aldea.cronica al guardar (no los filtran) y que el catálogo nuevo se lee sin romper nada.
```

**Verificación:** guardas, recargas y `aldea.edad` sigue ahí; tu aldea antigua (año 356) abre sin errores.

---

## Fase 3 · UI de años y estaciones

**Objetivo:** que el jugador vea el tiempo como años y estaciones.

```
FASE 3: interfaz de años y estaciones (front).

Contexto: el panel del ciclo está en src/app/(tabs)/index.js y hoy dice "Noche · Día 356 /
Quedan 23.97599999999997s". PixelVillage.js recibe la prop `noche` y muestra "DÍA N".

Tareas:
1. Usa estacionEn() de src/game/tiempo.js. Reemplaza el panel por:
   - Icono de la estación (del catálogo) y título "Primavera · Año 356".
   - Barra de progreso de la estación y, debajo, una barra de 4 segmentos para el año
     (el segmento actual se rellena).
   - Texto "Quedan 23 s" usando Math.ceil: nunca decimales largos.
   - Aviso de color cuando faltan < 15 s para el invierno (antes: aviso previo a la noche).
2. PixelVillage: reemplaza la prop `noche` por `estacion` (id). Paleta del cielo y del suelo por
   estación: primavera verde claro, verano cielo azul y sol, otoño tonos naranjas con
   hojas cayendo, invierno cielo oscuro azulado con nieve (pocas Views animadas, que
   no bajen el rendimiento). El rótulo "DÍA N" pasa a "AÑO N". Revisa el React.memo
   (compara ciclo.dia y la estación).
3. Cambia textos: "Día" -> "Año" donde corresponda (toasts, GameFeedback, modal offline).
   Quita el "Día · Día" duplicado.
4. En el HUD superior no agregues más chips; muestra el año en el panel de la pestaña Aldea.
5. Corrige de paso: fondo oscuro en el contenedor raíz de la web (hoy hay franjas blancas a los
   lados de la columna central) y que la escena pixel art ocupe todo el ancho de la columna.

Reglas: tokens de theme.js (colores de estación como tokens nuevos), mínimo 14 px de
fuente, accessibilityLabel en los iconos, sin tocar la lógica de juego.
```

**Verificación:** ves "Primavera · Año 356", la escena cambia de estación a estación, no hay decimales largos, no hay franjas blancas en la web.

---

## Fase 4 · Efectos de las estaciones en la economía

**Objetivo:** que las estaciones importen, sin desbalancear el juego.

```
FASE 4: efectos de estación en la producción (back y front con fórmula idéntica).

Contexto: hoy el multiplicador general incluye `(esNoche ? 0.8 : 1)`. Las estaciones del
catálogo traen { generacion, recursos: { <recurso>: factor } }.

Tareas:
1. En tiempo.js agrega multiplicadoresDeEstacion(estacionId, catalogoEstaciones)
   -> { general, recursos }. Úsalo en simularSegundo (back) y simularProduccionActiva (front):
   - Sustituye el factor `(esNoche ? 0.8 : 1)` por el `generacion` de la estación
     (invierno = 0.8, así que el invierno sigue idéntico a la noche de hoy).
   - Aplica los factores por recurso solo a las tasas de generación primaria
     (tasasGeneracion + aportes de leñadores/agricultores) y a la salida de la mina. Las
     recetas (molino, horno) usan solo el factor general.
2. Las dos implementaciones deben dar el mismo resultado: agrega a
   fixtures/tiempo-vectores.json casos de recursos tras N segundos desde un estado inicial,
   verificados con test-logic.js (back) y scripts/verificar-paridad.mjs (front).
3. Script scripts/balance-ciclo.js (back): simula 1 año completo con una aldea de ejemplo y
   compara el total producido por recurso con el sistema antiguo (esNoche 0.8). Imprime la
   diferencia porcentual. Objetivo: que ningún recurso se desvíe más de ±4 %. Si algo se
   pasa, propón ajustes de los factores y no los apliques sin mi "ok".
4. Muestra la estación y su efecto en la UI de forma mínima: en la tarjeta de recurso, un
   pequeño indicador "▲ por la estación" o "▼ por la estación" cuando el factor ≠ 1.
```

**Verificación:** el reporte de balance está dentro de ±4 %; en verano la madera sube un poco; en invierno la comida baja.

---

## Fase 5 · Motor de edades

**Objetivo:** edades largas con inicio, duración y cambios decididos de forma determinista.

```
FASE 5: motor de edades (back y front idénticos).

Reglas:
- Prohibido Math.random(). Crea en tiempo.js un generador determinista:
  semillaDe(texto) (hash de cadena a entero) y aleatorio(semilla, clave) -> número en [0, 1)
  (por ejemplo, mulberry32 sobre hash(semilla + clave)). Misma entrada = misma salida
  en back y front.
- La semilla de una aldea es String(aldea._id ?? aldea.id ?? 'aldea').

Tareas:
1. En tiempo.js agrega:
   - elegirSiguienteEdad(semilla, numero, edadActualId, EDADES): elige al azar determinista
     según pesoSeleccion, sin repetir la edad actual.
   - duracionDeEdad(semilla, numero, edad): entero dentro de duracionAnios.
   - avanzarEdad(aldea, EDADES): si ciclo.dia >= edad.inicioAnio + edad.duracionAnios,
     pasa a la siguiente edad (numero + 1, inicioAnio = ciclo.dia) y devuelve
     { cambio: true, de, a }. Llama a registrarCronica con tipo 'edad' y un texto del estilo
     "Comienza la Edad del Hielo".
   Llama a avanzarEdad cuando avanzarTiempo cruce un año (cruzoAnio).
2. Aplica los modificadores de edad a la producción: edad.generacion se multiplica con el
   factor general, y edad.recursos con los factores por recurso (misma fórmula en back y
   front, y encadenada con las estaciones de la Fase 4).
3. src/utils/offlineProgress.js hoy solo copia recursos, ciclo y eventoNocturno al documento.
   Haz que también copie edad y cronica, de modo que las edades que ocurren en el offline
   (tope 8 h = 160 años) queden guardadas.
4. Tests:
   a. Determinismo: mismos (semilla, numero) -> misma edad y duración, 1000 veces.
   b. Vectores de paridad: añade a fixtures/tiempo-vectores.json 20 casos
      (semilla, numero) -> (edad, duración); el front los verifica con
      scripts/verificar-paridad.mjs.
   c. Simula 8 h offline (28.800 s) y comprueba que el año final es el esperado y que
      aldea.edad refleja las transiciones y que cronica no supera 50 entradas.
5. Muestra la edad en la pestaña Aldea: tarjeta con icono, nombre, descripción, efectos
   resumidos (ej. "Comida +20 %") y "Quedan N años".
```

**Verificación:** misma aldea, mismas edades en front y back; en un progreso offline largo cambias de edad y queda guardado.

---

## Fase 6 · Eventos por estación y por edad

**Objetivo:** eventos que tengan sentido narrativo y avisos al cambiar de edad.

```
FASE 6: eventos anuales y avisos.

Contexto: el evento hoy se elige con (dia - 1) % 3 y se genera al cruzar el segundo 120.
Su resolución ocurre solo en el front (resolverEventoNocturno en GameContext.js).

Tareas:
1. El evento sigue generándose al entrar en invierno (segundo 120), pero el tipo se elige por
   pesos: edad.pesosEventos con aleatorio(semilla, 'evento:' + año). Misma lógica
   en back (gameSimulation.js, que hoy tiene la lista ['bestias','helada','recaudador']
   fija) y en front.
2. En resolverEventoNocturno aplica edad.danoEventos al daño de los edificios y
   edad.guardiaEficacia al aporte de los guardias en la reducción de daño. No cambies
   costos de defensa.
3. Cuando cambie la edad, muestra un banner/toast destacado (GameFeedback.js) con el
   icono y la descripción de la nueva edad, y una vibración media. Cuando empiece el
   invierno y exista un evento, el banner del evento sigue como hoy.
4. Cuando cambie la estación, un toast breve ("Llega el otoño: la cosecha rinde más").
5. Pruebas: 10.000 años simulados con distintas semillas y edades: la frecuencia de cada
   evento debe acercarse a la proporción de pesos (tolerancia ±5 %).
6. Textos amables en la UI: eventos "de invierno" y "de la edad", sin identificadores
   internos (aprovecha de pasar "planosAntiguos" a "Planos antiguos" donde se muestre
   "Requiere: ...").
```

**Verificación:** en la Edad del Hielo ves heladas casi cada año; en la Edad de las Sombras, bestias; al cambiar de edad aparece el aviso.

---

## Fase 7 · Crónica de la aldea y resumen offline en años

**Objetivo:** que la aldea tenga historia visible. Además alimenta la narración del LLM más adelante.

```
FASE 7: crónica y resumen del tiempo transcurrido.

BACK:
1. Registra en la crónica (registrarCronica, máx. 50 entradas): cambios de edad, llegada de un
   aldeano (con su nombre), eventos resueltos con su resultado (los resuelve el front y
   llegan por el PUT, así que acepta entradas nuevas desde el cliente sin duplicarlas: usa
   año + tipo + texto como clave de deduplicación), y hitos de construcción
   (primer edificio de cada tipo).
2. GET /api/aldea agrega un campo nuevo `resumenTiempo`:
   { segundos, anios, edadAnterior, edadNueva, cambios: [...] } calculado en
   aplicarProgresoInactivo. NO cambies progresoInactivo (el front lo usa como mapa de
   recursos).

FRONT:
3. Modal "Mientras no estabas" (ya existe en GameFeedback.js): añade arriba
   "Pasaron N años" y, si aplica, "Cruzaste a la Edad del Hielo".
4. Nueva sección "Crónica" dentro de la pestaña Aldea (o en Ajustes si prefieres): línea de
   tiempo vertical con "Año 12 · Llegó Marta", "Año 15 · Helada: la granja quedó al 80 %",
   "Año 18 · Comienza la Edad de la Abundancia", con icono por tipo. Estado vacío amable.
5. Accesibilidad: accessibilityLabel y orden de lectura lógico en la línea de tiempo.
```

**Verificación:** cierras la app, la reabres tras unos minutos, y el modal te dice cuántos años pasaron; la crónica muestra la historia.

---

## Fase 8 · Edades en la IA de los aldeanos

> **Haz esta fase después del paso 2 de la IA** (decisiones registradas con factores). Si todavía no lo aplicaste, déjala para más adelante.

```
FASE 8: las edades y estaciones influyen en las decisiones de los aldeanos.

Contexto: la IA de utilidad está en actualizarAgentesAutonomos (front, src/game/simulation.js)
y decidirTrabajo (back, src/utils/agentBrain.js). La lógica debe seguir idéntica en ambos.

Tareas:
1. Agrega un factor "contexto" a cada candidato, visible en la decisión registrada:
   - Edad: pesosIA por edad (hielo y abundancia favorecen agricultor; ceniza favorece minero y
     leñador; sombras favorecen guardia). Valores sugeridos: ±0,10 a ±0,20 sobre el puntaje.
   - Estación: otoño favorece agricultor (cosecha), invierno favorece guardia y reduce el
     puntaje de minero si no hay pan.
2. Los pensamientos (pensamientoActual) pasan a mencionar el contexto cuando fue decisivo:
   "Es la Edad del Hielo; aseguro la cosecha." / "Llega el invierno; me quedo de guardia."
3. Pruebas: con los mismos recursos, un aldeano elige distinto oficio en Edad del Hielo que en
   Edad de la Calma. Vectores de paridad front/back.
```

---

## Fase 9 · Modo demostración y pulido final

**Objetivo:** que puedas mostrar todo el sistema en 3 minutos delante del jurado.

```
FASE 9: modo demostración y pulido.

1. Ajustes -> sección "Modo demostración" (oculta por defecto, se activa tocando 5 veces la
   versión). Con una etiqueta visible "MODO DEMO" cuando esté activo:
   - Velocidad del tiempo x1 / x5 / x20: el tick de 1 s ejecuta N pasos de simulación.
   - Botones: "Saltar a la siguiente estación", "Forzar siguiente edad", "Disparar evento".
   Nada de esto se guarda en la base de datos como configuración; solo afecta al cliente.
2. Las acciones de demostración usan la misma lógica determinista (no atajos aparte) y
   dejan entradas en la crónica con la marca "(demo)".
3. Rendimiento: el cambio de estación y la nieve/hojas de la escena no deben bajar de
   60 fps en un teléfono medio; mide y reporta.
4. Checklist de QA manual: crear cuenta nueva, avanzar a invierno, cambio de edad, evento,
   cierre y reapertura con progreso offline, y comparar el año/edad entre dos dispositivos.
5. Actualiza README del back y del front con el sistema de tiempo (años, estaciones, edades)
   y dime qué secciones del informe de la universidad (Funciones Principales, Arquitectura)
   deberían cambiar.
```

**Verificación:** con velocidad x20 recorres un año en 9 segundos y puedes enseñar un cambio de edad en vivo.

---

## Prompt de revisión (úsalo al cerrar cada fase)

```
Revisa los cambios de esta fase como un revisor exigente:
1. ¿Hay algún Math.random() o dependencia del reloj en la simulación? (No debería.)
2. ¿La lógica de tiempo es idéntica en front y back? Compáralas línea por línea y corre los
   vectores de paridad.
3. ¿Se quitó o renombró algún campo del esquema o de la API? (No debería.)
4. ¿Se guardan y se leen edad y cronica tras el PUT y tras el progreso offline?
5. ¿Qué podría romper una aldea guardada antes de estos cambios?
Dame los hallazgos por severidad y propón arreglos sin aplicarlos hasta que yo diga "ok".
```
