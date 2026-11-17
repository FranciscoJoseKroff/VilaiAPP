import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import * as front from './estadisticas.js';

const require = createRequire(import.meta.url);
const back = require('../../backend/src/utils/estadisticas.js');

function ejecutarVectores(modulo) {
  let aldea = {
    recursos: { madera: 12.6, comida: -2, hierro: 4.4, oro: 1.5 },
    aldeanos: [{}, {}, {}],
    edad: { id: 'hielo' },
    estadisticas: modulo.crearEstadisticasIniciales(),
  };
  for (let anio = 1; anio <= 130; anio += 1) {
    aldea = modulo.registrarAnio({
      ...aldea,
      ciclo: { dia: anio },
      recursos: { madera: anio + 0.6, comida: anio / 2, hierro: anio * 2, oro: anio + 0.4 },
      aldeanos: Array.from({ length: anio % 9 }, () => ({})),
      edad: { id: anio % 2 ? 'calma' : 'abundancia' },
    });
    if (anio === 70) aldea = modulo.incrementarContador(aldea, 'eventosDefendidos');
  }
  return modulo.registrarAnio(aldea);
}

test('el módulo puro de estadísticas mantiene paridad entre frontend y backend', () => {
  assert.deepEqual(ejecutarVectores(front), ejecutarVectores(back));
  const resultado = ejecutarVectores(front);
  assert.equal(resultado.estadisticas.serie.length, front.MAX_PUNTOS_ESTADISTICAS);
  assert.equal(resultado.estadisticas.serie[0].a, 11);
  assert.equal(resultado.estadisticas.serie.at(-1).a, 130);
  assert.deepEqual(resultado.estadisticas.serie[0].r, { madera: 12, comida: 6, hierro: 22, oro: 11 });
  assert.equal(resultado.estadisticas.contadores.eventosDefendidos, 1);
});

test('cada acción admitida incrementa solo su contador', () => {
  let aldea = { estadisticas: front.crearEstadisticasIniciales() };
  for (const nombre of front.NOMBRES_CONTADORES) aldea = front.incrementarContador(aldea, nombre);
  assert.deepEqual(aldea.estadisticas.contadores, {
    eventosDefendidos: 1,
    eventosAceptados: 1,
    edificiosConstruidos: 1,
    aldeanosLlegados: 1,
    investigacionesCompletas: 1,
  });
  assert.equal(front.incrementarContador(aldea, 'desconocido'), aldea);
});
