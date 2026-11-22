# Vilai · Árbol de habilidades completo (ideas 1 a 6)

Guía de prompts por fases para Copilot. Cubre las seis ideas, en un orden pensado para que cada fase se apoye en la anterior y no haya que rehacer nada.

| Idea | Fase |
|---|---|
| Fundación técnica (catálogo de datos, efectos, migración) | **T1** |
| 2. Arreglar las reliquias | **T2** |
| 1. Árbol real y legible | **T3** |
| 3. Tecnologías ligadas a estaciones, edades, IA y crónica | **T4** |
| 4. Investigación con tiempo | **T5** |
| 5. Elecciones con costo (doctrinas) | **T6** |
| 6. Prestigio (refundar colonia) | **T7** |
| Pulido, metas guiadas y QA | **T8** |

## Lo que revisé en tu código (antes de escribir los prompts)

Los nombres salen de los zips que me enviaste antes de las últimas fases; los prompts piden a Copilot que lea el código actual primero.

- `TECNOLOGIAS` vive en el back (`villageDefaults.js`) con 3 entradas. Metalurgia y Planos antiguos **no están en el catálogo**: su costo está escrito dentro de `investigacion.js` y `GameContext.js`.
- **Los efectos están repartidos y escritos a mano:** herramientas `×(1+n·0,1)` en las dos simulaciones, logística `+100` de capacidad por nivel en `calcularCapacidades`, defensa en `resolverEventoNocturno` y en la IA de guardias, metalurgia `×1,5` al hierro.
- **El esquema de Mongoose guarda `tecnologias` e `investigaciones` con campos fijos.** Una tecnología nueva se descartaría en silencio al guardar. T1 lo arregla.
- **Nada entrega reliquias**, pero cada una multiplica la producción por `1 + 0,1` (cuenta el total, no las disponibles). Los Planos antiguos cuestan 3 y el Observatorio los exige: hoy son inalcanzables.

## Diseño de referencia (queda dentro de los prompts)

**Ramas y nodos** (valores iniciales; se balancean con scripts, no a ojo):

| Rama | Nodo (id) | Máx. | Requiere | Efecto por nivel |
|---|---|---|---|---|
| Economía | Herramientas calibradas (`herramientas`) | 6 | Centro nv. 1 | Producción general +10 % |
| | Rutas de abastecimiento (`logistica`) | 5 | herramientas 1 | Capacidad +10 % (hoy +100 plano) |
| | Rotación de cultivos (`rotacionCultivos`) | 3 | herramientas 2 | Comida y trigo +5 % |
| | Graneros de invierno (`graneroInvierno`) | 3 | rotacionCultivos 1, logistica 2 | Invierno: factor de comida +0,03 |
| Industria | Metalurgia (`metalurgia`) | 1 | Mina nv. 1 y Centro | Hierro ×1,5 |
| | Altos hornos (`altosHornos`) | 3 | metalurgia 1 | Hierro +15 % |
| | Ventilación de galerías (`ventilacion`) | 3 | metalurgia 1 | Pan consumido por mineros −15 % |
| Defensa | Guardia comunal (`defensa`) | 5 | metalurgia 1 | Daño de eventos −10 % |
| | Atalayas (`atalayas`) | 2 | defensa 1 | Aviso del evento +20 s de anticipación |
| | Hogueras de invierno (`hogueras`) | 2 | defensa 1 | Daño de helada −20 % |
| | Murallas (`murallas`) | 2 | defensa 2, atalayas 1 | Daño de bestias −20 % |
| Saber | Escuela de oficios (`escuelaOficios`) | 2 | Centro nv. 2 | La IA decide cada 8 s y luego cada 6 s (hoy 10 s) |
| | Mentores (`mentores`) | 3 | escuelaOficios 1 | Bono de rasgo +0,05 (IA y producción) |
| | Almanaque (`almanaque`) | 2 | Centro nv. 3 | Muestra la próxima edad 2 años antes (4 en nv. 2) |
| | Planos antiguos (`planosAntiguos`) | 1 | — | Cuesta reliquias; desbloquea el Observatorio |

**Doctrinas** (T6, cuestan reliquias; una por pareja):

