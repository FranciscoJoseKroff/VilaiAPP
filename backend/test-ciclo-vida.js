const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { aplicarProgresoInactivo } = require('./src/utils/offlineProgress');
const { crearAldeaPorDefecto } = require('./src/utils/villageDefaults');
const Aldea = require('./src/models/Village');
const {
  CICLO_VIDA,
  asegurarAldeaVida,
  avanzarAnioVida,
  etapaVida,
  multiplicadorProduccion,
} = require('./src/utils/cicloVida');
const { simularSegundo } = require('./src/utils/gameSimulation');

const umbrales = asegurarAldeaVida({
  _id: 'umbral',
  recursos: { comida: 10 },
  ciclo: { dia: 50 },
  aldeanos: [
    { _id: 'nina', nombre: 'Luz', edadAnios: 5, esperanza: 70, trabajo: 'lenador', estado: 'talando' },
    { _id: 'adulto', nombre: 'Sol', edadAnios: 49, esperanza: 75, trabajo: 'agricultor', estado: 'cultivando' },
    { _id: 'anciano', nombre: 'Mar', edadAnios: 50, esperanza: 80, trabajo: 'guardia', estado: 'vigilando' },
  ],
});
const siguiente = avanzarAnioVida(umbrales);
assert.deepStrictEqual(siguiente.aldeanos.map((aldeano) => aldeano.edadAnios), [6, 50, 51]);
assert.deepStrictEqual(siguiente.aldeanos.map((aldeano) => etapaVida(aldeano)), ['adulto', 'anciano', 'anciano']);
assert.strictEqual(siguiente.aldeanos[0].trabajo, 'libre');
assert.strictEqual(siguiente.recursos.comida, 9);
assert.strictEqual(siguiente.cronica.length, 2);
assert.strictEqual(multiplicadorProduccion(siguiente.aldeanos[1]), 0.8);
assert(siguiente.aldeanos.every((aldeano) => (
  Aldea.schema.path('aldeanos').schema.path('trabajo').enumValues.includes(aldeano.trabajo)
  && Aldea.schema.path('aldeanos').schema.path('estado').enumValues.includes(aldeano.estado)
)));

function produccionDeEdad(edadAnios) {
  const aldea = crearAldeaPorDefecto(`produccion-${edadAnios}`);
  aldea.ciclo.segundos = 10;
  aldea.edificios = [];
  aldea.recursos.madera = 0;
  aldea.tasasGeneracion.madera = 0;
  aldea.aldeanos = [{
    _id: `trabajador-${edadAnios}`,
    nombre: 'Trabajador',
    edadAnios,
    esperanza: 70,
    trabajo: 'lenador',
    modoTrabajo: 'manual',
    rasgo: 'polivalente',
  }];
  simularSegundo(aldea, 100, () => {});
  return aldea.recursos.madera;
}
assert.strictEqual(produccionDeEdad(5), 0);
const produccionAdulto = produccionDeEdad(30);
const produccionAnciano = produccionDeEdad(60);
assert.strictEqual(produccionAdulto, 22);
assert.strictEqual(produccionAnciano, produccionAdulto * 0.8);
assert.deepStrictEqual(CICLO_VIDA.esperanza, [62, 82]);

const semillas = 100;
const aniosSimulados = 300;
const aldeanosPorAldea = 8;
const resultados = [];
for (let semilla = 0; semilla < semillas; semilla += 1) {
  const aldea = crearAldeaPorDefecto(`semilla-${semilla}`);
  aldea._id = `aldea-${semilla}`;
  aldea.recursos.comida = 250;
  aldea.poblacionMaxima = 12;
  aldea.aldeanos = Array.from({ length: aldeanosPorAldea }, (_, indice) => ({
    _id: `aldeano-${semilla}-${indice}`,
    nombre: `Aldeano ${indice + 1}`,
    trabajo: 'libre',
    modoTrabajo: 'manual',
  }));
  Object.assign(aldea, asegurarAldeaVida(aldea));
  let muertes = 0;
  let primerFallecimiento = null;
  let muertesPorAnio = 0;
  for (let anio = 0; anio < aniosSimulados; anio += 1) {
    const generacionesAntes = Number(aldea.legado.generaciones || 0);
    simularSegundo(aldea, 180, () => {});
    const muertesDelAnio = Number(aldea.legado.generaciones || 0) - generacionesAntes;
    muertesPorAnio += muertesDelAnio;
    muertes += muertesDelAnio;
    if (muertesDelAnio && primerFallecimiento === null) primerFallecimiento = anio + 1;
    assert(aldea.aldeanos.length >= 3, `La semilla ${semilla} se extinguió en el año ${anio + 1}`);
  }
  const poblacion = aldea.aldeanos.length;
  const adultos = aldea.aldeanos.filter((aldeano) => etapaVida(aldeano) === 'adulto').length;
  resultados.push({ poblacion, adultos, muertes, muertesPorAnio, primerFallecimiento });
}

const poblacionMedia = resultados.reduce((total, item) => total + item.poblacion, 0) / semillas;
const poblacionMinima = Math.min(...resultados.map((item) => item.poblacion));
const poblacionMaxima = Math.max(...resultados.map((item) => item.poblacion));
const adultosTotales = resultados.reduce((total, item) => total + item.adultos, 0);
const aldeanosTotales = resultados.reduce((total, item) => total + item.poblacion, 0);
const proporcionAdultos = aldeanosTotales ? adultosTotales / aldeanosTotales : 0;
const muertesTotales = resultados.reduce((total, item) => total + item.muertes, 0);
const promedioMuertesPorAnio = muertesTotales / (semillas * aniosSimulados);
const primerosFallecimientosMinutos = resultados
  .filter((item) => item.primerFallecimiento !== null)
  .map((item) => item.primerFallecimiento * 3);
