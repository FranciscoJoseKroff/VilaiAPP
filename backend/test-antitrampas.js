const assert = require('node:assert/strict');
const test = require('node:test');
const { crearAldeaPorDefecto } = require('./src/utils/villageDefaults');
const { evaluarAldea } = require('./src/utils/antiTrampas');

function aldeaBase() {
  const aldea = crearAldeaPorDefecto('usuario-test');
  aldea.ultimoGuardado = new Date(0);
  aldea.anclaAntiTrampas = { cicloDia: 1, inicio: new Date(0) };
  return aldea;
}

test('el límite de años permite el margen y rechaza avances excesivos', () => {
  const anterior = aldeaBase();
  const permitida = { ...anterior, ciclo: { segundos: 0, dia: 4 } };
  const rechazada = { ...anterior, ciclo: { segundos: 0, dia: 5 } };
  const ahora = 180_000;

  assert.equal(evaluarAldea(permitida, anterior, ahora).rechazo, null);
  assert.match(evaluarAldea(rechazada, anterior, ahora).rechazo, /ritmo permitido/);

  const yaAvanzo = {
    ...anterior,
    ciclo: { segundos: 0, dia: 3 },
    anclaAntiTrampas: { cicloDia: 1, inicio: new Date(0) },
  };
  const margenAcumulado = { ...yaAvanzo, ciclo: { segundos: 0, dia: 5 } };
  assert.match(evaluarAldea(margenAcumulado, yaAvanzo, ahora).rechazo, /ritmo permitido/);
});

test('rechaza recursos por encima de la capacidad calculada', () => {
  const anterior = aldeaBase();
  const propuesta = {
    ...anterior,
    recursos: { ...anterior.recursos, madera: 251 },
  };

  assert.match(evaluarAldea(propuesta, anterior, 1_000).rechazo, /capacidad actual/);
});

test('acepta reliquias justificadas por una edad o un logro nuevo válido', () => {
  const anterior = aldeaBase();
  anterior.ciclo.dia = 8;
  anterior.edad = { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 8 };

  const porEdad = {
    ...anterior,
    ciclo: { segundos: 0, dia: 9 },
    edad: { id: 'hielo', numero: 2, inicioAnio: 9, duracionAnios: 6 },
    legado: { ...anterior.legado, reliquias: 1 },
  };
  assert.equal(evaluarAldea(porEdad, anterior, 10_000).marcarSospechosa, false);

  const porLogro = {
    ...anterior,
    legado: { ...anterior.legado, reliquias: 1 },
    estadisticas: { contadores: { eventosDefendidos: 5 } },
    logros: [{ id: 'defensor', anio: 8 }],
  };
  assert.equal(evaluarAldea(porLogro, anterior, 10_000).marcarSospechosa, false);
});

test('marca como sospechoso el exceso de reliquias y exime la aldea demo del ritmo', () => {
  const anterior = aldeaBase();
  const propuesta = {
    ...anterior,
    ciclo: { segundos: 0, dia: 1 },
    legado: { ...anterior.legado, reliquias: 1 },
  };
  assert.equal(evaluarAldea(propuesta, anterior, 1_000).marcarSospechosa, true);

  const demo = { ...anterior, marcaDemo: true };
  const progresoDemo = {
    ...propuesta,
    ciclo: { segundos: 0, dia: 100 },
    recursos: { ...propuesta.recursos, madera: 251 },
  };
  assert.match(evaluarAldea(progresoDemo, demo, 1_000).rechazo, /capacidad actual/);

  progresoDemo.recursos.madera = 20;
  const resultadoDemo = evaluarAldea(progresoDemo, demo, 1_000);
  assert.equal(resultadoDemo.rechazo, null);
  assert.equal(resultadoDemo.marcarSospechosa, false);
});
