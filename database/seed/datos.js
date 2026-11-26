// Datos de prueba de Vilai: 12 jugadores, 12 aldeas y su crónica.
// Todo es determinista (sin Math.random) y con _id fijos, para que el seed
// se pueda repetir sin duplicar: cada documento se reemplaza por su _id.
const { ObjectId } = require('mongodb');

// _id fijo y legible: prefijo de 2 caracteres por colección + número.
const id = (prefijo, n) => new ObjectId(prefijo + n.toString(16).padStart(22, '0'));

// Hash bcrypt de la contraseña de prueba "aldea-de-prueba" (solo para esta base de pruebas).
const HASH_PRUEBA = '$2a$10$8TZT91LDIWGqr06WfLJIwuFPlLzPgF8YA/MemHlVanqR8DWCKXTZq';
const INICIO = new Date('2026-09-01T12:00:00Z');
const diasDespues = (dias, horas = 0) => new Date(INICIO.getTime() + (dias * 24 + horas) * 3600 * 1000);

// [nombre, apodo, rankingVisible, aldea: { anios, numeroEdad (la edad sale del orden Calma→Abundancia→…), aldeanos, edificios, reliquias, demo }]
const JUGADORES = [
  ['Camila Rojas', 'CamiRoja', true, { anios: 42, numeroEdad: 4, aldeanos: 9, edificios: ['aserradero', 'granja', 'casa', 'casa', 'granero', 'molino', 'mina'], reliquias: 3 }],
  ['Matías Soto', 'Matiaserrin', true, { anios: 35, numeroEdad: 3, aldeanos: 8, edificios: ['aserradero', 'granja', 'casa', 'almacen', 'molino', 'horno'], reliquias: 2 }],
  ['Valentina Muñoz', 'ValeDeChiloe', true, { anios: 28, numeroEdad: 3, aldeanos: 7, edificios: ['aserradero', 'granja', 'casa', 'mina', 'centroInvestigacion'], reliquias: 2 }],
  ['Benjamín Díaz', 'BenjaHacha', true, { anios: 19, numeroEdad: 2, aldeanos: 6, edificios: ['aserradero', 'granja', 'casa', 'granero'], reliquias: 1 }],
  ['Isidora Pérez', null, false, { anios: 15, numeroEdad: 2, aldeanos: 5, edificios: ['aserradero', 'granja', 'casa'], reliquias: 1 }],
  ['Joaquín Contreras', 'Joaco_Castro', true, { anios: 12, numeroEdad: 1, aldeanos: 5, edificios: ['aserradero', 'granja', 'casa', 'almacen'], reliquias: 0 }],
  ['Antonia Silva', 'AntoMolinera', true, { anios: 31, numeroEdad: 3, aldeanos: 8, edificios: ['aserradero', 'granja', 'casa', 'molino', 'horno', 'observatorio'], reliquias: 2 }],
  ['Tomás Martínez', null, false, { anios: 8, numeroEdad: 1, aldeanos: 4, edificios: ['aserradero', 'granja'], reliquias: 0 }],
  ['Florencia Sepúlveda', 'FloDeAncud', true, { anios: 23, numeroEdad: 2, aldeanos: 6, edificios: ['aserradero', 'granja', 'casa', 'centroInvestigacion', 'mina'], reliquias: 1 }],
  ['Agustín Morales', 'AgusMinero', true, { anios: 47, numeroEdad: 5, aldeanos: 10, edificios: ['aserradero', 'granja', 'casa', 'casa', 'granero', 'almacen', 'mina', 'horno'], reliquias: 4 }],
  ['Martina Fuentes', 'MartiQuellon', false, { anios: 5, numeroEdad: 1, aldeanos: 3, edificios: ['aserradero'], reliquias: 0 }],
  ['Francisco Vargas', 'DemoVilai', true, { anios: 60, numeroEdad: 6, aldeanos: 12, edificios: ['aserradero', 'granja', 'casa', 'casa', 'granero', 'almacen', 'molino', 'horno', 'mina'], reliquias: 5, demo: true }],
];

