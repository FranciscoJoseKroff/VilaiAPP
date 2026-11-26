import test from 'node:test';
import assert from 'node:assert/strict';
import { sumarRecursosConCapacidad } from './recompensas.js';

test('la recompensa no pasa la capacidad y reporta lo que no cupo', () => {
  // Caso real del iPhone: madera 8350/8350 + 35 de la meta "Dar hogar a la aldea".
  const { recursos, sobrante } = sumarRecursosConCapacidad(
    { madera: 8350, comida: 1300 },
    { madera: 35, comida: 25 },
    { madera: 8350, comida: 1350 },
  );
  assert.equal(recursos.madera, 8350);
  assert.equal(recursos.comida, 1325);
  assert.deepEqual(sobrante, { madera: 35 });
});

test('cabe completa cuando hay espacio y respeta recursos sin capacidad conocida', () => {
  const { recursos, sobrante } = sumarRecursosConCapacidad({ pan: 0 }, { pan: 40, reliquia: 1 }, { pan: 100 });
  assert.equal(recursos.pan, 40);
  assert.equal(recursos.reliquia, 1);
  assert.deepEqual(sobrante, {});
});

test('no recorta lo que ya estaba sobre el tope', () => {
  const { recursos, sobrante } = sumarRecursosConCapacidad({ oro: 120 }, { oro: 25 }, { oro: 100 });
  assert.equal(recursos.oro, 120);
  assert.deepEqual(sobrante, { oro: 25 });
});
