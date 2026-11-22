# Vilai · IA de los aldeanos, paso 2 (decisiones con factores)

Estos prompts preparan el terreno para la **Fase 8** del sistema de tiempo y para la narración con LLM.
Cada fase toca **back y front** con la misma lógica, igual que en las fases de tiempo.

## Orden recomendado

| Orden | Qué | Por qué en ese orden |
|---|---|---|
| 1 | Cierra la **Fase 7** (verificación abajo) | La crónica ya guarda eventos; la IA la usará |
| 2 | **IA-1**: decisión registrada con factores | Fase 8 necesita esta estructura |
| 3 | **IA-2**: inercia, variedad y umbrales que escalan | Cambia un poco el comportamiento; mejor medirlo antes de sumar edades |
| 4 | **Fase 8** (con el ajuste de abajo) | Edades y estaciones entran como un factor más |
| 5 | **IA-3**: panel "Por qué lo hizo" | Es lo que el jurado ve |
| 6 | **IA-4**: banco de frases variadas | Será el respaldo del LLM |
| 7 | Fase 9 (modo demo) | Cierra el sistema de tiempo |

El mínimo para destrabar la Fase 8 es **IA-1**. IA-2 la recomiendo porque con la Fase 8 sumando más factores, conviene que las bases ya estén ajustadas.

## Antes de empezar: cierra la Fase 7

Comprueba a mano:
1. Cierras la app unos minutos y al reabrirla el modal dice "Pasaron N años".
2. La crónica muestra edades, llegadas de aldeanos y eventos, sin duplicados.
3. `node test-logic.js` sigue pasando y haces commit en los dos repos.

## Ajuste a la Fase 8

Cuando llegues a ella, cambia el párrafo "Contexto:" del prompt por este, porque la lógica ya no vivirá donde decía:

```
Contexto: la IA de utilidad vive en cerebro.js (back: src/utils/cerebro.js, front:
src/game/cerebro.js), creada en IA-1. Cada candidato ya devuelve factores con nombre
(necesidad, saturacion, rasgo, contexto, inercia, variedad). En esta fase solo se rellena
el factor "contexto". La lógica debe seguir idéntica en ambos proyectos.
```

---

## IA-1 · Decisión registrada con factores (sin cambiar el comportamiento)

**Objetivo:** que cada decisión guarde *por qué* se tomó, y que front y back usen exactamente la misma función.

```
IA-1: decisión registrada con factores (front y back, mismo resultado que hoy).

Contexto: la IA de utilidad existe en dos copias. Front: actualizarAgentesAutonomos en
src/game/simulation.js. Back: decidirTrabajo y actualizarAgentes en src/utils/agentBrain.js
(es posible que los nombres o la ubicación hayan cambiado en fases anteriores: léelos primero).
Cada 10 s, un aldeano en modo "automatico" puntúa lenador, agricultor, minero y guardia así:
  puntaje = clamp((objetivo - actual) / objetivo) / (1 + conteoDelOficio * k) + bonoRasgo
con k = 0,8 (leñador y agricultor), 0,9 (minero) y 1,3 (guardia); bonoRasgo = 0,28 si el
rasgo del aldeano coincide con el oficio; el guardia usa urgencia 1,2 (hay evento) o 0,62
(es invierno) en lugar de la necesidad. Si el mejor puntaje es < 0,2 el aldeano queda "libre".

Tareas:
1. ANTES de cambiar nada, léelo todo y dame una lista de las diferencias entre las dos copias
   (cómo cuentan los oficios, constantes fijas, umbrales, desempates) y espera mi "ok".
2. Crea un módulo puro con lógica idéntica en ambos proyectos:
   - Back: src/utils/cerebro.js (CommonJS). Front: src/game/cerebro.js (ESM).
   Funciones:
   - objetivosDeRecursos(capacidades): las mismas fórmulas actuales (madera min(120, cap*0.45),
     comida min(80, cap*0.4), hierro min(80, cap*0.35)). No las cambies en esta fase.
   - evaluarOpciones(aldea, aldeano, indice, catalogo) -> lista de opciones:
     { trabajo, estado, pensamiento, puntaje, factores: { necesidad, saturacion, rasgo,
     contexto, inercia, variedad } } donde necesidad es el clamp(...) crudo, saturacion es
     (necesidad/(1+k*conteo) - necesidad) (cero o negativa), rasgo es +0,28 o 0, y
     contexto, inercia y variedad valen 0 por ahora. El puntaje es la suma de factores.
   - decidir(aldea, aldeano, indice, catalogo) -> { eleccion, opciones, libre }.
3. Unifica el criterio de conteo de oficios: se cuentan los demás aldeanos (sin contarse a
   sí mismo) sobre el estado actual, en orden y de forma secuencial (el siguiente ve la
   decisión del anterior). Mantén el mismo desempate de hoy (orden alterno según índice y año).
4. Reemplaza actualizarAgentesAutonomos (front) y decidirTrabajo/actualizarAgentes (back) para
   que usen cerebro.js. Quita cualquier constante fija de día/noche y usa esInvierno() de
   tiempo.js.
5. Guarda la decisión en el aldeano (solo la última, solo si modoTrabajo es "automatico"):
   decision: { anio, segundos, elegida, libre, opciones: [{ trabajo, puntaje,
   factores: { necesidad, saturacion, rasgo, contexto, inercia, variedad } }] }
   con números redondeados a 2 decimales. Agrégalo a aldeanoSchema en src/models/Village.js
   (si no, el PUT lo descarta). Verifica que sobrevive a guardar y recargar.
6. src/utils/offlineProgress.js solo copia recursos, ciclo, evento, edad y crónica al
   documento. Haz que también copie, por _id de aldeano, trabajo, estado, pensamientoActual
   y decision, para que las decisiones tomadas en el offline queden guardadas.
7. Pruebas:
   a. Golden test: copia la lógica antigua como "referencia legada" dentro del test y compara
      trabajo elegido y pensamiento contra la nueva en 10.000 estados aleatorios (con una
      semilla fija; en pruebas puedes usar un generador local).
   b. Para cada decisión, la suma de factores es igual al puntaje (±0,001).
   c. fixtures/ia-vectores.json en el back con 20 estados -> elección esperada; el front lo
      verifica con scripts/verificar-paridad.mjs.
8. Sin cambios de interfaz ni de economía.

Entrega: lista de archivos tocados, las diferencias que encontraste en el paso 1 y el
resultado de las pruebas.
```

