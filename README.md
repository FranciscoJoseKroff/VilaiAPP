# Vilai

Juego incremental de construcción de aldea para móviles. La aldea crece de forma semi-autónoma: los aldeanos eligen su oficio según lo que la aldea necesita, el tiempo avanza por años, estaciones y edades, y el progreso se calcula también mientras la app está cerrada.

> Proyecto del curso **Tecnologías Web y Móviles** · Ingeniería Civil en Informática · Universidad de Los Lagos.
> Autor: Francisco José Kroff Inzunza.

## Documentación del proyecto

- **Bitácora de diseño y frontend móvil:** [`docs/bitacora.md`](docs/bitacora.md)
- **Diseño en Figma / Penpot:** 
- **Prompts usados con IA generativa:** [`docs/prompts/`](docs/prompts/)


## Funciones principales

- Cuentas de usuario con inicio de sesión y una aldea por cuenta.
- Producción pasiva de recursos, población máxima según las casas y llegada automática de aldeanos.
- Aldeanos autónomos: cada uno decide su oficio con una IA de utilidad y explica su decisión ("Por qué lo hizo").
- Tiempo por años, estaciones y edades, con eventos (helada, bestias, recaudador).
- Construcción y mejora de edificios, y árbol de investigación con efectos.
- Progreso fuera de línea calculado por el servidor (tope de 8 horas) y guardado automático en la nube.

## Tecnologías

| Parte | Stack |
|---|---|
| App móvil | Expo SDK 58, React Native 0.88, React 19, Expo Router, Skia, Reanimated |
| Servidor | Node.js, Express, Mongoose, JWT y bcrypt |
| Base de datos | MongoDB (Atlas) |

## Requisitos

- **Node.js 24** (la versión indicada en `backend/package.json`) y npm.
- **Git**.
- Un teléfono con **Expo Go compatible con el SDK 58**, conectado a la **misma red Wi-Fi** que el computador (o la versión web en el navegador).
- Una base de datos MongoDB: una cuenta gratuita en [MongoDB Atlas](https://www.mongodb.com/atlas) o una instalación local.

## Cómo ejecutarlo

### 1. Clonar e instalar

```bash
git clone https://github.com/FranciscoJoseKroff/VilaiAPP.git
cd VilaiAPP
npm install
cd backend
npm install
cd ..
```

### 2. Configurar y arrancar el servidor

```bash
cd backend
cp .env.example .env      # en Windows (cmd): copy .env.example .env
```

Edita `backend/.env` y completa (sin comillas):

| Variable | Qué poner |
|---|---|
| `MONGODB_URI` | Tu cadena de conexión de MongoDB, con el nombre de la base (por ejemplo `.../vilai_dev?...`) |
| `JWT_SECRET` | Un texto aleatorio de 32 caracteres o más |
| `PORT` | `4000` |
| `NODE_ENV` | `development` |

Para generar un `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

```bash
npm run dev
```

Comprueba que responde: `http://localhost:4000/api/salud`.

### 3. Arrancar la app

En otra terminal, en la raíz del repositorio. Para probar desde el teléfono, la app necesita la dirección del servidor en tu red local. Crea un archivo `.env` en la raíz con tu IP (en Linux: `ip -4 addr`; en Windows: `ipconfig`):

```
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:4000/api
```

```bash
npx expo start
```

Escanea el código QR con **Expo Go** (Android) o con la cámara (iPhone). Para la versión web: `npx expo start --web`.

## Estructura del proyecto

```
VilaiAPP/
├── src/
│   ├── app/            Rutas de Expo Router (pestañas, ajustes, créditos)
│   ├── components/     Componentes reutilizables (paneles, botones, escena)
│   ├── screens/        Pantallas fuera de las rutas (login)
│   ├── game/           Lógica compartida del juego (tiempo, IA, investigación)
│   ├── simulacion/     Simulación visual de los aldeanos
│   ├── hooks/          Estado y guardado de la aldea
│   ├── context/        Contexto global del juego
│   ├── data/           Datos estáticos (iconos, créditos)
│   └── audio/          Efectos de sonido
├── theme.js            Colores y tipografía (tokens de diseño)
├── backend/            API REST (Express + Mongoose)
├── fixtures/           Vectores de prueba compartidos entre app y servidor
├── scripts/            Scripts de verificación
├── e2e/                Pruebas de extremo a extremo
├── assets/             Íconos, fuentes e imágenes
└── docs/               Bitácora, imágenes y prompts
```

## Pruebas

```bash
npm test                  # app: simulación
cd backend && npm test    # servidor: lógica y seguridad
```

## Créditos y licencias

- Iconos de [game-icons.net](https://game-icons.net), licencia CC BY 3.0 (autores en la pantalla **Créditos** de la app).
- Avatares con [DiceBear](https://www.dicebear.com), estilo Pixel Art (CC0).
- Fuentes Press Start 2P e Inter, de Google Fonts.
- Sonidos de [Kenney](https://kenney.nl) (CC0).

## Licencia

MIT. Ver [`LICENSE`](LICENSE).
