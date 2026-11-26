// Consultas del avance, una o más por pantalla de la app.
//   node queries/consultas.js        → corre todas, en orden (el final deja la base como estaba)
//   node queries/consultas.js 10     → corre solo la consulta 10 (útil para tomar la captura)
//
// Las consultas 2, 6, 9 y 14 trabajan sobre un jugador "nuevo" que crea la
// consulta 2 y borra la 15, así se pueden repetir sin ensuciar los datos del seed.
const { ObjectId } = require('mongodb');
const { conBase } = require('../conexion');

const USUARIO_CAMILA = new ObjectId('a10000000000000000000001');
const ALDEA_CAMILA = new ObjectId('b20000000000000000000001');
const EMAIL_NUEVO = 'nuevo.jugador@ejemplo.cl';

async function aldeaDelNuevo(db) {
  const usuario = await db.collection('usuarios').findOne({ email: EMAIL_NUEVO });
  if (!usuario) throw new Error(`No existe ${EMAIL_NUEVO}: corre primero la consulta 2.`);
  const aldea = await db.collection('aldeas').findOne({ usuario: usuario._id }, { projection: { _id: 1 } });
  return { usuario, aldeaId: aldea._id };
}

const CONSULTAS = [
  {
    pantalla: 'Login', operacion: 'Detalle (iniciar sesión)',
    descripcion: 'Busca al usuario por email (índice único email_unico). El hash se compara después con bcrypt en el servidor.',
    run: (db) => db.collection('usuarios').findOne(
      { email: 'camila.rojas@ejemplo.cl' },
      { projection: { email: 1, nombre: 1, apodo: 1, passwordHash: 1 } },
    ),
  },
  {
    pantalla: 'Login', operacion: 'Crear (registrarse)',
    descripcion: 'Crea el usuario y su aldea inicial con 2 aldeanos embebidos.',
    run: async (db) => {
      const ahora = new Date();
      const usuario = await db.collection('usuarios').insertOne({
        email: EMAIL_NUEVO,
        passwordHash: '$2a$10$8TZT91LDIWGqr06WfLJIwuFPlLzPgF8YA/MemHlVanqR8DWCKXTZq',
        nombre: 'Nuevo Jugador',
        apodo: null,
        rankingVisible: false,
        createdAt: ahora,
        updatedAt: ahora,
      });
      const aldeano = (nombre, x) => ({
        _id: new ObjectId(), nombre, x, y: 120, edadAnios: 20, esperanza: 70,
        trabajo: 'libre', modoTrabajo: 'automatico', rasgo: 'polivalente', estado: 'descansando',
        necesidades: { hambre: 20, energia: 90, animo: 80 }, pensamientoActual: 'Qué lugar más tranquilo.',
      });
      const aldea = await db.collection('aldeas').insertOne({
        usuario: usuario.insertedId,
        recursos: { madera: 50, comida: 30, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
        ciclo: { dia: 1, segundos: 0 },
        edad: { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 10 },
        poblacionMaxima: 3,
        aldeanos: [aldeano('Rosa', 100), aldeano('Aurelio', 140)],
        edificios: [],
        tecnologias: { herramientas: 0, logistica: 0, defensa: 0, metalurgia: 0, planosAntiguos: 0 },
        puntosInvestigacion: 0,
        legado: { coloniasFundadas: 0, reliquias: 0, reliquiasGastadas: 0, generaciones: 0 },
        logros: [],
        marcaDemo: false,
        sospechosa: false,
        ultimoGuardado: ahora,
        createdAt: ahora,
        updatedAt: ahora,
      });
      return { usuarioId: usuario.insertedId, aldeaId: aldea.insertedId };
    },
  },
  {
    pantalla: 'Aldea (inicio)', operacion: 'Detalle por id',
    descripcion: 'Carga el HUD de la aldea del usuario con sesión: recursos, año, edad y población (índice aldea_usuario_unico).',
    run: (db) => db.collection('aldeas').findOne(
      { usuario: USUARIO_CAMILA },
      { projection: { recursos: 1, ciclo: 1, edad: 1, poblacionMaxima: 1, poblacion: { $size: '$aldeanos' }, 'legado.reliquias': 1 } },
    ),
  },
  {
    pantalla: 'Aldeanos', operacion: 'Listar con filtro y orden',
    descripcion: 'Aldeanos que trabajan en la producción (leñador o agricultor), ordenados por nombre.',
    run: (db) => db.collection('aldeas').aggregate([
      { $match: { _id: ALDEA_CAMILA } },
      { $unwind: '$aldeanos' },
      { $match: { 'aldeanos.trabajo': { $in: ['lenador', 'agricultor'] } } },
      { $sort: { 'aldeanos.nombre': 1 } },
      { $project: { _id: 0, nombre: '$aldeanos.nombre', trabajo: '$aldeanos.trabajo', rasgo: '$aldeanos.rasgo', modo: '$aldeanos.modoTrabajo', edad: '$aldeanos.edadAnios' } },
    ]).toArray(),
  },
  {
    pantalla: 'Aldeanos', operacion: 'Actualizar',
    descripcion: 'El jugador asigna a mano un oficio a un aldeano (subdocumento del arreglo, con arrayFilters).',
    run: (db) => db.collection('aldeas').updateOne(
      { _id: ALDEA_CAMILA },
      { $set: { 'aldeanos.$[a].trabajo': 'minero', 'aldeanos.$[a].estado': 'minando', 'aldeanos.$[a].modoTrabajo': 'manual', updatedAt: new Date() } },
      { arrayFilters: [{ 'a._id': new ObjectId('c30000000000000000000065') }] },
    ),
  },
  {
    pantalla: 'Construir', operacion: 'Crear (subdocumento) y actualizar recursos',
    descripcion: 'Construye un aserradero: descuenta 30 de madera y agrega el edificio en una sola operación atómica. Si no alcanza la madera, no modifica nada.',
    run: async (db) => {
      const { aldeaId } = await aldeaDelNuevo(db);
      const r = await db.collection('aldeas').updateOne(
        { _id: aldeaId, 'recursos.madera': { $gte: 30 } },
        {
          $inc: { 'recursos.madera': -30 },
          $push: { edificios: { _id: new ObjectId(), tipoId: 'aserradero', x: 80, y: 60, nivel: 1, completo: false, progreso: 0, integridad: 100 } },
          $set: { updatedAt: new Date() },
        },
      );
      if (r.modifiedCount) {
        await db.collection('cronica').insertOne({ aldea: aldeaId, anio: 1, tipo: 'construccion', texto: 'Comenzó la construcción de un aserradero', fecha: new Date() });
      }
      return r;
    },
  },
  {
    pantalla: 'Construir', operacion: 'Agregación ($unwind + $group)',
    descripcion: 'Resumen de edificios construidos por tipo (cuántos y nivel más alto), para mostrar "ya tienes" en cada tarjeta.',
    run: (db) => db.collection('aldeas').aggregate([
      { $match: { usuario: USUARIO_CAMILA } },
      { $unwind: '$edificios' },
      { $group: { _id: '$edificios.tipoId', cantidad: { $sum: 1 }, nivelMaximo: { $max: '$edificios.nivel' } } },
      { $sort: { cantidad: -1, _id: 1 } },
    ]).toArray(),
  },
  {
    pantalla: 'Investigación', operacion: 'Detalle',
    descripcion: 'Niveles del árbol de investigación y puntos disponibles de la aldea.',
    run: (db) => db.collection('aldeas').findOne(
      { usuario: USUARIO_CAMILA },
      { projection: { _id: 0, tecnologias: 1, puntosInvestigacion: 1, investigacionEnCurso: 1 } },
    ),
  },
  {
    pantalla: 'Ajustes', operacion: 'Actualizar',
    descripcion: 'El jugador elige su apodo y se hace visible en el ranking.',
    run: (db) => {
      const ahora = new Date();
      return db.collection('usuarios').updateOne(
        { email: EMAIL_NUEVO },
        { $set: { apodo: 'NuevoAldeano', rankingVisible: true, ultimoCambioApodo: ahora, updatedAt: ahora } },
      );
    },
  },
  {
    pantalla: 'Ranking', operacion: 'Agregación ($match + $sort + $lookup)',
    descripcion: 'Top 10 por años sobrevividos, sin aldeas demo ni sospechosas, solo jugadores que aceptaron aparecer (índice ranking_anios).',
    run: (db) => db.collection('aldeas').aggregate([
      { $match: { marcaDemo: false, sospechosa: false } },
      { $sort: { 'ciclo.dia': -1 } },
      { $lookup: { from: 'usuarios', localField: 'usuario', foreignField: '_id', as: 'jugador' } },
      { $unwind: '$jugador' },
      { $match: { 'jugador.rankingVisible': true } },
      { $limit: 10 },
      { $project: { _id: 0, apodo: '$jugador.apodo', anios: '$ciclo.dia', edad: '$edad.id', poblacion: { $size: '$aldeanos' }, reliquias: '$legado.reliquias' } },
    ]).toArray(),
  },
  {
    pantalla: 'Estadísticas', operacion: 'Agregación ($match + $group)',
    descripcion: 'Resumen de la crónica de la aldea: cuántos hechos hubo de cada tipo y en qué año fue el último.',
    run: (db) => db.collection('cronica').aggregate([
      { $match: { aldea: ALDEA_CAMILA } },
      { $group: { _id: '$tipo', cantidad: { $sum: 1 }, ultimoAnio: { $max: '$anio' } } },
      { $sort: { cantidad: -1 } },
    ]).toArray(),
  },
  {
    pantalla: 'Logros', operacion: 'Listar con orden',
    descripcion: 'Logros desbloqueados de la aldea, del más reciente al más antiguo.',
    run: (db) => db.collection('aldeas').aggregate([
      { $match: { usuario: USUARIO_CAMILA } },
      { $unwind: '$logros' },
      { $sort: { 'logros.anio': -1 } },
      { $project: { _id: 0, logro: '$logros.id', anio: '$logros.anio' } },
    ]).toArray(),
  },
  {
    pantalla: 'Aldea → Crónica', operacion: 'Listar con filtro, orden y paginación',
    descripcion: 'Página 1 de la crónica (10 por página), sin las entradas de eventos, la más nueva primero (índice cronica_aldea_anio).',
    run: (db) => db.collection('cronica')
      .find({ aldea: ALDEA_CAMILA, tipo: { $ne: 'evento' } }, { projection: { _id: 0, anio: 1, tipo: 1, texto: 1 } })
      .sort({ anio: -1 })
      .skip(0)
      .limit(10)
      .toArray(),
  },
  {
    pantalla: 'Aldeanos', operacion: 'Eliminar',
    descripcion: 'Un aldeano fallece: se saca del arreglo con $pull y se anota en la crónica.',
    run: async (db) => {
      const { aldeaId } = await aldeaDelNuevo(db);
      const r = await db.collection('aldeas').updateOne(
        { _id: aldeaId },
        { $pull: { aldeanos: { nombre: 'Aurelio' } }, $set: { updatedAt: new Date() } },
      );
      if (r.modifiedCount) {
        await db.collection('cronica').insertOne({ aldea: aldeaId, anio: 1, tipo: 'fallecimiento', texto: 'Aurelio falleció; la aldea lo despide', fecha: new Date() });
      }
      return r;
    },
  },
  {
    pantalla: 'Ajustes', operacion: 'Eliminar (borrar cuenta)',
    descripcion: 'Borra la cuenta con su aldea y su crónica. Como la crónica está referenciada, se borra aparte con deleteMany.',
    run: async (db) => {
      const { usuario, aldeaId } = await aldeaDelNuevo(db);
      const cronica = await db.collection('cronica').deleteMany({ aldea: aldeaId });
      const aldea = await db.collection('aldeas').deleteOne({ _id: aldeaId });
      const cuenta = await db.collection('usuarios').deleteOne({ _id: usuario._id });
      return { cronicaBorrada: cronica.deletedCount, aldeaBorrada: aldea.deletedCount, usuarioBorrado: cuenta.deletedCount };
    },
  },
];

const soloUna = Number(process.argv[2]);

conBase(async (db) => {
  for (const [i, c] of CONSULTAS.entries()) {
    const n = i + 1;
    if (soloUna && soloUna !== n) continue;
    console.log(`\n══ Consulta ${n} · Pantalla: ${c.pantalla} · ${c.operacion}`);
    console.log(`   ${c.descripcion}`);
    try {
      console.log(JSON.stringify(await c.run(db), null, 2));
    } catch (error) {
      console.log(`   ✘ ${error.message}`);
      process.exitCode = 1;
    }
  }
});
