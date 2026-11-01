# Vilai: instrucciones para Copilot

Vilai es un juego incremental de construcción de aldea para móviles (Expo, React Native,
JavaScript). La aldea crece de forma semi-autónoma y debe sentirse simple pero adictiva.
El backend (Node/Express/MongoDB) está en otro proyecto y no se toca desde aquí.

## Reglas
- La lógica de juego no se toca, salvo la lógica de tiempo (ciclo, años, estaciones, edades)
  cuando la fase lo indique. Producción base, costos, población y contrato de la API no cambian.
- La lógica de tiempo debe ser idéntica en front y back (misma fórmula). Prohibido Math.random()
  en la simulación: usa el generador determinista de tiempo.js.
- Los cambios de API son aditivos; no quites campos existentes del catálogo ni cambies el
  formato de progresoInactivo.
- No renombres campos del esquema de Mongoose (ciclo.dia pasa a significar "año").
- Trabaja solo dentro del alcance de la fase que te indique; no refactorices fuera de ella.
- Consulta la documentación de la versión de Expo instalada (ver package.json y AGENTS.md)
  y usa `npx expo install` para paquetes.
- Usa los tokens de theme.js; no agregues colores hex sueltos.
- Textos de UI en español, archivos en UTF-8.
- Mantén la identidad visual: fondo verde bosque (#0d1f1a), acento dorado (#e7b85c),
  escena pixel art hecha con Views.
- Al terminar, indica cómo probar (`npx expo start --web` y en el teléfono) y qué debería verse. 
- Los efectos de investigación (tecnologías y doctrinas) solo se calculan en investigacion.js
  (idéntico en front y back). Prohibido escribir bonos de tecnologías directamente en la
  simulación, en la IA o en la interfaz.
- El azar en simulación es determinista (generador de tiempo.js); nada de Math.random().
- Cambios de API aditivos: no quites campos del catálogo ni del esquema; no renombres campos.
- Cuando un prompt diga "alto y reporta", detente, muéstrame la tabla o el diagnóstico y espera
  mi "ok" antes de seguir.