const NOMBRES_ALDEANOS = [
  'Rosa', 'Aurelio', 'Elena', 'Bruno', 'Inés', 'Ramiro', 'Clara', 'Lautaro', 'Olga', 'Hernán',
  'Marta', 'Ciro', 'Alba', 'Gaspar', 'Nieves', 'Fermín', 'Luz', 'Octavio', 'Pilar', 'Ulises',
];
const ROTACION = [
  // [trabajo, estado, rasgo, pensamiento]
  ['lenador', 'talando', 'maderero', 'Este roble aguanta un invierno entero de leña.'],
  ['agricultor', 'cultivando', 'hortelano', 'Si llueve a tiempo, la cosecha llena el granero.'],
  ['minero', 'minando', 'minero', 'Aquí abajo suena a hierro.'],
  ['guardia', 'vigilando', 'guardian', 'Algo se mueve en el bosque.'],
  ['libre', 'descansando', 'polivalente', 'Un rato al sol y vuelvo al trabajo.'],
  ['lenador', 'talando', 'polivalente', 'Falta madera para la próxima casa.'],
  ['agricultor', 'cultivando', 'polivalente', 'El trigo está creciendo parejo.'],
];
const ESTACION_POR_INDICE = [12, 55, 97, 150]; // segundos del año: primavera, verano, otoño, invierno
const NOMBRE_EDAD = { calma: 'Calma', abundancia: 'Abundancia', hielo: 'Hielo', ceniza: 'Ceniza', sombras: 'Sombras', descubrimientos: 'Descubrimientos' };
const ORDEN_EDADES = Object.keys(NOMBRE_EDAD);
const NOMBRE_EDIFICIO = {
  aserradero: 'el aserradero', granja: 'la granja', casa: 'una casa', granero: 'el granero', almacen: 'el almacén',
  molino: 'el molino', horno: 'el horno', mina: 'la mina', observatorio: 'el observatorio', centroInvestigacion: 'el Centro de Investigación',
};
const TECNOLOGIAS = ['herramientas', 'logistica', 'defensa', 'metalurgia', 'planosAntiguos'];

function crearAldeanos(nAldea, cantidad) {
  return Array.from({ length: cantidad }, (_, i) => {
    const [trabajo, estado, rasgo, pensamiento] = ROTACION[(i + nAldea) % ROTACION.length];
    return {
      _id: id('c3', nAldea * 100 + i + 1),
      nombre: NOMBRES_ALDEANOS[(i * 3 + nAldea) % NOMBRES_ALDEANOS.length],
      x: 40 + ((i * 37 + nAldea * 11) % 260),
      y: 60 + ((i * 53 + nAldea * 7) % 180),
      edadAnios: 18 + ((i * 7 + nAldea * 5) % 40),
      esperanza: 62 + ((i * 5 + nAldea) % 21),
      trabajo,
      modoTrabajo: i % 3 === 0 ? 'manual' : 'automatico',
      rasgo,
      estado,
      necesidades: { hambre: 20 + ((i * 13) % 60), energia: 40 + ((i * 17) % 55), animo: 50 + ((i * 11) % 45) },
      pensamientoActual: pensamiento,
      objetivoEdificioId: null,
    };
  });
}

function crearEdificios(nAldea, tipos) {
  return tipos.map((tipoId, i) => ({
    _id: id('d4', nAldea * 100 + i + 1),
    tipoId,
    x: 30 + ((i * 61) % 300),
    y: 30 + ((i * 43) % 200),
    nivel: 1 + ((i + nAldea) % 3),
    completo: true,
    progreso: 100,
    integridad: 70 + ((i * 9 + nAldea) % 31),
  }));
}

const usuarios = [];
const aldeas = [];
const cronica = [];

