const {
  CAPACIDADES_BASE,
  EDADES,
  LOGROS,
  RELIQUIAS,
  calcularCapacidades,
} = require('./villageDefaults');
const { progresoLogro } = require('./logros');

const TOLERANCIA_RECURSOS = 1e-6;

function transicionesPosibles(aldeaAnterior, aldeaNueva) {
  let aniosRestantes = Math.max(
    0,
    Number(aldeaNueva.ciclo?.dia || 1) - Number(aldeaAnterior.edad?.inicioAnio || 1)
  );
  let duracion = Math.max(1, Number(aldeaAnterior.edad?.duracionAnios || 10));
  let transiciones = 0;

  while (aniosRestantes >= duracion) {
    aniosRestantes -= duracion;
    transiciones += 1;
    duracion = Math.min(...Object.values(EDADES).map((edad) => edad.duracionAnios[0]));
  }
  return transiciones;
}

function premioLogrosNuevos(aldeaAnterior, aldeaNueva) {
  if (!Array.isArray(aldeaNueva.logros)) return 0;
  const anteriores = new Set((Array.isArray(aldeaAnterior.logros) ? aldeaAnterior.logros : []).map((logro) => logro.id));
  const nuevos = new Set(aldeaNueva.logros.map((logro) => logro.id));
  const aldeaEvaluable = {
    ...aldeaNueva,
    cronica: Array.isArray(aldeaNueva.cronica) ? aldeaNueva.cronica : [],
    aldeanos: Array.isArray(aldeaNueva.aldeanos) ? aldeaNueva.aldeanos : [],
    edificios: Array.isArray(aldeaNueva.edificios) ? aldeaNueva.edificios : [],
    tecnologias: aldeaNueva.tecnologias && typeof aldeaNueva.tecnologias === 'object'
      ? aldeaNueva.tecnologias
      : {},
    estadisticas: aldeaNueva.estadisticas && typeof aldeaNueva.estadisticas === 'object'
      ? aldeaNueva.estadisticas
      : {},
  };
  return LOGROS.reduce((total, logro) => {
    if (anteriores.has(logro.id) || !nuevos.has(logro.id)) return total;
    if (progresoLogro(aldeaEvaluable, logro) < Number(logro.meta?.valor || Infinity)) return total;
    return total + Math.max(0, Number(logro.premioReliquias) || 0);
  }, 0);
}

function evaluarAldea(aldeaNueva, aldeaAnterior, ahora = Date.now()) {
  if (!aldeaAnterior) return { rechazo: null, marcarSospechosa: false };
  if (!Array.isArray(aldeaNueva.edificios)
    || !aldeaNueva.recursos
    || typeof aldeaNueva.recursos !== 'object'
    || Array.isArray(aldeaNueva.recursos)
    || (aldeaNueva.tecnologias != null
      && (typeof aldeaNueva.tecnologias !== 'object' || Array.isArray(aldeaNueva.tecnologias)))) {
    return {
      rechazo: 'Los datos de recursos o capacidad de la aldea no son válidos.',
      marcarSospechosa: false,
    };
  }

  const esDemo = aldeaAnterior.marcaDemo === true;
  if (!esDemo) {
    const ancla = aldeaAnterior.anclaAntiTrampas || {};
    const cicloBase = Number(ancla.cicloDia || aldeaAnterior.ciclo?.dia || 1);
    const inicioAncla = new Date(ancla.inicio || aldeaAnterior.ultimoGuardado || aldeaAnterior.updatedAt || ahora).getTime();
    const segundosReales = Math.max(0, (ahora - inicioAncla) / 1000);
    const cicloMaximo = cicloBase + segundosReales / 180 + 2;
    if (Number(aldeaNueva.ciclo?.dia || 1) > cicloMaximo) {
      return {
        rechazo: 'El avance de los años supera el ritmo permitido por el servidor.',
        marcarSospechosa: false,
      };
    }
  }

  const capacidades = calcularCapacidades(aldeaNueva);
  const recursos = { ...CAPACIDADES_BASE, ...(aldeaNueva.recursos || {}) };
  for (const [recurso, capacidad] of Object.entries(capacidades)) {
    if (Number(recursos[recurso]) > capacidad + TOLERANCIA_RECURSOS) {
      return {
        rechazo: 'Los recursos superan la capacidad actual de la aldea.',
        marcarSospechosa: false,
      };
    }
  }

  if (esDemo) return { rechazo: null, marcarSospechosa: false };

  const reliquiasNuevas = Number(aldeaNueva.legado?.reliquias || 0)
    - Number(aldeaAnterior.legado?.reliquias || 0);
  if (reliquiasNuevas <= 0) return { rechazo: null, marcarSospechosa: false };

  const cambiosEdad = Math.max(
    0,
    Number(aldeaNueva.edad?.numero || 1) - Number(aldeaAnterior.edad?.numero || 1)
  );
  const edadesJustificadas = Math.min(cambiosEdad, transicionesPosibles(aldeaAnterior, aldeaNueva));
  const reliquiasJustificadas = edadesJustificadas * Number(RELIQUIAS.porEdad || 0)
    + premioLogrosNuevos(aldeaAnterior, aldeaNueva);

  return {
    rechazo: null,
    marcarSospechosa: reliquiasNuevas > reliquiasJustificadas,
  };
}

module.exports = { evaluarAldea, transicionesPosibles };
