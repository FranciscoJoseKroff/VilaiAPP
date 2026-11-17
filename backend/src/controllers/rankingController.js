const Aldea = require('../models/Village');
const Usuario = require('../models/User');

const DURACION_CACHE_MS = 30_000;
const cacheRanking = new Map();
const TIPOS_RANKING = new Set(['anios', 'reliquias', 'poblacion']);

async function cargarRanking(tipo) {
  const actual = Date.now();
  const cacheado = cacheRanking.get(tipo);
  if (cacheado && cacheado.expira > actual) return cacheado.filas;

  const valores = {
    anios: { $ifNull: ['$ciclo.dia', 0] },
    reliquias: { $ifNull: ['$legado.reliquias', 0] },
    poblacion: {
      $ifNull: [
        '$poblacionRanking',
        { $size: { $ifNull: ['$aldeanos', []] } },
      ],
    },
  };
  const filas = await Aldea.aggregate([
    { $match: { marcaDemo: { $ne: true }, sospechosa: { $ne: true } } },
    {
      $lookup: {
        from: Usuario.collection.name,
        localField: 'usuario',
        foreignField: '_id',
        as: 'perfil',
      },
    },
    { $unwind: '$perfil' },
    { $match: { 'perfil.rankingVisible': true, 'perfil.apodo': { $type: 'string' } } },
    {
      $project: {
        usuarioId: { $toString: '$usuario' },
        apodo: '$perfil.apodo',
        edad: '$edad.id',
        valor: valores[tipo],
      },
    },
    { $sort: { valor: -1, apodo: 1 } },
  ]).collation({ locale: 'es', strength: 2 });

  const ordenadas = filas.map((fila, indice) => ({
    usuarioId: fila.usuarioId,
    apodo: fila.apodo,
    edad: fila.edad,
    valor: Number(fila.valor) || 0,
    posicion: indice + 1,
  }));
  cacheRanking.set(tipo, { filas: ordenadas, expira: actual + DURACION_CACHE_MS });
  return ordenadas;
}

async function obtenerRanking(req, res) {
  const tipo = req.query.tipo;
  if (!TIPOS_RANKING.has(tipo)) {
    return res.status(400).json({ error: 'El tipo debe ser anios, reliquias o poblacion.' });
  }

  try {
    const filas = await cargarRanking(tipo);
    const propia = filas.find((fila) => fila.usuarioId === String(req.usuarioId));
    const filaPublica = ({ usuarioId, ...fila }) => fila;
    return res.json({
      tipo,
      filas: filas.slice(0, 20).map(filaPublica),
      tuPosicion: propia ? filaPublica(propia) : null,
    });
  } catch (error) {
    console.error('Error al obtener el ranking:', error.message);
    return res.status(500).json({ error: 'No se pudo cargar el ranking.' });
  }
}

function limpiarCacheRanking() {
  cacheRanking.clear();
}

module.exports = { obtenerRanking, limpiarCacheRanking };
