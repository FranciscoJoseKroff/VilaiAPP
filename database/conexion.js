// Conexión compartida por todos los scripts de database/.
// Lee database/.env con process.loadEnvFile (Node >= 20.12), sin dependencias extra.
const path = require('node:path');
const { MongoClient } = require('mongodb');

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // Sin archivo .env: se usan las variables que ya existan en el entorno.
}

async function conectar() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI. Copia database/.env.example como database/.env y complétalo.');
    process.exit(1);
  }
  const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await cliente.connect();
  const db = cliente.db(process.env.DB_NAME || 'vilai_bd');
  return { cliente, db };
}

// Ejecuta una función con la base abierta y siempre cierra la conexión.
async function conBase(fn) {
  const { cliente, db } = await conectar();
  try {
    await fn(db);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await cliente.close();
  }
}

module.exports = { conectar, conBase };
