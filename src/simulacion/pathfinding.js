export function puntoLibre(rectangulo, punto, margen = 6) {
  return !(
    punto.x >= rectangulo.x - margen
    && punto.x <= rectangulo.x + (rectangulo.width || 72) + margen
    && punto.y >= rectangulo.y - margen
    && punto.y <= rectangulo.y + (rectangulo.height || 72) + margen
  );
}

export function caminoLibre(origen, destino, edificios, margen = 6, pasos = 10) {
  for (let indice = 1; indice <= pasos; indice += 1) {
    const t = indice / pasos;
    const punto = {
      x: origen.x + (destino.x - origen.x) * t,
      y: origen.y + (destino.y - origen.y) * t,
    };
    if ((edificios || []).some((edificio) => !puntoLibre(edificio, punto, margen))) return false;
  }
  return true;
}

export function buscarRuta(origen, destino, edificios = [], tamano = 32, ancho = 760, alto = 360) {
  const clave = (x, y) => `${x}:${y}`;
  const desde = { x: Math.round(origen.x / tamano), y: Math.round(origen.y / tamano) };
  const hasta = { x: Math.round(destino.x / tamano), y: Math.round(destino.y / tamano) };
  const cola = [desde];
  const visitados = new Set([clave(desde.x, desde.y)]);
  const padres = new Map();
  const direcciones = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let indice = 0; indice < cola.length; indice += 1) {
    const actual = cola[indice];
    if (actual.x === hasta.x && actual.y === hasta.y) break;
    for (const [dx, dy] of direcciones) {
      const siguiente = { x: actual.x + dx, y: actual.y + dy };
      const punto = { x: siguiente.x * tamano, y: siguiente.y * tamano };
      if (siguiente.x < 0 || siguiente.y < 0 || punto.x > ancho || punto.y > alto) continue;
      const id = clave(siguiente.x, siguiente.y);
      if (visitados.has(id) || edificios.some((edificio) => !puntoLibre(edificio, punto))) continue;
      visitados.add(id);
      padres.set(id, actual);
      cola.push(siguiente);
    }
  }

  const destinoId = clave(hasta.x, hasta.y);
  if (!visitados.has(destinoId)) return caminoLibre(origen, destino, edificios) ? [destino] : [origen];
  const ruta = [];
  let actual = hasta;
  while (actual.x !== desde.x || actual.y !== desde.y) {
    ruta.push({ x: actual.x * tamano, y: actual.y * tamano });
    actual = padres.get(clave(actual.x, actual.y));
    if (!actual) return [origen];
  }
  return ruta.reverse();
}