| Pareja | Opción A | Opción B |
|---|---|---|
| Cultivo | Cosecha intensiva: comida y trigo +25 %, madera −10 % | Silvicultura: madera +25 %, comida −10 % |
| Defensa | Guardia profesional: guardias ×1,5, producción −5 % | Pacto con el camino: el recaudador no roba madera, bestias +20 % de daño |
| Saber | Estudiosos: investigación +25 % más rápida, costo +10 % | Artesanos: construcción −10 % de costo, investigación 15 % más lenta |

## Reglas para todas las fases

Agrega esto a `.github/copilot-instructions.md` de los dos repos:

```markdown
- Los efectos de investigación (tecnologías y doctrinas) solo se calculan en investigacion.js
  (idéntico en front y back). Prohibido escribir bonos de tecnologías directamente en la
  simulación, en la IA o en la interfaz.
- El azar en simulación es determinista (generador de tiempo.js); nada de Math.random().
- Cambios de API aditivos: no quites campos del catálogo ni del esquema; no renombres campos.
- Cuando un prompt diga "alto y reporta", detente, muéstrame la tabla o el diagnóstico y espera
  mi "ok" antes de seguir.
```

## Calendario sugerido (≈ 3-4 semanas con todo)

| Semana | Fases | Nota |
|---|---|---|
| 1 | T1 + T2 | Fundación y reliquias; sin cambios visibles grandes |
| 2 | T3 + T4 | Árbol visible y tecnologías nuevas |
| | **Parada recomendada** | Despliega una versión de prueba (guía de despliegue) y prueba en celulares |
| 3 | T5 + T6 | Tiempo de investigación y doctrinas |
| 4 | T7 + T8 | Refundar y pulido |

Las ideas 5 y 6 agregan bastante balance. Si el tiempo aprieta, T5-T7 se pueden cortar sin dañar lo anterior: T1-T4 y T8 ya dejan un árbol completo. Pon una **congelación de funciones** al menos 2 semanas antes del demo.

**Aviso para el despliegue:** el catálogo viaja desde el servidor. No despliegues el back con el catálogo nuevo hasta que el front (y el APK, si ya lo repartiste) entienda los campos nuevos.

---

## T1 · Fundación: catálogo de datos, módulo de efectos y migración

**Objetivo:** que todo el árbol salga de un solo catálogo y de un módulo de efectos idéntico en front y back, sin cambiar todavía el juego.

