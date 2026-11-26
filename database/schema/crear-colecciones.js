// Crea (o actualiza) las 3 colecciones con su validador $jsonSchema.
// Se puede ejecutar varias veces: si la colección ya existe, usa collMod.
const { conBase } = require('../conexion');
const { validadores } = require('./validadores');

conBase(async (db) => {
  const existentes = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

  for (const [nombre, validator] of Object.entries(validadores)) {
    const opciones = { validator, validationLevel: 'strict', validationAction: 'error' };
    if (existentes.has(nombre)) {
      await db.command({ collMod: nombre, ...opciones });
      console.log(`✔ ${nombre}: validador actualizado (collMod)`);
    } else {
      await db.createCollection(nombre, opciones);
      console.log(`✔ ${nombre}: colección creada con $jsonSchema`);
    }
  }

  // Índice único de email: es una regla de integridad (no de rendimiento),
  // por eso se crea junto al esquema y no en indexes/.
  await db.collection('usuarios').createIndex({ email: 1 }, { unique: true, name: 'email_unico' });
  console.log('✔ usuarios: índice único email_unico');
});
