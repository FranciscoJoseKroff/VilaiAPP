const express = require('express');
const { obtenerCatalogo, obtenerCostoMejora } = require('../controllers/catalogController');

const router = express.Router();

router.get('/', obtenerCatalogo);
router.get('/:tipoId/mejora/:nivelActual', obtenerCostoMejora);

module.exports = router;