const promedioPrimerFallecimiento = primerosFallecimientosMinutos.reduce((total, minutos) => total + minutos, 0)
  / primerosFallecimientosMinutos.length;
const semillasBajoTres = resultados
  .map((item, indice) => (item.poblacion < 3 ? indice : null))
  .filter((indice) => indice !== null);
assert(poblacionMedia >= 3);
assert(poblacionMinima >= 3);
assert(poblacionMaxima <= 12);
assert(muertesTotales > 0);
assert.strictEqual(primerosFallecimientosMinutos.length, semillas);
assert.deepStrictEqual(semillasBajoTres, []);

const aldeaOffline = crearAldeaPorDefecto('semilla-offline');
aldeaOffline.ultimoGuardado = new Date(Date.now() - 8 * 60 * 60 * 1000);
aplicarProgresoInactivo(aldeaOffline);
assert.strictEqual(aldeaOffline.ciclo.dia, 161);
assert(aldeaOffline.aldeanos.length >= 3);
assert(aldeaOffline.legado.generaciones > 0);
assert(aldeaOffline.cronica.some((entrada) => entrada.tipo === 'fallecimiento'));

const aldeaOfflineConNacimiento = crearAldeaPorDefecto('semilla-offline-nacimiento');
aldeaOfflineConNacimiento.usuario = new mongoose.Types.ObjectId();
aldeaOfflineConNacimiento.poblacionMaxima = 3;
aldeaOfflineConNacimiento.recursos.comida = 250;
aldeaOfflineConNacimiento.aldeanos = [
  {
    nombre: 'Alba', x: 400, y: 300, edadAnios: 30, esperanza: 70,
    trabajo: 'libre', modoTrabajo: 'manual', rasgo: 'maderero', estado: 'descansando',
  },
  {
    nombre: 'Bruno', x: 420, y: 300, edadAnios: 31, esperanza: 75,
    trabajo: 'libre', modoTrabajo: 'manual', rasgo: 'hortelano', estado: 'descansando',
  },
];
aldeaOfflineConNacimiento.ultimoGuardado = new Date(Date.now() - 8 * 60 * 60 * 1000);
const resumenNacimientoOffline = aplicarProgresoInactivo(aldeaOfflineConNacimiento);
assert(aldeaOfflineConNacimiento.aldeanos.length > 2);
assert(aldeaOfflineConNacimiento.aldeanos.length <= aldeaOfflineConNacimiento.poblacionMaxima);
assert(aldeaOfflineConNacimiento.cronica.some((entrada) => entrada.tipo === 'nacimiento'));
const llegadasRegistradas = aldeaOfflineConNacimiento.cronica.filter((entrada) => entrada.tipo === 'aldeano').length;
assert.strictEqual(resumenNacimientoOffline.resumenOffline.aldeanosLlegados, llegadasRegistradas);
assert(aldeaOfflineConNacimiento.estadisticas.contadores.aldeanosLlegados >= llegadasRegistradas);
assert.ifError(new Aldea(aldeaOfflineConNacimiento).validateSync());

console.log(`${aniosSimulados} años × 3 min/año × ${semillas} semillas, con ${aldeanosPorAldea} habitantes iniciales y máximo 12`);
console.log(`Población final: media ${poblacionMedia.toFixed(2)}, mínimo ${poblacionMinima}, máximo ${poblacionMaxima} · adultos ${(proporcionAdultos * 100).toFixed(2)} %`);
console.log(`Muertes: ${muertesTotales} total · ${promedioMuertesPorAnio.toFixed(3)} por aldea-año`);
console.log(`Primer fallecimiento: mínimo ${Math.min(...primerosFallecimientosMinutos)} min, media ${promedioPrimerFallecimiento.toFixed(2)} min, máximo ${Math.max(...primerosFallecimientosMinutos)} min`);
console.log(`Semillas con población < 3: ${semillasBajoTres.length ? semillasBajoTres.join(', ') : 'ninguna'}`);
console.log(`Progreso offline comprobado: ${aldeaOfflineConNacimiento.aldeanos.length - 2} nacimientos preservados, sin contarlos como forasteros`);
console.log('OK: sin extinciones, muertes/duelo deterministas y progreso offline');

// Aldeas con más habitantes que el máximo (recompensas de metas antiguas) se corrigen al cargar.
const { asegurarPoblacionMaxima } = require('./src/utils/migracionPoblacion');
const aldeaDesbordada = { poblacionMaxima: 1, aldeanos: [{}, {}, {}] };
asegurarPoblacionMaxima(aldeaDesbordada);
assert.equal(aldeaDesbordada.poblacionMaxima, 3);
asegurarPoblacionMaxima(aldeaDesbordada);
assert.equal(aldeaDesbordada.poblacionMaxima, 3, 'la migración es idempotente');
const aldeaConHolgura = { poblacionMaxima: 5, aldeanos: [{}] };
assert.equal(asegurarPoblacionMaxima(aldeaConHolgura).poblacionMaxima, 5, 'no baja un máximo mayor');
console.log('OK: poblacionMaxima nunca queda bajo la población actual');
