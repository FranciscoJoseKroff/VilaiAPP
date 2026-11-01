import assert from 'node:assert/strict';
import test from 'node:test';
import { decidir } from './decidir.js';

const mundo = {
  hora: 50,
  edificios: [{ tipoId: 'aserradero', completo: true }],
  random: () => 0,
};

function aldeano(necesidades, extras = {}) {
  return {
    id: 'test',
    profesion: 'lenador',
    necesidades: { hambre: 20, energia: 80, animo: 70, ...necesidades },
    rasgos: [],
    ...extras,
  };
}

test('hambre alta obliga a comer', () => {
  assert.equal(decidir(aldeano({ hambre: 90 }), mundo).accion, 'comer');
});

test('energia baja predispone a descansar', () => {
  assert.equal(decidir(aldeano({ energia: 5 }), mundo).accion, 'descansar');
});

test('de noche descansa aunque tenga trabajo', () => {
  assert.equal(decidir(aldeano({ energia: 80 }), { ...mundo, hora: 130 }).accion, 'descansar');
});

test('el rasgo perezoso reduce la preferencia por trabajar', () => {
  const normal = decidir(aldeano({ hambre: 20, energia: 60 }), mundo).accion;
  const perezoso = decidir(aldeano({ hambre: 20, energia: 60 }, { rasgos: ['perezoso'] }), mundo).accion;
  assert.notEqual(perezoso, 'ir_al_trabajo');
  assert.ok(normal === 'ir_al_trabajo' || normal === 'descansar');
});

test('sin trabajo disponible vaga', () => {
  assert.equal(decidir(aldeano({}, { profesion: 'sin_oficio' }), mundo).accion, 'vagar');
});
