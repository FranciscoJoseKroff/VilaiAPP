const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { registrar, iniciarSesion } = require('../controllers/authController');

const router = express.Router();
const limiteFallidos = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: 'Demasiados intentos de acceso fallidos. Espera quince minutos e inténtalo nuevamente.',
  }),
});

router.use(limiteFallidos);
router.post('/registro', registrar);
router.post('/login', iniciarSesion);

module.exports = router;
