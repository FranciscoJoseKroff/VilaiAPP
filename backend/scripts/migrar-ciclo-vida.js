require('dotenv').config();
const mongoose = require('mongoose');
const Aldea = require('../src/models/Village');
const { migrarCicloVida } = require('../src/utils/migracionCicloVida');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta la variable de entorno MONGODB_URI.');
  await mongoose.connect(process.env.MONGODB_URI);
  const modificadas = await migrarCicloVida(Aldea);
  console.log(`Migración completada: ${modificadas} aldeas actualizaron las etapas de vida.`);
}

main()
  .catch((error) => {
    console.error('No se pudo completar la migración del ciclo de vida:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
