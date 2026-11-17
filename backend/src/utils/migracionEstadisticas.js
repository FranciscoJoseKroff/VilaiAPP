const { crearEstadisticasIniciales } = require('./estadisticas');

async function migrarEstadisticas(Aldea) {
  const resultado = await Aldea.updateMany(
    { estadisticas: { $exists: false } },
    { $set: { estadisticas: crearEstadisticasIniciales() } }
  );
  return resultado.modifiedCount;
}

function asegurarEstadisticas(aldea) {
  if (!aldea || typeof aldea !== 'object') return aldea;
  const iniciales = crearEstadisticasIniciales();
  const estadisticas = aldea.estadisticas || {};
  const serie = Array.isArray(estadisticas.serie) ? estadisticas.serie.slice(-120) : [];
  const contadores = { ...iniciales.contadores, ...(estadisticas.contadores || {}) };
  const faltanCampos = !aldea.estadisticas
    || !Array.isArray(estadisticas.serie)
    || !estadisticas.contadores
    || Object.keys(iniciales.contadores).some((nombre) => estadisticas.contadores[nombre] == null);

  if (faltanCampos || serie.length !== estadisticas.serie?.length) {
    aldea.estadisticas = { serie, contadores };
    if (typeof aldea.markModified === 'function') aldea.markModified('estadisticas');
  }
  return aldea;
}

module.exports = { migrarEstadisticas, asegurarEstadisticas };