```
T1: fundación del sistema de investigación (front y back, mismo comportamiento que hoy).

Contexto (verifica los nombres en el código actual):
- Back: TECNOLOGIAS (3 entradas) en src/utils/villageDefaults.js; Metalurgia y Planos antiguos no
  están en el catálogo.
- Front: costoTecnologia y la simulación en src/game/simulation.js; comprarTecnologia,
  investigarMetalurgia y comprarPlanos en src/context/GameContext.js; pantalla en
  src/app/(tabs)/investigacion.js. El costo de Metalurgia (60 madera, 30 hierro, 10 pan) y el de
  Planos (3 reliquias) están escritos dentro de esos archivos.
- Efectos hoy: herramientas = producción x(1 + nivel*0.1); logistica = +100 de capacidad por nivel
  a todos los recursos base (calcularCapacidades en el back, equivalente en el front); defensa =
  reduccion de daño min(0.8, defensa*0.1 + guardias*0.1) en resolverEventoNocturno y presencia de
  guardias en la IA; metalurgia = hierro x1.5; reliquias = produccion x(1 + reliquias*0.1).
- Esquema Village.js: tecnologias e investigaciones tienen CAMPOS FIJOS. Una tecnología nueva se
  descartaría al guardar.

Tareas:
1. Antes de cambiar nada: busca TODOS los usos de tecnologias, investigaciones, legado,
   costoTecnologia y los tres métodos de compra en front y back, y dame una lista (archivo y línea).
   Espera mi "ok".
2. Catálogo ARBOL_INVESTIGACION en villageDefaults.js, solo con los 5 nodos actuales por ahora
   (herramientas, logistica, defensa, metalurgia, planosAntiguos). Cada nodo:
   { id, rama ('economia'|'industria'|'defensa'|'saber'), nombre, descripcion, icono, maxNivel
   (null = ilimitado por ahora), costoBase, factorCosto, costoReliquias (0 si no aplica),
   requiere: [{ id, nivel }], requiereEdificio: [{ tipoId, nivel }], permanente (boolean),
   posicion: { fila, columna }, efectos: [{ tipo, valor, recurso?, tipoEvento?, estacion? }] }.
   Tipos de efecto (lista cerrada, la usará todo el juego): produccionGeneral, produccionRecurso,
   multiplicadorRecurso, capacidadPlana, capacidadPct, estacionMod, reduccionDanoEventos,
   reduccionDanoTipo, guardiaEficacia, avisoEventoSegundos, iaIntervaloSegundos, iaBonoRasgo,
   bonoRasgoProduccion, pronosticoEdadAnios, consumoMineros, velocidadInvestigacion,
   costoInvestigacion, costoConstruccion, inmunidadEvento, desbloquea.
   Para conservar el comportamiento: logistica = capacidadPlana +100 por nivel; herramientas sin
   tope; metalurgia = multiplicadorRecurso hierro 1.5 con requiereEdificio mina nivel 1; planosAntiguos
   cuesta 3 reliquias y desbloquea el observatorio; defensa requiere metalurgia 1.
   Mantén TECNOLOGIAS y catalogo.tecnologias intactos por compatibilidad; agrega catalogo.arbol
   (aditivo).
3. Esquema: haz que tecnologias acepte cualquier id del catálogo (Mixed con validación de claves, o
   Map<Number>; elige lo más robusto y DEMUESTRA con un test de guardar y leer que las claves
   nuevas sobreviven al PUT y a toJSON). Deja investigaciones como está (compatibilidad).
4. Migración idempotente migrarInvestigacion(aldea) (src/utils/migracionInvestigacion.js): si
   investigaciones.metalurgia es true, tecnologias.metalurgia = 1; si tecnologias.planosAntiguos
   > 0, queda igual. Mantén sincronizado investigaciones.metalurgia por compatibilidad. Llámala en
   obtenerAldea y como respaldo en el front al cargar la aldea.
5. Módulo puro investigacion.js, idéntico en ambos proyectos (back CommonJS en src/utils/, front ESM en
   src/game/): nivelDe(aldea, id); requisitosCumplidos(aldea, nodo) -> { ok, faltantes: [texto
   humano] }; costoDe(nodo, nivelActual) -> { recursos, reliquias }; puedeInvestigar(aldea, nodo)
   -> { ok, motivo }; efectosActivos(aldea, arbol) -> objeto agregado con todos los tipos (aditivos
   sumados, multiplicativos multiplicados, con topes de seguridad por tipo: por ejemplo
   produccionGeneral <= +1.0 y reduccionDanoEventos <= 0.8).
6. Reemplaza los bonos escritos a mano por efectosActivos, EXACTAMENTE con el mismo resultado:
   herramientas y metalurgia en las dos simulaciones, logistica en calcularCapacidades (y su
   equivalente en el front), defensa en resolverEventoNocturno y en la presencia de guardias de la
   IA. No toques todavía el bono de reliquias (T2).
7. Unifica la compra en una sola función investigar(id) en GameContext (recursos o reliquias, con
   requisitos, motivo legible si falla) y haz que investigacion.js la use en lugar de
   comprarTecnologia/investigarMetalurgia/comprarPlanos. La interfaz puede quedar como está.
8. Pruebas: (a) golden test: la lógica antigua copiada como referencia legada vs la nueva en 10.000
   estados aleatorios con semilla fija (producción, capacidades, daño de eventos); (b) vectores de
   paridad fixtures/arbol-vectores.json (20 estados -> efectos agregados) verificados en el front
   con scripts/verificar-paridad.mjs; (c) la migración es idempotente.

Sin cambios visibles de interfaz ni de economía.
```

**Verificación:** los tests y el golden test pasan; juegas 5 minutos y nada cambió; compras una tecnología, recargas y sigue ahí.

---

## T2 · Reliquias alcanzables (idea 2)

