require('dotenv').config();
const mongoose = require('mongoose');
const Aldea = require('../src/models/Village');
const { migrarLogros } = require('../src/utils/migracionLogros');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta la variable de entorno MONGODB_URI.');
  await mongoose.connect(process.env.MONGODB_URI);
  const modificadas = await migrarLogros(Aldea);
  console.log(`Migración completada: ${modificadas} aldeas actualizadas.`);
}

main()
  .catch((error) => {
    console.error('No se pudo completar la migración de logros:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
