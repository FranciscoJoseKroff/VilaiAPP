const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const conectarDB = require('../src/config/db');

async function main() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'playwright-e2e-only-test-secret';
  process.env.PORT = process.env.E2E_API_PORT || '4123';
  process.env.CORS_ORIGINS = 'http://127.0.0.1:4173';

  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('vilai_playwright_e2e');
  const { app } = require('../src/server');
  await conectarDB();

  const server = app.listen(Number(process.env.PORT), '127.0.0.1', () => {
    console.log(`Servidor E2E escuchando en puerto ${process.env.PORT}`);
  });

  let cerrando = false;
  const cerrar = () => {
    if (cerrando) return;
    cerrando = true;
    server.close(async (error) => {
      if (error) {
        console.error('Error al cerrar el servidor E2E:', error.message);
        process.exitCode = 1;
      }
      await mongoose.disconnect();
      await mongod.stop();
    });
  };
  process.once('SIGINT', cerrar);
  process.once('SIGTERM', cerrar);
  server.once('error', (error) => {
    console.error('No se pudo iniciar el servidor E2E:', error.message);
    cerrar();
  });
}

main().catch((error) => {
  console.error('No se pudo preparar el servidor E2E:', error.message);
  process.exitCode = 1;
});