```
T2: reliquias alcanzables y bono razonable.

Contexto: hoy nada entrega reliquias, pero cada una multiplica la producción por 1 + 0,1 sobre el
TOTAL de reliquias (no las disponibles). Planos antiguos cuestan 3 reliquias y el Observatorio los
exige, así que hoy son inalcanzables.

Tareas:
1. Constantes en el catálogo (aditivas): RELIQUIAS = { porEdad: 1, bonoPorReliquia: 0.03,
   bonoMaximo: 0.30 }. El nodo planosAntiguos pasa a costar 2 reliquias (costoReliquias en el
   catálogo; elimina el 3 escrito a mano en cualquier otro archivo).
2. En el motor de edades (avanzarEdad en tiempo.js), al completarse una edad suma legado.reliquias
   += RELIQUIAS.porEdad, igual en back y front (el progreso offline ya copia legado al documento;
   compruébalo). Registra en la crónica (tipo 'reliquia'): "Se halló una reliquia entre las ruinas".
3. Reemplaza el factor (1 + reliquias*0,1) en ambas simulaciones por el bono de reliquias dentro de
   efectosActivos: min(bonoMaximo, reliquiasTotales*bonoPorReliquia). Misma fórmula en front y back.
4. Interfaz: en el encabezado de Investigación, "Reliquias: N (disponibles M) · +X % de producción".
   Aviso al hallar una (toast + vibración), y una línea en el modal "Mientras no estabas".
5. El Observatorio, mientras esté bloqueado, muestra "Requiere: Planos antiguos" con texto humano
   (nunca el id interno).
6. Alto y reporta: script scripts/balance-reliquias.js (back) que simule 160 años (8 h offline) y
   muestre cuántas edades y reliquias se obtienen, el bono resultante y el tiempo (en minutos
   de juego) para llegar a Planos antiguos. Muéstrame la tabla antes de seguir.
7. Pruebas: tras simular K edades, el número de reliquias es el mismo en front y back; no se
   duplican al recargar; el límite del bono se respeta.

Comprueba también que "Forzar siguiente edad" del modo demostración (si ya existe) pasa por
avanzarEdad y entrega la reliquia.
```

**Verificación:** una edad nueva te da una reliquia (con aviso); con 2 puedes comprar los Planos y construir el Observatorio.

---

## T3 · Árbol visual y legible (idea 1)

```
T3: pestaña Investigación como árbol real (front).

Contexto: hoy son 5 tarjetas planas con un botón "Investigar nivel N · costo", sin descripción del
efecto. El catálogo (catalogo.arbol) ya trae rama, posicion, requiere y efectos por nodo.

Tareas (plan primero; implementa tras mi "ok"):
1. format.js: efectoDescripcion(nodo, nivel) que convierta efectos estructurados en texto humano
   ("+20 % de producción", "Hierro ×1,5", "−10 % de daño de eventos"), y textoRequisito(req) con
   nombres reales ("Metalurgia nivel 1", "Centro de Investigación nivel 2"). Nunca mostrar ids.
2. Estructura de la pestaña:
   - Encabezado: reliquias (disponibles / totales), nivel del Centro de Investigación y un panel
     "Bonos activos" (producción general, capacidad, reducción de daño, intervalo de la IA... lo que
     aplique, calculado con efectosActivos).
   - Selector de rama con chips (Economía, Industria, Defensa, Saber) y colores propios por rama
     como tokens nuevos de theme.js. En pantallas anchas (>= 900 px) mostrar las ramas en columnas.
   - Cada rama dibuja sus nodos por (fila, columna) con conectores hacia sus requisitos. Si
     react-native-svg ya está instalado úsalo; si no, haz los conectores con Views (no agregues
     librerías sin avisarme).
3. NodoInvestigacion: icono grande, nombre, "nivel X/máx" y estado con forma y color: bloqueado
   (candado, atenuado), disponible (acento), alcanzable ahora (acento + indicador suave), completado
   (check, "MÁX"), sin recursos (borde rojo). El estado no depende solo del color.
4. Al tocar un nodo se abre un bottom sheet con: descripción, "Efecto actual" y "Siguiente nivel"
   (ej. "+20 % → +30 % producción"), requisitos con marca cumplido o no, costos como chips (verde si
   alcanza, rojo con lo que falta, reutiliza CostChips de Construir) y el botón "Investigar nivel N"
   deshabilitado con el motivo escrito debajo cuando no se puede.
5. Nodo "Sugerido": marca con una etiqueta el nodo disponible más barato en relación con tus
   recursos (regla simple, documenta cuál usaste).
6. Al completar una investigación: toast, vibración media y un pulso breve del nodo. Si ya existe el
   sistema de feedback, reutilízalo.
7. Estados vacíos y bloqueado: sin Centro de Investigación, mensaje claro con botón que lleva a
   la pestaña Construir.
8. Accesibilidad: accessibilityLabel con nombre, nivel, estado y costo; mínimo 14 px; áreas
   táctiles de 44x44; orden de lectura por rama.
9. Rendimiento: nodos memorizados; el tick de 1 s no debe volver a dibujar el árbol entero (solo los
   nodos cuyo estado cambie).

No cambies la lógica de investigación ni los efectos.
```

