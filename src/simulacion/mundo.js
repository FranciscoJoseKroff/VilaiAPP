import { ESTADOS_ALDEANO, TRABAJOS_ALDEANO } from './aldeanoEnums.js';

export const PROFESIONES = ['lenador', 'granjero', 'minero', 'sin_oficio'];

export function normalizarNecesidades(necesidades = {}) {
  const limitar = (valor, defecto) => Math.max(0, Math.min(100, Number(valor ?? defecto)));
  return {
    hambre: limitar(necesidades.hambre, 35),
    energia: limitar(necesidades.energia, 80),
    animo: limitar(necesidades.animo, 70),
  };
}

export function crearAldeanoVida(aldeano, indice = 0) {
  const necesidad = `aldeano-${String(aldeano._id || aldeano.id || aldeano.nombre || indice)}`;
  const profesion = aldeano.profesion
    || ({ lenador: 'lenador', agricultor: 'granjero', minero: 'minero', libre: 'sin_oficio' }[aldeano.trabajo])
    || 'sin_oficio';
  const rasgos = Array.isArray(aldeano.rasgos) && aldeano.rasgos.length
    ? aldeano.rasgos.slice(0, 2)
    : [aldeano.rasgo && aldeano.rasgo !== 'polivalente' ? aldeano.rasgo : 'trabajador'];

  return {
    ...aldeano,
    id: String(aldeano._id || aldeano.id || necesidad),
    nombre: aldeano.nombre || `Aldeano ${indice + 1}`,
    edad: Number(aldeano.edad || 18 + (indice % 24)),
    posicion: aldeano.posicion || { x: 240 + (indice % 5) * 18, y: 300 },
    destino: null,
    estadoVida: aldeano.estadoVida || 'vagar',
    estado: ESTADOS_ALDEANO.includes(aldeano.estado) ? aldeano.estado : 'buscando_arbol',
    necesidades: normalizarNecesidades(aldeano.necesidades),
    rasgos,
    profesion,
    trabajo: TRABAJOS_ALDEANO.includes(aldeano.trabajo)
      ? aldeano.trabajo
      : ({ lenador: 'lenador', granjero: 'agricultor', agricultor: 'agricultor', minero: 'minero', guardia: 'guardia' }[profesion] || 'libre'),
    carga: Number(aldeano.carga || 0),
    emote: null,
    historial: Array.isArray(aldeano.historial) ? aldeano.historial.slice(0, 5) : [],
  };
}

export function resumirAldeano(aldeano) {
  return {
    id: aldeano.id,
    nombre: aldeano.nombre,
    edad: aldeano.edad,
    rasgos: (aldeano.rasgos || []).slice(0, 2),
    profesion: aldeano.profesion,
    necesidades: { ...normalizarNecesidades(aldeano.necesidades) },
    trabajo: TRABAJOS_ALDEANO.includes(aldeano.trabajo) ? aldeano.trabajo : 'libre',
    estado: ESTADOS_ALDEANO.includes(aldeano.estado) ? aldeano.estado : 'buscando_arbol',
    modoTrabajo: aldeano.modoTrabajo,
  };
}

export function sincronizarAldeanoConVida(aldeano, vivo, indice = 0) {
  if (!vivo) return crearAldeanoVida(aldeano, indice);
  return {
    ...aldeano,
    ...vivo,
    posicion: undefined,
    destino: undefined,
    estadoVida: vivo.estadoVida,
    estado: ESTADOS_ALDEANO.includes(aldeano.estado) ? aldeano.estado : 'buscando_arbol',
    trabajo: TRABAJOS_ALDEANO.includes(vivo.trabajo) ? vivo.trabajo : (
      TRABAJOS_ALDEANO.includes(aldeano.trabajo) ? aldeano.trabajo : 'libre'
    ),
  };
}
