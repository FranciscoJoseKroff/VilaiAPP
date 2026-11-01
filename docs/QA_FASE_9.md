# QA final — Fase 9

## Resultados automatizados

- Contraste de tokens principales: todos los pares usados en texto superan 4.5:1.
  - `textoPrimario` sobre fondo: 14.63:1.
  - `textoSecundario` sobre fondo: 8.10:1.
  - `textoSecundario` sobre superficieAlta: 5.39:1.
  - `acento`, `exito` y `aviso` sobre las superficies principales superan 4.5:1.
- `peligro` sobre borde queda por debajo de 4.5:1 (4.44:1); no se usa borde como fondo de texto.
- `npx eslint` sobre los archivos principales de Fase 9 finaliza sin errores; quedan advertencias de hooks heredadas y deben revisarse antes de una entrega estricta.
- Exportación web correcta con `npx expo export --platform web`.
- El tick permanece activo al navegar y el guardado conservó el intervalo de 5 segundos.
- `PixelVillage` usa `React.memo` con firma visual para evitar rerenderizados irrelevantes por el tick.

## Checklist manual

| Plataforma | Paso | Resultado esperado |
|---|---|---|
| Web | Iniciar sin sesión | Marca Vilai, campos etiquetados y validación de correo/contraseña. |
| Web | Cambiar entre login y registro | Alternancia accesible, sin pérdida de campos y botón con foco visible. |
| Web | Reducir a 2 columnas y ampliar a 960-1280 px | Contenido centrado, máximo 960 px, sin desbordes horizontales. |
| Web | Navegar por las 4 pestañas durante 30 s | Recursos siguen avanzando, no se reinicia el guardado ni el tick. |
| Web | Desactivar haptics y recargar | La preferencia permanece desactivada. |
| Web | Desconectar la red y guardar | Aparece “Sin conexión, reintentando...” y el progreso local no desaparece. |
| Android | Abrir login con teclado | `KeyboardAvoidingView` permite llegar al botón sin ocultar campos. |
| Android | Activar lector de pantalla | Botones principales tienen etiqueta, rol, hint y estado deshabilitado. |
| Android | Abrir aldeano, construcción, evento nocturno | Se puede cerrar con gesto o botón, las áreas táctiles permiten tocar con precisión. |
| Android | Modo de pantalla grande/tablet | Aldea usa 2 columnas y pantallas centrales usan ancho máximo de 960 px. |
| Android | Cerrar sesión desde Ajustes | Alerta pide confirmación antes de borrar la sesión. |
| iPhone | Abrir con Safe Area activa | Sin solapes con notch ni barra inferior. |
| iPhone | Login con SecureStore | Tras cerrar y reabrir, conserva sesión válida sin mostrar login de nuevo. |
| iPhone | Simular token vencido | Muestra sesión expirada, inicia cierre y vuelve al login amable. |
| Todas | Aldea sin edificios ni aldeanos | Mensajes vacíos claros y recomendación de construir una casa. |
| Todas | Nombre largo de aldeano | El nombre se trunca o envuelve sin romper tarjetas ni modal. |
| Todas | Almacén lleno | La barra de capacidad pasa a aviso y muestra “Lleno”. |
| Todas | Evento nocturno | Banner visible desde todas las pestañas y resolución conserva la lógica actual. |
| Todas | Reabrir tras más de 1 h | Modal muestra progreso offline limitado a 8 horas y los recursos ganados. |

## Rendimiento

- La medición empírica final con React DevTools Profiler depende de un dispositivo y sesión real, por lo que no se sustituye por una estimación automática.
- Antes de realizar medición manual: activar “Highlight updates” y registrar 30 s en Aldea.
- Después: repetir la grabación, comparar commits de pantallas memoizadas y confirmar que la escena PixelVillage no cambia en cada tick salvo cambios visuales reales.
- Los contadores de render obtenidos deben archivarse en una sesión de QA; el proyecto no añade instrumentos de profiler de producción.

## Problemas conocidos

1. El contexto `GameContext` continúa entregando el estado completo y puede generar actualizaciones amplias, aunque su valor está memoizado.
2. Algunas pantallas heredadas contienen controles sin etiqueta específica en flujos secundarios; pendiente auditoría automatizada completa.
3. La medición real de 60 fps, lector de pantalla y fuente del sistema requiere dispositivos físicos.
4. La compatibilidad visual exacta de tablet, web y Safe Area requiere una prueba manual en cada plataforma.