**Verificación:** sin leer código, puedes decir qué hace cada nodo, qué te falta para comprarlo y qué desbloquea.

---

## T4 · Tecnologías ligadas a tus sistemas (idea 3)

```
T4: nuevas tecnologías conectadas con estaciones, edades, eventos, IA y crónica.

Contexto: investigacion.js ya agrega efectos de una lista cerrada de tipos. Esta fase agrega nodos
nuevos al catálogo y conecta cada tipo de efecto con el sistema que le corresponde.

Tareas:
1. Agrega al catálogo ARBOL_INVESTIGACION estos nodos (id, rama, máx, requiere, efecto por nivel,
   costoBase y factorCosto de partida entre paréntesis; son valores iniciales a balancear):
   - rotacionCultivos (economia, 3, requiere herramientas 2): produccionRecurso comida
     +0.05 y trigo +0.05 (60 madera + 40 comida, x1.7).
   - graneroInvierno (economia, 3, rotacionCultivos 1 y logistica 2): estacionMod invierno comida
     +0.03 (90 madera + 60 comida, x1.8).
   - altosHornos (industria, 3, metalurgia 1): produccionRecurso hierro +0.15 (100 madera + 40
     hierro + 20 pan, x1.8).
   - ventilacion (industria, 3, metalurgia 1): consumoMineros pan -0.15 (80 madera + 30 hierro,
     x1.7). Si el consumo de pan de los mineros no es un parámetro limpio en el código, dímelo y
     propón una alternativa equivalente.
   - atalayas (defensa, 2, defensa 1): avisoEventoSegundos +20 (80 madera + 20 hierro, x1.8).
   - hogueras (defensa, 2, defensa 1): reduccionDanoTipo helada 0.20 (60 madera + 20 comida, x1.8).
   - murallas (defensa, 2, defensa 2 y atalayas 1): reduccionDanoTipo bestias 0.20 (150 madera +
     40 hierro, x2.0).
   - escuelaOficios (saber, 2, Centro nivel 2): iaIntervaloSegundos -2 por nivel (70 madera + 50
     comida, x1.8).
   - mentores (saber, 3, escuelaOficios 1): iaBonoRasgo +0.05 y bonoRasgoProduccion +0.05 (90 madera
     + 60 comida + 10 pan, x1.8).
   - almanaque (saber, 2, Centro nivel 3): pronosticoEdadAnios +2 (100 madera + 70 comida, x2.0).
   Ajusta también: herramientas maxNivel 6; logistica maxNivel 5. Posiciones (fila, columna) para
   que el árbol quede ordenado en T3.
2. Conecta cada efecto en el sistema correcto, usando siempre efectosActivos:
   - estacionMod: en tiempo.js, al calcular los multiplicadores de la estación.
   - reduccionDanoTipo y reduccionDanoEventos: en resolverEventoNocturno, por tipo de evento.
   - avisoEventoSegundos: el evento del año es predecible (se elige con el generador determinista
     y los pesos de la edad), así que crea eventoPrevisto(aldea) en tiempo.js y muestra el banner
     "Se acerca: <evento> en N s" durante los últimos avisoEventoSegundos antes del invierno.
   - iaIntervaloSegundos: el intervalo de decisión (hoy 10 s, fijo) pasa a ser un parámetro de
     cerebro.js, igual en front y back.
   - iaBonoRasgo: sumar al bono del rasgo en cerebro.js (aparece como factor "rasgo" en la decisión).
   - bonoRasgoProduccion: sumar al bono de producción del rasgo.
   - pronosticoEdadAnios: proximaEdad(aldea) en tiempo.js (usa elegirSiguienteEdad) y una línea en
     la tarjeta de edad: "Próxima edad: Edad del Hielo en 3 años" cuando falten <= N años.
   - consumoMineros: en la receta de la mina.
3. Crónica: cada investigación completada registra una entrada (tipo 'investigacion', "Se completó
   Metalurgia nivel 1").
4. Alto y reporta (cambios de balance): scripts/balance-arbol.js (back) que simule 10 años y compare
   (a) sin tecnologías, (b) todas en nivel 1, (c) todo al máximo. Reporta producción por recurso,
   capacidad, daño de eventos y decisiones por minuto de la IA. Propón valores para que ningún
   conjunto de una rama dé más de +80 % de producción respecto a (a). Incluye el efecto de cambiar
   logistica de +100 plano a +10 % de capacidad por nivel. No apliques cambios de valores sin mi "ok".
5. Pruebas: vectores de paridad actualizados (efectos agregados, eventoPrevisto, proximaEdad) y
   un test por efecto nuevo que demuestre que cambia el sistema correspondiente.
6. Confirma que el árbol de T3 muestra todos los nodos nuevos con descripciones y "Siguiente nivel".
```

