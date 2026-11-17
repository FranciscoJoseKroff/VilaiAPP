async function migrarLogros(Aldea) {
  const resultado = await Aldea.updateMany(
    { logros: { $exists: false } },
    { $set: { logros: [] } }
  );
  return resultado.modifiedCount;
}

function asegurarLogros(aldea) {
  if (!aldea || typeof aldea !== 'object') return aldea;
  if (!Array.isArray(aldea.logros)) {
    aldea.logros = [];
    if (typeof aldea.markModified === 'function') aldea.markModified('logros');
  }
  return aldea;
}

module.exports = { migrarLogros, asegurarLogros };
