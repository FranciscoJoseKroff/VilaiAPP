const express = require('express');
const { rateLimit } = require('express-rate-limit');
const requiereAutenticacion = require('../middleware/auth');
const { obtenerAldea, guardarAldea } = require('../controllers/villageController');

const router = express.Router();
const limitePorUsuario = rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.usuarioId,
  handler: (req, res) => res.status(429).json({
    error: 'Demasiadas peticiones a tu aldea. Espera un minuto e inténtalo nuevamente.',
  }),
});

router.use(requiereAutenticacion);
router.use(limitePorUsuario);
router.get('/', obtenerAldea);
router.put('/', guardarAldea);

module.exports = router;
