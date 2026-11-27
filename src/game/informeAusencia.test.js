import assert from 'node:assert/strict';
import { test } from 'node:test';
import { armarInformeAusencia, formatearAusencia } from './informeAusencia.js';

const resumenTiempo = {
  segundos: 5400,
  anios: 30,
  edadAnterior: 'Edad de Calma',
  edadNueva: 'Edad de Abundancia',
  cambios: [
    { anio: 3, tipo: 'aldeano', texto: 'Llegó Rosa' },
    { anio: 5, tipo: 'etapa_vida', texto: 'Rosa ya es adulta' },
    { anio: 8, tipo: 'nacimiento', texto: 'Nació Bruno' },
    { anio: 9, tipo: 'investigacion', texto: 'Se completó Herramientas calibradas' },
    { anio: 11, tipo: 'edad', texto: 'Comienza la Edad de Abundancia' },
    { anio: 11, tipo: 'reliquia', texto: 'Se halló una reliquia entre las ruinas' },
    { anio: 20, tipo: 'fallecimiento', texto: 'Murió Aurelio' },
    { anio: 21, tipo: 'etapa_vida', texto: 'Bruno ya es joven' },
  ],
};
const resumenOffline = {
  segundosAusente: 5400,
  recursosGenerados: { madera: 120.4, comida: 0.3, oro: 8 },
  logrosDesbloqueados: ['primeraEdad'],
  alcanzoTope8h: false,
};

test('agrupa la crónica de la ausencia por secciones', () => {
  const informe = armarInformeAusencia({ resumenTiempo, resumenOffline, aldea: { eventoNocturno: { tipo: 'bestias', dia: 31 } } });
  assert.equal(informe.mostrar, true);
  assert.equal(informe.tiempo, '1 h 30 min');
  assert.equal(informe.anios, 30);
  assert.deepEqual(informe.cambioEdad, { de: 'Edad de Calma', a: 'Edad de Abundancia' });
  assert.deepEqual(informe.evento, { tipo: 'bestias', anio: 31 });
  assert.deepEqual(informe.poblacion.map((c) => c.texto), ['Llegó Rosa', 'Nació Bruno', 'Murió Aurelio']);
  assert.equal(informe.reliquias.length, 1);
  assert.deepEqual(informe.edades.map((c) => c.anio), [11]);
  assert.equal(informe.investigaciones.length, 1);
  assert.equal(informe.cambiosDeEtapa, 2);
  assert.deepEqual(informe.logros, ['primeraEdad']);
  // Las ganancias menores a 1 no se muestran como "+0".
  assert.deepEqual(informe.recursos.map((r) => r.recurso), ['madera', 'oro']);
});

test('una ausencia corta sin años no muestra el informe', () => {
  const informe = armarInformeAusencia({
    resumenTiempo: { segundos: 30, anios: 0, edadAnterior: 'Edad de Calma', edadNueva: 'Edad de Calma', cambios: [] },
    resumenOffline: { segundosAusente: 30, recursosGenerados: {} },
    aldea: { eventoNocturno: { tipo: null, dia: 0 } },
  });
  assert.equal(informe.mostrar, false);
  assert.equal(informe.cambioEdad, null);
  assert.equal(informe.evento, null);
});

test('tolera respuestas antiguas sin resumenTiempo', () => {
  const informe = armarInformeAusencia({ resumenOffline: { segundosAusente: 7200, recursosGenerados: { madera: 10 } } });
  assert.equal(informe.mostrar, true);
  assert.equal(informe.anios, 0);
  assert.deepEqual(informe.poblacion, []);
});

test('formatea el tiempo ausente', () => {
  assert.equal(formatearAusencia(28800), '8 h');
  assert.equal(formatearAusencia(125), '2 min');
  assert.equal(formatearAusencia(20), 'menos de 1 min');
});
