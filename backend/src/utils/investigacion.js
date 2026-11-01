const TIPOS_EFECTO = [
  'produccionGeneral', 'produccionRecurso', 'multiplicadorRecurso', 'capacidadPlana', 'capacidadPct',
  'estacionMod', 'reduccionDanoEventos', 'reduccionDanoTipo', 'guardiaEficacia', 'avisoEventoSegundos',
  'iaIntervaloSegundos', 'iaBonoRasgo', 'bonoRasgoProduccion', 'pronosticoEdadAnios', 'consumoMineros',
  'velocidadInvestigacion', 'costoInvestigacion', 'costoConstruccion', 'inmunidadEvento', 'desbloquea',
];
const RELIQUIAS = { porEdad: 1, bonoPorReliquia: 0.03, bonoMaximo: 0.30 };

const NOMBRES_NODOS = {
  herramientas: 'Herramientas calibradas',
  logistica: 'Rutas de abastecimiento',
  defensa: 'Guardia comunal',
  metalurgia: 'Metalurgia',
  planosAntiguos: 'Planos antiguos',
};

const NOMBRES_EDIFICIOS = {
  centroInvestigacion: 'Centro de Investigación',
  mina: 'Mina',
};

function nivelDe(aldea, id) {
  const nivelGuardado = Number(aldea?.tecnologias?.[id] || 0);
  if (id === 'metalurgia' && aldea?.investigaciones?.metalurgia && nivelGuardado < 1) return 1;
  return Number.isFinite(nivelGuardado) ? Math.max(0, nivelGuardado) : 0;
}

function requisitosCumplidos(aldea, nodo) {
  const faltantes = [];
  for (const requisito of nodo?.requiere || []) {
    if (nivelDe(aldea, requisito.id) < requisito.nivel) {
      const nombre = NOMBRES_NODOS[requisito.id] || requisito.id;
      faltantes.push(`Requiere ${nombre} nivel ${requisito.nivel}.`);
    }
  }
  for (const requisito of nodo?.requiereEdificio || []) {
    const edificio = (aldea?.edificios || []).find((item) => item.tipoId === requisito.tipoId);
    if (!edificio || Number(edificio.nivel || 1) < requisito.nivel) {
      const nombre = NOMBRES_EDIFICIOS[requisito.tipoId] || requisito.tipoId;
      faltantes.push(`Requiere ${nombre} nivel ${requisito.nivel}.`);
    }
  }
  return { ok: faltantes.length === 0, faltantes };
}

function redondearADecima(valor) {
  return Math.round((valor + Number.EPSILON * Math.abs(valor)) * 10) / 10;
}

function costoDe(nodo, nivelActual = 0) {
  if (!nodo) return { recursos: {}, reliquias: 0 };
  const nivel = Math.max(0, Number(nivelActual) || 0);
  const factor = Math.pow(Number(nodo.factorCosto) || 1, nivel);
  const recursos = Object.fromEntries(Object.entries(nodo.costoBase || {}).map(([recurso, cantidad]) => (
    [recurso, redondearADecima(Number(cantidad) * factor)]
  )));
  return { recursos, reliquias: Math.max(0, Number(nodo.costoReliquias) || 0) };
}

