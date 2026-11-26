// Carga los datos de prueba. Idempotente: cada documento se reemplaza por su
// _id fijo (replaceOne + upsert), así que correrlo dos veces no duplica nada.
const { conBase } = require('../conexion');
const datos = require('./datos');

conBase(async (db) => {
  for (const nombre of ['usuarios', 'aldeas', 'cronica']) {
    const operaciones = datos[nombre].map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    }));
    const r = await db.collection(nombre).bulkWrite(operaciones, { ordered: true });
    const total = await db.collection(nombre).countDocuments();
    console.log(`✔ ${nombre}: ${r.upsertedCount} insertados, ${r.modifiedCount} actualizados, ${r.matchedCount - r.modifiedCount} sin cambios → ${total} documentos`);
  }
});
