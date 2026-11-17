const {
  TIPOS_EDIFICIO,
  crearAldeaPorDefecto,
  calcularCapacidades,
} = require('./villageDefaults');
const { asegurarAldeaVida } = require('./cicloVida');

const NOMBRES_ALDEANOS = [
  'Ana', 'Pedro', 'Sofía', 'Lucas', 'Valentina',
  'Mateo', 'Camila', 'Diego', 'Javiera', 'Tomás',
];
const RASGOS = ['maderero', 'hortelano', 'minero', 'polivalente'];
const EDIFICIOS_VIVOS = [
  ['aserradero', 3],
  ['granja', 3],
  ['casa', 4],
  ['granero', 1],
  ['almacen', 2],
  ['molino', 1],
  ['horno', 1],
  ['mina', 1],
  ['centroInvestigacion', 2],
];
const PORCENTAJES_RECURSOS = {
  madera: 0.6,
  comida: 0.55,
  oro: 0.4,
  trigo: 0.7,
  harina: 0.5,
  pan: 0.45,
  hierro: 0.65,
};

function crearAldeanos(cantidad) {
  return Array.from({ length: cantidad }, (_, indice) => ({
    nombre: NOMBRES_ALDEANOS[indice],
    x: 360 + (indice % 4) * 28,
    y: 280 + Math.floor(indice / 4) * 28,
    trabajo: 'libre',
    modoTrabajo: 'automatico',
    rasgo: RASGOS[indice % RASGOS.length],
    estado: 'buscando_arbol',
    pensamientoActual: 'Explorando el mundo.',
    objetivoEdificioId: null,
  }));
}

function crearEdificios(niveles) {
  return niveles.map(([tipoId, nivel], indice) => {
    const info = TIPOS_EDIFICIO[tipoId];
    return {
      tipoId,
      x: 100 + (indice % 3) * 200,
      y: 80 + Math.floor(indice / 3) * 100,
      progreso: info.tiempoConstruccion,
      completo: true,
      nivel,
      mejorando: false,
      progresoMejora: 0,
      tiempoMejora: 0,
      integridad: 100,
      contribucionTasa: info.efectoTasa ? info.efectoTasa.base * nivel : 0,
      contribucionTasaSecundaria: info.efectoTasaSecundario ? info.efectoTasaSecundario.base * nivel : 0,
      contribucionPoblacion: info.efectoPoblacion ? info.efectoPoblacion * nivel : 0,
    };
  });
}

function calcularTasas(edificios, tasasIniciales) {
  const tasas = { ...tasasIniciales };
  for (const edificio of edificios) {
    const info = TIPOS_EDIFICIO[edificio.tipoId];
    if (info.efectoTasa) {
      const recurso = info.efectoTasa.recurso;
      tasas[recurso] = (tasas[recurso] || 0) + edificio.contribucionTasa;
    }
    if (info.efectoTasaSecundario) {
      const recurso = info.efectoTasaSecundario.recurso;
      tasas[recurso] = (tasas[recurso] || 0) + edificio.contribucionTasaSecundaria;
    }
  }
  return tasas;
}

function crearAldeaViva(usuarioId) {
  const inicial = crearAldeaPorDefecto(usuarioId);
  const edificios = crearEdificios(EDIFICIOS_VIVOS);
  const tecnologias = {
    ...inicial.tecnologias,
    herramientas: 2,
    logistica: 1,
    metalurgia: 1,
    defensa: 1,
  };
  const legado = { ...inicial.legado, reliquias: 1 };
  const capacidades = calcularCapacidades({ ...inicial, edificios, tecnologias, legado });
  const recursos = Object.fromEntries(
    Object.entries(PORCENTAJES_RECURSOS).map(([recurso, porcentaje]) => [
      recurso,
      Math.round(capacidades[recurso] * porcentaje * 10) / 10,
    ])
  );
  const aldea = {
    ...inicial,
    marcaDemo: false,
    recursos,
    tasasGeneracion: calcularTasas(edificios, inicial.tasasGeneracion),
    poblacionMaxima: 8,
    aldeanos: crearAldeanos(8),
    edificios,
    investigaciones: { ...inicial.investigaciones, metalurgia: true },
    arbolInvestigacionDesbloqueado: true,
    tecnologias,
    legado,
    ciclo: { segundos: 0, dia: 25 },
    edad: { id: 'calma', numero: 2, inicioAnio: 17, duracionAnios: 9 },
    anclaAntiTrampas: { cicloDia: 25, inicio: new Date(0) },
    cronica: [
      { anio: 18, tipo: 'construccion', texto: 'Se levantó la primera casa para recibir a nuevas familias.' },
      { anio: 19, tipo: 'construccion', texto: 'La primera granja aseguró las cosechas de la aldea.' },
      { anio: 20, tipo: 'construccion', texto: 'El aserradero comenzó a abastecer al poblado.' },
      { anio: 21, tipo: 'construccion', texto: 'El granero y el almacén ampliaron las reservas.' },
      { anio: 22, tipo: 'construccion', texto: 'Se construyeron la mina y el centro de investigación.' },
      { anio: 23, tipo: 'investigacion', texto: 'La aldea aprendió metalurgia y reforzó su defensa.' },
      { anio: 24, tipo: 'construccion', texto: 'El molino y el horno iniciaron la producción de pan.' },
      { anio: 25, tipo: 'investigacion', texto: 'Las rutas de abastecimiento y las herramientas mejoraron.' },
    ],
    ultimoGuardado: new Date(0),
  };
  return asegurarAldeaVida(aldea);
}

function crearInviernoHelada(usuarioId) {
  const inicial = crearAldeaPorDefecto(usuarioId);
  return asegurarAldeaVida({
    ...inicial,
    marcaDemo: false,
    recursos: { ...inicial.recursos, madera: 100, comida: 100 },
    poblacionMaxima: 10,
    aldeanos: crearAldeanos(10),
    ciclo: { segundos: 105, dia: 58 },
    edad: { id: 'hielo', numero: 3, inicioAnio: 49, duracionAnios: 10 },
    anclaAntiTrampas: { cicloDia: 58, inicio: new Date(0) },
    ultimoGuardado: new Date(0),
  });
}

function crearCambioDeEdad(usuarioId) {
  const aldea = crearAldeaViva(usuarioId);
  return asegurarAldeaVida({
    ...aldea,
    legado: { ...aldea.legado, reliquias: 0 },
    ciclo: { segundos: 170, dia: 25 },
    edad: { id: 'calma', numero: 1, inicioAnio: 16, duracionAnios: 10 },
    ultimoGuardado: new Date(0),
  });
}

const ESCENARIOS = Object.freeze({
  'aldea-viva': crearAldeaViva,
  'invierno-helada': crearInviernoHelada,
  'cambio-de-edad': crearCambioDeEdad,
});

module.exports = { ESCENARIOS };
