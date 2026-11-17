import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { simularProduccionActiva } from './simulation.js';
import { calcularEfectosEdificios } from './buildingEffects.js';
import { seleccionarEdificiosAfectados } from './eventEffects.js';

const require = createRequire(import.meta.url);
const {
  ARBOL_INVESTIGACION,
  CAPACIDADES_BASE,
  EDADES,
  EVENTOS_NOCTURNOS,
  ESTACIONES,
  RELIQUIAS,
  TIPOS_EDIFICIO,
} = require('../../backend/src/utils/villageDefaults.js');
const { calcularEfectosEdificios: calcularEfectosBackend } = require('../../backend/src/utils/buildingEffects.js');

const edificiosPrueba = [
  { tipoId: 'taberna', nivel: 5, integridad: 100 },
  { tipoId: 'biblioteca', nivel: 5, integridad: 100 },
  { tipoId: 'torreVigilancia', nivel: 1, integridad: 100 },
];

test('efectos de edificios coinciden entre front y back y respetan niveles', () => {
  const aldea = { edificios: edificiosPrueba };
  const front = calcularEfectosEdificios(aldea, TIPOS_EDIFICIO);
  assert.deepEqual(front, calcularEfectosBackend(aldea, TIPOS_EDIFICIO));
  assert.equal(front.produccionGeneral, 0.1);
  assert.equal(front.velocidadInvestigacion, 1.25);
  assert.equal(front.avisoEventoSegundos, 10);
  assert.equal(front.multiplicadorGuardia, 1.1);
});

test('taberna aumenta la producción simulada', () => {
  const aldea = {
    recursos: { madera: 10 },
    tasasGeneracion: { madera: 1 },
    multiplicadores: { generacion: 1 },
    aldeanos: [],
    edificios: [{ tipoId: 'taberna', nivel: 5, integridad: 100 }],
    ciclo: { segundos: 0, dia: 1 },
    edad: { id: 'calma' },
    legado: { reliquias: 0 },
  };
  const catalogo = {
    tiposEdificio: TIPOS_EDIFICIO,
    capacidadesBase: CAPACIDADES_BASE,
    arbol: ARBOL_INVESTIGACION,
    reliquias: RELIQUIAS,
    estaciones: ESTACIONES,
    edades: EDADES,
  };
  const recursos = simularProduccionActiva(aldea, catalogo);
  assert.equal(recursos.madera, 11.1);
});

test('incendio solo selecciona aserraderos, casas y graneros para daño', () => {
  const edificios = [
    { tipoId: 'aserradero', integridad: 100 },
    { tipoId: 'casa', integridad: 100 },
    { tipoId: 'granero', integridad: 100 },
    { tipoId: 'granja', integridad: 100 },
    { tipoId: 'mina', integridad: 100 },
    { tipoId: 'biblioteca', integridad: 100 },
  ];
  const afectados = seleccionarEdificiosAfectados(edificios, 'incendio', EVENTOS_NOCTURNOS.incendio);
  assert.deepEqual(afectados.map(({ tipoId }) => tipoId), ['aserradero', 'casa', 'granero']);
  afectados.forEach((edificio) => { edificio.integridad -= 28; });
  assert.deepEqual(edificios.slice(3).map(({ integridad }) => integridad), [100, 100, 100]);
});
