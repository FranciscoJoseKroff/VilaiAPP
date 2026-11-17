const mongoose = require('mongoose');
const { ARBOL_INVESTIGACION, LOGROS } = require('../utils/villageDefaults');

const idsTecnologia = new Set(ARBOL_INVESTIGACION.map((nodo) => nodo.id));

function validarTecnologias(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  return Object.entries(valor).every(([id, nivel]) => (
    idsTecnologia.has(id) && typeof nivel === 'number' && Number.isFinite(nivel) && nivel >= 0
  ));
}

const factoresDecisionSchema = new mongoose.Schema({
  necesidad: { type: Number, required: true },
  saturacion: { type: Number, required: true },
  rasgo: { type: Number, required: true },
  contexto: { type: Number, required: true },
  inercia: { type: Number, required: true },
  variedad: { type: Number, required: true },
}, { _id: false });

const opcionDecisionSchema = new mongoose.Schema({
  trabajo: { type: String, enum: ['lenador', 'agricultor', 'minero', 'guardia'], required: true },
  puntaje: { type: Number, required: true },
  factores: { type: factoresDecisionSchema, required: true },
}, { _id: false });

const decisionSchema = new mongoose.Schema({
  anio: { type: Number, required: true },
  segundos: { type: Number, required: true },
  elegida: { type: String, enum: ['libre', 'lenador', 'agricultor', 'minero', 'guardia'], required: true },
  libre: { type: Boolean, required: true },
  opciones: { type: [opcionDecisionSchema], default: [] },
}, { _id: false });

const estadisticaPuntoSchema = new mongoose.Schema({
  a: { type: Number, required: true, min: 1, validate: Number.isInteger },
  r: {
    madera: { type: Number, required: true, min: 0, validate: Number.isInteger },
    comida: { type: Number, required: true, min: 0, validate: Number.isInteger },
    hierro: { type: Number, required: true, min: 0, validate: Number.isInteger },
    oro: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  p: { type: Number, required: true, min: 0, validate: Number.isInteger },
  e: { type: String, enum: ['calma', 'abundancia', 'hielo', 'ceniza', 'sombras', 'descubrimientos'], required: true },
}, { _id: false });

const estadisticasSchema = new mongoose.Schema({
  serie: {
    type: [estadisticaPuntoSchema],
    default: [],
    validate: { validator: (serie) => serie.length <= 120, message: 'La serie de estadísticas no puede superar 120 puntos.' },
  },
  contadores: {
    eventosDefendidos: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    eventosAceptados: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    edificiosConstruidos: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    aldeanosLlegados: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    investigacionesCompletas: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  },
}, { _id: false });

const logroSchema = new mongoose.Schema({
  id: { type: String, enum: LOGROS.map((logro) => logro.id), required: true },
  anio: { type: Number, required: true, min: 1, validate: Number.isInteger },
}, { _id: false });

// Un aldeano puede estar "yendo_a_construir" o "construyendo" hacia un
// edificio; guardamos el _id de Mongo de ese subdocumento como referencia,
// igual que hicimos con el id numérico en el prototipo de Python.
const aldeanoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  edad: { type: Number, min: 0 },
  edadAnios: { type: Number, min: 0, validate: Number.isInteger },
  esperanza: { type: Number, min: 62, max: 82, validate: Number.isInteger },
  familiaId: { type: String },
  dueloAniosRestantes: { type: Number, default: 0, min: 0, max: 1, validate: Number.isInteger },
  profesion: {
    type: String,
    enum: ['lenador', 'granjero', 'minero', 'sin_oficio'],
  },
  rasgos: { type: [String], default: undefined },
  necesidades: {
    hambre: { type: Number, min: 0, max: 100 },
    energia: { type: Number, min: 0, max: 100 },
    animo: { type: Number, min: 0, max: 100 },
  },
  trabajo: { type: String, enum: ['libre', 'lenador', 'agricultor', 'minero', 'guardia'], default: 'libre' },
  modoTrabajo: { type: String, enum: ['automatico', 'manual'], default: 'manual' },
  rasgo: { type: String, enum: ['polivalente', 'maderero', 'hortelano', 'minero', 'guardian'], default: 'polivalente' },
  estado: {
    type: String,
    enum: [
      'buscando_arbol',
      'talando',
      'cultivando',
      'minando',
      'vigilando',
      'descansando',
      'yendo_a_construir',
      'construyendo',
    ],
    default: 'buscando_arbol',
  },
  pensamientoActual: { type: String, default: '' },
  decision: { type: decisionSchema, default: undefined },
  objetivoEdificioId: { type: mongoose.Schema.Types.ObjectId, default: null },
});

const edificioSchema = new mongoose.Schema({
  tipoId: {
    type: String,
    required: true,
    enum: ['aserradero', 'granja', 'casa', 'centroInvestigacion', 'granero', 'almacen', 'molino', 'horno', 'mina', 'observatorio', 'taberna', 'biblioteca', 'torreVigilancia'],
  },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  progreso: { type: Number, default: 0 },
  completo: { type: Boolean, default: false },
  nivel: {
    type: Number,
    default: 1,
    validate: {
      validator(nivel) {
        const { TIPOS_EDIFICIO } = require('../utils/villageDefaults');
        const maxNivel = TIPOS_EDIFICIO[this.tipoId]?.maxNivel;
        return maxNivel == null || nivel <= maxNivel;
      },
      message: 'El edificio superó su nivel máximo.',
    },
  },
  mejorando: { type: Boolean, default: false },
  progresoMejora: { type: Number, default: 0 },
  tiempoMejora: { type: Number, default: 0 },
  integridad: { type: Number, default: 100, min: 0, max: 100 },
  // Cuánto le está aportando este edificio a las tasas globales o a la
  // población máxima ahora mismo, para poder recalcular limpio al subir de
  // nivel sin duplicar el efecto (igual que en el prototipo de Python).
  contribucionTasa: { type: Number, default: 0 },
  contribucionTasaSecundaria: { type: Number, default: 0 },
  contribucionPoblacion: { type: Number, default: 0 },
});

const aldeaSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
    recursos: {
      madera: { type: Number, default: 0 },
      comida: { type: Number, default: 0 },
      oro: { type: Number, default: 0 },
      trigo: { type: Number, default: 0 },
      harina: { type: Number, default: 0 },
      pan: { type: Number, default: 0 },
      hierro: { type: Number, default: 0 },
    },
    tasasGeneracion: {
      madera: { type: Number, default: 0 },
      comida: { type: Number, default: 0.5 },
      oro: { type: Number, default: 0 },
      trigo: { type: Number, default: 0 },
      harina: { type: Number, default: 0 },
      pan: { type: Number, default: 0 },
      hierro: { type: Number, default: 0 },
    },
    multiplicadores: {
      generacion: { type: Number, default: 1 },
      velocidad: { type: Number, default: 1 },
      costoConstruccion: { type: Number, default: 1 },
    },
    poblacionMaxima: { type: Number, default: 1 },
    umbralPoblacion: { type: Number, default: 30 },
    aldeanos: [aldeanoSchema],
    edificios: [edificioSchema],
    investigaciones: {
      herramientas: { type: Boolean, default: false },
      rutas: { type: Boolean, default: false },
      planificacion: { type: Boolean, default: false },
      metalurgia: { type: Boolean, default: false },
    },
    arbolInvestigacionDesbloqueado: { type: Boolean, default: false },
    puntosInvestigacion: { type: Number, default: 0, min: 0 },
    desbloqueos: { type: [String], default: [] },
    tecnologias: {
      type: mongoose.Schema.Types.Mixed,
      default: () => Object.fromEntries(ARBOL_INVESTIGACION.map((nodo) => [nodo.id, 0])),
      validate: { validator: validarTecnologias, message: 'Tecnologias contiene ids o niveles inválidos.' },
    },
    legado: {
      coloniasFundadas: { type: Number, default: 0, min: 0 },
      reliquias: { type: Number, default: 0, min: 0 },
      reliquiasGastadas: { type: Number, default: 0, min: 0 },
      generaciones: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    },
    ciclo: {
      segundos: { type: Number, default: 0, min: 0 },
      dia: { type: Number, default: 1, min: 1 },
    },
    eventoNocturno: {
      tipo: { type: String, enum: ['bestias', 'helada', 'recaudador', 'incendio', null], default: null },
      dia: { type: Number, default: 0, min: 0 },
    },
    eventoPrevisto: {
      tipo: { type: String, enum: ['bestias', 'helada', 'recaudador', 'incendio', null], default: null },
      dia: { type: Number, default: 0, min: 0 },
      segundosRestantes: { type: Number, default: 0, min: 0 },
    },
    investigacionEnCurso: {
      id: { type: String, enum: [...idsTecnologia, null], default: null },
      nivelObjetivo: { type: Number, min: 1, default: null },
      progresoSegundos: { type: Number, min: 0, default: 0 },
    },
    edad: {
      id: { type: String, enum: ['calma', 'abundancia', 'hielo', 'ceniza', 'sombras', 'descubrimientos'], default: 'calma' },
      numero: { type: Number, default: 1 },
      inicioAnio: { type: Number, default: 1 },
      duracionAnios: { type: Number, default: 10 },
    },
    cronica: [{ anio: { type: Number }, tipo: { type: String }, texto: { type: String } }],
    estadisticas: { type: estadisticasSchema, default: () => ({}) },
    logros: {
      type: [logroSchema],
      default: [],
      validate: { validator: (logros) => new Set(logros.map((logro) => logro.id)).size === logros.length, message: 'No se puede repetir un logro.' },
    },
    marcaDemo: { type: Boolean, default: false },
    sospechosa: { type: Boolean, default: false, select: false },
    poblacionRanking: { type: Number, default: 0, min: 0, select: false },
    anclaAntiTrampas: {
      cicloDia: { type: Number, min: 1, select: false },
      inicio: { type: Date, select: false },
    },
    ultimoGuardado: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

aldeaSchema.path('edificios').validate((edificios) => {
  const biblioteca = edificios.find((edificio) => edificio.tipoId === 'biblioteca');
  if (!biblioteca) return true;
  const centro = edificios.find((edificio) => edificio.tipoId === 'centroInvestigacion');
  return Boolean(centro && Number(centro.nivel || 1) >= 2);
}, 'La Biblioteca requiere un Centro de Investigación de nivel 2.');

aldeaSchema.index({ marcaDemo: 1, sospechosa: 1, 'ciclo.dia': -1 });
aldeaSchema.index({ marcaDemo: 1, sospechosa: 1, 'legado.reliquias': -1 });
aldeaSchema.index({ marcaDemo: 1, sospechosa: 1, poblacionRanking: -1 });

module.exports = mongoose.model('Aldea', aldeaSchema);