**Verificación:** con Atalayas aparece el aviso antes del evento; con el Almanaque ves la próxima edad con anticipación; con Escuela de oficios los aldeanos deciden más seguido.

---

## T5 · Investigación con tiempo (idea 4)

```
T5: investigar toma tiempo (años) y el Centro de Investigación importa.

Contexto: hoy comprar es instantáneo. Con el sistema de tiempo, la investigación puede avanzar
con el ciclo y también mientras la app está cerrada (el back simula el offline).

Tareas:
1. Catálogo: cada nodo suma duracionBase (segundos de juego) y factorDuracion por nivel. Valores de
   partida: herramientas 30 s x1.5; logistica 45 s x1.5; rotacionCultivos 60 s; graneroInvierno 90 s;
   metalurgia 120 s; altosHornos 120 s; ventilacion 90 s; defensa 60 s x1.5; atalayas 90 s;
   hogueras 60 s; murallas 150 s; escuelaOficios 90 s; mentores 120 s; almanaque 150 s;
   planosAntiguos 0 (instantáneo, cuesta reliquias). Un año dura 180 s.
2. Estado en la aldea y el esquema: investigacionActiva: [{ id, nivel, restante, total }] (restante
   en segundos de juego). Migración: sin el campo = [].
3. Ranuras y velocidad según el nivel del Centro de Investigación:
   ranuras = 1 + floor((nivel - 1) / 2) (nv. 1-2: 1; 3-4: 2; 5-6: 3).
   duración efectiva = duracion * max(0.5, 1 - 0.05*(nivel - 1)) * (1 - velocidadInvestigacion).
4. Módulo investigacion.js: iniciarInvestigacion(aldea, id) (cobra el costo al iniciar, valida
   requisitos y ranuras libres), avanzarInvestigacion(aldea, dt) (resta tiempo; al llegar a 0 sube el
   nivel, registra en la crónica y devuelve las completadas), cancelarInvestigacion(aldea, id)
   (devuelve el 50 % del costo en recursos; las reliquias no se devuelven).
5. Llámalo en cada segundo simulado: el tick del front y simularSegundo del back, igual en ambos.
   offlineProgress.js debe copiar investigacionActiva, tecnologias y cronica al documento. El
   resumen offline lista las investigaciones completadas ("Mientras no estabas, se completó
   Metalurgia").
6. Interfaz:
   - Panel "En curso" arriba del árbol con una barra por investigación y "Quedan 1 min 20 s".
   - Indicador de ranuras ("Ranuras: 1/2 en uso") y bono de velocidad del Centro.
   - Nodo en progreso con anillo de avance; botón "Cancelar" con confirmación y el reembolso.
   - El botón del detalle pasa a "Comenzar investigación (tarda 1 min 30 s)".
   - Toast y vibración al completar.
7. Alto y reporta: el script de balance mide cuánto tarda en completarse el árbol de Economía
   (sin doctrinas) con 1, 2 y 3 ranuras, y cuántas tecnologías puede completar un jugador en 30
   minutos de juego y en 8 horas offline. Propón ajustes si un camino completo queda en menos de
   15 min o en más de 3 h de juego.
8. Pruebas: determinismo (mismo resultado en front y back), no se excede el número de ranuras, el
   offline completa investigaciones, cancelar reembolsa lo correcto, una investigación completada
   dos veces es imposible (por ejemplo, recargar a mitad no la duplica).
```

**Verificación:** inicias una investigación, cierras la app, y al volver aparece completada en el resumen.

---

## T6 · Doctrinas: elecciones con costo (idea 5)

