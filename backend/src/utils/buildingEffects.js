function calcularEfectosEdificios(aldea, tiposEdificio) {
  const efectos = {
    produccionGeneral: 0,
    velocidadInvestigacion: 1,
    avisoEventoSegundos: 0,
    multiplicadorGuardia: 1,
  };
  for (const edificio of aldea?.edificios || []) {
    const info = tiposEdificio?.[edificio.tipoId];
    if (!info) continue;
    const integridad = Math.max(0, Math.min(1, Number(edificio.integridad ?? 100) / 100));
    const nivel = Math.min(Number(edificio.nivel || 1), Number(info.maxNivel || Infinity)) * integridad;
    efectos.produccionGeneral += Number(info.efectoProduccionGeneral || 0) * nivel;
    efectos.velocidadInvestigacion += Number(info.efectoVelocidadInvestigacion || 0) * nivel;
    efectos.avisoEventoSegundos += Number(info.avisoEventoSegundos || 0) * nivel;
    efectos.multiplicadorGuardia += Number(info.multiplicadorGuardia || 0) * nivel;
  }
  return efectos;
}

module.exports = { calcularEfectosEdificios };
