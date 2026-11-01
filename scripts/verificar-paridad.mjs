import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { estacionEn, avanzarTiempo, avanzarEdad, multiplicadoresDeEstacion, semillaDe, elegirSiguienteEdad, duracionDeEdad, elegirEventoInvierno } from '../src/game/tiempo.js';
import { decidir as decidirIA } from '../src/game/cerebro.js';
import { efectoDescripcion, textoRequisito } from '../src/game/format.js';

const require = createRequire(import.meta.url);
const {
  ARBOL_INVESTIGACION,
  EDADES: EDADES_CATALOGO,
  ESTACIONES: ESTACIONES_CATALOGO,
} = require('../../AldeaIncrementalBack/src/utils/villageDefaults.js');
const { simularSegundo } = require('../../AldeaIncrementalBack/src/utils/gameSimulation.js');
const { efectosActivos: efectosActivosBack, RELIQUIAS: RELIQUIAS_BACK } = require('../../AldeaIncrementalBack/src/utils/investigacion.js');
const { efectosActivos: efectosActivosFront, RELIQUIAS: RELIQUIAS_FRONT } = await import('../src/game/investigacion.js');

const estaciones = {
  primavera: { generacion: 1, recursos: { comida: 1.10 } },
  verano: { generacion: 1.05, recursos: { madera: 1.10 } },
  otono: { generacion: 1, recursos: { comida: 1.15, trigo: 1.15 } },
  invierno: { generacion: 0.80, recursos: { comida: 0.90 } },
};

const EDADES = {
  calma: { pesoSeleccion: 2, duracionAnios: [8, 14] }, abundancia: { pesoSeleccion: 1, duracionAnios: [6, 10] },
  hielo: { pesoSeleccion: 1, duracionAnios: [6, 10] }, ceniza: { pesoSeleccion: 1, duracionAnios: [6, 10] },
  sombras: { pesoSeleccion: 1, duracionAnios: [6, 10] }, descubrimientos: { pesoSeleccion: 1, duracionAnios: [6, 10] },
};
const casos = JSON.parse(await fs.readFile(new URL('../fixtures/tiempo-vectores.json', import.meta.url), 'utf8'));
for (const caso of casos) {
  if (caso.semilla && caso.numero) {
    const ids = ['calma', 'abundancia', 'hielo', 'ceniza', 'sombras', 'descubrimientos'];
    const actualId = ids[(caso.numero - 1) % ids.length];
    const seed = semillaDe(caso.semilla);
    const edad = elegirSiguienteEdad(seed, caso.numero, actualId, EDADES);
    const duracion = duracionDeEdad(seed, caso.numero, EDADES[edad]);
    if (edad !== caso.edad || duracion !== caso.duracion) throw new Error(`Paridad de edad fallida en ${caso.semilla}`);
    continue;
  }
  const actual = estacionEn(caso.segundos);
  for (const clave of ['id', 'indice', 'segundosEnEstacion', 'duracion', 'restante']) {
    if (actual[clave] !== caso[clave]) {
      throw new Error(`Paridad fallida en ${caso.segundos}: ${clave} era ${actual[clave]}, esperado ${caso[clave]}`);
    }
  }
  if (caso.recursosEsperados) {
    const factores = multiplicadoresDeEstacion(actual.id, estaciones);
    const actualizados = {};
    for (const recurso of Object.keys(caso.recursosEsperados)) {
      actualizados[recurso] = factores.general * (factores.recursos[recurso] ?? 1);
      if (Math.abs(actualizados[recurso] - caso.recursosEsperados[recurso]) > 0.0001) {
        throw new Error(`Paridad de recursos fallida en ${caso.segundos}: ${recurso} era ${actualizados[recurso]}, esperado ${caso.recursosEsperados[recurso]}`);
      }
    }
  }
}
for (let ano = 1; ano <= 10000; ano += 1) {
  const seed = semillaDe(`estadistica-calma-${ano}`);
  const tipo = elegirEventoInvierno(seed, ano, { bestias: 1, helada: 1, recaudador: 1 });
  if (!['bestias', 'helada', 'recaudador'].includes(tipo)) throw new Error(`Evento inválido en año ${ano}`);
}

