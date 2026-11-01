import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { ESTADOS_ALDEANO, TRABAJOS_ALDEANO, prepararAldeaParaGuardar } from './aldeanoEnums.js';
import { crearAldeanoVida, sincronizarAldeanoConVida } from './mundo.js';
import { crearStoreAldeanos } from './villagerStore.js';
import { simularAldeanos } from './simularAldeanos.js';

test('los enums coinciden con la fixture generada por el backend', async () => {
  const fixture = JSON.parse(await readFile(new URL('../../fixtures/enums-aldeano.json', import.meta.url), 'utf8'));
  assert.deepEqual(ESTADOS_ALDEANO, fixture.estado);
  assert.deepEqual(TRABAJOS_ALDEANO, fixture.trabajo);
});

test('la simulacion, sincronizacion y guardado no persisten estadoVida ni trabajos visuales', () => {
  const base = [
    { id: '1', nombre: 'Ana', x: 240, y: 300, trabajo: 'libre', estado: 'buscando_arbol', necesidades: {} },
    { id: '2', nombre: 'Pedro', x: 258, y: 300, trabajo: 'lenador', estado: 'talando', necesidades: {} },
    { id: '3', nombre: 'Sofia', x: 276, y: 300, trabajo: 'minero', estado: 'minando', necesidades: {} },
  ];
  const store = crearStoreAldeanos(base.map((aldeano, indice) => crearAldeanoVida(aldeano, indice)));
  const mundo = { edificios: [], recursos: { comida: 100 }, hora: 50, random: () => 0 };

  for (let tick = 0; tick < 25; tick += 1) {
    simularAldeanos(store, mundo, 0.1);
  }

  const sincronizados = base.map((aldeano, indice) => sincronizarAldeanoConVida(
    aldeano,
    store.getState()[indice],
    indice,
  ));
  const payload = prepararAldeaParaGuardar({ aldeanos: sincronizados });

  assert.ok(payload.aldeanos.every((aldeano) => ESTADOS_ALDEANO.includes(aldeano.estado)));
  assert.ok(payload.aldeanos.every((aldeano) => TRABAJOS_ALDEANO.includes(aldeano.trabajo)));
  assert.ok(store.getState().every((aldeano) => aldeano.estadoVida));
});
