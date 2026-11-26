import { memo, useMemo } from 'react';
import { Rect } from '@shopify/react-native-skia';
import { theme } from '../../../theme';

// Paisaje estático de la escena (suelo, camino, estanque, bosque y detalles), en coordenadas del mapa.
// El mapa de la simulación mide 760×360; el paisaje se extiende más allá para que nunca se vean bordes.
export const MAPA = { ancho: 760, alto: 360 };
export const AREA_PAISAJE = { x0: -280, y0: -420, x1: 1040, y1: 780 };

// Ruido determinista (no Math.random): la misma celda siempre da el mismo valor entre 0 y 1.
// Así la decoración no cambia entre aperturas y se respeta la regla de determinismo del proyecto.
export function ruido(a, b) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const CELDA_SUELO = 24;
const CELDA_ARBOL = 34;
// Bajo el camino horizontal y a la izquierda del vertical, dentro de la vista inicial.
const ESTANQUE = { x: 250, y: 300 };
const FILAS_ESTANQUE = [44, 66, 78, 84, 80, 68, 46];
const ARBOLES_INTERIORES = [[22, 40], [728, 52], [740, 236], [18, 210], [300, 18], [520, 342], [660, 340], [196, 344]];

function Arbol({ x, y, p, invierno }) {
  return (
    <>
      <Rect x={x - 2} y={y + 20} width={20} height={4} color={p.sueloOscuro} />
      <Rect x={x + 6} y={y + 14} width={5} height={8} color={theme.colors.troncoArbol} />
      <Rect x={x} y={y + 6} width={17} height={10} color={p.copaSombra} />
      <Rect x={x + 1} y={y + 1} width={15} height={10} color={p.copa} />
      <Rect x={x + 4} y={y - 3} width={9} height={6} color={p.copa} />
      <Rect x={x + 4} y={y + (invierno ? -3 : 1)} width={invierno ? 9 : 5} height={invierno ? 3 : 3} color={p.copaLuz} />
    </>
  );
}