```
T6: doctrinas excluyentes que se pagan con reliquias.

Contexto: las reliquias (T2) son el recurso escaso para decisiones permanentes. Tres parejas de
doctrinas, una elección por pareja.

Tareas:
1. Catálogo: nodos con doctrina: true, rama 'doctrinas', costoReliquias: 2, requiere Centro nivel 3
   y excluyeCon: [id]. Parejas y efectos:
   - cosechaIntensiva (produccionRecurso comida +0.25 y trigo +0.25, madera -0.10) vs
     silvicultura (madera +0.25, comida -0.10).
   - guardiaProfesional (guardiaEficacia x1.5, produccionGeneral -0.05) vs pactoCamino
     (inmunidadEvento recaudador, reduccionDanoTipo bestias -0.20, es decir, bestias hacen
     +20 % de daño).
   - estudiosos (velocidadInvestigacion +0.25, costoInvestigacion +0.10) vs artesanos
     (costoConstruccion -0.10, velocidadInvestigacion -0.15).
2. Reglas en investigacion.js: no se puede tener una doctrina si ya tienes su pareja; "Reconsiderar"
   cuesta 1 reliquia, quita la doctrina elegida y libera la pareja. Los efectos de las doctrinas
   entran en efectosActivos como cualquier otro, con sus topes.
3. Conecta los tipos nuevos: guardiaEficacia (se combina con el de la edad de las Sombras),
   inmunidadEvento y reduccionDanoTipo negativo en resolverEventoNocturno, costoInvestigacion y
   velocidadInvestigacion en T5, y costoConstruccion en el cálculo de costos de construcción y
   mejora (back: costoSiguienteNivel; front: tarjetas y GameContext). Si costoConstruccion exige
   tocar demasiados lugares, dime cuáles y propón un punto único.
4. Interfaz: nueva rama/chip "Doctrinas" con las tres parejas como tarjetas enfrentadas (VS):
   beneficios en verde, costos en rojo con signo y texto, la elegida resaltada y la excluida
   atenuada con "Excluida por X". Confirmación al elegir ("Se puede cambiar pagando 1 reliquia").
   Botón "Reconsiderar" con costo visible.
5. Alto y reporta: balance de las 8 combinaciones posibles: producción total equivalente, daño
   recibido y velocidad de investigación. Ninguna combinación debe superar en más de 15 % a la peor
   en el resultado global. Muéstrame la tabla y propón ajustes antes de aplicarlos.
6. Pruebas: exclusión (comprar la pareja falla con motivo claro), reconsiderar devuelve el estado
   correcto y cobra 1 reliquia, paridad front/back de los efectos con vectores, y las doctrinas se
   guardan tras el PUT y tras el offline.
```

**Verificación:** eliges "Silvicultura" y no puedes comprar "Cosecha intensiva"; reconsiderar cuesta 1 reliquia y libera la pareja.

---

## T7 · Prestigio: refundar colonia (idea 6)