function puedeInvestigar(aldea, nodo) {
  if (!nodo) return { ok: false, motivo: 'Esta investigación no está disponible.' };
  const nivel = nivelDe(aldea, nodo.id);
  if (nodo.maxNivel != null && nivel >= nodo.maxNivel) {
    return { ok: false, motivo: `${nodo.nombre} ya alcanzó su nivel máximo.` };
  }
  if (nodo.permanente && nivel > 0) {
    return { ok: false, motivo: `${nodo.nombre} ya está desbloqueado.` };
  }
  const requisitos = requisitosCumplidos(aldea, nodo);
  if (!requisitos.ok) return { ok: false, motivo: requisitos.faltantes.join(' ') };

  const costo = costoDe(nodo, nivel);
  const recursos = aldea?.recursos || {};
  for (const [recurso, cantidad] of Object.entries(costo.recursos)) {
    if ((Number(recursos[recurso]) || 0) < cantidad) {
      return { ok: false, motivo: `Falta ${recurso}: necesitas ${cantidad}.` };
    }
  }
  const reliquiasDisponibles = Math.max(0,
    (Number(aldea?.legado?.reliquias) || 0) - (Number(aldea?.legado?.reliquiasGastadas) || 0)
  );
  if (reliquiasDisponibles < costo.reliquias) {
    return { ok: false, motivo: `Necesitas ${costo.reliquias} reliquias disponibles.` };
  }
  return { ok: true, motivo: '' };
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function sumarEnMapa(mapa, clave, valor, minimo = -1000000, maximo = 1000000) {
  mapa[clave] = limitar((mapa[clave] || 0) + valor, minimo, maximo);
}

function multiplicarEnMapa(mapa, clave, valor, nivel) {
  const actual = mapa[clave] ?? 1;
  const factor = Math.pow(Number(valor), nivel);
  mapa[clave] = limitar(actual * factor, 0.1, 10);
}

function efectosActivos(aldea, arbol, reliquiasConfig = RELIQUIAS) {
  const reliquiasTotales = Math.max(0, Number(aldea?.legado?.reliquias) || 0);
  const efectos = {
    produccionGeneral: 0,
    bonoReliquias: Math.min(
      Number(reliquiasConfig.bonoMaximo) || 0,
      reliquiasTotales * (Number(reliquiasConfig.bonoPorReliquia) || 0)
    ),
    produccionRecurso: {},
    multiplicadorRecurso: {},
    capacidadPlana: {},
    capacidadPct: {},
    estacionMod: {},
    reduccionDanoEventos: 0,
    reduccionDanoTipo: {},
    guardiaEficacia: 0,
    avisoEventoSegundos: 0,
    iaIntervaloSegundos: 0,
    iaBonoRasgo: 0,
    bonoRasgoProduccion: {},
    pronosticoEdadAnios: 0,
    consumoMineros: 1,
    velocidadInvestigacion: 1,
    costoInvestigacion: 1,
    costoConstruccion: 1,
    inmunidadEvento: [],
    desbloquea: [],
  };
  const nodos = Array.isArray(arbol) ? arbol : Object.values(arbol || {});

  for (const nodo of nodos) {
    const nivel = nivelDe(aldea, nodo.id);
    if (nivel <= 0) continue;
    for (const efecto of nodo.efectos || []) {
      if (!TIPOS_EFECTO.includes(efecto.tipo)) continue;
      const valor = Number(efecto.valor) || 0;
      const clave = efecto.recurso || '*';
      switch (efecto.tipo) {
        case 'produccionGeneral':
          efectos.produccionGeneral = limitar(efectos.produccionGeneral + valor * nivel, -0.9, 1);
          break;
        case 'produccionRecurso':
          sumarEnMapa(efectos.produccionRecurso, clave, valor * nivel, -0.9, 5);
          break;
        case 'multiplicadorRecurso':
          multiplicarEnMapa(efectos.multiplicadorRecurso, clave, valor, nivel);
          break;
        case 'capacidadPlana':
          sumarEnMapa(efectos.capacidadPlana, clave, valor * nivel);
          break;
        case 'capacidadPct':
          sumarEnMapa(efectos.capacidadPct, clave, valor * nivel, -0.9, 10);
          break;
        case 'estacionMod': {
          const estacion = efecto.estacion || '*';
          if (!efectos.estacionMod[estacion]) efectos.estacionMod[estacion] = {};
          sumarEnMapa(efectos.estacionMod[estacion], clave, valor * nivel, -0.9, 5);
          break;
        }
        case 'reduccionDanoEventos':
          efectos.reduccionDanoEventos = limitar(efectos.reduccionDanoEventos + valor * nivel, 0, 0.8);
          break;
        case 'reduccionDanoTipo':
          sumarEnMapa(efectos.reduccionDanoTipo, efecto.tipoEvento || '*', valor * nivel, 0, 0.8);
          break;
        case 'guardiaEficacia':
          efectos.guardiaEficacia = limitar(efectos.guardiaEficacia + valor * nivel, 0, 5);
          break;
        case 'avisoEventoSegundos':
          efectos.avisoEventoSegundos = limitar(efectos.avisoEventoSegundos + valor * nivel, 0, 3600);
          break;
        case 'iaIntervaloSegundos':
          efectos.iaIntervaloSegundos = limitar(efectos.iaIntervaloSegundos + valor * nivel, -59, 3600);
          break;
        case 'iaBonoRasgo':
          efectos.iaBonoRasgo = limitar(efectos.iaBonoRasgo + valor * nivel, 0, 1);
          break;
        case 'bonoRasgoProduccion':
          sumarEnMapa(efectos.bonoRasgoProduccion, clave, valor * nivel, -0.9, 5);
          break;
        case 'pronosticoEdadAnios':
          efectos.pronosticoEdadAnios = limitar(efectos.pronosticoEdadAnios + valor * nivel, 0, 50);
          break;
        case 'consumoMineros':
          multiplicarEnMapa({ valor: efectos.consumoMineros }, 'valor', valor, nivel);
          efectos.consumoMineros = limitar(efectos.consumoMineros * Math.pow(valor, nivel), 0.1, 10);
          break;
        case 'velocidadInvestigacion':
          efectos.velocidadInvestigacion = limitar(efectos.velocidadInvestigacion * Math.pow(valor, nivel), 0.1, 10);
          break;
        case 'costoInvestigacion':
          efectos.costoInvestigacion = limitar(efectos.costoInvestigacion * Math.pow(valor, nivel), 0.1, 10);
          break;
        case 'costoConstruccion':
          efectos.costoConstruccion = limitar(efectos.costoConstruccion * Math.pow(valor, nivel), 0.1, 10);
          break;
        case 'inmunidadEvento':
          if (!efectos.inmunidadEvento.includes(efecto.tipoEvento || efecto.valor)) {
            efectos.inmunidadEvento.push(efecto.tipoEvento || efecto.valor);
          }
          break;
        case 'desbloquea':
          if (!efectos.desbloquea.includes(efecto.valor)) efectos.desbloquea.push(efecto.valor);
          break;
        default:
          break;
      }
    }
  }
  return efectos;
}

module.exports = {
  TIPOS_EFECTO,
  RELIQUIAS,
  nivelDe,
  requisitosCumplidos,
  costoDe,
  puedeInvestigar,
  efectosActivos,
};