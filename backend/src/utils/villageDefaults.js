// Catálogo de edificios disponibles. El costo y tiempo de construcción son los
// valores de Nivel 1; para niveles superiores se recalculan con las funciones
// costoSiguienteNivel / tiempoSiguienteNivel de más abajo (mejora procedural).
const { efectosActivos, RELIQUIAS } = require('./investigacion');

const TIPOS_EDIFICIO = {
  aserradero: {
    nombre: 'Aserradero',
    costoBase: { madera: 20 },
    tiempoConstruccion: 3,
    efectoTasa: { recurso: 'madera', base: 0.4 },
  },
  granja: {
    nombre: 'Granja',
    costoBase: { madera: 15, comida: 5 },
    tiempoConstruccion: 3,
    efectoTasa: { recurso: 'comida', base: 0.4 },
    efectoTasaSecundario: { recurso: 'trigo', base: 0.2 },
  },
  casa: {
    nombre: 'Casa',
    costoBase: { madera: 25, comida: 10 },
    tiempoConstruccion: 4,
    efectoPoblacion: 1,
  },
  centroInvestigacion: {
    nombre: 'Centro de Investigación',
    costoBase: { madera: 30, comida: 20 },
    tiempoConstruccion: 5,
  },
  granero: {
    nombre: 'Granero',
    costoBase: { madera: 40, comida: 25 },
    tiempoConstruccion: 4,
    efectoCapacidad: { comida: 500, trigo: 500, harina: 500, pan: 500 },
  },
  almacen: {
    nombre: 'Almacén',
    costoBase: { madera: 50, comida: 30 },
    tiempoConstruccion: 4,
    efectoCapacidad: { madera: 500, oro: 500, hierro: 500 },
  },
  molino: {
    nombre: 'Molino',
    costoBase: { madera: 70, comida: 40 },
    tiempoConstruccion: 6,
    receta: { entrada: 'trigo', salida: 'harina', tasa: 0.2 },
  },
  horno: {
    nombre: 'Horno',
    costoBase: { madera: 90, comida: 60 },
    tiempoConstruccion: 7,
    receta: { entrada: 'harina', salida: 'pan', tasa: 0.15 },
  },
  mina: {
    nombre: 'Mina de hierro',
    costoBase: { madera: 120, comida: 80 },
    tiempoConstruccion: 8,
    produccionPorMinero: { entrada: 'pan', salida: 'hierro', consumo: 0.05, produccion: 0.1 },
  },
  observatorio: {
    nombre: 'Observatorio antiguo',
    costoBase: { madera: 250, hierro: 30, pan: 20 },
    tiempoConstruccion: 12,
    efectoTasa: { recurso: 'oro', base: 0.2 },
    requiereTecnologia: 'planosAntiguos',
  },
};

const CAPACIDADES_BASE = {
  madera: 250,
  comida: 250,
  oro: 100,
  trigo: 100,
  harina: 100,
  pan: 100,
  hierro: 100,
};
const OBJETIVOS_IA = { madera: 0.42, comida: 0.40, hierro: 0.15 };
const TOPE_OBJETIVO = null;

