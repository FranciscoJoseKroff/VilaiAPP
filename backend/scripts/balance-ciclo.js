const { ESTACIONES } = require('../src/utils/villageDefaults');
const { estacionEn } = require('../src/utils/tiempo');

const ejemplo = { madera: 1, comida: 1, trigo: 0.2 };
const antiguos = { madera: 0, comida: 0, trigo: 0 };
const nuevo = { madera: 0, comida: 0, trigo: 0 };

for (let segundo = 0; segundo < 180; segundo += 1) {
  const estacionId = estacionEn(segundo).id;
  const estacionCatalogoId = estacionId === 'otoño' ? 'otono' : estacionId;
  const estacion = ESTACIONES[estacionCatalogoId];
  for (const recurso of Object.keys(ejemplo)) {
    antiguos[recurso] += ejemplo[recurso] * (segundo >= 120 ? 0.8 : 1);
    nuevo[recurso] += ejemplo[recurso] * estacion.generacion * (estacion.recursos[recurso] ?? 1);
  }
}

console.log('Balance de 1 año (aldea de ejemplo: madera 1/s, comida 1/s, trigo 0.2/s)');
for (const recurso of Object.keys(ejemplo)) {
  const diferencia = antiguos[recurso] === 0 ? 0 : ((nuevo[recurso] - antiguos[recurso]) / antiguos[recurso]) * 100;
  console.log(`${recurso}: antiguo=${antiguos[recurso].toFixed(1)}, nuevo=${nuevo[recurso].toFixed(1)}, diferencia=${diferencia.toFixed(2)}%`);
}
