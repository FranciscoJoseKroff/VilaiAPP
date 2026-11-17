# Pruebas E2E del front

Las pruebas Playwright ejercitan el build web de producción contra un backend local y una base MongoDB temporal en memoria. Incluyen registro e inicio de sesión, escena y construcción con persistencia, descarga e importación de partida (incluido el rechazo de enums inválidos), y un guardado 400 para comprobar que no se confunde con desconexión ni se repite automáticamente. También miden durante cinco segundos la escena con cada calidad gráfica (Alta, Media, Baja y Auto) e imprimen los FPS observados.

## Preparación y ejecución

Desde la raíz del proyecto:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

La primera ejecución puede descargar Chromium. El runner también prepara una instancia local de MongoDB en memoria, exporta la web con `EXPO_PUBLIC_API_URL=http://127.0.0.1:4123/api` y la sirve en `http://127.0.0.1:4173` con `npx serve -s dist`. Al terminar, Playwright cierra ambos servidores y la base temporal.

La prueba falla ante excepciones JavaScript no controladas (`pageerror`) y respuestas HTTP 4xx/5xx. La captura de la pestaña Aldea se guarda en [docs/capturas-e2e/aldea.png](./capturas-e2e/aldea.png).

## Descargas y espacio

`@playwright/test` es una dependencia de desarrollo; el paquete npm ocupa unos **28 KB**. Chromium es la descarga grande. En la instalación de Windows probada, Playwright descargó Chrome for Testing (**207,3 MiB**), Chrome Headless Shell (**123,8 MiB**), FFmpeg (**1,6 MiB**) y Winldd (**0,1 MiB**): unos **333 MiB descargados** y **743 MiB instalados** en total. El tamaño cambia según la versión y el sistema operativo. Playwright guarda estos binarios en la caché del usuario, no dentro de `node_modules`. El servidor estático `serve` se ejecuta mediante `npx` y no se agrega a las dependencias del proyecto.

La primera puesta en marcha de `mongodb-memory-server` también puede descargar el binario de MongoDB si no está en caché; esa descarga es independiente de Playwright.
