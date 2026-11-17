const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Aldea = require('./src/models/Village');
const { ESCENARIOS } = require('./src/utils/escenarios');
const { simularSegundo } = require('./src/utils/gameSimulation');
const { calcularCapacidades, LOGROS } = require('./src/utils/villageDefaults');
const { estacionEn } = require('./src/utils/tiempo');

const usuarioId = new mongoose.Types.ObjectId();

for (const [nombre, crearEscenario] of Object.entries(ESCENARIOS)) {
  const aldea = crearEscenario(usuarioId);
  const errorValidacion = new Aldea(aldea).validateSync();
  assert.ifError(errorValidacion, `${nombre} debe cumplir el esquema de Mongoose`);
  assert(aldea.aldeanos.every((aldeano) => aldeano.modoTrabajo === 'automatico'));
  assert(aldea.aldeanos.every((aldeano) => (
    ['libre', 'lenador', 'agricultor', 'minero', 'guardia'].includes(aldeano.trabajo)
  )));
  assert(aldea.aldeanos.every((aldeano) => (
    ['buscando_arbol', 'talando', 'cultivando', 'minando', 'vigilando', 'descansando', 'yendo_a_construir', 'construyendo']
      .includes(aldeano.estado)
  )));

  const simulacion = structuredClone(aldea);
  for (let segundo = 0; segundo < 300; segundo += 1) simularSegundo(simulacion, 1);
}

const aldeaViva = ESCENARIOS['aldea-viva'](usuarioId);
assert.deepEqual(aldeaViva, ESCENARIOS['aldea-viva'](usuarioId));
assert.equal(aldeaViva.ciclo.dia, 25);
assert.equal(aldeaViva.edad.id, 'calma');
assert.equal(aldeaViva.aldeanos.length, 8);
assert.equal(aldeaViva.edificios.length, 9);
assert.equal(aldeaViva.cronica.length, 8);
assert.equal(aldeaViva.legado.reliquias, 1);
const capacidades = calcularCapacidades(aldeaViva);
for (const [recurso, cantidad] of Object.entries(aldeaViva.recursos)) {
  const porcentaje = cantidad / capacidades[recurso];
  assert(porcentaje >= 0.4 && porcentaje <= 0.7, `${recurso} debe estar entre 40 % y 70 %`);
}
assert.deepEqual(
  Object.fromEntries(aldeaViva.edificios.map((edificio) => [edificio.tipoId, edificio.nivel])),
  {
    aserradero: 3,
    granja: 3,
    casa: 4,
    granero: 1,
    almacen: 2,
    molino: 1,
    horno: 1,
    mina: 1,
    centroInvestigacion: 2,
  }
);
assert.deepEqual(
  Object.fromEntries(Object.entries(aldeaViva.tecnologias).filter(([, nivel]) => nivel > 0)),
  { herramientas: 2, logistica: 1, defensa: 1, metalurgia: 1 }
);

const invierno = ESCENARIOS['invierno-helada'](usuarioId);
assert.equal(invierno.ciclo.dia, 58);
assert.equal(invierno.edad.id, 'hielo');
assert.equal(invierno.ciclo.segundos, 105);
assert.equal(estacionEn(invierno.ciclo.segundos).restante, 15);
assert.equal(invierno.aldeanos.length, 10);
assert.equal(invierno.edificios.length, 0);

const cambioDeEdad = ESCENARIOS['cambio-de-edad'](usuarioId);
const reliquiasAntes = cambioDeEdad.legado.reliquias;
for (let segundo = 0; segundo < 10; segundo += 1) simularSegundo(cambioDeEdad, 1);
assert.notEqual(cambioDeEdad.edad.id, 'calma');
assert.equal(cambioDeEdad.ciclo.dia, 26);
const premioLogros = cambioDeEdad.logros.reduce((total, desbloqueado) => (
  total + Number(LOGROS.find((logro) => logro.id === desbloqueado.id)?.premioReliquias || 0)
), 0);
assert.equal(cambioDeEdad.legado.reliquias, reliquiasAntes + 1 + premioLogros);
assert(cambioDeEdad.cronica.some((entrada) => entrada.tipo === 'reliquia'));

console.log('OK: los tres escenarios validan el esquema y simulan 5 minutos.');
console.log('OK: cambio-de-edad transiciona y entrega una reliquia tras 10 segundos.');
