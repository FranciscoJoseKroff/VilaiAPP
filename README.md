# VilaiAPP

Aplicación móvil de gestión de una aldea inspirada en juegos de estrategia.
El proyecto se divide en una interfaz Expo/React Native y una API Node.js con MongoDB.

## Estructura

```text
/
├── src/          Código del frontend y pantallas de Expo Router
├── assets/       Imágenes, iconos y recursos audiovisuales
├── docs/         Documentación del proyecto
├── fixtures/     Datos de prueba
├── scripts/      Utilidades de mantenimiento
├── backend/      API REST con Node.js, Express y MongoDB
└── package.json  Dependencias y comandos del frontend
```

## Frontend

Requisitos: Node.js y Expo CLI.

```bash
npm install
npm start
```

Comandos adicionales:

```bash
npm run web
npm run android
npm run lint
npm test
```

## Backend

El servidor necesita Node.js y una conexión a MongoDB.

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Antes de ejecutar el backend, completa las variables de entorno en `backend/.env`.
El archivo `.env` contiene información privada y no debe subirse al repositorio.

## Ejecución en red local

Mientras se desarrolla con Expo Go, el teléfono y la computadora deben estar
conectados a la misma red. Configura la API del frontend con la dirección IP
local de la computadora y el puerto usado por el backend.
