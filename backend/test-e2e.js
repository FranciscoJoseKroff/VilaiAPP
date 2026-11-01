const { MongoMemoryServer } = require('mongodb-memory-server');
const Aldea = require('./src/models/Village');

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = 'secreto_e2e';
  process.env.PORT = 4123;

  // server.js se auto-ejecuta al hacer require (conecta y hace listen),
  // así que lo cargamos después de fijar las variables de entorno.
  require('./src/server.js');

  // Esperar un poco a que conecte y levante el server
  await new Promise((r) => setTimeout(r, 1500));

  const base = 'http://localhost:4123';

  async function post(path, body, token) {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }
  async function get(path, token) {
    const res = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
    return { status: res.status, body: await res.json() };
  }
  async function put(path, body, token) {
    const res = await fetch(base + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  const assert = require('assert');

  // 1. Salud
  const salud = await (await fetch(base + '/api/salud')).json();
  assert.strictEqual(salud.estado, 'ok');
  console.log('OK: /api/salud');

  // 2. Registro
  const reg = await post('/api/auth/registro', { email: 'francisco@test.com', password: '123456', nombre: 'Francisco' });
  assert.strictEqual(reg.status, 201);
  assert(reg.body.token);
  const token = reg.body.token;
  console.log('OK: registro devuelve token');

  // 3. Registro duplicado debe fallar
  const regDup = await post('/api/auth/registro', { email: 'francisco@test.com', password: '123456' });
  assert.strictEqual(regDup.status, 409);
  console.log('OK: registro duplicado rechazado (409)');

  // 4. Login
  const login = await post('/api/auth/login', { email: 'francisco@test.com', password: '123456' });
  assert.strictEqual(login.status, 200);
  console.log('OK: login funciona');

  // 5. Obtener aldea (debe crearse automáticamente con Francisco el aldeano)
  const aldea1 = await get('/api/aldea', token);
  assert.strictEqual(aldea1.status, 200);
  assert.strictEqual(aldea1.body.aldea.aldeanos.length, 1);
  assert.strictEqual(aldea1.body.aldea.aldeanos[0].nombre, 'Francisco');
  assert.strictEqual(aldea1.body.aldea.aldeanos[0].trabajo, 'libre');
  assert.strictEqual(aldea1.body.aldea.aldeanos[0].modoTrabajo, 'automatico');
  assert.strictEqual(aldea1.body.aldea.aldeanos[0].rasgo, 'maderero');
  assert.strictEqual(aldea1.body.aldea.recursos.madera, 20);
  assert.strictEqual(aldea1.body.aldea.recursos.trigo, 0);
  assert.strictEqual(aldea1.body.aldea.ciclo.dia, 1);
  assert.strictEqual(aldea1.body.aldea.legado.reliquias, 0);
  assert.strictEqual(aldea1.body.aldea.arbolInvestigacionDesbloqueado, false);
  console.log('OK: GET /api/aldea crea la aldea inicial con un aldeano');

  // 6. Sin token debe rechazar
  const sinToken = await fetch(base + '/api/aldea');
  assert.strictEqual(sinToken.status, 401);
  console.log('OK: /api/aldea sin token devuelve 401');

  // 7. Catálogo de edificios
  const catalogo = await (await fetch(base + '/api/catalogo')).json();
  assert(catalogo.tiposEdificio.aserradero);
  assert.strictEqual(catalogo.tiposEdificio.aserradero.costoBase.madera, 20);
  assert.strictEqual(catalogo.produccionTrabajador, 0.2);
  assert.strictEqual(catalogo.capacidadesBase.madera, 250);
  assert.deepStrictEqual(catalogo.objetivosIA, { madera: 0.42, comida: 0.40, hierro: 0.15 });
  assert.strictEqual(catalogo.topeObjetivo, null);
  assert.deepStrictEqual(catalogo.reliquias, { porEdad: 1, bonoPorReliquia: 0.03, bonoMaximo: 0.30 });
  assert.deepStrictEqual(Object.keys(catalogo.tecnologias), ['herramientas', 'logistica', 'defensa']);
  assert.strictEqual(catalogo.arbol.length, 5);
  assert.strictEqual(catalogo.edades.hielo.pesosIA.agricultor, 0.15);
  assert.strictEqual(catalogo.estaciones.otono.pesosIA.agricultor, 0.12);
  assert.strictEqual(catalogo.estaciones.invierno.pesosIA.mineroSinPan, -0.15);
  assert.deepStrictEqual(catalogo.arbol.map((nodo) => nodo.id), [
    'herramientas', 'logistica', 'defensa', 'metalurgia', 'planosAntiguos',
  ]);
  assert.strictEqual(catalogo.arbol.find((nodo) => nodo.id === 'planosAntiguos').costoReliquias, 2);
  assert(catalogo.tiposEdificio.molino.receta);
  console.log('OK: /api/catalogo devuelve tipos de edificio, balance de reliquias y configuración IA aditivos');

  // 8. Costo de mejora
  const mejora = await (await fetch(base + '/api/catalogo/aserradero/mejora/1')).json();
  assert.strictEqual(mejora.costo.madera, 23);
  console.log('OK: /api/catalogo/:tipo/mejora/:nivel calcula costo procedural');

  const mejoraNivel2 = await (await fetch(`${base}/api/catalogo/aserradero/mejora/2`)).json();
  const mejoraNivel3 = await (await fetch(`${base}/api/catalogo/aserradero/mejora/3`)).json();
  assert.strictEqual(mejoraNivel2.costo.madera, 26.5);
  assert.strictEqual(mejoraNivel3.costo.madera, 30.4);
  assert.strictEqual(mejoraNivel3.nivelResultante, 4);
  console.log('OK: el precio se recalcula correctamente hasta la mejora a nivel 4');

  const mejoraNivelAlto = await fetch(`${base}/api/catalogo/aserradero/mejora/50`);
  assert.strictEqual(mejoraNivelAlto.status, 200);
  assert.strictEqual((await mejoraNivelAlto.json()).nivelResultante, 51);
  console.log('OK: mejoras siguen disponibles después del nivel 5');

  // 9. Guardar aldea (simula el "F5" del prototipo) con un edificio nuevo
  const nuevaAldea = {
    ...aldea1.body.aldea,
    recursos: { madera: 50, comida: 20, oro: 0, trigo: 8, harina: 3, pan: 2, hierro: 1 },
    tecnologias: { herramientas: 2, logistica: 1, defensa: 0, planosAntiguos: 0 },
    legado: { coloniasFundadas: 1, reliquias: 2, reliquiasGastadas: 0 },
    ciclo: { segundos: 120, dia: 2 },
    eventoNocturno: { tipo: 'bestias', dia: 2 },
    arbolInvestigacionDesbloqueado: true,
    aldeanos: aldea1.body.aldea.aldeanos.map((aldeano) => ({
      ...aldeano,
      trabajo: 'lenador',
      modoTrabajo: 'manual',
    })),
  };
  const guardado = await put('/api/aldea', nuevaAldea, token);
  assert.strictEqual(guardado.status, 200);
  assert.strictEqual(guardado.body.aldea.recursos.madera, 50);
  assert.strictEqual(guardado.body.aldea.aldeanos[0].trabajo, 'lenador');
  assert.strictEqual(guardado.body.aldea.aldeanos[0].modoTrabajo, 'manual');
  assert.strictEqual(guardado.body.aldea.recursos.harina, 3);
  assert.strictEqual(guardado.body.aldea.tecnologias.herramientas, 2);
  assert.strictEqual(guardado.body.aldea.legado.reliquias, 2);
  assert.strictEqual(guardado.body.aldea.eventoNocturno.tipo, 'bestias');
  assert.strictEqual(guardado.body.aldea.arbolInvestigacionDesbloqueado, true);
  console.log('OK: PUT /api/aldea guarda los cambios');

  const decisionPrueba = {
    anio: 2,
    segundos: 120,
    elegida: 'lenador',
    libre: false,
    opciones: [{
      trabajo: 'lenador',
      puntaje: 0.28,
      factores: { necesidad: 0, saturacion: 0, rasgo: 0.28, contexto: 0, inercia: 0, variedad: 0 },
    }],
  };
  const aldeaConDecision = {
    ...guardado.body.aldea,
    aldeanos: guardado.body.aldea.aldeanos.map((aldeano) => ({
      ...aldeano,
      modoTrabajo: 'automatico',
      decision: decisionPrueba,
    })),
  };
  const guardadoDecision = await put('/api/aldea', aldeaConDecision, token);
  assert.strictEqual(guardadoDecision.status, 200);
  assert.deepStrictEqual(guardadoDecision.body.aldea.aldeanos[0].decision, decisionPrueba);
  const recargadaDecision = await get('/api/aldea', token);
  assert.deepStrictEqual(recargadaDecision.body.aldea.aldeanos[0].decision, decisionPrueba);
  console.log('OK: decision sobrevive al PUT y al GET posterior');

  const tecnologiasExtendidas = {
    ...recargadaDecision.body.aldea,
    tecnologias: { ...recargadaDecision.body.aldea.tecnologias, metalurgia: 1, planosAntiguos: 1 },
    investigaciones: { ...recargadaDecision.body.aldea.investigaciones, metalurgia: true },
  };
  const guardadoTecnologias = await put('/api/aldea', tecnologiasExtendidas, token);
  assert.strictEqual(guardadoTecnologias.status, 200);
  const esperadoTecnologias = guardadoTecnologias.body.aldea.tecnologias;
  assert.strictEqual(esperadoTecnologias.metalurgia, 1);
  assert.strictEqual(esperadoTecnologias.planosAntiguos, 1);
  const documentoTecnologias = await Aldea.findById(guardadoTecnologias.body.aldea._id);
  assert.deepStrictEqual(documentoTecnologias.toJSON().tecnologias, esperadoTecnologias);
  console.log('OK: claves dinámicas sobreviven PUT, Mongo y toJSON');

  const tecnologiasLegacy = {
    ...guardadoTecnologias.body.aldea,
    tecnologias: { herramientas: 0, logistica: 0, defensa: 0, planosAntiguos: 2 },
    investigaciones: { ...guardadoTecnologias.body.aldea.investigaciones, metalurgia: true },
  };
  await put('/api/aldea', tecnologiasLegacy, token);
  const aldeaMigrada = await get('/api/aldea', token);
  assert.strictEqual(aldeaMigrada.body.aldea.tecnologias.metalurgia, 1);
  assert.strictEqual(aldeaMigrada.body.aldea.tecnologias.planosAntiguos, 2);
  assert.strictEqual(aldeaMigrada.body.aldea.investigaciones.metalurgia, true);
  console.log('OK: GET migra Metalurgia legacy y conserva Planos antiguos');

  const tecnologiasInvalidas = {
    ...aldeaMigrada.body.aldea,
    tecnologias: { ...aldeaMigrada.body.aldea.tecnologias, inventada: 1 },
  };
  const rechazadoTecnologia = await put('/api/aldea', tecnologiasInvalidas, token);
  assert.strictEqual(rechazadoTecnologia.status, 400);
  console.log('OK: el esquema rechaza ids de tecnología fuera del catálogo');

  // 10. Intentar robar la aldea de otro usuario (cambiando el campo "usuario") debe ignorarse
  const intentoRobo = { ...nuevaAldea, usuario: '000000000000000000000000' };
  const resRobo = await put('/api/aldea', intentoRobo, token);
  assert.strictEqual(resRobo.body.aldea.usuario, reg.body.usuario.id);
  console.log('OK: no se puede pisar el dueño de la aldea desde el body');

  console.log('\nTODOS LOS TESTS END-TO-END (HTTP real + Mongo en memoria) PASARON ✅');
  await mongod.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error('FALLÓ EL TEST E2E:', err);
  process.exit(1);
});
