require('dotenv').config();
const mongoose = require('mongoose');
const Aldea = require('../src/models/Village');
const { migrarEventosInvestigacion } = require('../src/utils/migracionEventosInvestigacion');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta la variable de entorno MONGODB_URI.');
  await mongoose.connect(process.env.MONGODB_URI);
  const modificadas = await migrarEventosInvestigacion(Aldea);
  console.log(`Migración completada: ${modificadas} documentos de campo actualizados.`);
}

main()
  .catch((error) => {
    console.error('No se pudo completar la migración de eventos e investigación:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