const UMBRAL_POBLACION_BASE = 30;
const FACTOR_CRECIMIENTO_UMBRAL = 1.6; // cada nuevo aldeano exige más comida acumulada que el anterior
const MADERA_INICIAL = 20;
const PRODUCCION_TRABAJADOR = 0.2;
const SEGUNDOS_DIA = 120;
const SEGUNDOS_NOCHE = 60;
const ESTACIONES = {
  primavera: { nombre: 'Primavera', inicio: 0, duracion: 40, generacion: 1.00, recursos: { comida: 1.10 }, icono: 'flower' },
  verano: { nombre: 'Verano', inicio: 40, duracion: 40, generacion: 1.05, recursos: { madera: 1.10 }, icono: 'white-balance-sunny' },
  otono: { nombre: 'Otoño', inicio: 80, duracion: 40, generacion: 1.00, recursos: { comida: 1.15, trigo: 1.15 }, pesosIA: { agricultor: 0.12 }, icono: 'leaf' },
  invierno: { nombre: 'Invierno', inicio: 120, duracion: 60, generacion: 0.80, recursos: { comida: 0.90 }, pesosIA: { guardia: 0.15, mineroSinPan: -0.15 }, icono: 'snowflake' },
};
const EDADES = {
  calma: { nombre: 'Edad de la Calma', duracionAnios: [8, 14], pesoSeleccion: 2, generacion: 1, recursos: {}, danoEventos: 1, guardiaEficacia: 1, pesosEventos: { bestias: 1, helada: 1, recaudador: 1 }, pesosIA: {}, icono: 'weather-partly-cloudy', descripcion: 'Tiempos tranquilos. Nada cambia.' },
  abundancia: { nombre: 'Edad de la Abundancia', duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 1, recursos: { comida: 1.2, trigo: 1.2 }, danoEventos: 0.8, guardiaEficacia: 1, pesosEventos: { bestias: 0.5, helada: 0.5, recaudador: 2 }, pesosIA: { agricultor: 0.15 }, icono: 'basket', descripcion: 'Las cosechas rinden más, pero atraes a los recaudadores.' },
  hielo: { nombre: 'Edad del Hielo', duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 1, recursos: { comida: 0.85, madera: 0.9 }, danoEventos: 1, guardiaEficacia: 1, pesosEventos: { bestias: 0.5, helada: 3, recaudador: 0.5 }, pesosIA: { agricultor: 0.15 }, icono: 'snowflake-variant', descripcion: 'Heladas frecuentes y cosechas escasas.' },
  ceniza: { nombre: 'Edad de la Ceniza', duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 1, recursos: { madera: 0.8, hierro: 1.25 }, danoEventos: 1.3, guardiaEficacia: 1, pesosEventos: { bestias: 1, helada: 0.5, recaudador: 1.5 }, pesosIA: { lenador: 0.10, minero: 0.15 }, icono: 'volcano', descripcion: 'La tierra arde: menos madera, más hierro y más daño.' },
  sombras: { nombre: 'Edad de las Sombras', duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 0.95, recursos: {}, danoEventos: 1, guardiaEficacia: 2, pesosEventos: { bestias: 3, helada: 0.5, recaudador: 1 }, pesosIA: { guardia: 0.15 }, icono: 'weather-night', descripcion: 'Más bestias, pero los guardias valen el doble.' },
  descubrimientos: { nombre: 'Edad de los Descubrimientos', duracionAnios: [6, 10], pesoSeleccion: 1, generacion: 1, recursos: { hierro: 1.2, oro: 1.3, comida: 0.95 }, danoEventos: 1, guardiaEficacia: 1, pesosEventos: { bestias: 1, helada: 1, recaudador: 1 }, pesosIA: {}, icono: 'telescope', descripcion: 'Más hierro y oro, a costa de algo de comida.' },
};
const RASGOS_ALDEANO = {
  polivalente: { nombre: 'Polivalente', trabajo: null, bono: 0.1 },
  maderero: { nombre: 'Maderero', trabajo: 'lenador', bono: 0.25 },
  hortelano: { nombre: 'Hortelano', trabajo: 'agricultor', bono: 0.25 },
  minero: { nombre: 'Minero nato', trabajo: 'minero', bono: 0.25 },
};
const TECNOLOGIAS = {
  herramientas: { nombre: 'Herramientas calibradas', costoBase: { madera: 40, comida: 25 }, factorCosto: 1.6 },
  logistica: { nombre: 'Rutas de abastecimiento', costoBase: { madera: 80, comida: 40 }, factorCosto: 1.7 },
  defensa: { nombre: 'Guardia comunal', costoBase: { madera: 70, hierro: 15, pan: 10 }, factorCosto: 1.8, requiereMetalurgia: true },
};
const ARBOL_INVESTIGACION = [
  {
    id: 'herramientas', rama: 'economia', nombre: 'Herramientas calibradas',
    descripcion: 'Aumenta la producción general de la aldea.', icono: 'hammer', maxNivel: null,
    costoBase: { madera: 40, comida: 25 }, factorCosto: 1.6, costoReliquias: 0,
    requiere: [], requiereEdificio: [], permanente: false, posicion: { fila: 0, columna: 0 },
    efectos: [{ tipo: 'produccionGeneral', valor: 0.1 }],
  },
  {
    id: 'logistica', rama: 'economia', nombre: 'Rutas de abastecimiento',
    descripcion: 'Amplía la capacidad de todos los almacenes.', icono: 'warehouse', maxNivel: null,
    costoBase: { madera: 80, comida: 40 }, factorCosto: 1.7, costoReliquias: 0,
    requiere: [], requiereEdificio: [], permanente: false, posicion: { fila: 1, columna: 0 },
    efectos: [{ tipo: 'capacidadPlana', valor: 100 }],
  },
  {
    id: 'defensa', rama: 'defensa', nombre: 'Guardia comunal',
    descripcion: 'Reduce el daño de los eventos nocturnos.', icono: 'shield', maxNivel: null,
    costoBase: { madera: 70, hierro: 15, pan: 10 }, factorCosto: 1.8, costoReliquias: 0,
    requiere: [{ id: 'metalurgia', nivel: 1 }], requiereEdificio: [], permanente: false, posicion: { fila: 1, columna: 2 },
    efectos: [{ tipo: 'reduccionDanoEventos', valor: 0.1 }],
  },
  {
    id: 'metalurgia', rama: 'industria', nombre: 'Metalurgia',
    descripcion: 'Los mineros extraen un 50 % más de hierro.', icono: 'anvil', maxNivel: 1,
    costoBase: { madera: 60, hierro: 30, pan: 10 }, factorCosto: 1, costoReliquias: 0,
    requiere: [], requiereEdificio: [
      { tipoId: 'centroInvestigacion', nivel: 1 },
      { tipoId: 'mina', nivel: 1 },
    ], permanente: true, posicion: { fila: 0, columna: 2 },
    efectos: [{ tipo: 'multiplicadorRecurso', recurso: 'hierro', valor: 1.5 }],
  },
  {
    id: 'planosAntiguos', rama: 'saber', nombre: 'Planos antiguos',
    descripcion: 'Desbloquea la construcción del observatorio.', icono: 'telescope', maxNivel: 1,
    costoBase: {}, factorCosto: 1, costoReliquias: 2,
    requiere: [], requiereEdificio: [], permanente: true, posicion: { fila: 0, columna: 4 },
    efectos: [{ tipo: 'desbloquea', valor: 'observatorio' }],
  },
];
const EVENTOS_NOCTURNOS = {
  bestias: { nombre: 'Bestias en el lindero', costoDefensa: { madera: 20, comida: 10 }, dano: 24 },
  helada: { nombre: 'Helada nocturna', costoDefensa: { madera: 25 }, dano: 20 },
  recaudador: { nombre: 'Recaudador del camino', costoDefensa: { comida: 15, madera: 10 }, dano: 0, perdidaMadera: 20 },
};

