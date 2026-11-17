export const CALIDADES_GRAFICAS = Object.freeze(['alta', 'media', 'baja', 'auto']);
export const PARTICULAS_AMBIENTALES_BASE = 18;

export function normalizarCalidadGrafica(valor) {
  return CALIDADES_GRAFICAS.includes(valor) ? valor : 'auto';
}

export function perfilCalidadGrafica(calidad, reducirAnimaciones = false) {
  const nivel = normalizarCalidadGrafica(calidad);
  const efectivo = nivel === 'auto' ? 'alta' : nivel;
  const animacionesHabilitadas = !reducirAnimaciones && efectivo !== 'baja';
  const particulas = reducirAnimaciones
    ? 0
    : efectivo === 'baja'
      ? 0
      : efectivo === 'media'
        ? Math.floor(PARTICULAS_AMBIENTALES_BASE / 2)
        : PARTICULAS_AMBIENTALES_BASE;

  return {
    nivel: efectivo,
    particulas,
    coposNieve: reducirAnimaciones || efectivo === 'baja' ? 0 : efectivo === 'media' ? 2 : 4,
    textosFlotantes: efectivo === 'baja' ? 2 : Infinity,
    transicionesEstacion: animacionesHabilitadas,
    animacionEscena: animacionesHabilitadas,
  };
}

export function calidadRecomendada(fps) {
  const promedio = Number(fps);
  if (!Number.isFinite(promedio) || promedio >= 40) return null;
  return promedio < 30 ? 'baja' : 'media';
}
