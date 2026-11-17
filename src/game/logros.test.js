import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { aplicarLogros, evaluarLogros } from './logros.js';

const require = createRequire(import.meta.url);
const logrosBack = require('../../backend/src/utils/logros.js');
const { LOGROS } = require('../../backend/src/utils/villageDefaults.js');

function aldeaConTodosLosHitos() {
  return {
    aldeanos: Array.from({ length: 10 }, () => ({})),
    edad: { numero: 4 },
    estadisticas: {
      contadores: {
        eventosDefendidos: 5,
        edificiosConstruidos: 15,
        investigacionesCompletas: 3,
      },
    },
    tecnologias: { metalurgia: 1, herramientas: 1, logistica: 1 },
    edificios: [{ tipoId: 'casa', nivel: 5 }],
    ciclo: { dia: 6 },
    legado: { reliquias: 3 },
    cronica: Array.from({ length: 30 }, (_, indice) => ({
      anio: 1,
      tipo: indice < 5 ? 'evento' : 'general',
      texto: indice < 5 ? 'La aldea resistió la noche.' : 'La aldea prospera.',
    })),
    logros: [],
  };
}

test('front y back evalúan el mismo catálogo de logros', () => {
  const aldea = aldeaConTodosLosHitos();
  assert.deepEqual(evaluarLogros(aldea, LOGROS), logrosBack.evaluarLogros(aldea, LOGROS));
  assert.deepEqual(evaluarLogros(aldea, LOGROS), LOGROS.map((logro) => logro.id));
});

test('otorga cada logro una sola vez y aplica las reliquias de premio', () => {
  const desbloqueada = aplicarLogros(aldeaConTodosLosHitos(), LOGROS);
  assert.equal(desbloqueada.logros.length, LOGROS.length);
  assert.equal(desbloqueada.legado.reliquias, 6);
  assert.equal(desbloqueada.cronica.filter((entrada) => entrada.tipo === 'logro').length, LOGROS.length);
  assert.strictEqual(aplicarLogros(desbloqueada, LOGROS), desbloqueada);
});
