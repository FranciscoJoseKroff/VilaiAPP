// Crea los índices del avance y muestra explain() ANTES y DESPUÉS de cada uno.
// Para que el "antes" sea real, primero borra el índice si ya existía.
const { ObjectId } = require('mongodb');
const { conBase } = require('../conexion');

const ALDEA_CAMILA = new ObjectId('b20000000000000000000001');
const USUARIO_CAMILA = new ObjectId('a10000000000000000000001');

const INDICES = [
  {
    coleccion: 'cronica',
    nombre: 'cronica_aldea_anio',
    claves: { aldea: 1, anio: -1 },
    opciones: {},
    pantalla: 'Aldea → Crónica (últimas 10 entradas de mi aldea, la más nueva primero)',
    consulta: (c) => c.find({ aldea: ALDEA_CAMILA }).sort({ anio: -1 }).limit(10),
  },
  {
    coleccion: 'aldeas',
    nombre: 'aldea_usuario_unico',
    claves: { usuario: 1 },
    opciones: { unique: true }, // además garantiza 1 aldea por usuario
    pantalla: 'Aldea (al abrir la app se carga la aldea del usuario con sesión)',
    consulta: (c) => c.find({ usuario: USUARIO_CAMILA }),
  },
  {
    coleccion: 'aldeas',
    nombre: 'ranking_anios',
    claves: { marcaDemo: 1, sospechosa: 1, 'ciclo.dia': -1 },
    opciones: {},
    pantalla: 'Ranking (top 10 por años sobrevividos, sin aldeas demo ni sospechosas)',
    consulta: (c) => c.find({ marcaDemo: false, sospechosa: false }).sort({ 'ciclo.dia': -1 }).limit(10),
  },
];

// Recorre el plan ganador y devuelve sus etapas, p. ej. "LIMIT ← FETCH ← IXSCAN".
function etapas(plan) {
  const lista = [];
  for (let p = plan; p; p = p.inputStage || p.inputStages?.[0]) lista.push(p.stage + (p.indexName ? `(${p.indexName})` : ''));
  return lista.join(' ← ');
}

async function medir(cursor) {
  const e = await cursor.explain('executionStats');
  const s = e.executionStats;
  return {
    plan: etapas(e.queryPlanner.winningPlan.queryPlan || e.queryPlanner.winningPlan),
    devueltos: s.nReturned,
    docsExaminados: s.totalDocsExamined,
    clavesExaminadas: s.totalKeysExamined,
    ms: s.executionTimeMillis,
  };
}

conBase(async (db) => {
  for (const ind of INDICES) {
    const col = db.collection(ind.coleccion);
    const existentes = await col.indexes();
    if (existentes.some((i) => i.name === ind.nombre)) await col.dropIndex(ind.nombre);

    const antes = await medir(ind.consulta(col));
    await col.createIndex(ind.claves, { name: ind.nombre, ...ind.opciones });
    const despues = await medir(ind.consulta(col));

    console.log(`\n══ ${ind.coleccion}.${ind.nombre} ${JSON.stringify(ind.claves)}`);
    console.log(`   Pantalla: ${ind.pantalla}`);
    console.table({ antes, despues });
  }
});
