const Aldea = require('../models/Village');
const mongoose = require('mongoose');
const { crearAldeaPorDefecto, MADERA_INICIAL } = require('../utils/villageDefaults');
const { aplicarProgresoInactivo } = require('../utils/offlineProgress');
const { asegurarEdad, registrarCronica } = require('../utils/migracionTiempo');
const { migrarInvestigacion } = require('../utils/migracionInvestigacion');

// GET /api/aldea — trae (o crea) la aldea del usuario y le suma el progreso
// generado mientras no tenía la app abierta.
async function obtenerAldea(req, res) {
  try {
    let aldea = await Aldea.findOne({ usuario: req.usuarioId });
    if (!aldea) {
      aldea = await Aldea.create(crearAldeaPorDefecto(req.usuarioId));
    }
    asegurarEdad(aldea);
    migrarInvestigacion(aldea);
    if (aldea.edificios.length === 0 && aldea.recursos.madera < MADERA_INICIAL) {
      aldea.recursos.madera = MADERA_INICIAL;
    }

    const progresoInactivo = aplicarProgresoInactivo(aldea);
    const resumenTiempo = progresoInactivo.resumenTiempo || { segundos: 0, anios: 0, edadAnterior: null, edadNueva: null, cambios: [] };
    await aldea.save();

    const resumenOffline = progresoInactivo.resumenOffline || {
      segundosAusente: resumenTiempo.segundos,
      segundosAplicados: resumenTiempo.segundos,
      recursosGenerados: {},
      aldeanosLlegados: 0,
      alcanzoTope8h: false,
    };
    res.json({ aldea, progresoInactivo, resumenTiempo, resumenOffline });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la aldea', detalle: error.message });
  }
}

// PUT /api/aldea — sobrescribe el estado del juego con lo que manda el
// frontend (equivalente al F5 del prototipo). Nunca permitimos tocar el
// dueño del documento desde el body, pase lo que pase en la petición.
async function guardarAldea(req, res) {
  try {
    const datos = { ...req.body };
    delete datos.usuario;
    delete datos._id;
    delete datos.id;
    delete datos.__v;
    delete datos.createdAt;
    delete datos.updatedAt;

    const aldeaExistente = await Aldea.findOne({ usuario: req.usuarioId });
    if (Array.isArray(datos.cronica) && aldeaExistente) {
      const combinada = [...(aldeaExistente.cronica || []).map((e) => ({ anio: Number(e.anio), tipo: String(e.tipo), texto: String(e.texto) }))];
      for (const entrada of datos.cronica) {
        const normalizada = { anio: Number(entrada.anio ?? aldeaExistente.ciclo?.dia ?? 1), tipo: String(entrada.tipo ?? 'general'), texto: String(entrada.texto ?? '').trim() };
        if (!normalizada.texto) continue;
        if (!combinada.some((e) => e.anio === normalizada.anio && e.tipo === normalizada.tipo && e.texto === normalizada.texto)) combinada.push(normalizada);
      }
      datos.cronica = combinada.slice(-50);
    }
    const aldea = await Aldea.findOneAndUpdate(
      { usuario: req.usuarioId },
      { $set: { ...datos, ultimoGuardado: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json({ aldea });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      console.error('Error de validación al guardar la aldea:', error.message);
      return res.status(400).json({ error: 'Datos de la aldea inválidos', detalle: error.message });
    }
    console.error('Error al guardar la aldea:', error.message);
    return res.status(500).json({ error: 'Error al guardar la aldea', detalle: error.message });
  }
}

module.exports = { obtenerAldea, guardarAldea };
