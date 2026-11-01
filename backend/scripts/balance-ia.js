const { actualizarAgentes } = require('../src/utils/agentBrain');
const { calcularCapacidades, RASGOS_ALDEANO } = require('../src/utils/villageDefaults');
const { esInvierno } = require('../src/utils/tiempo');
const { simularSegundo } = require('../src/utils/gameSimulation');

const ANIOS = 10;
const SEGUNDOS_POR_ANIO = 180;
const OFICIOS = ['lenador', 'agricultor', 'minero', 'guardia', 'libre'];
const RECURSOS = ['madera', 'comida', 'hierro'];

function decidirTrabajoLegado(aldea, aldeano, indice) {
  const capacidades = calcularCapacidades(aldea);
  const conteos = { lenador: 0, agricultor: 0, minero: 0, guardia: 0 };
  for (let otroIndice = 0; otroIndice < aldea.aldeanos.length; otroIndice += 1) {
    if (otroIndice === indice) continue;
    const trabajo = aldea.aldeanos[otroIndice].trabajo;
    if (conteos[trabajo] !== undefined) conteos[trabajo] += 1;
  }

  const objetivoMadera = Math.min(120, capacidades.madera * 0.45);
  const objetivoComida = Math.min(80, capacidades.comida * 0.4);
  const objetivoHierro = Math.min(80, capacidades.hierro * 0.35);
  const recursos = aldea.recursos;
  const rasgo = RASGOS_ALDEANO[aldeano.rasgo] || RASGOS_ALDEANO.polivalente;
  const limitar = (valor) => Math.max(0, Math.min(1, valor));
  const opciones = [
    {
      trabajo: 'lenador', estado: 'talando', pensamiento: 'La madera empieza a escasear; voy al bosque.',
      puntaje: limitar((objetivoMadera - (recursos.madera || 0)) / objetivoMadera) / (1 + conteos.lenador * 0.8)
        + (rasgo.trabajo === 'lenador' ? 0.28 : 0),
    },
    {
      trabajo: 'agricultor', estado: 'cultivando', pensamiento: 'Quiero que las reservas de comida estén seguras.',
      puntaje: limitar((objetivoComida - (recursos.comida || 0)) / objetivoComida) / (1 + conteos.agricultor * 0.8)
        + (rasgo.trabajo === 'agricultor' ? 0.28 : 0),
    },
  ];
  if (aldea.edificios.some((edificio) => edificio.tipoId === 'mina')
    && (recursos.pan || 0) >= 1
    && (recursos.hierro || 0) < capacidades.hierro) {
    opciones.push({
      trabajo: 'minero', estado: 'minando', pensamiento: 'Hay pan y espacio en el almacén; bajo a la mina.',
      puntaje: limitar((objetivoHierro - (recursos.hierro || 0)) / objetivoHierro) / (1 + conteos.minero * 0.9)
        + (rasgo.trabajo === 'minero' ? 0.28 : 0),
    });
  }
  const ciclo = aldea.ciclo;
  const hayEvento = Boolean(aldea.eventoNocturno?.tipo);
  if ((hayEvento || esInvierno(ciclo.segundos)) && (aldea.tecnologias.defensa || 0) > 0) {
    opciones.push({
      trabajo: 'guardia', estado: 'vigilando',
      pensamiento: hayEvento
        ? 'Oigo ruidos en el lindero; me quedo de guardia.'
        : 'La noche cae; vigilo las casas y los cultivos.',
      puntaje: (hayEvento ? 1.2 : 0.62) / (1 + conteos.guardia * 1.3),
    });
  }
  const orden = (indice + (ciclo.dia || 1)) % 2 === 0
    ? ['agricultor', 'lenador', 'minero', 'guardia']
    : ['lenador', 'agricultor', 'minero', 'guardia'];
  opciones.sort((primera, segunda) => {
    const diferencia = segunda.puntaje - primera.puntaje;
    return Math.abs(diferencia) > 0.0001
      ? diferencia
      : orden.indexOf(primera.trabajo) - orden.indexOf(segunda.trabajo);
  });
  const elegida = opciones[0];
  return !elegida || elegida.puntaje < 0.2
    ? { trabajo: 'libre', estado: 'descansando', pensamientoActual: 'Las reservas están estables; aprovecho para descansar.' }
    : elegida;
}

function actualizarAgentesLegado(aldea) {
  if ((aldea.ciclo.segundos || 0) % 10 !== 0) return;
  for (let indice = 0; indice < aldea.aldeanos.length; indice += 1) {
    const aldeano = aldea.aldeanos[indice];
    const decision = decidirTrabajoLegado(aldea, aldeano, indice);
    aldeano.trabajo = decision.trabajo;
    aldeano.estado = decision.estado;
    aldeano.pensamientoActual = decision.pensamiento || decision.pensamientoActual;
  }
}

