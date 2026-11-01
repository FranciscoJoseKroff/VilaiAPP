const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/User');
const Aldea = require('../models/Village');
const { crearAldeaPorDefecto } = require('../utils/villageDefaults');

function generarToken(usuarioId) {
  return jwt.sign({ id: usuarioId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

async function registrar(req, res) {
  try {
    const { email, password, nombre } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existente = await Usuario.findOne({ email: email.toLowerCase() });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create({ email, passwordHash, nombre });

    // Cada cuenta nueva arranca con su propia aldea (Francisco talando el primer árbol)
    await Aldea.create(crearAldeaPorDefecto(usuario._id));

    const token = generarToken(usuario._id);
    res.status(201).json({
      token,
      usuario: { id: usuario._id, email: usuario.email, nombre: usuario.nombre },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el usuario', detalle: error.message });
  }
}

async function iniciarSesion(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const usuario = await Usuario.findOne({ email: email.toLowerCase() });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const coincide = await bcrypt.compare(password, usuario.passwordHash);
    if (!coincide) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generarToken(usuario._id);
    res.json({
      token,
      usuario: { id: usuario._id, email: usuario.email, nombre: usuario.nombre },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión', detalle: error.message });
  }
}

module.exports = { registrar, iniciarSesion };
