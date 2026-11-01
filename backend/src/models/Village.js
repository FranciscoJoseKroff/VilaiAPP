const mongoose = require('mongoose');
const { ARBOL_INVESTIGACION } = require('../utils/villageDefaults');

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

// Un aldeano puede estar "yendo_a_construir" o "construyendo" hacia un
// edificio; guardamos el _id de Mongo de ese subdocumento como referencia,
// igual que hicimos con el id numérico en el prototipo de Python.
const aldeanoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  edad: { type: Number, min: 0 },
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
  rasgo: { type: String, enum: ['polivalente', 'maderero', 'hortelano', 'minero'], default: 'polivalente' },
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
    enum: ['aserradero', 'granja', 'casa', 'centroInvestigacion', 'granero', 'almacen', 'molino', 'horno', 'mina', 'observatorio'],
  },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  progreso: { type: Number, default: 0 },
  completo: { type: Boolean, default: false },
  nivel: { type: Number, default: 1 },
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
    },
    ciclo: {
      segundos: { type: Number, default: 0, min: 0 },
      dia: { type: Number, default: 1, min: 1 },
    },
    eventoNocturno: {
      tipo: { type: String, enum: ['bestias', 'helada', 'recaudador', null], default: null },
      dia: { type: Number, default: 0, min: 0 },
    },
    edad: {
      id: { type: String, enum: ['calma', 'abundancia', 'hielo', 'ceniza', 'sombras', 'descubrimientos'], default: 'calma' },
      numero: { type: Number, default: 1 },
      inicioAnio: { type: Number, default: 1 },
      duracionAnios: { type: Number, default: 10 },
    },
    cronica: [{ anio: { type: Number }, tipo: { type: String }, texto: { type: String } }],
    ultimoGuardado: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Aldea', aldeaSchema);
