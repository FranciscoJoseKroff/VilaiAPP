require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../src/models/User');
const { migrarPerfilRanking } = require('../src/utils/migracionPerfilRanking');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta la variable de entorno MONGODB_URI.');
  await mongoose.connect(process.env.MONGODB_URI);
  const modificados = await migrarPerfilRanking(Usuario);
  console.log(`Migración completada: ${modificados} usuarios actualizados.`);
}

main()
  .catch((error) => {
    console.error('No se pudo completar la migración del perfil de ranking:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
