const assert = require('assert');
const fs = require('fs');
const { ANIO_SEGUNDOS, estacionEn, avanzarTiempo } = require('./src/utils/tiempo');

function legado(ciclo, evento, duracion) {
  const anterior = ciclo.segundos || 0;
  const transcurrido = anterior + duracion;
  if (anterior < 120 && transcurrido >= 120 && !evento.tipo) {
    const eventos = ['bestias', 'helada', 'recaudador'];
    evento = { tipo: eventos[((ciclo.dia || 1) - 1) % 3], dia: ciclo.dia || 1 };
  }
  if (transcurrido >= ANIO_SEGUNDOS) {
    ciclo = { segundos: transcurrido - ANIO_SEGUNDOS, dia: (ciclo.dia || 1) + 1 };
  } else {
    ciclo = { segundos: transcurrido, dia: ciclo.dia || 1 };
  }
  return { ciclo, evento };
}

for (const duracion of [1, 0.5]) {
  let nuevo = { segundos: 0, dia: 1 };
  let nuevoEvento = { tipo: null, dia: 0 };
  let viejo = { segundos: 0, dia: 1 };
  let viejoEvento = { tipo: null, dia: 0 };
  for (let paso = 0; paso < 100000; paso += 1) {
    nuevoEvento = nuevoEvento || { tipo: null, dia: 0 };
    const resultado = avanzarTiempo(nuevo, duracion);
    const anterior = nuevo.segundos;
    nuevo = resultado.ciclo;
    if (anterior < 120 && nuevo.segundos >= 120 && !nuevoEvento.tipo) {
      const eventos = ['bestias', 'helada', 'recaudador'];
      nuevoEvento = { tipo: eventos[((resultado.ciclo.dia || 1) - 1) % 3], dia: resultado.ciclo.dia || 1 };
    }
    const referencia = legado(viejo, viejoEvento, duracion);
    viejo = referencia.ciclo;
    viejoEvento = referencia.evento;
    assert.deepStrictEqual(nuevo, viejo, `ciclo difiere en paso ${paso}, duración ${duracion}`);
    assert.deepStrictEqual(nuevoEvento, viejoEvento, `evento difiere en paso ${paso}, duración ${duracion}`);
  }
  console.log(`OK: 100.000 pasos dorados con duración ${duracion}`);
}

let ciclo = { segundos: 0, dia: 1 };
for (let paso = 0; paso < 180; paso += 1) ciclo = avanzarTiempo(ciclo, 1).ciclo;
assert.deepStrictEqual(ciclo, { segundos: 0, dia: 2 });
console.log('OK: 180 pasos = 1 año exacto');

const vectores = JSON.parse(fs.readFileSync('./fixtures/tiempo-vectores.json', 'utf8'))
  .filter((vector) => Number.isFinite(vector.segundos));
for (const vector of vectores) {
  const actual = estacionEn(vector.segundos);
  for (const clave of ['id', 'indice', 'segundosEnEstacion', 'duracion', 'restante']) {
    assert.strictEqual(actual[clave], vector[clave], `vector ${vector.segundos}: ${clave}`);
  }
}
console.log(`OK: estacionEn para ${vectores.length} vectores límite`);
