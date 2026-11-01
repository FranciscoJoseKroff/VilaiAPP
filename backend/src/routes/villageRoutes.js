const express = require('express');
const requiereAutenticacion = require('../middleware/auth');
const { obtenerAldea, guardarAldea } = require('../controllers/villageController');

const router = express.Router();

router.use(requiereAutenticacion);
router.get('/', obtenerAldea);
router.put('/', guardarAldea);

module.exports = router;
