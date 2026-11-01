const { simularSegundo } = require('../src/utils/gameSimulation');
const { ARBOL_INVESTIGACION, RELIQUIAS } = require('../src/utils/villageDefaults');
const { efectosActivos } = require('../src/utils/investigacion');

const ANIOS_SIMULADOS = 160;
const SEGUNDOS_POR_ANIO = 180;
const SEGUNDOS_SIMULADOS = ANIOS_SIMULADOS * SEGUNDOS_POR_ANIO;
const nodoPlanos = ARBOL_INVESTIGACION.find((nodo) => nodo.id === 'planosAntiguos');
const aldea = {
  _id: 'balance-reliquias-160-anios',
  recursos: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
  tasasGeneracion: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
  multiplicadores: { generacion: 1 },
  tecnologias: {},
  investigaciones: {},
  legado: { reliquias: 0, reliquiasGastadas: 0 },
  ciclo: { segundos: 0, dia: 1 },
  eventoNocturno: { tipo: null, dia: 0 },
  edad: { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 10 },
  cronica: [],
  aldeanos: [],
  edificios: [],
};

let segundosParaPlanos = null;
for (let segundo = 1; segundo <= SEGUNDOS_SIMULADOS; segundo += 1) {
  simularSegundo(aldea);
  const disponibles = (aldea.legado.reliquias || 0) - (aldea.legado.reliquiasGastadas || 0);
  if (segundosParaPlanos === null && disponibles >= nodoPlanos.costoReliquias) {
    segundosParaPlanos = segundo;
  }
}

const efectos = efectosActivos(aldea, ARBOL_INVESTIGACION, RELIQUIAS);
const cambiosEdad = aldea.cronica.filter((entrada) => entrada.tipo === 'edad').length;
const bonoProduccion = Math.round(efectos.bonoReliquias * 100);
const minutosPlanos = segundosParaPlanos === null ? 'No alcanzado' : (segundosParaPlanos / 60).toFixed(1);
const filas = [
  ['Años simulados', String(ANIOS_SIMULADOS)],
  ['Transiciones de edad', String(cambiosEdad)],
  ['Reliquias obtenidas', String(aldea.legado.reliquias)],
  ['Reliquias requeridas para Planos antiguos', String(nodoPlanos.costoReliquias)],
  ['Bono total de producción', `+${bonoProduccion}%`],
  ['Tiempo hasta Planos antiguos', `${minutosPlanos} min de juego`],
];
console.log('| Métrica | Resultado |');
console.log('| --- | ---: |');
for (const [metrica, resultado] of filas) console.log(`| ${metrica} | ${resultado} |`);
console.log(`\nBono máximo configurado: +${Math.round(RELIQUIAS.bonoMaximo * 100)}%.`);
