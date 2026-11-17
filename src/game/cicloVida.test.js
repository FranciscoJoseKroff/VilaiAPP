import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import {
  CICLO_VIDA,
  asegurarAldeaVida,
  avanzarAnioVida,
  etapaVida,
  multiplicadorProduccion,
  PROBABILIDAD_NACIMIENTO_ANUAL,
  RASGOS_NACIMIENTO,
} from './cicloVida.js';
import { simularProduccionActiva } from './simulation.js';
import { crearAldeanoVida } from '../simulacion/mundo.js';
import { aleatorio, semillaDe } from './tiempo.js';

const require = createRequire(import.meta.url);
const cicloVidaBackend = require('../../backend/src/utils/cicloVida.js');

test('front y back inicializan y envejecen aldeanos con los mismos valores', () => {
  const aldea = {
    _id: 'aldea-prueba',
    recursos: { comida: 10 },
    ciclo: { dia: 50 },
    aldeanos: [
      { _id: 'nina', nombre: 'Luz', edadAnios: 5, esperanza: 70, trabajo: 'lenador' },
      { _id: 'adulto', nombre: 'Sol', edadAnios: 49, esperanza: 75, trabajo: 'agricultor' },
      { _id: 'anciano', nombre: 'Mar', edadAnios: 50, esperanza: 80, trabajo: 'guardia' },
    ],
  };
  assert.deepEqual(CICLO_VIDA, cicloVidaBackend.CICLO_VIDA);
  assert.deepEqual(asegurarAldeaVida(aldea), cicloVidaBackend.asegurarAldeaVida(aldea));
  assert.deepEqual(avanzarAnioVida(aldea), cicloVidaBackend.avanzarAnioVida(aldea));
  const siguiente = avanzarAnioVida(aldea);
  assert.deepEqual(siguiente.aldeanos.map((aldeano) => etapaVida(aldeano)), ['adulto', 'anciano', 'anciano']);
  assert.deepEqual(siguiente.aldeanos.map((aldeano) => aldeano.edadAnios), [6, 50, 51]);
  assert.equal(siguiente.recursos.comida, 9);
  assert.equal(siguiente.aldeanos[0].trabajo, 'libre');
  assert.equal(siguiente.cronica.length, 2);
  assert.equal(multiplicadorProduccion(siguiente.aldeanos[0]), 1);
  assert.equal(multiplicadorProduccion(siguiente.aldeanos[1]), 0.8);
});

test('edad inicial y esperanza son deterministas y respetan sus rangos', () => {
  const aldea = {
    _id: 'aldea-seed',
    aldeanos: Array.from({ length: 100 }, (_, indice) => ({ _id: `aldeano-${indice}`, nombre: `Aldeano ${indice}` })),
  };
  const front = asegurarAldeaVida(aldea);
  const back = cicloVidaBackend.asegurarAldeaVida(aldea);
  assert.deepEqual(front, back);
  assert.equal(crearAldeanoVida(aldea.aldeanos[0], 0, aldea).esperanza, back.aldeanos[0].esperanza);
  assert.equal(crearAldeanoVida(aldea.aldeanos[0], 0, aldea).edadAnios, back.aldeanos[0].edadAnios);
  for (const aldeano of front.aldeanos) {
    assert(aldeano.edadAnios >= 15 && aldeano.edadAnios <= 40);
    assert(aldeano.esperanza >= 62 && aldeano.esperanza <= 82);
  }
});

test('niños no producen y los ancianos producen el 80 %', () => {
  const catalogo = {
    tiposEdificio: {},
    capacidadesBase: { madera: 100 },
    arbol: [],
    reliquias: {},
    estaciones: { primavera: { general: 1, recursos: {} } },
    edades: { calma: { generacion: 1, recursos: {} } },
    produccionTrabajador: 1,
  };
  const recursosDe = (edadAnios) => simularProduccionActiva({
    recursos: { madera: 0 },
    tasasGeneracion: { madera: 0 },
    aldeanos: [{ edadAnios, trabajo: 'lenador', rasgo: 'polivalente' }],
    edificios: [],
    ciclo: { segundos: 0, dia: 1 },
    edad: { id: 'calma' },
    legado: { reliquias: 0 },
  }, catalogo).madera;
  assert.equal(recursosDe(5), 0);
  assert.equal(recursosDe(30), 1);
  assert.equal(recursosDe(60), 0.8);
});