function redondearADecima(valor) {
  return Math.round((valor + Number.EPSILON * Math.abs(valor)) * 10) / 10;
}

// --- Mejora procedural ---
// El costo y el tiempo de cada mejora se calculan a partir del nivel actual,
// no están escritos a mano nivel por nivel. Esto es lo que hace que el
// sistema sea "procedural": agregar más niveles no requiere tocar datos,
// solo ajustar estas dos fórmulas.
function costoSiguienteNivel(tipoId, nivelActual) {
  const info = TIPOS_EDIFICIO[tipoId];
  if (!info) throw new Error(`Tipo de edificio desconocido: ${tipoId}`);
  const factor = Math.pow(1.15, nivelActual);
  const costo = {};
  for (const [recurso, valor] of Object.entries(info.costoBase)) {
    costo[recurso] = redondearADecima(valor * factor);
  }
  return costo;
}

function tiempoSiguienteNivel(tipoId, nivelActual) {
  const info = TIPOS_EDIFICIO[tipoId];
  if (!info) throw new Error(`Tipo de edificio desconocido: ${tipoId}`);
  return redondearADecima(info.tiempoConstruccion * Math.pow(1.25, nivelActual));
}

function calcularCapacidades(aldea) {
  const capacidades = { ...CAPACIDADES_BASE };
  const efectos = efectosActivos(aldea, ARBOL_INVESTIGACION);
  for (const recurso of Object.keys(capacidades)) {
    const plana = (efectos.capacidadPlana['*'] || 0) + (efectos.capacidadPlana[recurso] || 0);
    const porcentaje = (efectos.capacidadPct['*'] || 0) + (efectos.capacidadPct[recurso] || 0);
    capacidades[recurso] = (capacidades[recurso] + plana) * (1 + porcentaje);
  }
  for (const edificio of aldea.edificios || []) {
    const efectos = TIPOS_EDIFICIO[edificio.tipoId]?.efectoCapacidad || {};
    const eficiencia = Math.max(0, Math.min(1, (edificio.integridad ?? 100) / 100));
    for (const [recurso, capacidadPorNivel] of Object.entries(efectos)) {
      capacidades[recurso] = (capacidades[recurso] || 0) + capacidadPorNivel * (edificio.nivel || 1) * eficiencia;
    }
  }
  return capacidades;
}

