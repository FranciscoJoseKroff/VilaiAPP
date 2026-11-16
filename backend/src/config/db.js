const mongoose = require('mongoose');

async function conectarDB({ reintentos = 5, retrasoMs = 2000 } = {}) {
  let ultimoError;
  for (let intento = 1; intento <= reintentos; intento += 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB conectado');
      return mongoose.connection;
    } catch (error) {
      ultimoError = error;
      console.error(`No se pudo conectar a MongoDB (intento ${intento}/${reintentos})`);
      if (intento < reintentos) {
        await new Promise((resolve) => setTimeout(resolve, retrasoMs));
      }
    }
  }
  throw new Error(`MongoDB no pudo conectarse después de ${reintentos} intentos: ${ultimoError?.message || 'error desconocido'}`);
}

module.exports = conectarDB;
