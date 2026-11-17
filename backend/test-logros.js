const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Aldea = require('./src/models/Village');
const { crearAldeaPorDefecto, LOGROS } = require('./src/utils/villageDefaults');
const { aplicarProgresoInactivo } = require('./src/utils/offlineProgress');
const { migrarLogros } = require('./src/utils/migracionLogros');

async function main() {
  assert.equal(LOGROS.length, 12);
  assert.equal(LOGROS.filter((logro) => logro.premioReliquias === 1).length, 3);
  let migracionEjecutada = false;
  const migraciones = [];
  const modifiedCount = await migrarLogros({
    updateMany: async (...argumentos) => {
      migraciones.push(argumentos);
      if (migracionEjecutada) return { modifiedCount: 0 };
      migracionEjecutada = true;
      return { modifiedCount: 1 };
    },
  });
  assert.equal(modifiedCount, 1);
  assert.equal((await migrarLogros({
    updateMany: async (...argumentos) => {
      migraciones.push(argumentos);
      return { modifiedCount: 0 };
    },
  })), 0);
  assert.deepEqual(migraciones[0], [{ logros: { $exists: false } }, { $set: { logros: [] } }]);

  const usuario = new mongoose.Types.ObjectId();
  const datos = crearAldeaPorDefecto(usuario);
  const aldea = new Aldea({ ...datos, usuario });
  await aldea.validate();

  const invalida = new Aldea({ ...datos, usuario, logros: [{ id: 'logroInventado', anio: 1 }] });
  await assert.rejects(invalida.validate(), /logros\.0\.id/);

  const sinDuplicados = crearAldeaPorDefecto(usuario);
  sinDuplicados.logros = [{ id: LOGROS[0].id, anio: 1 }, { id: LOGROS[0].id, anio: 2 }];
  const documentoDuplicado = new Aldea(sinDuplicados);
  await assert.rejects(documentoDuplicado.validate(), /No se puede repetir un logro/);

  const offline = crearAldeaPorDefecto(usuario);
  offline.tecnologias = { ...(offline.tecnologias || {}), metalurgia: 1 };
  offline.ultimoGuardado = new Date(Date.now() - 1000);
  const resumen = aplicarProgresoInactivo(offline).resumenOffline;
  assert.ok(offline.logros.some((logro) => logro.id === 'metalurgico'));
  assert.ok(resumen.logrosDesbloqueados.includes('metalurgico'));

  console.log('Pruebas de logros: esquema, duplicados y desbloqueo offline correctos.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
