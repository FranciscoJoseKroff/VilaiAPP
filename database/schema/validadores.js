// Validadores $jsonSchema de las 3 colecciones del caso de uso principal.
// Reflejan los esquemas Mongoose de backend/src/models (User.js y Village.js):
// mismos nombres de campo, mismos enums. La colección `cronica` es nueva en
// este avance (hoy la crónica vive embebida y recortada a 50 entradas).
//
// "number" acepta int, long, double y decimal: así el validador no rechaza
// los números que Mongoose guarda como double.

const TRABAJOS = ['libre', 'lenador', 'agricultor', 'minero', 'guardia'];
const ESTADOS_ALDEANO = [
  'buscando_arbol', 'talando', 'cultivando', 'minando',
  'vigilando', 'descansando', 'yendo_a_construir', 'construyendo',
];
const RASGOS = ['polivalente', 'maderero', 'hortelano', 'minero', 'guardian'];
const TIPOS_EDIFICIO = [
  'aserradero', 'granja', 'casa', 'centroInvestigacion', 'granero', 'almacen',
  'molino', 'horno', 'mina', 'observatorio', 'taberna', 'biblioteca', 'torreVigilancia',
];
const EDADES = ['calma', 'abundancia', 'hielo', 'ceniza', 'sombras', 'descubrimientos'];
const TIPOS_CRONICA = [
  'construccion', 'investigacion', 'aldeano', 'nacimiento', 'fallecimiento',
  'etapa_vida', 'edad', 'reliquia', 'logro', 'evento', 'demo',
];
const RECURSOS = ['madera', 'comida', 'oro', 'trigo', 'harina', 'pan', 'hierro'];

const numeroNoNegativo = { bsonType: 'number', minimum: 0 };

const usuarios = {
  $jsonSchema: {
    bsonType: 'object',
    title: 'Usuario (jugador)',
    required: ['email', 'passwordHash', 'rankingVisible', 'createdAt', 'updatedAt'],
    properties: {
      email: {
        bsonType: 'string',
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        description: 'Correo en minúsculas, único (índice único).',
      },
      passwordHash: { bsonType: 'string', minLength: 50, description: 'Hash bcrypt, nunca la contraseña.' },
      nombre: { bsonType: 'string', maxLength: 60 },
      apodo: {
        bsonType: ['string', 'null'],
        minLength: 3,
        maxLength: 16,
        description: 'Nombre público del ranking (3 a 16 caracteres) o null.',
      },
      rankingVisible: { bsonType: 'bool' },
      ultimoCambioApodo: { bsonType: 'date' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const aldeano = {
  bsonType: 'object',
  required: ['_id', 'nombre', 'x', 'y', 'trabajo', 'modoTrabajo', 'rasgo', 'estado'],
  properties: {
    _id: { bsonType: 'objectId' },
    nombre: { bsonType: 'string', minLength: 1 },
    x: { bsonType: 'number' },
    y: { bsonType: 'number' },
    edadAnios: { bsonType: 'number', minimum: 0 },
    esperanza: { bsonType: 'number', minimum: 62, maximum: 82 },
    trabajo: { enum: TRABAJOS },
    modoTrabajo: { enum: ['automatico', 'manual'] },
    rasgo: { enum: RASGOS },
    estado: { enum: ESTADOS_ALDEANO },
    necesidades: {
      bsonType: 'object',
      properties: {
        hambre: { bsonType: 'number', minimum: 0, maximum: 100 },
        energia: { bsonType: 'number', minimum: 0, maximum: 100 },
        animo: { bsonType: 'number', minimum: 0, maximum: 100 },
      },
    },
    pensamientoActual: { bsonType: 'string' },
  },
};

const edificio = {
  bsonType: 'object',
  required: ['_id', 'tipoId', 'x', 'y', 'nivel', 'completo'],
  properties: {
    _id: { bsonType: 'objectId' },
    tipoId: { enum: TIPOS_EDIFICIO },
    x: { bsonType: 'number' },
    y: { bsonType: 'number' },
    nivel: { bsonType: 'number', minimum: 1 },
    completo: { bsonType: 'bool' },
    progreso: { bsonType: 'number', minimum: 0, maximum: 100 },
    integridad: { bsonType: 'number', minimum: 0, maximum: 100 },
  },
};

const aldeas = {
  $jsonSchema: {
    bsonType: 'object',
    title: 'Aldea (partida de un usuario)',
    required: ['usuario', 'recursos', 'ciclo', 'edad', 'aldeanos', 'edificios', 'poblacionMaxima', 'ultimoGuardado', 'createdAt'],
    properties: {
      usuario: { bsonType: 'objectId', description: 'Referencia a usuarios._id (1 aldea por usuario).' },
      recursos: {
        bsonType: 'object',
        required: RECURSOS,
        properties: Object.fromEntries(RECURSOS.map((r) => [r, numeroNoNegativo])),
      },
      ciclo: {
        bsonType: 'object',
        required: ['dia', 'segundos'],
        properties: {
          dia: { bsonType: 'number', minimum: 1, description: 'Año del juego (el campo se llama dia por compatibilidad).' },
          segundos: { bsonType: 'number', minimum: 0, maximum: 180 },
        },
      },
      edad: {
        bsonType: 'object',
        required: ['id', 'numero'],
        properties: { id: { enum: EDADES }, numero: { bsonType: 'number', minimum: 1 } },
      },
      poblacionMaxima: { bsonType: 'number', minimum: 1 },
      aldeanos: { bsonType: 'array', maxItems: 200, items: aldeano },
      edificios: { bsonType: 'array', maxItems: 200, items: edificio },
      tecnologias: { bsonType: 'object' },
      puntosInvestigacion: numeroNoNegativo,
      legado: {
        bsonType: 'object',
        properties: { reliquias: numeroNoNegativo, coloniasFundadas: numeroNoNegativo },
      },
      logros: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['id', 'anio'],
          properties: { id: { bsonType: 'string' }, anio: { bsonType: 'number', minimum: 1 } },
        },
      },
      marcaDemo: { bsonType: 'bool' },
      sospechosa: { bsonType: 'bool' },
      ultimoGuardado: { bsonType: 'date' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const cronica = {
  $jsonSchema: {
    bsonType: 'object',
    title: 'Entrada de la crónica de una aldea',
    required: ['aldea', 'anio', 'tipo', 'texto', 'fecha'],
    additionalProperties: false,
    properties: {
      _id: { bsonType: 'objectId' },
      aldea: { bsonType: 'objectId', description: 'Referencia a aldeas._id.' },
      anio: { bsonType: 'number', minimum: 1, description: 'Año del juego en que ocurrió.' },
      tipo: { enum: TIPOS_CRONICA },
      texto: { bsonType: 'string', minLength: 3, maxLength: 200 },
      fecha: { bsonType: 'date', description: 'Momento real en que se registró.' },
    },
  },
};

module.exports = {
  validadores: { usuarios, aldeas, cronica },
  TRABAJOS, ESTADOS_ALDEANO, RASGOS, TIPOS_EDIFICIO, EDADES, TIPOS_CRONICA,
};
