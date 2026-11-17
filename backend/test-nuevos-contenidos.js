const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Aldea = require('./src/models/Village');
const { calcularEfectosEdificios } = require('./src/utils/buildingEffects');
const { crearAldeaPorDefecto, TIPOS_EDIFICIO } = require('./src/utils/villageDefaults');
const { simularSegundo } = require('./src/utils/gameSimulation');

const usuario = new mongoose.Types.ObjectId();
const aldea = crearAldeaPorDefecto(usuario);
aldea.edificios = [
  { tipoId: 'centroInvestigacion', nivel: 2, x: 5, y: 10, completo: true },
  { tipoId: 'taberna', nivel: 5, x: 10, y: 10, completo: true },
  { tipoId: 'biblioteca', nivel: 5, x: 20, y: 10, completo: true },
  { tipoId: 'torreVigilancia', nivel: 1, x: 30, y: 10, completo: true },
];
aldea.aldeanos[0] = {
  ...aldea.aldeanos[0],
  trabajo: 'guardia',
  modoTrabajo: 'automatico',
  rasgo: 'guardian',
  estado: 'vigilando',
};
aldea.eventoNocturno = { tipo: 'incendio', dia: 1 };
aldea.eventoPrevisto = { tipo: 'incendio', dia: 1, segundosRestantes: 10 };
aldea.investigacionEnCurso = { id: 'logistica', nivelObjetivo: 2, progresoSegundos: 12 };

const documento = new Aldea(aldea);
assert.equal(documento.validateSync(), undefined);
assert(Aldea.schema.path('edificios').schema.path('tipoId').enumValues.includes('taberna'));
assert(Aldea.schema.path('edificios').schema.path('tipoId').enumValues.includes('biblioteca'));
assert(Aldea.schema.path('edificios').schema.path('tipoId').enumValues.includes('torreVigilancia'));
assert(Aldea.schema.path('aldeanos').schema.path('rasgo').enumValues.includes('guardian'));
assert(Aldea.schema.path('eventoNocturno.tipo').enumValues.includes('incendio'));
assert(Aldea.schema.path('eventoPrevisto.tipo').enumValues.includes('incendio'));

const efectos = calcularEfectosEdificios(aldea, TIPOS_EDIFICIO);
assert.equal(efectos.produccionGeneral, 0.1);
assert.equal(efectos.velocidadInvestigacion, 1.25);
assert.equal(efectos.avisoEventoSegundos, 10);
assert.equal(efectos.multiplicadorGuardia, 1.1);

function aldeaDeProduccion(edificios) {
  const estado = crearAldeaPorDefecto(usuario);
  estado.recursos.madera = 10;
  estado.tasasGeneracion.madera = 1;
  estado.edificios = edificios;
  estado.aldeanos = [];
  return estado;
}

const base = aldeaDeProduccion([]);
const conTaberna = aldeaDeProduccion([{ tipoId: 'taberna', nivel: 5, integridad: 100 }]);
simularSegundo(base, 1, () => {});
simularSegundo(conTaberna, 1, () => {});
assert.equal(base.recursos.madera, 11);
assert.equal(conTaberna.recursos.madera, 11.1);

const torreEstado = aldeaDeProduccion([{ tipoId: 'torreVigilancia', nivel: 1, integridad: 100 }]);
torreEstado.ciclo.segundos = 109;
simularSegundo(torreEstado, 1, () => {});
assert(torreEstado.eventoPrevisto.tipo);
assert.equal(torreEstado.eventoPrevisto.segundosRestantes, 10);

const investigacion = aldeaDeProduccion([{ tipoId: 'biblioteca', nivel: 5, integridad: 100 }]);
investigacion.investigacionEnCurso = { id: 'herramientas', nivelObjetivo: 1, progresoSegundos: 59 };
simularSegundo(investigacion, 1, () => {});
assert.equal(investigacion.tecnologias.herramientas, 1);
assert.equal(investigacion.investigacionEnCurso.id, null);

console.log('OK: enums, rasgo guardian, efectos y simulación de edificios nuevos');