test('nacimientos son deterministas, respetan condiciones y coinciden entre front y back', () => {
  const aldeaId = 'aldea-nacimiento-paridad';
  const semilla = semillaDe(aldeaId);
  const aniosElegibles = [];
  let anioSinNacimiento = null;
  for (let anio = 2; anio < 10000; anio += 1) {
    const suerte = aleatorio(semilla, `nacimiento:probabilidad:${anio}`);
    if (suerte < PROBABILIDAD_NACIMIENTO_ANUAL) {
      aniosElegibles.push(anio);
    } else if (anioSinNacimiento === null) {
      anioSinNacimiento = anio;
    }
  }
  const anioHerencia = aniosElegibles.find((anio) => (
    aleatorio(semilla, `nacimiento:herencia:${anio}`) < 0.7
  ));
  const anioRasgoAleatorio = aniosElegibles.find((anio) => (
    aleatorio(semilla, `nacimiento:herencia:${anio}`) >= 0.7
  ));
  const crearAldea = (anio, cambios = {}) => ({
    _id: aldeaId,
    ciclo: { dia: anio },
    recursos: { comida: 200 },
    poblacionMaxima: 3,
    aldeanos: [
      { id: 'madre', nombre: 'Alba', edadAnios: 30, esperanza: 70, rasgo: 'maderero', trabajo: 'lenador' },
      { id: 'padre', nombre: 'Bruno', edadAnios: 31, esperanza: 75, rasgo: 'hortelano', trabajo: 'agricultor' },
    ],
    ...cambios,
  });
  const nacimiento = avanzarAnioVida(crearAldea(anioHerencia), { capacidadComida: 250 });
  const repetido = avanzarAnioVida(crearAldea(anioHerencia), { capacidadComida: 250 });
  const nacimientoBackend = cicloVidaBackend.avanzarAnioVida(
    crearAldea(anioHerencia),
    { capacidadComida: 250 }
  );
  const recienNacido = nacimiento.aldeanos[2];
  const adultosAntes = crearAldea(anioHerencia).aldeanos;
  const indicePadre = Math.floor(aleatorio(semilla, `nacimiento:padre:${anioHerencia}`) * adultosAntes.length);
  const indiceOtroPadre = Math.floor(aleatorio(semilla, `nacimiento:otro-padre:${anioHerencia}`));
  const segundoIndice = indiceOtroPadre >= indicePadre ? indiceOtroPadre + 1 : indiceOtroPadre;
  const progenitorElegido = aleatorio(semilla, `nacimiento:progenitor-rasgo:${anioHerencia}`) < 0.5
    ? adultosAntes[indicePadre]
    : adultosAntes[segundoIndice];

  assert.deepEqual(nacimiento, repetido);
  assert.deepEqual(nacimiento, nacimientoBackend);
  assert.equal(recienNacido.edadAnios, 0);
  assert(recienNacido.esperanza >= 62 && recienNacido.esperanza <= 82);
  assert.equal(recienNacido.rasgo, progenitorElegido.rasgo);
  assert.equal(
    nacimiento.cronica.at(-1).texto,
    `Nació ${recienNacido.nombre}, hijo de ${adultosAntes[indicePadre].nombre}`
  );

  const nacimientoConRasgoAleatorio = avanzarAnioVida(
    crearAldea(anioRasgoAleatorio),
    { capacidadComida: 250 }
  );
  const rasgoEsperado = RASGOS_NACIMIENTO[
    Math.floor(aleatorio(semilla, `nacimiento:rasgo:${anioRasgoAleatorio}`) * RASGOS_NACIMIENTO.length)
  ];
  assert.deepEqual(
    nacimientoConRasgoAleatorio,
    avanzarAnioVida(crearAldea(anioRasgoAleatorio), { capacidadComida: 250 })
  );
  assert.equal(nacimientoConRasgoAleatorio.aldeanos[2].rasgo, rasgoEsperado);

  const anioSinNacimientoResultado = avanzarAnioVida(
    crearAldea(anioSinNacimiento),
    { capacidadComida: 250 }
  );
  assert.equal(anioSinNacimientoResultado.aldeanos.length, 3);
  assert(!anioSinNacimientoResultado.cronica.some((entrada) => entrada.tipo === 'nacimiento'));

  const aldeaEnMaximo = avanzarAnioVida(
    crearAldea(anioHerencia, { poblacionMaxima: 2 }),
    { capacidadComida: 250 }
  );
  assert.equal(aldeaEnMaximo.aldeanos.length, 3);
  assert(!aldeaEnMaximo.cronica.some((entrada) => entrada.tipo === 'nacimiento'));
  const aldeaUnAdulto = avanzarAnioVida(
    crearAldea(anioHerencia, {
      aldeanos: [
        { id: 'adulto', nombre: 'Alba', edadAnios: 30, esperanza: 70, rasgo: 'maderero' },
        { id: 'anciano', nombre: 'Bruno', edadAnios: 50, esperanza: 75, rasgo: 'hortelano' },
      ],
    }),
    { capacidadComida: 250 }
  );
  assert.equal(aldeaUnAdulto.aldeanos.length, 3);
  assert(!aldeaUnAdulto.cronica.some((entrada) => entrada.tipo === 'nacimiento'));
  const aldeaComidaBaja = avanzarAnioVida(
    crearAldea(anioHerencia, { recursos: { comida: 125 } }),
    { capacidadComida: 250 }
  );
  assert.equal(aldeaComidaBaja.aldeanos.length, 3);
  assert(!aldeaComidaBaja.cronica.some((entrada) => entrada.tipo === 'nacimiento'));
});

