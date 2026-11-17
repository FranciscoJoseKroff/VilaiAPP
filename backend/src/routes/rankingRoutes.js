const express = require('express');
const { rateLimit } = require('express-rate-limit');
const requiereAutenticacion = require('../middleware/auth');
const { obtenerRanking } = require('../controllers/rankingController');

const router = express.Router();
const limitePorUsuario = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.usuarioId,
  handler: (_req, res) => res.status(429).json({
    error: 'Has consultado el ranking demasiadas veces. Espera un minuto e inténtalo nuevamente.',
  }),
});

router.use(requiereAutenticacion);
router.get('/', limitePorUsuario, obtenerRanking);

module.exports = router;
