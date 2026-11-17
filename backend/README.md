# Aldea Incremental — Backend (Node.js + Express + MongoDB)

API para guardar y cargar la partida de la app móvil (React Native).
Cada usuario tiene su propia aldea: recursos con almacenamiento ampliable,
aldeanos con rasgos y oficios, y una cadena de producción trigo-harina-pan-hierro.
La producción continúa offline, hay eventos nocturnos que requieren decisiones,
y las mejoras de edificios no tienen nivel máximo.

## Requisitos

- Node.js 18+
- Una base de datos MongoDB (local o [Atlas](https://www.mongodb.com/atlas), gratis)

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar variables de entorno

Copia `.env.example` a `.env` y completa:

```bash
cp .env.example .env
```

- `MONGODB_URI`: tu cadena de conexión (local o Atlas)
- `JWT_SECRET`: cualquier string largo y aleatorio (puedes generarlo con
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `PORT`: puerto del servidor (por defecto 4000)

## 3. Correr

```bash
npm run dev     # con nodemon, se reinicia solo al guardar cambios
# o
npm start       # sin nodemon
```

## 4. Verificar que todo funciona

```bash
npm test
```

Esto valida la lógica, el ciclo de tiempo, los escenarios, las estadísticas,
los logros y la seguridad.
Los escenarios también se validan contra el esquema y se simulan durante
cinco minutos; el caso de cambio de edad comprueba la entrega de una reliquia.

También incluye `test-e2e.js`, un test más completo que levanta el
servidor real contra una base de datos MongoDB en memoria (usando
`mongodb-memory-server`) y hace peticiones HTTP reales con `fetch`. Este
test necesita poder descargar el binario de MongoDB la primera vez que
corre, así que solo funciona con acceso normal a internet:

```bash
node test-e2e.js
```

## Migrar aldeas existentes

Después de desplegar campos nuevos, ejecuta las migraciones idempotentes desde esta carpeta.
Para inicializar el historial, los contadores y la visibilidad de ranking:

```bash
npm run migrar-estadisticas
npm run migrar-logros
npm run migrar-perfil-ranking
npm run migrar-ciclo-vida
```

La migración de ciclo de vida asigna determinísticamente edad inicial y esperanza
a los aldeanos legacy. Las migraciones conservan los datos existentes y pueden
ejecutarse más de una vez.

Los nacimientos se evalúan una vez por año, con una probabilidad determinista
del 25 %, cuando hay espacio, dos adultos como mínimo y comida por encima de la
mitad de su capacidad. El recién nacido puede heredar el rasgo de uno de sus
padres (70 %); los demás rasgos se eligen determinísticamente. Los forasteros
siguen llegando mediante el umbral acumulativo de comida.

Al alcanzar la esperanza de vida, un aldeano fallece y el legado incrementa
`generaciones`. Los familiares supervivientes tienen un año de duelo, que reduce
su producción en un 5 %. Si la población cae por debajo de tres, se incorporan
forasteros deterministas para restablecer el mínimo.
Para documentos de despliegues anteriores que todavía no tienen `marcaDemo`,
ejecuta también `npm run migrar-marca-demo`; esa migración establece `false` y
también es idempotente.

## Endpoints

Todos los endpoints devuelven JSON. Los que requieren autenticación
esperan el header `Authorization: Bearer <token>`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/salud` | No | Chequeo de disponibilidad; devuelve `estado`, `mongo` y `version` de la API |
| POST | `/api/auth/registro` | No | `{ email, password, nombre, apodo? }` → crea usuario + aldea inicial, devuelve `{ token, usuario }` |
| POST | `/api/auth/login` | No | `{ email, password }` → devuelve `{ token, usuario }` |
| GET | `/api/auth/perfil` | Sí | Devuelve solo el apodo y la visibilidad del perfil |
| PATCH | `/api/auth/perfil` | Sí | Actualiza el apodo y/o la visibilidad del ranking |
| GET | `/api/aldea` | Sí | Trae la aldea del usuario (la crea si es la primera vez) y le aplica el progreso generado mientras la app estaba cerrada. Devuelve `{ aldea, progresoInactivo, resumenOffline }` |
| PUT | `/api/aldea` | Sí | Guarda el estado del juego después de comprobar el avance de años y los límites de capacidad |
| POST | `/api/aldea/escenario` | Sí | `{ escenario }` → reemplaza la aldea con un escenario de demo permitido; máximo 5 peticiones por minuto y usuario |
| POST | `/api/aldea/importar` | Sí | `{ aldea }` → valida y reemplaza la partida; la marca como demo para excluirla del ranking |
| POST | `/api/aldea/marca-demo` | Sí | Marca la aldea como demo; el campo es de solo activación y no puede modificarse desde `PUT` |
| GET | `/api/catalogo` | No | Edificios, capacidades base, rasgos laborales, constantes de población y logros |
| GET | `/api/catalogo/:tipoId/mejora/:nivelActual` | No | Costo y tiempo para subir ese edificio al siguiente nivel |
| GET | `/api/ranking?tipo=anios\|reliquias\|poblacion` | Sí | Top 20 y posición propia, solo para perfiles visibles; máximo 60 consultas por minuto y usuario |

## Ranking y guardado

El apodo es único sin distinguir mayúsculas, se filtra con la lista editable de
`src/utils/apodos.js` y solo puede cambiarse una vez al día. La visibilidad es
privada por defecto. El ranking no devuelve correo ni identificadores, excluye
aldeas demo y sospechosas, y mantiene cada clasificación en caché durante 30 s.

El `PUT /api/aldea` rechaza avances de año superiores a
`segundosReales / 180 + 2`, medidos desde una ancla temporal del servidor para
que el margen no se reponga en cada guardado, y recursos por encima de la capacidad calculada. Un
aumento de reliquias que no se justifique con edades completadas o logros
válidos se guarda, pero marca la aldea como sospechosa y la excluye del ranking.
Para aldeas demo ya marcadas por el servidor no se aplican los límites de años y
reliquias; el límite de capacidad sigue vigente. La marca demo no se puede activar
ni borrar enviando un campo en el `PUT`.

## Decisiones de diseño (para que las puedas explicar/defender)

- **Una aldea por usuario, no varias**: simplifica el alcance del
  proyecto. El campo `usuario` en el modelo `Village` tiene `unique:
  true`, así que Mongo lo garantiza a nivel de base de datos, no solo en
  el código.
- **Progreso offline con tope de 8 horas**: sin el tope, alguien podría
  dejar la app cerrada una semana y volver con una aldea absurdamente
  rica. Es la misma razón por la que juegos como Clash of Clans o
  Cookie Clicker limitan las horas de progreso "mientras no jugabas".
- **Almacenamiento ampliable y cadenas de producción**: el granero y el almacén
  aumentan su capacidad por nivel; los molinos convierten trigo en harina, los
  hornos harina en pan y los mineros consumen pan para producir hierro.
- **Oficios y rasgos**: los aldeanos generan recursos según su trabajo y el
  rasgo que poseen; reasignar a alguien a minería reduce la mano de obra
  disponible para madera o comida.
- **Ciclo día/noche**: cada ciclo tiene 120 segundos de día y 60 de noche. Al
  anochecer aparece un evento que puede defenderse con recursos o dejarse pasar,
  dañando estructuras que luego se reparan con madera. El reloj sigue avanzando
  durante el progreso offline.
- **Árbol del concejo y expediciones**: construir el centro de investigación
  habilita tecnologías repetibles. Con metalurgia, 12 niveles de edificios y 5
  aldeanos se puede fundar otra colonia; recursos y edificios se reinician, pero
  las reliquias conservan un multiplicador y pueden desbloquear planos antiguos.
- **Mejora de edificios procedural, sin nivel máximo**:
  `costoSiguienteNivel` y `tiempoSiguienteNivel` calculan el costo/tiempo
  a partir de fórmulas (`base * 1.15^nivel` y `base * 1.25^nivel`), no de
  datos escritos a mano nivel por nivel. Los precios de construcción se
  muestran en cada edificio antes de comprarlo.
- **El campo `usuario` del body siempre se ignora al guardar**
  (`guardarAldea` lo borra explícitamente antes de escribir en Mongo):
  así nadie puede mandar `{ usuario: "otro-id" }` en el PUT e intentar
  pisar la aldea de alguien más. El dueño real siempre sale del token
  JWT verificado, nunca del body.
- **JWT en vez de sesiones**: la app es móvil y stateless es más simple
  de manejar ahí — el cliente guarda el token localmente (por ejemplo con
  `expo-secure-store`) y lo manda en cada request.
- **`GET /api/aldea` crea la aldea si no existe** en vez de devolver 404:
  así el cliente no necesita un paso separado de "crear partida", el
  primer `GET` después de registrarse ya trae algo usable — aunque en la
  práctica `registrar` ya crea la aldea de una vez.

## Conectar con la app React Native

Desde la app, todas las peticiones van a `http://<tu-ip-local>:4000/api/...`
mientras desarrollas con Expo Go (no `localhost`, porque el teléfono y la
computadora son dispositivos distintos en la red). El token que devuelve
`/api/auth/login` o `/api/auth/registro` se guarda en el dispositivo y se
manda en cada request subsecuente.