**Verificación:** los tests pasan; en una aldea con aldeanos en Auto, el documento en Mongo trae `decision` con factores; después de un offline largo los oficios quedan guardados.

---

## IA-2 · Inercia, variedad y umbrales que escalan

**Objetivo:** que los aldeanos no cambien de oficio cada 10 s, que no sean clones, y que trabajen cuando los almacenes crecen. **Esta fase sí cambia el comportamiento**, por eso lleva un script de balance.

```
IA-2: inercia, variedad y umbrales escalables (cambia el comportamiento de forma controlada).

Contexto: en cerebro.js (creado en IA-1) los factores inercia y variedad valen 0, y los
objetivos de recursos tienen topes absolutos (madera 120, comida 80, hierro 80). Con
almacenes grandes (1750 madera / 750 comida) esos topes hacen que todos los aldeanos
queden "libres" apenas se supera el tope, aunque falten recursos en términos relativos.

Tareas:
1. Factor inercia: +0,10 al oficio que el aldeano ya tiene (solo si no es "libre"). Evita que
   cambie de trabajo cada 10 s por diferencias mínimas.
2. Factor variedad: ruido determinista en [-0,05, +0,05] usando el generador de tiempo.js
   (semillaDe y aleatorio). Clave: id del aldeano (_id si existe; si no, nombre + índice,
   porque puede haber nombres repetidos) + año + segundos. Prohibido Math.random().
3. Umbrales escalables: objetivo = capacidad * fracción, con fracciones en una constante
   OBJETIVOS_IA = { madera: 0.45, comida: 0.40, hierro: 0.35 } y TOPE_OBJETIVO = null
   (sin tope; poniendo un número se recupera el comportamiento anterior). Agrégalas a
   villageDefaults.js y al catálogo (aditivo) para que el front las lea.
4. scripts/balance-ia.js (back): simula 10 años con una aldea de ejemplo y 8 aldeanos en Auto,
   antes (topes absolutos, sin inercia ni variedad) y después. Reporta, por recurso, el total
   producido y, por oficio, el porcentaje de tiempo trabajado. Si algún recurso se desvía más
   de ±10 %, no cambies nada más: muéstrame la tabla y espera mi decisión.
5. Pruebas:
   a. Con condiciones estables, ningún aldeano cambia de oficio en 100 decisiones seguidas.
   b. Dos aldeanos con las mismas condiciones y rasgo no siempre eligen igual (diversidad), pero
      el resultado es idéntico en back y front (vectores de paridad actualizados).
   c. La suma de factores sigue igualando el puntaje.
6. Sin cambios de interfaz.
```

**Verificación:** el reporte de balance está dentro de lo que aceptas; en pantalla los aldeanos dejan de saltar de oficio y ya no se quedan todos "Libres" con almacenes grandes.

