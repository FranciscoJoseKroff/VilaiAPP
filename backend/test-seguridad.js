const assert = require('assert');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = 'secreto_seguridad_de_al_menos_32_caracteres';
  process.env.PORT = '4124';
  process.env.NODE_ENV = 'development';
  process.env.CORS_ORIGINS = 'https://app.permitida.test';

  const mongoose = require('mongoose');
  const { iniciarServidor } = require('./src/server.js');
  const servidor = await iniciarServidor();
  const base = 'http://localhost:4124';

  const salud = await fetch(`${base}/api/salud`);
  assert.strictEqual(salud.status, 200);
  assert.deepStrictEqual(await salud.json(), { estado: 'ok', mongo: 'conectado', version: require('./package.json').version });
  console.log('OK: /api/salud informa Mongo conectado');

  const corsPermitido = await fetch(`${base}/api/salud`, {
    headers: { Origin: 'https://app.permitida.test' },
  });
  assert.strictEqual(corsPermitido.headers.get('access-control-allow-origin'), 'https://app.permitida.test');

  const corsNoPermitido = await fetch(`${base}/api/salud`, {
    headers: { Origin: 'https://app.no-permitida.test' },
  });
  assert.strictEqual(corsNoPermitido.status, 403);

  const sinOrigin = await fetch(`${base}/api/salud`);
  assert.strictEqual(sinOrigin.status, 200);
  console.log('OK: CORS permite origen configurado, rechaza otro y permite apps sin Origin');

  const ipAuth = '198.51.100.10';
  const registro = await fetch(`${base}/api/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ipAuth },
    body: JSON.stringify({ email: 'limite@test.com', password: '123456', nombre: 'Limite' }),
  });
  assert.strictEqual(registro.status, 201);
  const registroBody = await registro.json();

  let estadoUltimoFallido;
  for (let intento = 1; intento <= 21; intento += 1) {
    const respuesta = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ipAuth },
      body: JSON.stringify({ email: 'limite@test.com', password: 'incorrecta' }),
    });
    estadoUltimoFallido = respuesta.status;
    if (intento === 20) assert.strictEqual(respuesta.status, 401);
    if (intento === 21) assert.strictEqual(respuesta.status, 429);
  }
  assert.strictEqual(estadoUltimoFallido, 429);
  console.log('OK: /api/auth cuenta intentos fallidos y limita con 429');

  const loginExitoso = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.11' },
    body: JSON.stringify({ email: 'limite@test.com', password: '123456' }),
  });
  assert.strictEqual(loginExitoso.status, 200);
  console.log('OK: un acceso exitoso no incrementa el contador de fallidos');

  let estadoUltimoAldea;
  for (let intento = 1; intento <= 241; intento += 1) {
    const respuesta = await fetch(`${base}/api/aldea`, {
      headers: { Authorization: `Bearer ${registroBody.token}`, 'X-Forwarded-For': '198.51.100.20' },
    });
    estadoUltimoAldea = respuesta.status;
  }
  assert.strictEqual(estadoUltimoAldea, 429);
  console.log('OK: /api/aldea aplica el límite por usuario');

  servidor.close(async () => {
    await mongoose.disconnect();
    await mongod.stop();
    console.log('\nTODOS LOS TESTS DE SEGURIDAD PASARON ✅');
  });
}

main().catch((error) => {
  console.error('FALLÓ EL TEST DE SEGURIDAD:', error);
  process.exit(1);
});
