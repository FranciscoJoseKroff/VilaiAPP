const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Aldea = require('./src/models/Village');
const Usuario = require('./src/models/User');
const { migrarMarcaDemo } = require('./src/utils/migracionMarcaDemo');
const { migrarEstadisticas } = require('./src/utils/migracionEstadisticas');
const { migrarPerfilRanking } = require('./src/utils/migracionPerfilRanking');
const { migrarCicloVida } = require('./src/utils/migracionCicloVida');
const { edadInicial, esperanzaDeVida } = require('./src/utils/cicloVida');
const { crearAldeaPorDefecto } = require('./src/utils/villageDefaults');
const { limpiarCacheRanking } = require('./src/controllers/rankingController');

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = 'secreto_e2e';
  process.env.PORT = 4123;

  const { iniciarServidor } = require('./src/server.js');
  await iniciarServidor();

  // Esperar un poco a que conecte y levante el server
  await new Promise((r) => setTimeout(r, 1500));

  const base = 'http://localhost:4123';

  async function post(path, body, token) {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
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
  async function patch(path, body, token) {
    const res = await fetch(base + path, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  const assert = require('assert');

  // 1. Salud
  const salud = await (await fetch(base + '/api/salud')).json();
  assert.strictEqual(salud.estado, 'ok');
  assert.strictEqual(salud.version, require('./package.json').version);
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

  const perfilInvalido = await patch('/api/auth/perfil', { apodo: 'idiota' }, token);
  assert.strictEqual(perfilInvalido.status, 400);
  const registroSinApodo = await post('/api/auth/registro', {
    email: 'sin-apodo@test.com',
    password: '123456',
  });
  assert.strictEqual(registroSinApodo.status, 201);
  const visibilidadSinApodo = await patch('/api/auth/perfil', { rankingVisible: true }, registroSinApodo.body.token);
  assert.strictEqual(visibilidadSinApodo.status, 400);
  const perfil = await patch('/api/auth/perfil', { apodo: 'Aldea Uno', rankingVisible: true }, token);
  assert.strictEqual(perfil.status, 200);
  assert.deepStrictEqual(perfil.body.usuario, { apodo: 'Aldea Uno', rankingVisible: true });
  assert.strictEqual(Object.hasOwn(perfil.body.usuario, 'email'), false);
  assert.strictEqual(Object.hasOwn(perfil.body.usuario, 'id'), false);
  const perfilLeido = await get('/api/auth/perfil', token);
  assert.deepStrictEqual(perfilLeido.body.usuario, { apodo: 'Aldea Uno', rankingVisible: true });
  const usuarioPerfil = await Usuario.findOne({ email: 'francisco@test.com' });
  assert.strictEqual(usuarioPerfil.apodo, 'Aldea Uno');
  assert.strictEqual(usuarioPerfil.rankingVisible, true);
  const apodoRepetido = await patch('/api/auth/perfil', { apodo: 'Aldea Dos' }, token);
  assert.strictEqual(apodoRepetido.status, 429);

  const segundoRegistro = await post('/api/auth/registro', {
    email: 'segunda@test.com',
    password: '123456',
    apodo: 'Aldea Dos',
  });
  assert.strictEqual(segundoRegistro.status, 201);
  assert.strictEqual(segundoRegistro.body.usuario.apodo, 'Aldea Dos');
  assert.strictEqual(segundoRegistro.body.usuario.rankingVisible, false);
  const apodoDuplicado = await patch('/api/auth/perfil', { apodo: 'aldea uno' }, segundoRegistro.body.token);
  assert.strictEqual(apodoDuplicado.status, 409);

  await Usuario.updateOne({ _id: usuarioPerfil._id }, { $unset: { rankingVisible: 1 } });
  assert.strictEqual(await migrarPerfilRanking(Usuario), 1);
  assert.strictEqual(await migrarPerfilRanking(Usuario), 0);
  assert.strictEqual((await Usuario.findById(usuarioPerfil._id)).rankingVisible, false);
  console.log('OK: perfil valida apodos, aplica unicidad insensible a mayúsculas y limita cambios diarios');
  console.log('OK: perfil persiste y migra la visibilidad sin exponer datos personales');

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
  assert(aldea1.body.aldea.aldeanos[0].edadAnios >= 15 && aldea1.body.aldea.aldeanos[0].edadAnios <= 40);
  assert(aldea1.body.aldea.aldeanos[0].esperanza >= 62 && aldea1.body.aldea.aldeanos[0].esperanza <= 82);
  assert.strictEqual(aldea1.body.aldea.legado.reliquias, 0);
  assert.strictEqual(aldea1.body.aldea.arbolInvestigacionDesbloqueado, false);
  console.log('OK: GET /api/aldea crea la aldea inicial con un aldeano');

  const partidaParaImportar = {
    ...aldea1.body.aldea,
    usuario: 'dato-privado-que-no-debe-importarse@example.test',
  };
  const importacionCorrecta = await post('/api/aldea/importar', { aldea: partidaParaImportar }, segundoRegistro.body.token);
  assert.strictEqual(importacionCorrecta.status, 200);
  assert.strictEqual(importacionCorrecta.body.aldea.marcaDemo, true);
  assert.strictEqual(Object.hasOwn(importacionCorrecta.body.aldea, 'usuario'), false);
  assert.strictEqual(importacionCorrecta.body.aldea.aldeanos[0].nombre, 'Francisco');
  const partidaConEnumInvalido = {
    ...partidaParaImportar,
    aldeanos: partidaParaImportar.aldeanos.map((aldeano, indice) => (
      indice === 0 ? { ...aldeano, estado: 'estado-inventado' } : aldeano
    )),
  };
  const importacionRechazada = await post('/api/aldea/importar', { aldea: partidaConEnumInvalido }, segundoRegistro.body.token);
  assert.strictEqual(importacionRechazada.status, 400);
  assert.match(importacionRechazada.body.detalle, /estado-inventado/);
  console.log('OK: importación valida enums, reemplaza la partida y la marca como demo');

  // 6. Sin token debe rechazar
  const sinToken = await fetch(base + '/api/aldea');
  assert.strictEqual(sinToken.status, 401);
  console.log('OK: /api/aldea sin token devuelve 401');

  // 7. Catálogo de edificios
  const catalogo = await (await fetch(base + '/api/catalogo')).json();
  assert.deepStrictEqual(catalogo.cicloVida, { ninez: 6, vejez: 50, esperanza: [62, 82] });
  assert.strictEqual(catalogo.logros.length, 12);
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
  assert.equal(catalogo.tiposEdificio.taberna.efectoProduccionGeneral, 0.02);
  assert.equal(catalogo.tiposEdificio.biblioteca.efectoVelocidadInvestigacion, 0.05);
  assert.equal(catalogo.tiposEdificio.torreVigilancia.avisoEventoSegundos, 10);
  assert.equal(catalogo.eventosNocturnos.incendio.dano, 28);
  assert.deepStrictEqual(catalogo.eventosNocturnos.incendio.edificiosObjetivo, ['aserradero', 'casa', 'granero']);
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
    ciclo: { segundos: 0, dia: 2 },
    eventoNocturno: { tipo: null, dia: 0 },
    eventoPrevisto: { tipo: 'incendio', dia: 2, segundosRestantes: 10 },
    investigacionEnCurso: { id: 'logistica', nivelObjetivo: 2, progresoSegundos: 12 },
    edificios: [
      { tipoId: 'centroInvestigacion', nivel: 2, x: 5, y: 10, completo: true, integridad: 100 },
      { tipoId: 'taberna', nivel: 2, x: 10, y: 10, completo: true, integridad: 100 },
      { tipoId: 'biblioteca', nivel: 1, x: 20, y: 10, completo: true, integridad: 100 },
      { tipoId: 'torreVigilancia', nivel: 1, x: 30, y: 10, completo: true, integridad: 100 },
    ],
    arbolInvestigacionDesbloqueado: true,
    aldeanos: aldea1.body.aldea.aldeanos.map((aldeano) => ({
      ...aldeano,
      trabajo: 'lenador',
      modoTrabajo: 'manual',
      rasgo: 'guardian',
    })),
  };
  const guardado = await put('/api/aldea', nuevaAldea, token);
  assert.strictEqual(guardado.status, 200);
  assert.strictEqual(guardado.body.aldea.recursos.madera, 50);
  assert.strictEqual(guardado.body.aldea.aldeanos[0].trabajo, 'lenador');
  assert.strictEqual(guardado.body.aldea.aldeanos[0].edadAnios, aldea1.body.aldea.aldeanos[0].edadAnios);
  assert.strictEqual(guardado.body.aldea.aldeanos[0].esperanza, aldea1.body.aldea.aldeanos[0].esperanza);
  assert.strictEqual(guardado.body.aldea.aldeanos[0].modoTrabajo, 'manual');
  assert.strictEqual(guardado.body.aldea.recursos.harina, 3);
  assert.strictEqual(guardado.body.aldea.tecnologias.herramientas, 2);
  assert.strictEqual(guardado.body.aldea.legado.reliquias, 2);
  assert.strictEqual(guardado.body.aldea.eventoNocturno.tipo, null);
  assert.strictEqual(guardado.body.aldea.eventoPrevisto.tipo, 'incendio');
  assert.strictEqual(guardado.body.aldea.investigacionEnCurso.id, 'logistica');
  assert.deepStrictEqual(guardado.body.aldea.edificios.map((edificio) => edificio.tipoId), ['centroInvestigacion', 'taberna', 'biblioteca', 'torreVigilancia']);
  assert.strictEqual(guardado.body.aldea.aldeanos[0].rasgo, 'guardian');
  assert.strictEqual(guardado.body.aldea.arbolInvestigacionDesbloqueado, true);
  const aldeaRecargada = await get('/api/aldea', token);
  assert.strictEqual(aldeaRecargada.body.aldea.eventoPrevisto.tipo, 'incendio');
  assert.strictEqual(aldeaRecargada.body.aldea.investigacionEnCurso.id, 'logistica');
  assert.deepStrictEqual(aldeaRecargada.body.aldea.edificios.map((edificio) => edificio.tipoId), ['centroInvestigacion', 'taberna', 'biblioteca', 'torreVigilancia']);
  assert.strictEqual(aldeaRecargada.body.aldea.aldeanos[0].rasgo, 'guardian');
  const aldeaSospechosa = await Aldea.findOne({ usuario: reg.body.usuario.id }).select('+sospechosa');
  assert.equal(aldeaSospechosa.sospechosa, true);
  console.log('OK: PUT /api/aldea guarda los cambios');

  const avanceExcesivo = await put('/api/aldea', {
    ...guardado.body.aldea,
    ciclo: { ...guardado.body.aldea.ciclo, dia: guardado.body.aldea.ciclo.dia + 3 },
  }, token);
  assert.strictEqual(avanceExcesivo.status, 400);
  assert.match(avanceExcesivo.body.error, /ritmo permitido/);
  const recursosExcesivos = await put('/api/aldea', {
    ...guardado.body.aldea,
    recursos: { ...guardado.body.aldea.recursos, madera: 500 },
  }, token);
  assert.strictEqual(recursosExcesivos.status, 400);
  assert.match(recursosExcesivos.body.error, /capacidad actual/);
  console.log('OK: anti-trampas rechaza avances de años y recursos fuera de capacidad');

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

  const escenarioSinToken = await post('/api/aldea/escenario', { escenario: 'aldea-viva' });
  assert.strictEqual(escenarioSinToken.status, 401);
  const escenarioInvalido = await post('/api/aldea/escenario', { escenario: '__proto__' }, token);
  assert.strictEqual(escenarioInvalido.status, 400);
  const escenarioVivo = await post('/api/aldea/escenario', { escenario: 'aldea-viva' }, token);
  assert.strictEqual(escenarioVivo.status, 200);
  assert.strictEqual(escenarioVivo.body.aldea.marcaDemo, true);
  assert.strictEqual(escenarioVivo.body.aldea._id, aldeaMigrada.body.aldea._id);
  assert.strictEqual(escenarioVivo.body.aldea.ciclo.dia, 25);
  assert.strictEqual(escenarioVivo.body.aldea.aldeanos.length, 8);
  const escenarioInvierno = await post('/api/aldea/escenario', { escenario: 'invierno-helada' }, token);
  assert.strictEqual(escenarioInvierno.status, 200);
  assert.strictEqual(escenarioInvierno.body.aldea.ciclo.segundos, 105);
  const escenarioEdad = await post('/api/aldea/escenario', { escenario: 'cambio-de-edad' }, token);
  assert.strictEqual(escenarioEdad.status, 200);
  assert.strictEqual(escenarioEdad.body.aldea.marcaDemo, true);
  const escenarioCuarto = await post('/api/aldea/escenario', { escenario: 'aldea-viva' }, token);
  assert.strictEqual(escenarioCuarto.status, 200);
  const escenarioQuinto = await post('/api/aldea/escenario', { escenario: 'invierno-helada' }, token);
  assert.strictEqual(escenarioQuinto.status, 429);
  const escenarioPersistido = await get('/api/aldea', token);
  assert.strictEqual(escenarioPersistido.body.aldea.marcaDemo, true);
  assert.strictEqual(escenarioPersistido.body.aldea.ciclo.dia, 25);
  console.log('OK: POST /api/aldea/escenario autentica, valida, reemplaza, persiste y limita a cinco por minuto');

  const marcaDemoGuardada = await put('/api/aldea', {
    ...escenarioPersistido.body.aldea,
    marcaDemo: true,
    estadisticas: {
      serie: [{ a: 25, r: { madera: 40, comida: 30, hierro: 20, oro: 10 }, p: 8, e: 'calma' }],
      contadores: {
        eventosDefendidos: 2,
        eventosAceptados: 1,
        edificiosConstruidos: 3,
        aldeanosLlegados: 4,
        investigacionesCompletas: 5,
      },
    },
  }, token);
  assert.strictEqual(marcaDemoGuardada.status, 200);
  assert.strictEqual(marcaDemoGuardada.body.aldea.marcaDemo, true);
  assert.deepStrictEqual(marcaDemoGuardada.body.aldea.estadisticas.serie[0], {
    a: 25, r: { madera: 40, comida: 30, hierro: 20, oro: 10 }, p: 8, e: 'calma',
  });
  assert.strictEqual(marcaDemoGuardada.body.aldea.estadisticas.contadores.eventosDefendidos, 2);
  const marcaDemoRecargada = await get('/api/aldea', token);
  assert.strictEqual(marcaDemoRecargada.body.aldea.marcaDemo, true);
  assert.deepStrictEqual(marcaDemoRecargada.body.aldea.estadisticas.serie[0], marcaDemoGuardada.body.aldea.estadisticas.serie[0]);
  assert.strictEqual(marcaDemoRecargada.body.aldea.estadisticas.contadores.investigacionesCompletas, 5);
  console.log('OK: PUT /api/aldea guarda y recarga marcaDemo y estadísticas con estado 200');

  const demoSegundo = await post('/api/aldea/marca-demo', {}, segundoRegistro.body.token);
  assert.strictEqual(demoSegundo.status, 200);
  const aldeaSegundo = await get('/api/aldea', segundoRegistro.body.token);
  const intentoDesmarcarDemo = await put('/api/aldea', {
    ...aldeaSegundo.body.aldea,
    marcaDemo: false,
  }, segundoRegistro.body.token);
  assert.strictEqual(intentoDesmarcarDemo.status, 200);
  assert.strictEqual(intentoDesmarcarDemo.body.aldea.marcaDemo, true);
  console.log('OK: la marca demo solo se activa en el servidor y no se puede quitar desde PUT');

  const tercerRegistro = await post('/api/auth/registro', {
    email: 'ranking@test.com',
    password: '123456',
    apodo: 'Aldea Ranking',
  });
  assert.strictEqual(tercerRegistro.status, 201);
  await patch('/api/auth/perfil', { rankingVisible: true }, tercerRegistro.body.token);
  const aldeaRankingGuardada = await get('/api/aldea', tercerRegistro.body.token);
  const intentoMarcarDemo = await put('/api/aldea', {
    ...aldeaRankingGuardada.body.aldea,
    marcaDemo: true,
  }, tercerRegistro.body.token);
  assert.strictEqual(intentoMarcarDemo.body.aldea.marcaDemo, false);
  const aldeaRanking = await Aldea.findOneAndUpdate(
    { usuario: tercerRegistro.body.usuario.id },
    { $set: { ciclo: { segundos: 0, dia: 3 } } },
    { new: true }
  );

  for (let indice = 0; indice < 21; indice += 1) {
    const apodo = `Jugador ${String(indice).padStart(2, '0')}`;
    const usuarioRanking = await Usuario.create({
      email: `ranking-${indice}@test.com`,
      passwordHash: 'hash-de-prueba',
      apodo,
      rankingVisible: true,
    });
    const aldeaPuntuada = crearAldeaPorDefecto(usuarioRanking._id);
    aldeaPuntuada.ciclo = { segundos: 0, dia: 100 - indice };
    aldeaPuntuada.poblacionRanking = indice + 1;
    await Aldea.create(aldeaPuntuada);
  }
  const usuarioDemoRanking = await Usuario.create({
    email: 'demo-ranking@test.com',
    passwordHash: 'hash-de-prueba',
    apodo: 'Demo Oculto',
    rankingVisible: true,
  });
  const aldeaDemoRanking = crearAldeaPorDefecto(usuarioDemoRanking._id);
  aldeaDemoRanking.marcaDemo = true;
  aldeaDemoRanking.ciclo.dia = 1000;
  await Aldea.create(aldeaDemoRanking);
  const usuarioSospechoso = await Usuario.create({
    email: 'sospechoso@test.com',
    passwordHash: 'hash-de-prueba',
    apodo: 'Sospechoso',
    rankingVisible: true,
  });
  const aldeaSospechosaRanking = crearAldeaPorDefecto(usuarioSospechoso._id);
  aldeaSospechosaRanking.sospechosa = true;
  aldeaSospechosaRanking.ciclo.dia = 2000;
  await Aldea.create(aldeaSospechosaRanking);

  limpiarCacheRanking();
  const rankingInicial = await get('/api/ranking?tipo=anios', tercerRegistro.body.token);
  assert.strictEqual(rankingInicial.status, 200);
  assert.strictEqual(rankingInicial.body.filas.length, 20);
  assert.strictEqual(rankingInicial.body.tuPosicion.posicion, 22);
  assert(!rankingInicial.body.filas.some((fila) => ['Demo Oculto', 'Sospechoso'].includes(fila.apodo)));
  assert(!JSON.stringify(rankingInicial.body).includes('@test.com'));
  for (const fila of rankingInicial.body.filas) {
    assert.deepStrictEqual(Object.keys(fila).sort(), ['apodo', 'edad', 'posicion', 'valor']);
  }
  const aldeaRankingActualizada = { ...aldeaRanking.toObject(), ciclo: { segundos: 0, dia: 999 } };
  await Aldea.updateOne({ usuario: tercerRegistro.body.usuario.id }, { $set: { ciclo: aldeaRankingActualizada.ciclo } });
  const rankingCacheado = await get('/api/ranking?tipo=anios', tercerRegistro.body.token);
  assert.strictEqual(rankingCacheado.body.tuPosicion.posicion, 22);
  limpiarCacheRanking();
  const rankingActualizado = await get('/api/ranking?tipo=anios', tercerRegistro.body.token);
  assert.strictEqual(rankingActualizado.body.tuPosicion.posicion, 1);
  const rankingPoblacion = await get('/api/ranking?tipo=poblacion', tercerRegistro.body.token);
  assert(rankingPoblacion.body.filas[0].valor > rankingPoblacion.body.filas[1].valor);
  const rankingInvalido = await get('/api/ranking?tipo=correo', tercerRegistro.body.token);
  assert.strictEqual(rankingInvalido.status, 400);
  const rankingPrivado = await get('/api/ranking?tipo=anios', segundoRegistro.body.token);
  assert.strictEqual(rankingPrivado.body.tuPosicion, null);
  assert(!rankingPrivado.body.filas.some((fila) => fila.apodo === 'Aldea Dos'));
  console.log('OK: ranking autentica, limita resultados, respeta privacidad/demo/sospecha y usa caché de 30 s');

  const aldeaLegada = await Aldea.create({ usuario: new mongoose.Types.ObjectId() });
  await Aldea.updateOne({ _id: aldeaLegada._id }, { $unset: { marcaDemo: 1 } });
  assert.strictEqual(await migrarMarcaDemo(Aldea), 1);
  const aldeaDemoMigrada = await Aldea.findById(aldeaLegada._id);
  assert.strictEqual(aldeaDemoMigrada.marcaDemo, false);
  assert.strictEqual(await migrarMarcaDemo(Aldea), 0);
  console.log('OK: migración de marcaDemo rellena documentos existentes y es idempotente');

  const aldeaVidaAntigua = await Aldea.create({
    usuario: new mongoose.Types.ObjectId(),
    aldeanos: [{ nombre: 'Legacy', x: 10, y: 20 }],
  });
  await Aldea.updateOne(
    { _id: aldeaVidaAntigua._id },
    {
      $unset: {
        'aldeanos.$[].edadAnios': 1,
        'aldeanos.$[].esperanza': 1,
        'aldeanos.$[].familiaId': 1,
        'aldeanos.$[].dueloAniosRestantes': 1,
        'legado.generaciones': 1,
      },
    }
  );
  assert.strictEqual(await migrarCicloVida(Aldea), 1);
  const aldeaVidaMigrada = await Aldea.findById(aldeaVidaAntigua._id);
  const identidadAldea = aldeaVidaMigrada.toObject();
  const identidadAldeano = identidadAldea.aldeanos[0];
  assert.strictEqual(identidadAldeano.edadAnios, edadInicial(identidadAldea, identidadAldeano, 0));
  assert.strictEqual(identidadAldeano.esperanza, esperanzaDeVida(identidadAldea, identidadAldeano, 0));
  assert(identidadAldeano.edadAnios >= 15 && identidadAldeano.edadAnios <= 40);
  assert(identidadAldeano.esperanza >= 62 && identidadAldeano.esperanza <= 82);
  assert.strictEqual(identidadAldeano.edad, identidadAldeano.edadAnios);
  assert(identidadAldeano.familiaId);
  assert.strictEqual(identidadAldeano.dueloAniosRestantes, 0);
  assert.strictEqual(identidadAldea.legado.generaciones, 0);
  assert.strictEqual(await migrarCicloVida(Aldea), 0);
  console.log('OK: migración de edadAnios/esperanza es determinista, guarda y es idempotente');

  const aldeaEstadisticasAntigua = await Aldea.create({ usuario: new mongoose.Types.ObjectId() });
  await Aldea.updateOne({ _id: aldeaEstadisticasAntigua._id }, { $unset: { estadisticas: 1 } });
  assert.strictEqual(await migrarEstadisticas(Aldea), 1);
  const aldeaEstadisticasMigrada = await Aldea.findById(aldeaEstadisticasAntigua._id);
  assert.deepStrictEqual(aldeaEstadisticasMigrada.estadisticas.serie, []);
  assert.strictEqual(aldeaEstadisticasMigrada.estadisticas.contadores.eventosDefendidos, 0);
  assert.strictEqual(await migrarEstadisticas(Aldea), 0);
  console.log('OK: migración de estadísticas inicializa los datos legacy y es idempotente');

  console.log('\nTODOS LOS TESTS END-TO-END (HTTP real + Mongo en memoria) PASARON ✅');
  await mongod.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error('FALLÓ EL TEST E2E:', err);
  process.exit(1);
});
