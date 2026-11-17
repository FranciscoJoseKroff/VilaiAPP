import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dispararEventoDelAnio,
  forzarSiguienteEdad,
  pasosPorTickDemo,
  simularPasoActivo,
} from './simulation.js';
import { ANIO_SEGUNDOS, estacionEn } from './tiempo.js';

const edades = {
  calma: {
    nombre: 'Edad de la Calma',
    duracionAnios: [8, 14],
    pesoSeleccion: 2,
    generacion: 1,
    recursos: {},
    danoEventos: 1,
    guardiaEficacia: 1,
    pesosEventos: { bestias: 1, helada: 1, recaudador: 1 },
  },
  hielo: {
    nombre: 'Edad del Hielo',
    duracionAnios: [6, 10],
    pesoSeleccion: 1,
    generacion: 1,
    recursos: {},
    danoEventos: 1,
    guardiaEficacia: 1,
    pesosEventos: { bestias: 1, helada: 3, recaudador: 1 },
  },
};

const catalogo = {
  segundosDia: 120,
  segundosNoche: 60,
  capacidadesBase: { madera: 250, comida: 250, oro: 100, trigo: 100, harina: 100, pan: 100, hierro: 100 },
  tiposEdificio: {},
  rasgosAldeano: { polivalente: { trabajo: null, bono: 0.1 } },
  edades,
  estaciones: {
    primavera: { generacion: 1, recursos: {} },
    verano: { generacion: 1, recursos: {} },
    otono: { generacion: 1, recursos: {} },
    invierno: { generacion: 1, recursos: {} },
  },
  arbol: [],
};

function crearAldea() {
  return {
    _id: 'demo-village',
    recursos: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    tasasGeneracion: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    multiplicadores: { generacion: 1 },
    edificios: [],
    aldeanos: [],
    legado: { reliquias: 0 },
    ciclo: { segundos: 0, dia: 1 },
    edad: { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 10 },
    eventoNocturno: { tipo: null, dia: 0 },
    cronica: [],
  };
}

test('x20 ejecuta veinte pasos normales por tick y completa el año en nueve ticks', () => {
  const pasos = pasosPorTickDemo(true, 20);
  assert.equal(pasos, 20);
  assert.equal(Math.ceil(ANIO_SEGUNDOS / pasos), 9);

  let aldea = crearAldea();
  for (let tick = 0; tick < 9; tick += 1) {
    for (let paso = 0; paso < pasos; paso += 1) aldea = simularPasoActivo(aldea, catalogo);
  }
  assert.equal(aldea.ciclo.dia, 2);
  assert.equal(aldea.ciclo.segundos, 0);
  assert.equal(aldea.estadisticas.serie.length, 1);
  assert.equal(aldea.estadisticas.serie[0].a, 2);
});

test('velocidad normal permanece en un paso y las velocidades demo están limitadas', () => {
  assert.equal(pasosPorTickDemo(false, 20), 1);
  assert.equal(pasosPorTickDemo(true, 1), 1);
  assert.equal(pasosPorTickDemo(true, 5), 5);
  assert.equal(pasosPorTickDemo(true, 20), 20);
  assert.equal(pasosPorTickDemo(true, 100), 1);
});

test('forzar la edad usa avanzarEdad y concede una reliquia', () => {
  const aldea = crearAldea();
  const cambiada = forzarSiguienteEdad(aldea, catalogo);
  assert.notEqual(cambiada.edad.id, 'calma');
  assert.equal(cambiada.ciclo.dia, 2);
  assert.equal(cambiada.legado.reliquias, 1);
  assert(cambiada.cronica.some((entrada) => entrada.tipo === 'reliquia'));
});

test('el botón de siguiente estación puede avanzar con pasos simulados y disparar un evento anual', () => {
  let aldea = { ...crearAldea(), ciclo: { segundos: 39, dia: 1 } };
  const restante = estacionEn(aldea.ciclo.segundos).restante;
  for (let paso = 0; paso < restante; paso += 1) aldea = simularPasoActivo(aldea, catalogo);
  assert.equal(estacionEn(aldea.ciclo.segundos).id, 'verano');

  const conEvento = dispararEventoDelAnio(aldea, catalogo);
  assert(['bestias', 'helada', 'recaudador', 'incendio'].includes(conEvento.eventoNocturno.tipo));
  assert.equal(conEvento.eventoNocturno.dia, aldea.ciclo.dia);
});