---

## IA-3 · Panel "Por qué lo hizo"

**Objetivo:** que se vea la inteligencia. Es lo más vendible frente al jurado.

```
IA-3: panel "Por qué lo hizo" (front).

Contexto: la pestaña de aldeanos está en src/app/(tabs)/aldeanos.js. Al tocar una tarjeta se
abre un bottom sheet con pensamiento, rasgo y selector de oficio. Cada aldeano en Auto ya
trae aldeano.decision (de IA-1) con opciones y factores.

Tareas:
1. En src/game/format.js crea razonPrincipal(decision, catalogo): una frase corta basada en
   el factor dominante de la opción elegida. Ejemplos: necesidad -> "Falta comida",
   rasgo -> "Es hortelano de nacimiento", saturacion -> "Ya hay muchos en este oficio",
   inercia -> "Ya estaba en este oficio", contexto -> "Por la edad/estación actual",
   libre -> "Todo está en orden".
2. Tarjeta de aldeano: bajo el oficio, una línea pequeña con esa razón.
3. Bottom sheet: nueva sección "Por qué lo hizo":
   - Una barra horizontal por opción evaluada (Leñador, Agricultor, Minero, Guardia), con el
     puntaje, la elegida resaltada con el color de acento.
   - Al tocar una barra, se muestra el desglose de factores con nombre, icono y signo
     (ej. "Necesidad +0,63 · Rasgo +0,28 · Saturación −0,15").
   - Línea resumen: "Eligió Agricultor (0,63) sobre Leñador (0,11)".
   - Si el aldeano está en modo Manual: "Tú decidiste su oficio" y las barras se ocultan.
4. Estados: sin decisión todavía -> "Aún no ha decidido nada"; en modo Manual -> mensaje arriba.
5. Accesibilidad: accessibilityLabel con el resumen de la decisión; mínimo 14 px;
   los factores no dependen solo del color (usa signo y texto).
6. Rendimiento: no re-renderices la lista entera cada segundo; memoriza las filas.

No cambies la lógica de decisión.
```

**Verificación:** tocas a Marta y ves que eligió Agricultora por "Falta comida" y rasgo, y puedes explicarlo en una frase.

---

## IA-4 · Banco de frases variadas (respaldo del LLM)

**Objetivo:** que los aldeanos dejen de repetir 4 frases fijas, sin depender de internet. Esto será el plan B cuando falle la narración con LLM.

```
IA-4: banco de pensamientos variados (front y back idénticos).

Contexto: hoy cada oficio tiene una frase fija ("La madera empieza a escasear; voy al
bosque."). Quiero variedad y personalidad sin LLM.

Tareas:
1. Crea src/utils/frases.js (back, CommonJS) y src/game/frases.js (front, ESM), mismo
   contenido: un banco de frases por combinación de oficio × factor dominante × rasgo.
   Mínimo 4 variantes por oficio y factor dominante (necesidad, rasgo, saturacion, inercia,
   libre), con tono distinto según rasgo (maderero, hortelano, minero nato, polivalente).
   Admite marcadores: {nombre}, {anio}, {estacion}, {edad}, {recurso}.
2. elegirFrase(decision, aldeano, aldea, catalogo): escoge una variante de forma determinista
   (generador de tiempo.js, clave: id del aldeano + año + segundos), sin repetir la última
   frase del mismo aldeano si hay alternativas. Devuelve el texto ya con marcadores resueltos.
3. cerebro.js usa elegirFrase para rellenar pensamiento y, por tanto, pensamientoActual.
4. Pruebas: ninguna frase deja un marcador sin resolver; misma entrada -> misma frase en
   back y front; en 100 decisiones consecutivas un mismo aldeano usa al menos 3 frases
   distintas.
5. Escribe el banco en español natural de Chile (sin modismos fuertes), frases de máximo
   100 caracteres.
```

**Verificación:** dos agricultores con la misma situación dicen cosas distintas, pero siempre iguales en front y back para la misma aldea.

---

## Prompt de revisión (al cerrar cada fase)

```
Revisa los cambios de esta fase como un revisor exigente:
1. ¿Hay Math.random() o dependencia del reloj en la simulación? (No debería.)
2. ¿cerebro.js y frases.js son idénticos en front y back salvo la sintaxis de módulos?
3. ¿La suma de factores sigue igualando el puntaje, y decision se guarda tras el PUT y tras
   el offline?
4. ¿Se rompió alguna aldea guardada sin el campo decision?
5. ¿Qué podría desbalancear la economía?
Dame los hallazgos por severidad y propón arreglos sin aplicarlos hasta que yo diga "ok".
```
