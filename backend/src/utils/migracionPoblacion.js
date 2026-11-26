// Las recompensas de metas agregaban aldeanos sin subir poblacionMaxima y algunas aldeas quedaron
// con más habitantes que el máximo ("3 de 1"). Al cargar, el máximo nunca queda por debajo de la
// población actual. Idempotente: si ya cuadra, no cambia nada.
function asegurarPoblacionMaxima(aldea) {
  const poblacion = Array.isArray(aldea.aldeanos) ? aldea.aldeanos.length : 0;
  if (Number(aldea.poblacionMaxima || 0) < poblacion) aldea.poblacionMaxima = poblacion;
  return aldea;
}

module.exports = { asegurarPoblacionMaxima };
