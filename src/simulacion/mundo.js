import { ESTADOS_ALDEANO, TRABAJOS_ALDEANO } from './aldeanoEnums.js';
import { asegurarAldeaVida } from '../game/cicloVida.js';

export const PROFESIONES = ['lenador', 'granjero', 'minero', 'sin_oficio'];

export function normalizarNecesidades(necesidades = {}) {
  const limitar = (valor, defecto) => Math.max(0, Math.min(100, Number(valor ?? defecto)));
  return {
    hambre: limitar(necesidades.hambre, 35),
    energia: limitar(necesidades.energia, 80),
    animo: limitar(necesidades.animo, 70),
  };
}

export function crearAldeanoVida(aldeano, indice = 0, contextoAldea = {}) {
  const persona = asegurarAldeaVida({ ...contextoAldea, aldeanos: [aldeano] }).aldeanos[0];
  const necesidad = `aldeano-${String(persona._id || persona.id || persona.nombre || indice)}`;
  const profesion = persona.profesion
    || ({ lenador: 'lenador', agricultor: 'granjero', minero: 'minero', libre: 'sin_oficio' }[persona.trabajo])
    || 'sin_oficio';
  const rasgos = Array.isArray(persona.rasgos) && persona.rasgos.length
    ? persona.rasgos.slice(0, 2)
    : [persona.rasgo && persona.rasgo !== 'polivalente' ? persona.rasgo : 'trabajador'];

  return {
    ...persona,
    id: String(persona._id || persona.id || necesidad),
    nombre: persona.nombre || `Aldeano ${indice + 1}`,
    edad: persona.edadAnios,
    edadAnios: persona.edadAnios,
    esperanza: persona.esperanza,
    posicion: persona.posicion || { x: 240 + (indice % 5) * 18, y: 300 },
    destino: null,
    estadoVida: persona.estadoVida || 'vagar',
    estado: ESTADOS_ALDEANO.includes(persona.estado) ? persona.estado : 'buscando_arbol',
    necesidades: normalizarNecesidades(persona.necesidades),
    rasgos,
    profesion,
    trabajo: TRABAJOS_ALDEANO.includes(persona.trabajo)
      ? persona.trabajo
      : ({ lenador: 'lenador', granjero: 'agricultor', agricultor: 'agricultor', minero: 'minero', guardia: 'guardia' }[profesion] || 'libre'),
    carga: Number(persona.carga || 0),
    emote: null,
    historial: Array.isArray(persona.historial) ? persona.historial.slice(0, 5) : [],
  };
}

export function resumirAldeano(aldeano) {
  return {
    id: aldeano.id,
    nombre: aldeano.nombre,
    edad: aldeano.edad,
    edadAnios: aldeano.edadAnios,
    esperanza: aldeano.esperanza,
    rasgos: (aldeano.rasgos || []).slice(0, 2),
    profesion: aldeano.profesion,
    necesidades: { ...normalizarNecesidades(aldeano.necesidades) },
    trabajo: TRABAJOS_ALDEANO.includes(aldeano.trabajo) ? aldeano.trabajo : 'libre',
    estado: ESTADOS_ALDEANO.includes(aldeano.estado) ? aldeano.estado : 'buscando_arbol',
    modoTrabajo: aldeano.modoTrabajo,
  };
}

export function sincronizarAldeanoConVida(aldeano, vivo, indice = 0, contextoAldea = {}) {
  if (!vivo) return crearAldeanoVida(aldeano, indice, contextoAldea);
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