const casosIA = JSON.parse(await fs.readFile(
  new URL('../../AldeaIncrementalBack/fixtures/ia-vectores.json', import.meta.url),
  'utf8'
));
const catalogoIA = {
  capacidadesBase: { madera: 250, comida: 250, oro: 100, trigo: 100, harina: 100, pan: 100, hierro: 100 },
  objetivosIA: { madera: 0.42, comida: 0.40, hierro: 0.15 },
  topeObjetivo: null,
  arbol: ARBOL_INVESTIGACION,
  edades: EDADES_CATALOGO,
  estaciones: ESTACIONES_CATALOGO,
  tiposEdificio: { mina: {} },
  rasgosAldeano: {
    polivalente: { trabajo: null },
    maderero: { trabajo: 'lenador' },
    hortelano: { trabajo: 'agricultor' },
    minero: { trabajo: 'minero' },
  },
};
for (const [indiceCaso, caso] of casosIA.entries()) {
  const aldeanos = caso.aldeanos || [{ trabajo: 'libre', rasgo: caso.rasgo || 'polivalente' }];
  const aldea = {
    recursos: { madera: 0, comida: 0, hierro: 0, pan: 0, ...(caso.recursos || {}) },
    edificios: caso.edificios || [],
    ciclo: { segundos: caso.segundos ?? 10, dia: caso.dia ?? 1 },
    edad: { id: caso.edad || 'calma' },
    eventoNocturno: { tipo: caso.evento || null },
    tecnologias: { defensa: caso.defensa || 0 },
    aldeanos,
  };
  const indice = caso.indice ?? 0;
  const resultado = decidirIA(aldea, aldeanos[indice], indice, catalogoIA);
  if (resultado.eleccion.trabajo !== caso.esperado.trabajo
    || resultado.eleccion.pensamiento !== caso.esperado.pensamiento) {
    throw new Error(`Paridad de IA fallida en vector ${indiceCaso + 1}`);
  }
  for (const opcion of resultado.opciones) {
    const suma = Object.values(opcion.factores).reduce((total, factor) => total + factor, 0);
    if (Math.abs(suma - opcion.puntaje) > 0.001) {
      throw new Error(`Suma de factores fallida en vector ${indiceCaso + 1}, oficio ${opcion.trabajo}`);
    }
  }
  if (caso.factorContextoEsperado) {
    const opcion = resultado.opciones.find((actual) => actual.trabajo === caso.factorContextoEsperado.trabajo);
    if (opcion.factores.contexto !== caso.factorContextoEsperado.valor) {
      throw new Error(`Factor contexto fallido en vector ${indiceCaso + 1}`);
    }
  }
}
console.log(`OK: paridad de tiempo, recursos y eventos para ${casos.length} vectores; IA para ${casosIA.length} vectores`);

const casosArbol = JSON.parse(await fs.readFile(
  new URL('../../AldeaIncrementalBack/fixtures/arbol-vectores.json', import.meta.url),
  'utf8'
));
for (const [indice, caso] of casosArbol.entries()) {
  const efectos = efectosActivosFront({ tecnologias: caso.tecnologias, investigaciones: caso.investigaciones }, ARBOL_INVESTIGACION);
  for (const [tipo, esperado] of Object.entries(caso.esperado)) {
    if (JSON.stringify(efectos[tipo]) !== JSON.stringify(esperado)) {
      throw new Error(`Efecto ${tipo} falló en vector de árbol ${indice + 1}`);
    }
  }
}
console.log(`OK: efectos del árbol para ${casosArbol.length} vectores`);

const nodoHerramientas = ARBOL_INVESTIGACION.find((nodo) => nodo.id === 'herramientas');
const nodoMetalurgia = ARBOL_INVESTIGACION.find((nodo) => nodo.id === 'metalurgia');
const nodoDefensa = ARBOL_INVESTIGACION.find((nodo) => nodo.id === 'defensa');
if (efectoDescripcion(nodoHerramientas, 2) !== '+20 % de producción'
  || efectoDescripcion(nodoMetalurgia, 1) !== 'Hierro ×1,5'
  || efectoDescripcion(nodoDefensa, 1) !== '−10 % de daño de eventos'
  || textoRequisito({ id: 'metalurgia', nivel: 1 }) !== 'Metalurgia nivel 1'
  || textoRequisito({ tipoId: 'centroInvestigacion', nivel: 2 }) !== 'Centro de Investigación nivel 2'
  || textoRequisito({ id: 'idInterno', nivel: 2 }).includes('idInterno')) {
  throw new Error('Las descripciones humanas de efectos o requisitos son incorrectas');
}
console.log('OK: efectos y requisitos se describen con texto humano, sin IDs');

for (const reliquias of [0, 1, 2, 10, 100]) {
  const estado = { legado: { reliquias } };
  const bonoBack = efectosActivosBack(estado, ARBOL_INVESTIGACION, RELIQUIAS_BACK).bonoReliquias;
  const bonoFront = efectosActivosFront(estado, ARBOL_INVESTIGACION, RELIQUIAS_FRONT).bonoReliquias;
  if (bonoBack !== bonoFront || bonoBack !== Math.min(0.30, reliquias * 0.03)) {
    throw new Error(`Bono de reliquias divergente con ${reliquias} reliquias`);
  }
}

const estadoReliquiasInicial = {
  _id: 'paridad-reliquias-160-anios',
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
const estadoReliquiasBack = structuredClone(estadoReliquiasInicial);
let estadoReliquiasFront = structuredClone(estadoReliquiasInicial);
for (let segundo = 0; segundo < 160 * 180; segundo += 1) {
  simularSegundo(estadoReliquiasBack);
  const siguiente = avanzarTiempo(estadoReliquiasFront.ciclo, 1);
  estadoReliquiasFront.ciclo = siguiente.ciclo;
  if (siguiente.eventos.cruzoAnio) avanzarEdad(estadoReliquiasFront, EDADES_CATALOGO);
}
const edadesBack = estadoReliquiasBack.cronica.filter((entrada) => entrada.tipo === 'edad').length;
const reliquiasBack = estadoReliquiasBack.cronica.filter((entrada) => entrada.tipo === 'reliquia').length;
const edadesFront = estadoReliquiasFront.cronica.filter((entrada) => entrada.tipo === 'edad').length;
const reliquiasFront = estadoReliquiasFront.cronica.filter((entrada) => entrada.tipo === 'reliquia').length;
if (reliquiasBack !== edadesBack || reliquiasFront !== edadesFront
  || reliquiasBack !== reliquiasFront
  || estadoReliquiasBack.legado.reliquias !== estadoReliquiasFront.legado.reliquias) {
  throw new Error('Las reliquias por transición de edad difieren entre front y back');
}
console.log(`OK: ${edadesFront} edades simuladas entregan ${reliquiasFront} reliquias en front y back; bono limitado a 30%`);