function crearAldea() {
  const aldeanos = [
    ['Alba', 'maderero'], ['Berto', 'maderero'],
    ['Celia', 'hortelano'], ['Dario', 'hortelano'],
    ['Eva', 'minero'], ['Fabio', 'minero'],
    ['Gala', 'polivalente'], ['Hugo', 'polivalente'],
  ].map(([nombre, rasgo], indice) => ({
    _id: `aldeano-${indice + 1}`,
    nombre,
    modoTrabajo: 'automatico',
    trabajo: 'libre',
    estado: 'descansando',
    rasgo,
    pensamientoActual: '',
  }));
  return {
    _id: 'balance-ia-10-anios',
    recursos: { madera: 200, comida: 120, oro: 0, trigo: 500, harina: 0, pan: 80, hierro: 0 },
    tasasGeneracion: { madera: 0, comida: 0.3, oro: 0, trigo: 0.25, harina: 0, pan: 0, hierro: 0 },
    multiplicadores: { generacion: 1 },
    tecnologias: { herramientas: 0, logistica: 0, defensa: 0 },
    legado: { reliquias: 0 },
    investigaciones: { metalurgia: false },
    ciclo: { segundos: 0, dia: 1 },
    eventoNocturno: { tipo: null, dia: 0 },
    edad: { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 10 },
    cronica: [],
    aldeanos,
    edificios: [
      { tipoId: 'almacen', nivel: 3 },
      { tipoId: 'granero', nivel: 1 },
      { tipoId: 'granja', nivel: 1 },
      { tipoId: 'molino', nivel: 1 },
      { tipoId: 'horno', nivel: 1 },
      { tipoId: 'mina', nivel: 1 },
    ],
  };
}

function simular(actualizar) {
  const aldea = crearAldea();
  const produccion = Object.fromEntries(RECURSOS.map((recurso) => [recurso, 0]));
  const tiempoOficios = Object.fromEntries(OFICIOS.map((oficio) => [oficio, 0]));
  const totalTicks = ANIOS * SEGUNDOS_POR_ANIO;
  for (let tick = 0; tick < totalTicks; tick += 1) {
    const antes = Object.fromEntries(RECURSOS.map((recurso) => [recurso, aldea.recursos[recurso] || 0]));
    simularSegundo(aldea, 1, actualizar);
    for (const recurso of RECURSOS) {
      produccion[recurso] += Math.max(0, (aldea.recursos[recurso] || 0) - antes[recurso]);
    }
    for (const aldeano of aldea.aldeanos) tiempoOficios[aldeano.trabajo] += 1;
  }
  const totalTiempo = totalTicks * aldea.aldeanos.length;
  const porcentajes = Object.fromEntries(OFICIOS.map((oficio) => [
    oficio,
    (tiempoOficios[oficio] / totalTiempo) * 100,
  ]));
  return { produccion, porcentajes };
}

function imprimirTabla(titulo, columnas, filas) {
  console.log(`\n${titulo}`);
  console.log(`| ${columnas.join(' | ')} |`);
  console.log(`| ${columnas.map(() => '---').join(' | ')} |`);
  for (const fila of filas) console.log(`| ${fila.join(' | ')} |`);
}

const anterior = simular(actualizarAgentesLegado);
const nuevo = simular(actualizarAgentes);
const filasRecursos = RECURSOS.map((recurso) => {
  const anteriorTotal = anterior.produccion[recurso];
  const nuevoTotal = nuevo.produccion[recurso];
  const desviacion = anteriorTotal === 0
    ? (nuevoTotal === 0 ? 0 : Infinity)
    : ((nuevoTotal - anteriorTotal) / anteriorTotal) * 100;
  return [
    recurso,
    anteriorTotal.toFixed(1),
    nuevoTotal.toFixed(1),
    Number.isFinite(desviacion) ? `${desviacion.toFixed(1)}%` : 'infinita',
  ];
});
imprimirTabla('Producción acumulada durante 10 años', ['Recurso', 'Antes', 'Después', 'Desviación'], filasRecursos);

const filasOficios = OFICIOS.map((oficio) => [
  oficio,
  `${anterior.porcentajes[oficio].toFixed(1)}%`,
  `${nuevo.porcentajes[oficio].toFixed(1)}%`,
]);
imprimirTabla('Porcentaje del tiempo por oficio', ['Oficio', 'Antes', 'Después'], filasOficios);

const fueraDeMargen = RECURSOS.filter((recurso) => {
  const anteriorTotal = anterior.produccion[recurso];
  const nuevoTotal = nuevo.produccion[recurso];
  if (anteriorTotal === 0) return nuevoTotal !== 0;
  return Math.abs((nuevoTotal - anteriorTotal) / anteriorTotal) > 0.1;
});
if (fueraDeMargen.length > 0) {
  console.log(`\nDETENER: desviación superior a ±10% en ${fueraDeMargen.join(', ')}.`);
} else {
  console.log('\nBalance dentro del margen de ±10% en todos los recursos.');
}