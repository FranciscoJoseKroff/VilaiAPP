const MAX_PUNTOS_ESTADISTICAS = 120;
const NOMBRES_CONTADORES = [
  'eventosDefendidos',
  'eventosAceptados',
  'edificiosConstruidos',
  'aldeanosLlegados',
  'investigacionesCompletas',
];

function crearEstadisticasIniciales() {
  return {
    serie: [],
    contadores: Object.fromEntries(NOMBRES_CONTADORES.map((nombre) => [nombre, 0])),
  };
}

function registrarAnio(aldea) {
  if (!aldea || typeof aldea !== 'object') return aldea;
  const anio = Number(aldea.ciclo?.dia);
  if (!Number.isInteger(anio) || anio < 1) return aldea;

  const estadisticas = aldea.estadisticas || crearEstadisticasIniciales();
  const serie = Array.isArray(estadisticas.serie) ? estadisticas.serie : [];
  if (Number(serie[serie.length - 1]?.a) === anio) return aldea;

  const entero = (valor) => Math.max(0, Math.round(Number(valor) || 0));
  const punto = {
    a: anio,
    r: {
      madera: entero(aldea.recursos?.madera),
      comida: entero(aldea.recursos?.comida),
      hierro: entero(aldea.recursos?.hierro),
      oro: entero(aldea.recursos?.oro),
    },
    p: entero(aldea.aldeanos?.length),
    e: String(aldea.edad?.id || 'calma'),
  };

  return {
    ...aldea,
    estadisticas: {
      serie: [...serie, punto].slice(-MAX_PUNTOS_ESTADISTICAS),
      contadores: { ...crearEstadisticasIniciales().contadores, ...(estadisticas.contadores || {}) },
    },
  };
}

function incrementarContador(aldea, nombre) {
  if (!aldea || !NOMBRES_CONTADORES.includes(nombre)) return aldea;
  const iniciales = crearEstadisticasIniciales();
  const estadisticas = aldea.estadisticas || iniciales;
  const contadores = { ...iniciales.contadores, ...(estadisticas.contadores || {}) };

  return {
    ...aldea,
    estadisticas: {
      serie: Array.isArray(estadisticas.serie)
        ? estadisticas.serie.slice(-MAX_PUNTOS_ESTADISTICAS)
        : [],
      contadores: {
        ...contadores,
        [nombre]: Math.max(0, Math.trunc(Number(contadores[nombre]) || 0)) + 1,
      },
    },
  };
}

module.exports = {
  MAX_PUNTOS_ESTADISTICAS,
  NOMBRES_CONTADORES,
  crearEstadisticasIniciales,
  registrarAnio,
  incrementarContador,
};
