const ANIO_SEGUNDOS = 180;
const { RELIQUIAS } = require('./investigacion');

const ESTACIONES = [
  { id: 'primavera', indice: 0, inicio: 0, duracion: 40 },
  { id: 'verano', indice: 1, inicio: 40, duracion: 40 },
  { id: 'otoño', indice: 2, inicio: 80, duracion: 40 },
  { id: 'invierno', indice: 3, inicio: 120, duracion: 60 },
];

function estacionEn(segundos) {
  const normalizado = ((Number(segundos) || 0) % ANIO_SEGUNDOS + ANIO_SEGUNDOS) % ANIO_SEGUNDOS;
  const estacion = ESTACIONES.find((item) => normalizado >= item.inicio && normalizado < item.inicio + item.duracion);
  return {
    id: estacion.id,
    indice: estacion.indice,
    segundosEnEstacion: normalizado - estacion.inicio,
    duracion: estacion.duracion,
    restante: estacion.inicio + estacion.duracion - normalizado,
  };
}

function esInvierno(segundos) {
  return estacionEn(segundos).id === 'invierno';
}

function xmur3(texto) {
  let valor = 1779033703 ^ String(texto).length;
  for (let i = 0; i < String(texto).length; i += 1) {
    valor = Math.imul(valor ^ String(texto).charCodeAt(i), 3432918353);
    valor = (valor << 13) | (valor >>> 19);
  }
  return () => {
    valor = Math.imul(valor ^ (valor >>> 16), 2246822507);
    valor = Math.imul(valor ^ (valor >>> 13), 3266489909);
    return (valor ^= valor >>> 16) >>> 0;
  };
}

function semillaDe(texto) {
  return xmur3(texto)();
}

function aleatorio(semilla, clave) {
  let valor = (Number(semilla) >>> 0) ^ xmur3(String(clave))();
  valor += 0x6D2B79F5;
  valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
  valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
  return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
}

function elegirSiguienteEdad(semilla, numero, edadActualId, EDADES) {
  const disponibles = Object.keys(EDADES || {}).filter((id) => id !== edadActualId);
  const pesoTotal = disponibles.reduce((total, id) => total + Number(EDADES[id]?.pesoSeleccion || 1), 0);
  let punto = aleatorio(semilla, `edad:${numero}`) * pesoTotal;
  for (const id of disponibles) {
    punto -= Number(EDADES[id]?.pesoSeleccion || 1);
    if (punto < 0) return id;
  }
  return disponibles[0] || edadActualId;
}

function elegirEventoInvierno(semilla, ano, pesosEventos) {
  const eventos = ['bestias', 'helada', 'recaudador'];
  const pesos = pesosEventos || {};
  const disponibles = eventos.filter((id) => Number(pesos[id] ?? 1) > 0);
  const total = disponibles.reduce((suma, id) => suma + Number(pesos[id] || 0), 0);
  let punto = aleatorio(semilla, `evento:${ano}`) * total;
  for (const id of disponibles) {
    punto -= Number(pesos[id] || 0);
    if (punto < 0) return id;
  }
  return disponibles[0] || 'bestias';
}

function duracionDeEdad(semilla, numero, edad) {
  const [minimo, maximo] = edad?.duracionAnios || [10, 10];
  const inicio = Number(minimo);
  const fin = Number(maximo);
  const enteroMinimo = Math.ceil(inicio);
  const enteroMaximo = Math.floor(fin);
  const cantidad = enteroMaximo - enteroMinimo + 1;
  return enteroMinimo + Math.floor(aleatorio(semilla, `duracion:${numero}`) * cantidad);
}

function avanzarEdad(aldea, EDADES, reliquias = RELIQUIAS) {
  if (!aldea) return { cambio: false, de: null, a: null };
  const edad = aldea.edad || {};
  const inicio = Number(edad.inicioAnio ?? 1);
  const duracion = Number(edad.duracionAnios ?? 10);
  const diaActual = Number(aldea.ciclo?.dia ?? 1);
  if (diaActual < inicio + duracion) return { cambio: false, de: edad.id || null, a: edad.id || null };

  const semilla = semillaDe(String(aldea._id ?? aldea.id ?? 'aldea'));
  const numero = Number(edad.numero ?? 1) + 1;
  const siguienteId = elegirSiguienteEdad(semilla, numero, edad.id, EDADES);
  const siguienteInfo = EDADES[siguienteId];
  const nuevaDuracion = duracionDeEdad(semilla, numero, siguienteInfo);
  const anteriorId = edad.id;
  aldea.edad = { id: siguienteId, numero, inicioAnio: diaActual, duracionAnios: nuevaDuracion };
  aldea.legado = { ...(aldea.legado || {}), reliquias: (Number(aldea.legado?.reliquias) || 0) + reliquias.porEdad };
  if (!Array.isArray(aldea.cronica)) aldea.cronica = [];
  aldea.cronica.push({ anio: diaActual, tipo: 'edad', texto: `Comienza la ${siguienteInfo.nombre}` });
  aldea.cronica.push({ anio: diaActual, tipo: 'reliquia', texto: 'Se halló una reliquia entre las ruinas' });
  if (aldea.cronica.length > 50) aldea.cronica.splice(0, aldea.cronica.length - 50);
  return { cambio: true, de: anteriorId, a: siguienteId };
}

function multiplicadoresDeEstacion(estacionId, catalogoEstaciones) {
  const catalogo = catalogoEstaciones || {};
  const clave = estacionId === 'otoño' ? 'otono' : estacionId;
  const estacion = catalogo[clave] || catalogo[estacionId];
  return {
    general: Number(estacion?.generacion ?? 1),
    recursos: { ...(estacion?.recursos || {}) },
  };
}

function avanzarTiempo(ciclo, duracion) {
  const actual = { segundos: 0, dia: 1, ...(ciclo || {}) };
  const anteriorEstacion = estacionEn(actual.segundos);
  const anteriorInvierno = anteriorEstacion.id === 'invierno';
  const transcurrido = actual.segundos + Math.max(0, Number(duracion) || 0);
  let anosCompletos = 0;
  let segundos = transcurrido;
  while (segundos >= ANIO_SEGUNDOS) {
    segundos -= ANIO_SEGUNDOS;
    anosCompletos += 1;
  }
  while (segundos < 0) {
    segundos += ANIO_SEGUNDOS;
    anosCompletos -= 1;
  }
  const nuevo = { segundos, dia: actual.dia + anosCompletos };
  const nuevaEstacion = estacionEn(nuevo.segundos);
  return {
    ciclo: nuevo,
    eventos: {
      cruzoEstacion: anteriorEstacion.indice !== nuevaEstacion.indice && transcurrido !== 0,
      cruzoInvierno: !anteriorInvierno && nuevaEstacion.id === 'invierno',
      cruzoAnio: anosCompletos > 0,
    },
  };
}

module.exports = { ANIO_SEGUNDOS, ESTACIONES, estacionEn, esInvierno, semillaDe, aleatorio, elegirSiguienteEdad, elegirEventoInvierno, duracionDeEdad, avanzarEdad, multiplicadoresDeEstacion, avanzarTiempo };