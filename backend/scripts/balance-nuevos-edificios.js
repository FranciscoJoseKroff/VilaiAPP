const { crearAldeaPorDefecto } = require('../src/utils/villageDefaults');
const { simularSegundo } = require('../src/utils/gameSimulation');

const RECURSOS = ['madera', 'comida', 'hierro', 'oro', 'trigo', 'harina', 'pan'];
const EDIFICIOS_BASE = [
  { tipoId: 'centroInvestigacion', nivel: 2 },
  { tipoId: 'granero', nivel: 5 },
  { tipoId: 'almacen', nivel: 5 },
  { tipoId: 'mina', nivel: 1 },
];
const EDIFICIOS_NUEVOS = [
  { tipoId: 'taberna', nivel: 3 },
  { tipoId: 'biblioteca', nivel: 5 },
  { tipoId: 'torreVigilancia', nivel: 2 },
];

function crearEjemplo(contenidoNuevo) {
  const aldea = crearAldeaPorDefecto('balance-demo');
  aldea.recursos = {
    madera: 150,
    comida: 150,
    hierro: 350,
    oro: 50,
    trigo: 100,
    harina: 100,
    pan: 200,
  };
  aldea.tasasGeneracion = {
    madera: 0,
    comida: 0.5,
    hierro: 0.01,
    oro: 0.02,
    trigo: 0.02,
    harina: 0.01,
    pan: 0.01,
  };
  aldea.edificios = [...EDIFICIOS_BASE, ...(contenidoNuevo ? EDIFICIOS_NUEVOS : [])]
    .map((edificio, indice) => ({
      ...edificio,
      x: indice * 100,
      y: 0,
      integridad: 100,
      completo: true,
    }));
  aldea.aldeanos = [
    { nombre: 'Alba', trabajo: 'lenador', modoTrabajo: 'manual', rasgo: 'maderero' },
    { nombre: 'Bruno', trabajo: 'agricultor', modoTrabajo: 'manual', rasgo: 'hortelano' },
    { nombre: 'Cira', trabajo: 'minero', modoTrabajo: 'manual', rasgo: 'minero' },
  ];
  aldea.investigacionEnCurso = {
    id: 'herramientas',
    nivelObjetivo: 1,
    progresoSegundos: 0,
  };
  return aldea;
}

function simular(aldea, segundos) {
  for (let paso = 0; paso < segundos; paso += 1) simularSegundo(aldea, 1);
  return aldea.recursos;
}

const sinContenido = simular(crearEjemplo(false), 10 * 180);
const conContenido = simular(crearEjemplo(true), 10 * 180);
const filas = RECURSOS.map((recurso) => {
  const anterior = Number(sinContenido[recurso]) || 0;
  const nuevo = Number(conContenido[recurso]) || 0;
  const variacion = anterior === 0
    ? (nuevo === 0 ? 0 : Infinity)
    : ((nuevo - anterior) / anterior) * 100;
  return { recurso, anterior, nuevo, variacion };
});

console.log('Balance de 10 años · aldea de ejemplo con investigación en curso');
console.log('Recurso    | Sin contenido | Con contenido | Variación | Resultado');
console.log('-----------|---------------|---------------|-----------|----------');
for (const fila of filas) {
  const porcentaje = Number.isFinite(fila.variacion) ? `${fila.variacion.toFixed(2)} %` : 'infinita';
  const resultado = Math.abs(fila.variacion) <= 8 ? 'OK' : 'FUERA ±8 %';
  console.log(
    `${fila.recurso.padEnd(10)} | ${fila.anterior.toFixed(1).padStart(13)} | ${fila.nuevo.toFixed(1).padStart(13)} | ${porcentaje.padStart(9)} | ${resultado}`
  );
}

const fueraDeRango = filas.filter((fila) => Math.abs(fila.variacion) > 8);
if (fueraDeRango.length) {
  console.error(`Balance fuera de rango: ${fueraDeRango.map((fila) => fila.recurso).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('OK: todos los recursos se mantienen dentro de ±8 %.');
}
