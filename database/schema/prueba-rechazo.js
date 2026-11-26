// Intenta insertar documentos inválidos y muestra cómo MongoDB los rechaza.
// Ninguno debería quedar guardado.
const { ObjectId } = require('mongodb');
const { conBase } = require('../conexion');

const intentos = [
  {
    coleccion: 'cronica',
    motivo: 'tipo fuera del enum y anio como texto (fechas/números deben ir con su tipo)',
    doc: { aldea: new ObjectId(), anio: 'año tres', tipo: 'fiesta', texto: 'Se celebró la cosecha', fecha: new Date() },
  },
  {
    coleccion: 'aldeas',
    motivo: 'aldeano con trabajo "panadero" (no existe) y madera negativa',
    doc: {
      usuario: new ObjectId(),
      recursos: { madera: -5, comida: 10, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
      ciclo: { dia: 1, segundos: 0 },
      edad: { id: 'calma', numero: 1 },
      poblacionMaxima: 2,
      aldeanos: [{ _id: new ObjectId(), nombre: 'Rosa', x: 10, y: 10, trabajo: 'panadero', modoTrabajo: 'manual', rasgo: 'polivalente', estado: 'descansando' }],
      edificios: [],
      ultimoGuardado: new Date(),
      createdAt: new Date(),
    },
  },
  {
    coleccion: 'usuarios',
    motivo: 'falta passwordHash y createdAt viene como texto',
    doc: { email: 'sin.clave@ejemplo.cl', rankingVisible: false, createdAt: '2026-11-26', updatedAt: new Date() },
  },
];

conBase(async (db) => {
  for (const { coleccion, motivo, doc } of intentos) {
    console.log(`\n── Insertar en ${coleccion}: ${motivo}`);
    try {
      await db.collection(coleccion).insertOne(doc);
      console.log('✘ Se insertó (el validador NO está funcionando)');
      process.exitCode = 1;
    } catch (error) {
      console.log(`✔ Rechazado: ${error.message} (código ${error.code})`);
      console.log(JSON.stringify(error.errInfo?.details?.schemaRulesNotSatisfied, null, 2));
    }
  }
});