function crearAldeaPorDefecto(usuarioId) {
  return {
    usuario: usuarioId,
    recursos: { madera: MADERA_INICIAL, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    tasasGeneracion: { madera: 0, comida: 0.5, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    multiplicadores: { generacion: 1, velocidad: 1, costoConstruccion: 1 },
    poblacionMaxima: 1,
    umbralPoblacion: UMBRAL_POBLACION_BASE,
    aldeanos: [
      {
        nombre: 'Francisco',
        x: 400,
        y: 300,
        trabajo: 'libre',
        modoTrabajo: 'automatico',
        rasgo: 'maderero',
        estado: 'buscando_arbol',
        pensamientoActual: 'Explorando el nuevo mundo.',
        objetivoEdificioId: null,
      },
    ],
    edificios: [],
    investigaciones: { herramientas: false, rutas: false, planificacion: false, metalurgia: false },
    arbolInvestigacionDesbloqueado: false,
    tecnologias: { herramientas: 0, logistica: 0, defensa: 0, metalurgia: 0, planosAntiguos: 0 },
    legado: { coloniasFundadas: 0, reliquias: 0, reliquiasGastadas: 0 },
    ciclo: { segundos: 0, dia: 1 },
    eventoNocturno: { tipo: null, dia: 0 },
    edad: { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 10 },
    cronica: [],
    ultimoGuardado: new Date(),
  };
}

module.exports = {
  TIPOS_EDIFICIO,
  TECNOLOGIAS,
  ARBOL_INVESTIGACION,
  RELIQUIAS,
  ARBOL_INVESTIGACION,
  RELIQUIAS,
  EVENTOS_NOCTURNOS,
  SEGUNDOS_DIA,
  SEGUNDOS_NOCHE,
  ESTACIONES,
  EDADES,
  UMBRAL_POBLACION_BASE,
  FACTOR_CRECIMIENTO_UMBRAL,
  MADERA_INICIAL,
  PRODUCCION_TRABAJADOR,
  RASGOS_ALDEANO,
  CAPACIDADES_BASE,
  OBJETIVOS_IA,
  TOPE_OBJETIVO,
  calcularCapacidades,
  costoSiguienteNivel,
  tiempoSiguienteNivel,
  crearAldeaPorDefecto,
};