```
T7: refundar colonia (prestigio), calculado en el servidor.

Contexto: legado.coloniasFundadas ya existe en el esquema, y el texto de Metalurgia dice
"investigación permanente en esta colonia". Falta el flujo real.

Tareas:
1. Catálogo: REFUNDACION = { aniosMinimos: 60, edadesMinimas: 3, reliquiasPorCadaAnios: 20 }.
   Recompensa: floor(año / reliquiasPorCadaAnios) reliquias adicionales a las que ya diste por edad.
   Nodos con permanente: true conservan su nivel (por ahora solo planosAntiguos).
2. Endpoint POST /api/aldea/refundar (autenticado, con límite de peticiones): lee la aldea guardada,
   valida año >= aniosMinimos y edades completadas >= edadesMinimas (400 con motivo si no), y en una
   sola actualización atómica:
   - guarda en legado: reliquias + recompensa, coloniasFundadas + 1;
   - añade a historialColonias [{ numero, anios, edades, reliquiasGanadas }] (máximo 10, nuevo campo
     en el esquema);
   - reinicia la aldea con el estado inicial (reutiliza la función que crea la aldea inicial):
     recursos, edificios, aldeanos, ciclo (año 1), edad (Calma, numero 1), crónica, investigaciones,
     doctrinas y tecnologías no permanentes; conserva legado e historialColonias.
   - devuelve la aldea nueva.
   El cliente NO calcula la recompensa. Un segundo POST inmediato debe fallar (el año ya se reinició).
3. Semilla del azar: la semilla de la aldea pasa a ser String(_id) + ':' + coloniasFundadas, para que
   cada colonia tenga edades y eventos distintos y siga siendo determinista. Actualiza
   semillaDeAldea en tiempo.js en AMBOS proyectos y los vectores de paridad.
4. Interfaz:
   - Tarjeta "Refundar colonia" al final de la pestaña Aldea con el progreso ("Año 43/60 · edades
     2/3") y, cuando se cumple, un botón que abre un modal con la vista previa ("Ganarás N reliquias,
     conservarás: Planos antiguos y tus reliquias, perderás: edificios, aldeanos y tecnologías").
   - Confirmación por mantener presionado 2 segundos (evita toques accidentales).
   - Pantalla/sección "Linaje" con la lista de colonias anteriores (años, edades, reliquias).
   - Modo demostración (si existe): opción "Refundar ahora" que ignora los mínimos, marcada "(demo)".
5. Alto y reporta: simulación de 3 colonias consecutivas con el script de balance: reliquias
   acumuladas, bono de producción resultante y tiempo hasta cada refundación. Objetivo: tras la
   tercera colonia la aldea progresa alrededor del doble de rápido que la primera, no diez veces.
   Propón los valores de bonoPorReliquia y bonoMaximo (T2) que lo logren y no los apliques sin mi "ok".
6. Pruebas: 401 sin token, 400 si no se cumplen requisitos, reintento rechazado, qué se conserva y
   qué se reinicia, semilla distinta por colonia con el mismo _id, paridad front/back de edades en la
   colonia 2.
```

**Verificación:** con el modo demostración refundas, ves el modal con la vista previa y tu nueva colonia arranca desde cero, con las reliquias intactas.

---

## T8 · Pulido, metas guiadas y QA

```
T8: pulido final del sistema de investigación.

1. Metas guiadas: el panel de metas de la pestaña Aldea hoy tiene textos fijos ("Investigar
   metalurgia"). Haz que la meta de investigación sea la del nodo "Sugerido" del árbol
   (sugerirInvestigacion(aldea) en investigacion.js, misma regla que usa la interfaz), con su barra de
   progreso hacia el costo.
2. Bonos activos también en la pestaña Aldea: tarjeta compacta con los 3 bonos más importantes
   ("Producción +24 %", "Daño de eventos −30 %", "IA decide cada 8 s") que lleva al árbol al tocarla.
3. Primera vez en Investigación: mini guía de 3 pasos (ramas, nodos con requisitos, reliquias y
   doctrinas), con "Saltar", que se guarda como vista. Texto en español claro.
4. Crónica: confirma que investigaciones completadas, reliquias, doctrinas elegidas y refundaciones
   aparecen con año e icono.
5. Rendimiento y accesibilidad: el tick de 1 s no vuelve a dibujar el árbol, 60 fps en un teléfono medio
   (mide y reporta), etiquetas de accesibilidad en todos los nodos, y contraste AA.
6. scripts/balance-completo.js (back): simulación de 30 años con una estrategia automática
   (investiga siempre el sugerido) y reporte de producción, ranuras ocupadas, reliquias y edades.
7. Checklist de QA manual (web, Android, iPhone si hay PWA): comprar y completar un nodo, cancelar,
   doctrinas, refundar, cierre y reapertura con offline, comparar el estado entre dos dispositivos.
8. Actualiza README del back y del front con el sistema de investigación, y dime qué secciones del
   informe de la universidad deberían cambiar (Funciones Principales, Interfaces).
```

---

## Prompt de revisión (al cerrar cada fase)

```
Revisa los cambios de esta fase como un revisor exigente:
1. ¿Hay algún bono escrito a mano fuera de investigacion.js? ¿Algún Math.random() en simulación?
2. ¿investigacion.js es idéntico en front y back (salvo la sintaxis de módulos)? Corre los vectores de
   paridad y compáralo línea por línea.
3. ¿Se guardan y leen tecnologías nuevas, investigacionActiva, doctrinas, legado e historialColonias
   tras el PUT y tras el progreso offline?
4. ¿Qué podría romper una aldea guardada antes de estos cambios?
5. ¿Qué podría desbalancear la economía o permitir una combinación dominante?
Dame los hallazgos por severidad y propón arreglos sin aplicarlos hasta que yo diga "ok".
```
