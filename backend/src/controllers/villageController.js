const Aldea = require('../models/Village');
const mongoose = require('mongoose');
const { crearAldeaPorDefecto, MADERA_INICIAL, LOGROS, calcularCapacidades } = require('../utils/villageDefaults');
const { aplicarProgresoInactivo } = require('../utils/offlineProgress');
const { asegurarEdad, registrarCronica } = require('../utils/migracionTiempo');
const { migrarInvestigacion } = require('../utils/migracionInvestigacion');
const { asegurarEstadisticas } = require('../utils/migracionEstadisticas');
const { asegurarLogros } = require('../utils/migracionLogros');
const { aplicarLogros } = require('../utils/logros');
const { ESCENARIOS } = require('../utils/escenarios');
const { evaluarAldea } = require('../utils/antiTrampas');
const { asegurarAldeaVida } = require('../utils/cicloVida');

// GET /api/aldea — trae (o crea) la aldea del usuario y le suma el progreso
// generado mientras no tenía la app abierta.
async function obtenerAldea(req, res) {
  try {
    let aldea = await Aldea.findOne({ usuario: req.usuarioId }).select('+poblacionRanking +anclaAntiTrampas');
    if (!aldea) {
      aldea = await Aldea.create(crearAldeaPorDefecto(req.usuarioId));
    }
    aldea.aldeanos = asegurarAldeaVida(aldea.toObject()).aldeanos;
    asegurarEdad(aldea);
    migrarInvestigacion(aldea);
    asegurarEstadisticas(aldea);
    asegurarLogros(aldea);
    if (aldea.poblacionRanking !== (aldea.aldeanos || []).length) {
      aldea.poblacionRanking = (aldea.aldeanos || []).length;
    }
    if (!aldea.anclaAntiTrampas?.inicio) {
      aldea.anclaAntiTrampas = {
        cicloDia: Number(aldea.ciclo?.dia || 1),
        inicio: new Date(aldea.ultimoGuardado || Date.now()),
      };
    }
    if (aldea.edificios.length === 0 && aldea.recursos.madera < MADERA_INICIAL) {
      aldea.recursos.madera = MADERA_INICIAL;
    }

    const progresoInactivo = aplicarProgresoInactivo(aldea);
    aldea.poblacionRanking = (aldea.aldeanos || []).length;
    Object.assign(aldea, aplicarLogros(aldea, LOGROS));
    const resumenTiempo = progresoInactivo.resumenTiempo || { segundos: 0, anios: 0, edadAnterior: null, edadNueva: null, cambios: [] };
    await aldea.save();

    const resumenOffline = progresoInactivo.resumenOffline || {
      segundosAusente: resumenTiempo.segundos,
      segundosAplicados: resumenTiempo.segundos,
      recursosGenerados: {},
      aldeanosLlegados: 0,
      alcanzoTope8h: false,
    };
    const aldeaPublica = aldea.toObject();
    delete aldeaPublica.sospechosa;
    delete aldeaPublica.poblacionRanking;
    delete aldeaPublica.anclaAntiTrampas;
    res.json({ aldea: aldeaPublica, progresoInactivo, resumenTiempo, resumenOffline });
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
    delete datos.marcaDemo;
    delete datos.sospechosa;
    delete datos.poblacionRanking;
    delete datos.anclaAntiTrampas;
    delete datos.ultimoGuardado;

    const aldeaExistente = await Aldea.findOne({ usuario: req.usuarioId }).select('+sospechosa +poblacionRanking +anclaAntiTrampas');
    if (Array.isArray(datos.cronica) && aldeaExistente) {
      const combinada = [...(aldeaExistente.cronica || []).map((e) => ({ anio: Number(e.anio), tipo: String(e.tipo), texto: String(e.texto) }))];
      for (const entrada of datos.cronica) {
        const normalizada = { anio: Number(entrada.anio ?? aldeaExistente.ciclo?.dia ?? 1), tipo: String(entrada.tipo ?? 'general'), texto: String(entrada.texto ?? '').trim() };
        if (!normalizada.texto) continue;
        if (!combinada.some((e) => e.anio === normalizada.anio && e.tipo === normalizada.tipo && e.texto === normalizada.texto)) combinada.push(normalizada);
      }
      datos.cronica = combinada.slice(-50);
    }
    datos.poblacionRanking = Array.isArray(datos.aldeanos)
      ? datos.aldeanos.length
      : (aldeaExistente?.aldeanos || []).length;
    if (aldeaExistente) {
      const propuesta = {
        ...aldeaExistente.toObject(),
        ...datos,
        marcaDemo: aldeaExistente.marcaDemo,
      };
      const validacion = evaluarAldea(propuesta, aldeaExistente);
      if (validacion.rechazo) {
        return res.status(400).json({ error: validacion.rechazo });
      }
      if (validacion.marcarSospechosa) datos.sospechosa = true;
      if (!aldeaExistente.anclaAntiTrampas?.inicio) {
        datos.anclaAntiTrampas = {
          cicloDia: Number(aldeaExistente.ciclo?.dia || 1),
          inicio: new Date(aldeaExistente.ultimoGuardado || aldeaExistente.updatedAt || Date.now()),
        };
      }
    }
    const aldea = await Aldea.findOneAndUpdate(
      { usuario: req.usuarioId },
      { $set: { ...datos, aldeanos: asegurarAldeaVida(datos).aldeanos, ultimoGuardado: new Date() } },
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

async function marcarAldeaDemo(req, res) {
  try {
    const aldea = await Aldea.findOneAndUpdate(
      { usuario: req.usuarioId },
      { $set: { marcaDemo: true } },
      { new: true, runValidators: true }
    );
    if (!aldea) return res.status(404).json({ error: 'No se encontró la aldea.' });
    return res.json({ aldea });
  } catch (error) {
    console.error('Error al marcar la aldea como demo:', error.message);
    return res.status(500).json({ error: 'No se pudo activar la marca demo.' });
  }
}

async function aplicarEscenario(req, res) {
  const nombre = req.body?.escenario;
  if (typeof nombre !== 'string' || !Object.hasOwn(ESCENARIOS, nombre)) {
    return res.status(400).json({ error: 'El escenario solicitado no es válido.' });
  }

  try {
    const crearEscenario = ESCENARIOS[nombre];
    const datos = crearEscenario(req.usuarioId);
    datos.marcaDemo = true;
    datos.sospechosa = false;
    datos.poblacionRanking = (datos.aldeanos || []).length;
    datos.anclaAntiTrampas = { cicloDia: Number(datos.ciclo?.dia || 1), inicio: new Date() };
    datos.ultimoGuardado = new Date();
    const aldea = await Aldea.findOneAndReplace(
      { usuario: req.usuarioId },
      { ...datos, aldeanos: asegurarAldeaVida(datos).aldeanos },
      { new: true, upsert: true, runValidators: true }
    );
    return res.json({ aldea });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      console.error('Error de validación al aplicar un escenario:', error.message);
      return res.status(400).json({ error: 'El escenario no es válido', detalle: error.message });
    }
    console.error('Error al aplicar un escenario:', error.message);
    return res.status(500).json({ error: 'No se pudo aplicar el escenario.' });
  }
}

async function importarAldea(req, res) {
  const fuente = req.body?.aldea;
  if (!fuente || typeof fuente !== 'object' || Array.isArray(fuente)
    || !fuente.recursos || !Array.isArray(fuente.aldeanos) || !Array.isArray(fuente.edificios)) {
    return res.status(400).json({ error: 'El archivo no contiene una aldea completa y válida.' });
  }

  try {
    const datos = { ...fuente };
    for (const campo of [
      'usuario', '_id', 'id', '__v', 'createdAt', 'updatedAt', 'ultimoGuardado',
      'marcaDemo', 'sospechosa', 'poblacionRanking', 'anclaAntiTrampas',
    ]) delete datos[campo];

    const candidata = new Aldea({
      ...datos,
      usuario: req.usuarioId,
      marcaDemo: true,
      sospechosa: false,
      poblacionRanking: datos.aldeanos.length,
      anclaAntiTrampas: { cicloDia: Number(datos.ciclo?.dia || 1), inicio: new Date() },
      ultimoGuardado: new Date(),
    });
    await candidata.validate();

    const capacidades = calcularCapacidades(candidata.toObject());
    for (const [recurso, cantidad] of Object.entries(candidata.recursos.toObject())) {
      if (!Number.isFinite(cantidad) || cantidad < 0) {
        return res.status(400).json({ error: `El valor de ${recurso} debe ser un número no negativo.` });
      }
      if (cantidad > (capacidades[recurso] ?? Infinity)) {
        return res.status(400).json({ error: `${recurso} supera la capacidad de la aldea.` });
      }
    }

    const aldeaExistente = await Aldea.findOne({ usuario: req.usuarioId });
    const reemplazo = candidata.toObject();
    if (aldeaExistente) reemplazo._id = aldeaExistente._id;
    const importada = await Aldea.findOneAndReplace(
      { usuario: req.usuarioId },
      reemplazo,
      { new: true, upsert: true, runValidators: true },
    );
    const aldeaPublica = importada.toObject();
    delete aldeaPublica.usuario;
    delete aldeaPublica.sospechosa;
    delete aldeaPublica.poblacionRanking;
    delete aldeaPublica.anclaAntiTrampas;
    return res.json({ aldea: aldeaPublica });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: 'La partida contiene datos inválidos.', detalle: error.message });
    }
    console.error('Error al importar la aldea:', error.message);
    return res.status(500).json({ error: 'No se pudo importar la partida.' });
  }
}

module.exports = { obtenerAldea, guardarAldea, aplicarEscenario, marcarAldeaDemo, importarAldea };
