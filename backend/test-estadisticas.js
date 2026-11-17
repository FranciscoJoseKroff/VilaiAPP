const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Aldea = require('./src/models/Village');
const {
  MAX_PUNTOS_ESTADISTICAS,
  crearEstadisticasIniciales,
} = require('./src/utils/estadisticas');

async function main() {
  const front = await import('../src/game/estadisticas.js');
  const back = require('./src/utils/estadisticas');
  const crearAldea = () => ({
    recursos: { madera: 0.5, comida: 12.8, hierro: 4.4, oro: 1.5 },
    aldeanos: [{}, {}],
    edad: { id: 'hielo' },
    estadisticas: crearEstadisticasIniciales(),
  });
  let aldeaFront = crearAldea();
  let aldeaBack = crearAldea();
  for (let anio = 1; anio <= 125; anio += 1) {
    const vector = {
      ciclo: { dia: anio },
      recursos: { madera: anio + 0.6, comida: anio / 2, hierro: anio * 2, oro: anio + 0.4 },
      aldeanos: Array.from({ length: anio % 7 }, () => ({})),
      edad: { id: anio % 2 ? 'calma' : 'abundancia' },
    };
    aldeaFront = front.registrarAnio({ ...aldeaFront, ...vector });
    aldeaBack = back.registrarAnio({ ...aldeaBack, ...vector });
    assert.deepEqual(aldeaFront, aldeaBack);
  }
  assert.equal(aldeaFront.estadisticas.serie.length, MAX_PUNTOS_ESTADISTICAS);
  assert.equal(aldeaFront.estadisticas.serie[0].a, 6);
  assert.deepEqual(back.registrarAnio(aldeaBack), aldeaBack);

  const serie = Array.from({ length: 120 }, (_, indice) => ({
    a: indice + 1,
    r: { madera: indice, comida: indice + 1, hierro: indice + 2, oro: indice + 3 },
    p: indice % 20,
    e: 'calma',
  }));
  const documento = new Aldea({
    usuario: new mongoose.Types.ObjectId(),
    recursos: { madera: 100, comida: 100, hierro: 100, oro: 100 },
    estadisticas: {
      serie,
      contadores: {
        eventosDefendidos: 20,
        eventosAceptados: 10,
        edificiosConstruidos: 12,
        aldeanosLlegados: 15,
        investigacionesCompletas: 8,
      },
    },
  });
  await documento.validate();
  assert(JSON.stringify(documento.toObject()).length < 100 * 1024);

  const serieInvalida = new Aldea({
    usuario: new mongoose.Types.ObjectId(),
    estadisticas: { serie: [...serie, serie[0]] },
  });
  await assert.rejects(serieInvalida.validate(), /120 puntos/);
  console.log('OK: paridad front/back, límite de 120 puntos, validación y aldea menor de 100 KB');
}

main().catch((error) => {
  console.error('FALLÓ test-estadisticas:', error);
  process.exitCode = 1;
});