JUGADORES.forEach(([nombre, apodo, rankingVisible, a], indice) => {
  const n = indice + 1;
  const [nombrePila, apellido] = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(' ');
  const creado = diasDespues(n * 3);
  const usuarioId = id('a1', n);
  const aldeaId = id('b2', n);
  const tecnologias = Object.fromEntries(TECNOLOGIAS.map((t, i) => [t, Math.max(0, Math.min(3, Math.floor(a.anios / 12) - i))]));

  usuarios.push({
    _id: usuarioId,
    email: `${nombrePila}.${apellido}@ejemplo.cl`,
    passwordHash: HASH_PRUEBA,
    nombre,
    apodo,
    rankingVisible,
    ...(apodo ? { ultimoCambioApodo: diasDespues(n * 3, 2) } : {}),
    createdAt: creado,
    updatedAt: diasDespues(70 + n, 5),
  });

  const aldeanos = crearAldeanos(n, a.aldeanos);
  const edificios = crearEdificios(n, a.edificios);
  aldeas.push({
    _id: aldeaId,
    usuario: usuarioId,
    recursos: {
      madera: 40 + a.anios * 9, comida: 30 + a.anios * 7, oro: a.anios * 2,
      trigo: a.edificios.includes('granja') ? a.anios * 3 : 0,
      harina: a.edificios.includes('molino') ? a.anios : 0,
      pan: a.edificios.includes('horno') ? Math.floor(a.anios / 2) : 0,
      hierro: a.edificios.includes('mina') ? a.anios * 2 : 0,
    },
    tasasGeneracion: { madera: Number((0.4 * a.aldeanos).toFixed(1)), comida: Number((0.5 + 0.3 * a.aldeanos).toFixed(1)), oro: 0.1, trigo: 0.2, harina: 0.1, pan: 0.05, hierro: a.edificios.includes('mina') ? 0.3 : 0 },
    poblacionMaxima: a.aldeanos + 2,
    aldeanos,
    edificios,
    tecnologias,
    puntosInvestigacion: a.anios * 4,
    legado: { coloniasFundadas: 0, reliquias: a.reliquias, reliquiasGastadas: 0, generaciones: Math.floor(a.anios / 25) },
    ciclo: { dia: a.anios, segundos: ESTACION_POR_INDICE[n % 4] },
    edad: { id: ORDEN_EDADES[(a.numeroEdad - 1) % 6], numero: a.numeroEdad, inicioAnio: Math.max(1, a.anios - 6), duracionAnios: 10 },
    logros: [
      { id: 'primerAldeano', anio: 1 },
      ...(a.aldeanos >= 10 ? [{ id: 'aldeaDeDiez', anio: a.anios - 3 }] : []),
      ...(a.numeroEdad >= 2 ? [{ id: 'primeraEdad', anio: 11 }] : []),
      ...(a.numeroEdad >= 4 ? [{ id: 'tresEdades', anio: 30 }] : []),
      ...(a.anios >= 5 ? [{ id: 'invernada', anio: 5 }] : []),
    ],
    marcaDemo: Boolean(a.demo),
    sospechosa: false,
    poblacionRanking: a.aldeanos,
    ultimoGuardado: diasDespues(70 + n, 5),
    createdAt: creado,
    updatedAt: diasDespues(70 + n, 5),
  });

  // Crónica: lo que realmente se anota en el juego (construcciones, llegadas, edades, logros, eventos).
  const entradas = [];
  a.edificios.forEach((tipo, i) => entradas.push({ anio: 1 + i * 2, tipo: 'construccion', texto: `Se terminó de construir ${NOMBRE_EDIFICIO[tipo]}` }));
  aldeanos.slice(1).forEach((aldeano, i) => entradas.push({ anio: 2 + i * 3, tipo: 'aldeano', texto: `${aldeano.nombre} llegó a la aldea` }));
  for (let e = 2; e <= a.numeroEdad; e += 1) entradas.push({ anio: (e - 1) * 10, tipo: 'edad', texto: `Comienza la Edad de ${NOMBRE_EDAD[ORDEN_EDADES[(e - 1) % 6]]}` });
  for (let r = 1; r <= a.reliquias; r += 1) entradas.push({ anio: r * 10, tipo: 'reliquia', texto: 'Se halló una reliquia entre las ruinas' });
  for (let anio = 4; anio <= a.anios; anio += 6) {
    entradas.push({ anio, tipo: 'evento', texto: anio % 12 === 4 ? 'Las bestias rondaron la aldea, pero la guardia resistió' : 'Una helada dañó los cultivos' });
  }
  entradas
    .filter((e) => e.anio <= a.anios)
    .sort((x, y) => x.anio - y.anio)
    .forEach((entrada, i) => cronica.push({
      _id: id('e5', n * 1000 + i + 1),
      aldea: aldeaId,
      ...entrada,
      fecha: new Date(creado.getTime() + entrada.anio * 180 * 1000), // 1 año del juego = 180 s reales
    }));
});

module.exports = { usuarios, aldeas, cronica, id };
