function listaLogros(catalogo) {
  return Array.isArray(catalogo) ? catalogo : catalogo?.logros || [];
}

function contarCronica(aldea, expresion) {
  return (aldea.cronica || []).filter((entrada) => (
    entrada.tipo === 'evento' && expresion.test(String(entrada.texto || ''))
  )).length;
}

function progresoLogro(aldea, logro) {
  if (!aldea || !logro?.meta) return 0;
  const { tipo } = logro.meta;
  const contadores = aldea.estadisticas?.contadores || {};
  const obtenerContador = (nombre, respaldo) => (
    Number.isFinite(Number(contadores[nombre]))
      ? Math.max(Number(contadores[nombre]), respaldo)
      : respaldo
  );
  const tecnologias = aldea.tecnologias || {};

  switch (tipo) {
    case 'aldeanos':
      return (aldea.aldeanos || []).length;
    case 'edades':
      return Math.max(0, Number(aldea.edad?.numero || 1) - 1);
    case 'eventosDefendidos':
      return obtenerContador('eventosDefendidos', contarCronica(aldea, /defendi[oó]|resisti[oó]/i));
    case 'tecnologia':
      return Math.max(Number(tecnologias[logro.meta.id]) || 0, logro.meta.id === 'metalurgia' && aldea.investigaciones?.metalurgia ? 1 : 0);
    case 'nodosInvestigados':
      return Object.values(tecnologias).filter((nivel) => Number(nivel) > 0).length;
    case 'edificiosConstruidos':
      return obtenerContador('edificiosConstruidos', (aldea.edificios || []).length);
    case 'nivelEdificio':
      return Number((aldea.edificios || []).find((edificio) => edificio.tipoId === logro.meta.id)?.nivel || 0);
    case 'inviernos':
      return Math.max(0, Number(aldea.ciclo?.dia || 1) - 1);
    case 'reliquias':
      return Number(aldea.legado?.reliquias || 0);
    case 'cronica':
      return (aldea.cronica || []).length;
    default:
      return 0;
  }
}

function evaluarLogros(aldea, catalogo) {
  if (!aldea) return [];
  const desbloqueados = new Set((aldea.logros || []).map((logro) => logro.id));
  return listaLogros(catalogo)
    .filter((logro) => (
      !desbloqueados.has(logro.id)
      && progresoLogro(aldea, logro) >= Number(logro.meta?.valor || Infinity)
    ))
    .map((logro) => logro.id);
}

function aplicarLogros(aldea, catalogo) {
  const ids = evaluarLogros(aldea, catalogo);
  if (!ids.length) return aldea;
  const definiciones = new Map(listaLogros(catalogo).map((logro) => [logro.id, logro]));
  const logros = [...(aldea.logros || [])];
  const cronica = [...(aldea.cronica || [])];
  const legado = { ...(aldea.legado || {}) };
  const anio = Number(aldea.ciclo?.dia || 1);

  for (const id of ids) {
    const logro = definiciones.get(id);
    if (!logro) continue;
    logros.push({ id, anio });
    cronica.push({ anio, tipo: 'logro', texto: `Logro desbloqueado: ${logro.nombre}` });
    if (Number(logro.premioReliquias) > 0) {
      legado.reliquias = (Number(legado.reliquias) || 0) + Number(logro.premioReliquias);
    }
  }

  return {
    ...aldea,
    logros,
    cronica: cronica.slice(-50),
    legado,
  };
}

module.exports = { progresoLogro, evaluarLogros, aplicarLogros };
