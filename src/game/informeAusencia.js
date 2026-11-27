// Arma el informe "Mientras no estabas" con lo que ya manda GET /api/aldea:
// resumenTiempo (años, edades y entradas nuevas de la crónica), resumenOffline
// (tiempo ausente, recursos, logros) y la aldea (evento del año pendiente).
// Es lógica pura, sin interfaz, para poder probarla con node --test.

export const MINIMO_SEGUNDOS_INFORME = 60;

export function formatearAusencia(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  if (horas > 0) return `${horas} h${minutos ? ` ${minutos} min` : ''}`;
  if (minutos > 0) return `${minutos} min`;
  return 'menos de 1 min';
}

export function armarInformeAusencia({ resumenTiempo, resumenOffline, aldea } = {}) {
  const cambios = Array.isArray(resumenTiempo?.cambios) ? resumenTiempo.cambios : [];
  const deTipo = (...tipos) => cambios.filter((c) => tipos.includes(c.tipo));
  const segundosAusente = Number(resumenOffline?.segundosAusente || resumenTiempo?.segundos || 0);
  const anios = Number(resumenTiempo?.anios || 0);
  const { edadAnterior, edadNueva } = resumenTiempo || {};
  const recursos = Object.entries(resumenOffline?.recursosGenerados || {})
    .filter(([, cantidad]) => typeof cantidad === 'number' && cantidad >= 1)
    .map(([recurso, cantidad]) => ({ recurso, cantidad }));
  const evento = aldea?.eventoNocturno?.tipo
    ? { tipo: aldea.eventoNocturno.tipo, anio: Number(aldea.eventoNocturno.dia || 0) }
    : null;

  return {
    // Se muestra si la ausencia fue larga o si alcanzó a pasar un año del juego.
    mostrar: segundosAusente > MINIMO_SEGUNDOS_INFORME || anios >= 1,
    tiempo: formatearAusencia(segundosAusente),
    anios,
    cambioEdad: edadAnterior && edadNueva && edadAnterior !== edadNueva ? { de: edadAnterior, a: edadNueva } : null,
    alcanzoTope8h: Boolean(resumenOffline?.alcanzoTope8h),
    // Cada edad que empezó durante la ausencia (las edades pueden repetirse en ciclo).
    edades: deTipo('edad'),
    evento,
    reliquias: deTipo('reliquia'),
    // Llegadas, nacimientos y fallecimientos en el orden en que ocurrieron.
    poblacion: deTipo('aldeano', 'nacimiento', 'fallecimiento'),
    investigaciones: deTipo('investigacion'),
    logros: resumenOffline?.logrosDesbloqueados || [],
    // Las etapas de vida son muchas y poco importantes: solo se cuentan.
    cambiosDeEtapa: deTipo('etapa_vida').length,
    recursos,
  };
}
