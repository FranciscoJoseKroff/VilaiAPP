require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const mongoose = require('mongoose');
const conectarDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const villageRoutes = require('./routes/villageRoutes');
const catalogRoutes = require('./routes/catalogRoutes');

function validarEntorno() {
  const faltantes = ['MONGODB_URI', 'JWT_SECRET'].filter((nombre) => !process.env[nombre]);
  if (faltantes.length) {
    throw new Error(`Faltan variables de entorno obligatorias: ${faltantes.join(', ')}`);
  }
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

const origenesPermitidos = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const permitido = origenesPermitidos.includes(origin)
      || (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin));
    if (permitido) return callback(null, true);
    return callback(new Error('Origen CORS no permitido'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
});

const limitePublico = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: 'Demasiadas peticiones públicas. Espera un minuto e inténtalo nuevamente.',
  }),
});

app.use('/api/salud', limitePublico, (req, res) => {
  const conectado = mongoose.connection.readyState === 1;
  res.status(conectado ? 200 : 503).json({
    estado: conectado ? 'ok' : 'no_conectado',
    mongo: conectado ? 'conectado' : 'desconectado',
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/aldea', villageRoutes);
app.use('/api/catalogo', limitePublico, catalogRoutes);

app.use((error, req, res, next) => {
  if (error.message === 'Origen CORS no permitido') {
    return res.status(403).json({ error: error.message });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud excede el límite permitido de 1 MB' });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'El cuerpo de la solicitud debe ser JSON válido' });
  }
  return next(error);
});

// Manejo de rutas no encontradas
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

async function iniciarServidor() {
  validarEntorno();
  await conectarDB();
  const puerto = process.env.PORT || 4000;
  const servidor = app.listen(puerto, '0.0.0.0', () => {
    console.log(`Servidor escuchando en puerto ${puerto}`);
  });

  const cerrar = async (senal) => {
    console.log(`Recibida ${senal}; cerrando servidor`);
    servidor.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', () => cerrar('SIGTERM'));
  return servidor;
}

if (require.main === module) {
  iniciarServidor().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { app, iniciarServidor };
