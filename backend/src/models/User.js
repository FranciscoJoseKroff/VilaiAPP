const mongoose = require('mongoose');
const { validarApodo } = require('../utils/apodos');

const usuarioSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    nombre: { type: String, trim: true },
    apodo: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: (valor) => valor == null || validarApodo(valor).valido,
        message: 'El apodo debe tener entre 3 y 16 caracteres válidos y no incluir groserías.',
      },
    },
    rankingVisible: { type: Boolean, default: false },
    ultimoCambioApodo: { type: Date },
  },
  { timestamps: true }
);

usuarioSchema.index(
  { apodo: 1 },
  {
    unique: true,
    collation: { locale: 'es', strength: 2 },
    partialFilterExpression: { apodo: { $type: 'string' } },
  }
);
usuarioSchema.index({ rankingVisible: 1, apodo: 1 });

module.exports = mongoose.model('Usuario', usuarioSchema);
