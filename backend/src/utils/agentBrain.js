const {
  CAPACIDADES_BASE,
  TIPOS_EDIFICIO,
  RASGOS_ALDEANO,
  EDADES,
  ESTACIONES,
  ARBOL_INVESTIGACION,
  OBJETIVOS_IA,
  TOPE_OBJETIVO,
} = require('./villageDefaults');
const { decidir } = require('./cerebro');

const CATALOGO_IA = {
  capacidadesBase: CAPACIDADES_BASE,
  tiposEdificio: TIPOS_EDIFICIO,
  rasgosAldeano: RASGOS_ALDEANO,
  edades: EDADES,
  estaciones: ESTACIONES,
  arbol: ARBOL_INVESTIGACION,
  objetivosIA: OBJETIVOS_IA,
  topeObjetivo: TOPE_OBJETIVO,
};

function redondear(valor) {
  return Math.round((valor + Number.EPSILON * Math.abs(valor)) * 100) / 100;
}

function guardarDecision(aldea, aldeano, resultado) {
  const opciones = resultado.opciones.map((opcion) => {
    const factores = Object.fromEntries(
      Object.entries(opcion.factores).map(([nombre, valor]) => [nombre, redondear(valor)])
    );
    return {
      trabajo: opcion.trabajo,
      puntaje: redondear(Object.values(factores).reduce((total, valor) => total + valor, 0)),
      factores,
    };
  });
  aldeano.decision = {
    anio: aldea.ciclo?.dia || 1,
    segundos: aldea.ciclo?.segundos || 0,
    elegida: resultado.eleccion.trabajo,
    libre: resultado.libre,
    opciones,
  };
}

function decidirTrabajo(aldea, aldeano, indice = 0) {
  if (aldeano.modoTrabajo !== 'automatico') return null;
  const resultado = decidir(aldea, aldeano, indice, CATALOGO_IA);
  return {
    ...resultado.eleccion,
    pensamientoActual: resultado.eleccion.pensamiento,
  };
}

function actualizarAgentes(aldea) {
  if ((aldea.ciclo?.segundos || 0) % 10 !== 0) return;
  for (let indice = 0; indice < (aldea.aldeanos || []).length; indice += 1) {
    const aldeano = aldea.aldeanos[indice];
    if (aldeano.modoTrabajo !== 'automatico') continue;
    const resultado = decidir(aldea, aldeano, indice, CATALOGO_IA);
    aldeano.trabajo = resultado.eleccion.trabajo;
    aldeano.estado = resultado.eleccion.estado;
    aldeano.pensamientoActual = resultado.eleccion.pensamiento;
    guardarDecision(aldea, aldeano, resultado);
  }
}

module.exports = { decidirTrabajo, actualizarAgentes };
