import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crearTextoDiagnostico,
  obtenerDiagnostico,
  registrarError,
  registrarFalloRed,
  registrarGuardadoCorrecto,
  registrarRespuestaApi,
} from './registro.js';

test('registra errores 4xx como conexión activa, incluyendo detalle y sin datos privados', () => {
  registrarFalloRed('fallo de red anterior');
  registrarRespuestaApi(400, "Enum inválido: `estado-inventado` is not a valid enum value. correo ana@example.test Bearer secreto");
  const texto = crearTextoDiagnostico({
    versionApp: '1.0.0',
    versionApi: '1.0.0',
    snapshot: obtenerDiagnostico(),
  });
  assert.equal(obtenerDiagnostico().conexion, 'Conectado');
  assert.match(texto, /API 400/);
  assert.match(texto, /Enum inválido/);
  assert.doesNotMatch(texto, /ana@example\.test|Bearer secreto|estado-inventado/);
});

test('limita el registro a veinte errores y conserva la hora del último guardado', () => {
  const guardado = new Date().toISOString();
  registrarGuardadoCorrecto(guardado);
  for (let indice = 0; indice < 25; indice += 1) registrarError('Prueba', `error ${indice}`);
  assert.equal(obtenerDiagnostico().errores.length, 20);
  assert.equal(obtenerDiagnostico().ultimoGuardado, guardado);
});
