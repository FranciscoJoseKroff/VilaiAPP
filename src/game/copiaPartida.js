import {
  ESTADOS_ALDEANO,
  RASGOS_ALDEANO,
  TIPOS_EDIFICIO,
  TIPOS_EVENTO,
  TRABAJOS_ALDEANO,
} from '../simulacion/aldeanoEnums.js';
import { calcularCapacidadesAldea } from './simulation.js';

export const TAMANO_MAXIMO_PARTIDA = 1024 * 1024;
const EDADES = ['calma', 'abundancia', 'hielo', 'ceniza', 'sombras', 'descubrimientos'];
const CAMPOS_PRIVADOS = [
  '_id',
  'id',
  'usuario',
  '__v',
  'createdAt',
  'updatedAt',
  'ultimoGuardado',
  'marcaDemo',
  'sospechosa',
  'poblacionRanking',
  'anclaAntiTrampas',
];

function bytesUtf8(texto) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(texto).byteLength;
  return unescape(encodeURIComponent(texto)).length;
}

function clonarAldea(aldea) {
  const copia = JSON.parse(JSON.stringify(aldea));
  for (const campo of CAMPOS_PRIVADOS) delete copia[campo];
  return copia;
}

export function exportarPartida(aldea) {
  if (!aldea || typeof aldea !== 'object' || Array.isArray(aldea)) {
    throw new Error('No hay una aldea válida para exportar.');
  }
  return JSON.stringify({
    formato: 'vilai-partida',
    version: 1,
    aldea: clonarAldea(aldea),
  }, null, 2);
}

export function validarPartida(texto, catalogo = {}) {
  if (typeof texto !== 'string' || bytesUtf8(texto) > TAMANO_MAXIMO_PARTIDA) {
    throw new Error('El archivo de partida supera el límite de 1 MB.');
  }

  let contenido;
  try {
    contenido = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no contiene un JSON válido.');
  }

  if (contenido?.formato !== 'vilai-partida' || contenido.version !== 1) {
    throw new Error('El formato de la partida no es compatible.');
  }
  const aldea = contenido.aldea;
  if (!aldea || typeof aldea !== 'object' || Array.isArray(aldea)) {
    throw new Error('El archivo no contiene una aldea válida.');
  }
  if (!aldea.recursos || typeof aldea.recursos !== 'object' || Array.isArray(aldea.recursos)) {
    throw new Error('La partida no contiene recursos válidos.');
  }
  if (!Array.isArray(aldea.aldeanos) || !Array.isArray(aldea.edificios)) {
    throw new Error('La partida debe incluir listas válidas de aldeanos y edificios.');
  }
  if (!aldea.ciclo || !Number.isInteger(aldea.ciclo.dia) || aldea.ciclo.dia < 1
    || !Number.isFinite(aldea.ciclo.segundos) || aldea.ciclo.segundos < 0) {
    throw new Error('El ciclo de la aldea no es válido.');
  }
  if (!aldea.edad || !EDADES.includes(aldea.edad.id)) {
    throw new Error(`La edad "${aldea.edad?.id ?? ''}" no es válida.`);
  }
  if (Array.isArray(aldea.estadisticas?.serie) && aldea.estadisticas.serie.length > 120) {
    throw new Error('La serie de estadísticas no puede superar 120 puntos.');
  }
  if (aldea.estadisticas?.serie?.some((punto) => !EDADES.includes(punto.e))) {
    throw new Error('La serie de estadísticas contiene una edad no válida.');
  }
  if (aldea.estadisticas?.contadores && Object.values(aldea.estadisticas.contadores).some((valor) => (
    !Number.isInteger(valor) || valor < 0
  ))) {
    throw new Error('Los contadores de estadísticas deben ser enteros no negativos.');
  }

  const tiposTecnologia = new Set((catalogo.arbol || []).map((nodo) => nodo.id));
  const idsLogros = new Set((catalogo.logros || []).map((logro) => logro.id));
  for (const [indice, aldeano] of aldea.aldeanos.entries()) {
    if (aldeano.estado != null && !ESTADOS_ALDEANO.includes(aldeano.estado)) {
      throw new Error(`El estado "${aldeano.estado}" del aldeano ${indice + 1} no es válido.`);
    }
    if (aldeano.trabajo != null && !TRABAJOS_ALDEANO.includes(aldeano.trabajo)) {
      throw new Error(`El trabajo "${aldeano.trabajo}" del aldeano ${indice + 1} no es válido.`);
    }
    if (aldeano.rasgo != null && !RASGOS_ALDEANO.includes(aldeano.rasgo)) {
      throw new Error(`El rasgo "${aldeano.rasgo}" del aldeano ${indice + 1} no es válido.`);
    }
    if (aldeano.modoTrabajo != null && !['automatico', 'manual'].includes(aldeano.modoTrabajo)) {
      throw new Error(`El modo de trabajo del aldeano ${indice + 1} no es válido.`);
    }
  }
  for (const [indice, edificio] of aldea.edificios.entries()) {
    if (!TIPOS_EDIFICIO.includes(edificio.tipoId)) {
      throw new Error(`El edificio ${indice + 1} tiene un tipo no válido.`);
    }
    if (!Number.isFinite(edificio.x) || !Number.isFinite(edificio.y)) {
      throw new Error(`La posición del edificio ${indice + 1} no es válida.`);
    }
    const maxNivel = catalogo.tiposEdificio?.[edificio.tipoId]?.maxNivel;
    if (!Number.isInteger(edificio.nivel) || edificio.nivel < 1 || (maxNivel != null && edificio.nivel > maxNivel)) {
      throw new Error(`El nivel del edificio ${indice + 1} no es válido.`);
    }
  }

  for (const [campo, evento] of [['eventoNocturno', aldea.eventoNocturno], ['eventoPrevisto', aldea.eventoPrevisto]]) {
    if (evento?.tipo != null && !TIPOS_EVENTO.includes(evento.tipo)) {
      throw new Error(`El evento "${evento.tipo}" (${campo}) no es válido.`);
    }
    const investigacionId = aldea.investigacionEnCurso?.id;
    if (investigacionId != null && !tiposTecnologia.has(investigacionId)) {
      throw new Error(`La investigación "${investigacionId}" no es válida.`);
    }
    if (Array.isArray(aldea.logros) && idsLogroInvalidos(aldea.logros, idsLogros)) {
      throw new Error('La partida contiene un logro no válido.');
    }
  }

  if (aldea.tecnologias && tiposTecnologia.size) {
    for (const [id, nivel] of Object.entries(aldea.tecnologias)) {
      if (!tiposTecnologia.has(id) || !Number.isFinite(nivel) || nivel < 0) {
        throw new Error(`La tecnología "${id}" no es válida.`);
      }
    }
  }

  const capacidades = calcularCapacidadesAldea(aldea, {
    ...catalogo,
    arbol: catalogo.arbol || [],
    tiposEdificio: catalogo.tiposEdificio || {},
  });
  for (const [recurso, cantidad] of Object.entries(aldea.recursos)) {
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      throw new Error(`El valor de ${recurso} debe ser un número no negativo.`);
    }
    if (cantidad > (capacidades[recurso] ?? Infinity)) {
      throw new Error(`${recurso} supera la capacidad de la aldea.`);
    }
  }

  return clonarAldea(aldea);
}

function idsLogroInvalidos(logros, idsLogros) {
  return logros.some((logro) => !idsLogros.has(logro.id));
}
