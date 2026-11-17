const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { registrar, iniciarSesion, obtenerPerfil, actualizarPerfil } = require('../controllers/authController');
const requiereAutenticacion = require('../middleware/auth');

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
router.get('/perfil', requiereAutenticacion, obtenerPerfil);
const limitePerfilPorUsuario = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.usuarioId,
  handler: (_req, res) => res.status(429).json({
    error: 'Demasiadas actualizaciones de perfil. Espera un minuto e inténtalo nuevamente.',
  }),
});
router.patch('/perfil', requiereAutenticacion, limitePerfilPorUsuario, actualizarPerfil);

module.exports = router;
