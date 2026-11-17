const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Usuario = require('../models/User');
const Aldea = require('../models/Village');
const { crearAldeaPorDefecto } = require('../utils/villageDefaults');
const { validarApodo } = require('../utils/apodos');

function generarToken(usuarioId) {
  return jwt.sign({ id: usuarioId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

async function registrar(req, res) {
  try {
    const { email, password, nombre, apodo } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    let apodoLimpio;
    if (apodo != null && apodo !== '') {
      const resultadoApodo = validarApodo(apodo);
      if (!resultadoApodo.valido) return res.status(400).json({ error: resultadoApodo.error });
      apodoLimpio = resultadoApodo.apodo;
    }

    const existente = await Usuario.findOne({ email: email.toLowerCase() });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create({ email, passwordHash, nombre, ...(apodoLimpio ? { apodo: apodoLimpio } : {}) });

    // Cada cuenta nueva arranca con su propia aldea (Francisco talando el primer árbol)
    await Aldea.create(crearAldeaPorDefecto(usuario._id));

    const token = generarToken(usuario._id);
    res.status(201).json({
      token,
      usuario: {
        id: usuario._id,
        email: usuario.email,
        nombre: usuario.nombre,
        apodo: usuario.apodo || null,
        rankingVisible: Boolean(usuario.rankingVisible),
      },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.apodo) {
      return res.status(409).json({ error: 'Ese apodo ya está en uso.' });
    }
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
      usuario: {
        id: usuario._id,
        email: usuario.email,
        nombre: usuario.nombre,
        apodo: usuario.apodo || null,
        rankingVisible: Boolean(usuario.rankingVisible),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión', detalle: error.message });
  }
}

async function obtenerPerfil(req, res) {
  try {
    const usuario = await Usuario.findById(req.usuarioId).select('apodo rankingVisible').lean();
    if (!usuario) return res.status(404).json({ error: 'No se encontró el usuario.' });
    return res.json({
      usuario: {
        apodo: usuario.apodo || null,
        rankingVisible: Boolean(usuario.rankingVisible),
      },
    });
  } catch (error) {
    console.error('Error al obtener el perfil:', error.message);
    return res.status(500).json({ error: 'No se pudo cargar el perfil.' });
  }
}

function inicioDiaUTC(fecha) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

async function actualizarPerfil(req, res) {
  const cuerpo = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body
    : {};
  const incluyeApodo = Object.hasOwn(cuerpo, 'apodo');
  const incluyeVisibilidad = Object.hasOwn(cuerpo, 'rankingVisible');
  if (!incluyeApodo && !incluyeVisibilidad) {
    return res.status(400).json({ error: 'Indica un apodo o la visibilidad del ranking.' });
  }
  if (incluyeVisibilidad && typeof cuerpo.rankingVisible !== 'boolean') {
    return res.status(400).json({ error: 'Aparecer en el ranking debe ser verdadero o falso.' });
  }

  const validacion = incluyeApodo ? validarApodo(cuerpo.apodo) : null;
  if (validacion && !validacion.valido) {
    return res.status(400).json({ error: validacion.error });
  }

  try {
    const ahora = new Date();
    const usuarioExistente = await Usuario.findById(req.usuarioId);
    if (!usuarioExistente) return res.status(404).json({ error: 'No se encontró el usuario.' });
    const apodoFinal = incluyeApodo ? validacion.apodo : usuarioExistente.apodo;
    if (incluyeVisibilidad && cuerpo.rankingVisible && !apodoFinal) {
      return res.status(400).json({ error: 'Elige un apodo antes de aparecer en el ranking.' });
    }

    const cambioApodo = incluyeApodo && usuarioExistente.apodo !== validacion.apodo;
    if (cambioApodo && usuarioExistente.ultimoCambioApodo
      && inicioDiaUTC(usuarioExistente.ultimoCambioApodo).getTime() === inicioDiaUTC(ahora).getTime()) {
      return res.status(429).json({ error: 'Solo puedes cambiar tu apodo una vez por día.' });
    }

    const cambios = {};
    if (cambioApodo) {
      cambios.apodo = validacion.apodo;
      cambios.ultimoCambioApodo = ahora;
    }
    if (incluyeVisibilidad) cambios.rankingVisible = cuerpo.rankingVisible;

    let usuario;
    if (cambioApodo) {
      const inicioHoy = inicioDiaUTC(ahora);
      usuario = await Usuario.findOneAndUpdate(
        {
          _id: req.usuarioId,
          $or: [
            { ultimoCambioApodo: { $exists: false } },
            { ultimoCambioApodo: null },
            { ultimoCambioApodo: { $lt: inicioHoy } },
          ],
        },
        { $set: cambios },
        { new: true, runValidators: true }
      );
      if (!usuario) {
        const usuarioActual = await Usuario.findById(req.usuarioId);
        if (usuarioActual?.apodo === validacion.apodo) {
          usuario = usuarioActual;
        } else if (usuarioActual) {
          return res.status(429).json({ error: 'Solo puedes cambiar tu apodo una vez por día.' });
        } else {
          return res.status(404).json({ error: 'No se encontró el usuario.' });
        }
      }
    } else {
      usuario = await Usuario.findOneAndUpdate(
        { _id: req.usuarioId },
        { $set: cambios },
        { new: true, runValidators: true }
      );
    }

    if (!usuario) return res.status(404).json({ error: 'No se encontró el usuario.' });
    return res.json({
      usuario: {
        apodo: usuario.apodo || null,
        rankingVisible: Boolean(usuario.rankingVisible),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Ese apodo ya está en uso.' });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: 'El perfil contiene datos inválidos.' });
    }
    console.error('Error al actualizar el perfil:', error.message);
    return res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
  }
}

module.exports = { registrar, iniciarSesion, obtenerPerfil, actualizarPerfil };
