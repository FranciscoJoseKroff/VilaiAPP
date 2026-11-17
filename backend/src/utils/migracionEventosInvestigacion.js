async function migrarEventosInvestigacion(Modelo) {
  const [eventos, investigaciones] = await Promise.all([
    Modelo.updateMany(
      { eventoPrevisto: { $exists: false } },
      { $set: { eventoPrevisto: { tipo: null, dia: 0, segundosRestantes: 0 } } }
    ),
    Modelo.updateMany(
      { investigacionEnCurso: { $exists: false } },
      { $set: { investigacionEnCurso: { id: null, nivelObjetivo: null, progresoSegundos: 0 } } }
    ),
  ]);
  return Number(eventos.modifiedCount || 0) + Number(investigaciones.modifiedCount || 0);
}

module.exports = { migrarEventosInvestigacion };
