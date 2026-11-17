import test from 'node:test';
import assert from 'node:assert/strict';
import { debeReintentarGuardado, esErrorCliente } from './politicaGuardado.js';

test('un 4xx se informa como validación y nunca se reintenta automáticamente', () => {
  const error = Object.assign(new Error('Datos inválidos'), { status: 400, detalle: 'trabajo no permitido' });
  assert.equal(esErrorCliente(error), true);
  assert.equal(debeReintentarGuardado(error, 1), false);
  assert.equal(debeReintentarGuardado(error, 2), false);
  assert.equal(debeReintentarGuardado(error, 3), false);
});

test('errores de servidor o conexión conservan como máximo tres intentos', () => {
  assert.equal(debeReintentarGuardado({ status: 503 }, 1), true);
  assert.equal(debeReintentarGuardado(new Error('fallo de red'), 2), true);
  assert.equal(debeReintentarGuardado({ status: 503 }, 3), false);
});