test('muertes, duelo familiar, generaciones y población mínima son idénticos en front y back', () => {
  const aldeaMuerte = {
    _id: 'aldea-muerte',
    ciclo: { dia: 20 },
    recursos: { comida: 0 },
    poblacionMaxima: 5,
    legado: { generaciones: 4 },
    aldeanos: [
      { id: 'abuelo', nombre: 'Tomás', edadAnios: 63, esperanza: 64, familiaId: 'familia-a', rasgo: 'maderero' },
      { id: 'nieta', nombre: 'Luz', edadAnios: 30, esperanza: 75, familiaId: 'familia-a', rasgo: 'hortelano' },
      { id: 'vecino-1', nombre: 'Sol', edadAnios: 25, esperanza: 70, familiaId: 'familia-b', rasgo: 'minero' },
      { id: 'vecino-2', nombre: 'Mar', edadAnios: 24, esperanza: 70, familiaId: 'familia-c', rasgo: 'guardian' },
    ],
  };
  const front = avanzarAnioVida(aldeaMuerte);
  const back = cicloVidaBackend.avanzarAnioVida(aldeaMuerte);
  assert.deepEqual(front, back);
  assert.equal(front.aldeanos.length, 3);
  assert(!front.aldeanos.some((aldeano) => aldeano.id === 'abuelo'));
  assert.equal(front.legado.generaciones, 5);
  assert(front.cronica.some((entrada) => entrada.texto === 'Tomás falleció a los 64 años'));
  const familiarSuperviviente = front.aldeanos.find((aldeano) => aldeano.id === 'nieta');
  assert.equal(familiarSuperviviente.dueloAniosRestantes, 1);
  assert.equal(multiplicadorProduccion(familiarSuperviviente), 0.95);
  assert.equal(multiplicadorProduccion(front.aldeanos.find((aldeano) => aldeano.id === 'vecino-1')), 1);

  const finDuelo = avanzarAnioVida(front);
  assert.equal(finDuelo.aldeanos.find((aldeano) => aldeano.id === 'nieta').dueloAniosRestantes, 0);
  assert.equal(multiplicadorProduccion(finDuelo.aldeanos.find((aldeano) => aldeano.id === 'nieta')), 1);

  const caidaBajoMinimo = avanzarAnioVida({
    ...aldeaMuerte,
    _id: 'aldea-minimo',
    ciclo: { dia: 21 },
    aldeanos: aldeaMuerte.aldeanos.slice(0, 2),
  });
  assert.equal(caidaBajoMinimo.aldeanos.length, 3);
  assert(caidaBajoMinimo.cronica.some((entrada) => entrada.tipo === 'aldeano'));
  assert(caidaBajoMinimo.aldeanos.every((aldeano) => aldeano.familiaId));
});
