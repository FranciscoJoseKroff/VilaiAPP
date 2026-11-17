import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CALIDADES_GRAFICAS,
  calidadRecomendada,
  normalizarCalidadGrafica,
  perfilCalidadGrafica,
} from './calidadGrafica.js';

test('ofrece las cuatro calidades y normaliza preferencias desconocidas', () => {
  assert.deepEqual(CALIDADES_GRAFICAS, ['alta', 'media', 'baja', 'auto']);
  assert.equal(normalizarCalidadGrafica('baja'), 'baja');
  assert.equal(normalizarCalidadGrafica('desconocida'), 'auto');
});

test('Media usa la mitad de partículas y Baja las elimina y detiene la animación', () => {
  assert.equal(perfilCalidadGrafica('alta').particulas, 18);
  assert.equal(perfilCalidadGrafica('media').particulas, 9);
  assert.equal(perfilCalidadGrafica('baja').particulas, 0);
  assert.equal(perfilCalidadGrafica('baja').coposNieve, 0);
  assert.equal(perfilCalidadGrafica('baja').textosFlotantes, 2);
  assert.equal(perfilCalidadGrafica('baja').transicionesEstacion, false);
  assert.equal(perfilCalidadGrafica('baja').animacionEscena, false);
});

test('Reducir animaciones desactiva partículas y movimientos en cualquier nivel', () => {
  for (const calidad of CALIDADES_GRAFICAS) {
    const perfil = perfilCalidadGrafica(calidad, true);
    assert.equal(perfil.particulas, 0);
    assert.equal(perfil.coposNieve, 0);
    assert.equal(perfil.transicionesEstacion, false);
    assert.equal(perfil.animacionEscena, false);
  }
});

test('Auto propone Baja por debajo de 30 FPS, Media por debajo de 40 y nunca cambia solo', () => {
  assert.equal(calidadRecomendada(29.9), 'baja');
  assert.equal(calidadRecomendada(30), 'media');
  assert.equal(calidadRecomendada(39.9), 'media');
  assert.equal(calidadRecomendada(40), null);
  assert.equal(calidadRecomendada(Number.NaN), null);
});