function construirPaisaje(estacion) {
  const p = theme.colors.escena[estacion] || theme.colors.escena.primavera;
  const invierno = estacion === 'invierno';
  const piezas = [];
  const k = (prefijo, a, b) => `${prefijo}-${a}-${b}`;

  // Suelo: color base más manchas claras/oscuras dispersas y matas de pasto.
  piezas.push(<Rect key="suelo" x={AREA_PAISAJE.x0} y={AREA_PAISAJE.y0} width={AREA_PAISAJE.x1 - AREA_PAISAJE.x0} height={AREA_PAISAJE.y1 - AREA_PAISAJE.y0} color={p.suelo} />);
  for (let cx = AREA_PAISAJE.x0 / CELDA_SUELO; cx < AREA_PAISAJE.x1 / CELDA_SUELO; cx += 1) {
    for (let cy = AREA_PAISAJE.y0 / CELDA_SUELO; cy < AREA_PAISAJE.y1 / CELDA_SUELO; cy += 1) {
      const r = ruido(cx, cy);
      const x = cx * CELDA_SUELO;
      const y = cy * CELDA_SUELO;
      if (r < 0.13) piezas.push(<Rect key={k('c', cx, cy)} x={x} y={y + 6} width={CELDA_SUELO} height={12} color={p.sueloClaro} />);
      else if (r > 0.88) {
        // Mancha irregular (dos rectángulos) para que no se lea como una columna.
        piezas.push(<Rect key={k('o', cx, cy)} x={x} y={y + 10} width={22} height={6} color={p.sueloOscuro} />);
        piezas.push(<Rect key={k('o2', cx, cy)} x={x + 6} y={y + 6} width={12} height={4} color={p.sueloOscuro} />);
      }
      if (ruido(cx + 911, cy) < 0.16) piezas.push(<Rect key={k('m', cx, cy)} x={x + 8} y={y + 10} width={4} height={2} color={p.sueloOscuro} />);
    }
  }

  // Camino de tierra: entra por abajo y cruza la aldea.
  piezas.push(<Rect key="camino-v-b" x={370} y={180} width={20} height={AREA_PAISAJE.y1 - 180} color={p.caminoBorde} />);
  piezas.push(<Rect key="camino-v" x={372} y={180} width={16} height={AREA_PAISAJE.y1 - 180} color={p.camino} />);
  piezas.push(<Rect key="camino-h-b" x={140} y={176} width={480} height={20} color={p.caminoBorde} />);
  piezas.push(<Rect key="camino-h" x={140} y={178} width={480} height={16} color={p.camino} />);

  // Estanque: filas centradas forman una mancha redondeada, con orilla y brillos.
  FILAS_ESTANQUE.forEach((ancho, fila) => {
    const y = ESTANQUE.y - (FILAS_ESTANQUE.length * 6) / 2 + fila * 6;
    piezas.push(<Rect key={`orilla-${fila}`} x={ESTANQUE.x - ancho / 2 - 3} y={y - 3} width={ancho + 6} height={12} color={p.orilla} />);
  });
  FILAS_ESTANQUE.forEach((ancho, fila) => {
    const y = ESTANQUE.y - (FILAS_ESTANQUE.length * 6) / 2 + fila * 6;
    piezas.push(<Rect key={`agua-${fila}`} x={ESTANQUE.x - ancho / 2} y={y} width={ancho} height={6} color={p.agua} />);
  });
  piezas.push(<Rect key="brillo-1" x={ESTANQUE.x - 22} y={ESTANQUE.y - 10} width={14} height={2} color={p.aguaLuz} />);
  piezas.push(<Rect key="brillo-2" x={ESTANQUE.x + 6} y={ESTANQUE.y + 2} width={10} height={2} color={p.aguaLuz} />);

  // Flores y piedras dentro del mapa (en invierno, sin flores).
  for (let cx = 0; cx < MAPA.ancho / 30; cx += 1) {
    for (let cy = 0; cy < MAPA.alto / 30; cy += 1) {
      const r = ruido(cx + 300, cy + 300);
      const x = cx * 30 + Math.floor(ruido(cx, cy + 77) * 24);
      const y = cy * 30 + Math.floor(ruido(cx + 77, cy) * 24);
      if (p.flores.length && r < 0.1) {
        piezas.push(<Rect key={k('f', cx, cy)} x={x} y={y} width={3} height={3} color={p.flores[Math.floor(r * 100) % p.flores.length]} />);
        piezas.push(<Rect key={k('t', cx, cy)} x={x + 1} y={y + 3} width={1} height={2} color={p.copaSombra} />);
      } else if (r > 0.965) {
        piezas.push(<Rect key={k('p', cx, cy)} x={x} y={y + 1} width={7} height={4} color={theme.colors.salviaOscura} />);
        piezas.push(<Rect key={k('q', cx, cy)} x={x + 1} y={y} width={4} height={2} color={theme.colors.niebla} />);
      }
    }
  }

  // Bosque: rodea el mapa (fuera de la zona de la aldea) y algunos árboles sueltos en los bordes.
  const arboles = ARBOLES_INTERIORES.map(([x, y]) => ({ x, y }));
  for (let cx = Math.floor(AREA_PAISAJE.x0 / CELDA_ARBOL); cx < AREA_PAISAJE.x1 / CELDA_ARBOL; cx += 1) {
    for (let cy = Math.floor(AREA_PAISAJE.y0 / CELDA_ARBOL); cy < AREA_PAISAJE.y1 / CELDA_ARBOL; cy += 1) {
      const x = cx * CELDA_ARBOL + Math.floor(ruido(cx, cy + 5) * 14);
      const y = cy * CELDA_ARBOL + Math.floor(ruido(cx + 5, cy) * 14);
      const fuera = x < -24 || x > MAPA.ancho + 6 || y < -30 || y > MAPA.alto + 8;
      // Más denso lejos de la aldea; justo en el borde quedan claros para que no parezca un muro.
      const distancia = Math.max(-x - 24, x - MAPA.ancho - 6, -y - 30, y - MAPA.alto - 8);
      if (fuera && ruido(cx + 41, cy + 13) < Math.min(0.85, 0.35 + distancia / 220)) arboles.push({ x, y });
    }
  }
  arboles.sort((a, b) => a.y - b.y);
  arboles.forEach(({ x, y }, indice) => piezas.push(<Arbol key={`arbol-${indice}`} x={x} y={y} p={p} invierno={invierno} />));

  return piezas;
}

// memo + useMemo: el paisaje solo se vuelve a armar cuando cambia la estación, no en cada tick de la simulación.
export const PaisajeAldea = memo(function PaisajeAldea({ estacion }) {
  return useMemo(() => construirPaisaje(estacion), [estacion]);
});
