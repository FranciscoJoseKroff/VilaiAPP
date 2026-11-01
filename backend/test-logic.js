process.env.JWT_SECRET = 'secreto_de_prueba';

const assertNativo = require('assert');
const fallosAssert = [];
const seguro = (operacion, argumentos, mensaje) => {
  try {
    operacion(...argumentos);
  } catch (error) {
    fallosAssert.push(mensaje || error.message);
  }
};
const assert = new Proxy((valor, mensaje) => seguro(assertNativo, [valor, mensaje], mensaje), {
  get: (_objetivo, propiedad) => {
    const metodo = assertNativo[propiedad];
    if (typeof metodo !== 'function') return metodo;
    return (...argumentos) => seguro(metodo.bind(assertNativo), argumentos, argumentos[2]);
  },
});
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const {
  costoSiguienteNivel,
  tiempoSiguienteNivel,
  crearAldeaPorDefecto,
  calcularCapacidades,
  CAPACIDADES_BASE,
  OBJETIVOS_IA,
  TOPE_OBJETIVO,
  ARBOL_INVESTIGACION,
  TIPOS_EDIFICIO,
  RASGOS_ALDEANO,
  ESTACIONES,
  EDADES,
} = require('./src/utils/villageDefaults');
const { estacionEn, multiplicadoresDeEstacion, semillaDe, elegirSiguienteEdad, duracionDeEdad, avanzarEdad, elegirEventoInvierno } = require('./src/utils/tiempo');
const { simularSegundo } = require('./src/utils/gameSimulation');
const { decidirTrabajo, actualizarAgentes } = require('./src/utils/agentBrain');
const { decidir: decidirIA, objetivosDeRecursos } = require('./src/utils/cerebro');
const {
  costoDe,
  efectosActivos,
  nivelDe,
  puedeInvestigar,
  requisitosCumplidos,
  RELIQUIAS,
} = require('./src/utils/investigacion');
const { migrarInvestigacion } = require('./src/utils/migracionInvestigacion');
const { asegurarEdad, registrarCronica } = require('./src/utils/migracionTiempo');
const catalogController = require('./src/controllers/catalogController');
const { aplicarProgresoInactivo } = require('./src/utils/offlineProgress');
const requiereAutenticacion = require('./src/middleware/auth');
const Usuario = require('./src/models/User');
const Aldea = require('./src/models/Village');
const authController = require('./src/controllers/authController');
const villageController = require('./src/controllers/villageController');

function crearAldeaDeVectorIA(caso) {
  const aldeanos = caso.aldeanos || [{ trabajo: 'libre', rasgo: caso.rasgo || 'polivalente' }];
  return {
    recursos: { madera: 0, comida: 0, hierro: 0, pan: 0, ...(caso.recursos || {}) },
    edificios: caso.edificios || [],
    ciclo: { segundos: caso.segundos ?? 10, dia: caso.dia ?? 1 },
    edad: { id: caso.edad || 'calma' },
    eventoNocturno: { tipo: caso.evento || null },
    tecnologias: { defensa: caso.defensa || 0 },
    aldeanos: aldeanos.map((aldeano) => ({ modoTrabajo: 'automatico', ...aldeano })),
  };
}

function crearResFalso() {
  const res = {};
  res.statusCode = 200;
  res.status = (codigo) => { res.statusCode = codigo; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

async function correrTests() {
  // --- 1. Fórmulas procedurales de mejora ---
  const costoNivel1 = costoSiguienteNivel('aserradero', 1);
  assert.strictEqual(costoNivel1.madera, 23); // 20 * 1.15^1
  const costoNivel3 = costoSiguienteNivel('aserradero', 3);
  assert.strictEqual(costoNivel3.madera, Math.round(20 * Math.pow(1.15, 3) * 10) / 10);
  const costoNivel50 = costoSiguienteNivel('aserradero', 50);
  assert(Number.isFinite(costoNivel50.madera) && costoNivel50.madera > costoNivel3.madera);
  const tiempoNivel2 = tiempoSiguienteNivel('aserradero', 2);
  assert.strictEqual(tiempoNivel2, Math.round(3 * Math.pow(1.25, 2) * 10) / 10);
  const resMejoraNivelAlto = crearResFalso();
  catalogController.obtenerCostoMejora(
    { params: { tipoId: 'aserradero', nivelActual: '50' } },
    resMejoraNivelAlto
  );
  assert.strictEqual(resMejoraNivelAlto.statusCode, 200);
  assert.strictEqual(resMejoraNivelAlto.body.nivelResultante, 51);
  console.log('OK: fórmulas de costo/tiempo de mejora');

  const aldeaDefault = crearAldeaPorDefecto('usuario123');
  assert.strictEqual(aldeaDefault.recursos.madera, 20);
  assert.strictEqual(aldeaDefault.recursos.trigo, 0);
  assert.strictEqual(aldeaDefault.aldeanos.length, 1);
  assert.strictEqual(aldeaDefault.poblacionMaxima, 1);
  assert.strictEqual(aldeaDefault.aldeanos[0].modoTrabajo, 'automatico');
  assert.strictEqual(aldeaDefault.tecnologias.metalurgia, 0);
  console.log('OK: crearAldeaPorDefecto');

  const nodosArbol = Object.fromEntries(ARBOL_INVESTIGACION.map((nodo) => [nodo.id, nodo]));
  assert.deepStrictEqual(costoDe(nodosArbol.herramientas, 0), { recursos: { madera: 40, comida: 25 }, reliquias: 0 });
  assert.deepStrictEqual(costoDe(nodosArbol.herramientas, 1), { recursos: { madera: 64, comida: 40 }, reliquias: 0 });
  assert.deepStrictEqual(costoDe(nodosArbol.metalurgia, 0), { recursos: { madera: 60, hierro: 30, pan: 10 }, reliquias: 0 });
  assert.deepStrictEqual(costoDe(nodosArbol.planosAntiguos, 0), { recursos: {}, reliquias: 2 });
  const metalurgiaSinEdificios = requisitosCumplidos({ edificios: [] }, nodosArbol.metalurgia);
  assert.strictEqual(metalurgiaSinEdificios.ok, false);
  assert.deepStrictEqual(metalurgiaSinEdificios.faltantes, [
    'Requiere Centro de Investigación nivel 1.',
    'Requiere Mina nivel 1.',
  ]);
  assert.strictEqual(puedeInvestigar({ tecnologias: { metalurgia: 0 } }, nodosArbol.defensa).ok, false);
  assert.strictEqual(nivelDe({ investigaciones: { metalurgia: true } }, 'metalurgia'), 1);
  assert.strictEqual(puedeInvestigar({ legado: { reliquias: 1 } }, nodosArbol.planosAntiguos).ok, false);
  assert.strictEqual(puedeInvestigar({ legado: { reliquias: 2 } }, nodosArbol.planosAntiguos).ok, true);
  console.log('OK: requisitos y costos mantienen las cinco tecnologías legacy');

  const aldeaAntiguaMetalurgia = {
    tecnologias: { herramientas: 0, logistica: 0, defensa: 0, planosAntiguos: 2 },
    investigaciones: { metalurgia: true },
  };
  migrarInvestigacion(aldeaAntiguaMetalurgia);
  const migradaUnaVez = JSON.stringify(aldeaAntiguaMetalurgia);
  migrarInvestigacion(aldeaAntiguaMetalurgia);
  assert.strictEqual(aldeaAntiguaMetalurgia.tecnologias.metalurgia, 1);
  assert.strictEqual(aldeaAntiguaMetalurgia.tecnologias.planosAntiguos, 2);
  assert.strictEqual(JSON.stringify(aldeaAntiguaMetalurgia), migradaUnaVez);
  const aldeaConMetalurgiaNueva = { tecnologias: { metalurgia: 1 }, investigaciones: { metalurgia: false } };
  migrarInvestigacion(aldeaConMetalurgiaNueva);
  assert.strictEqual(aldeaConMetalurgiaNueva.investigaciones.metalurgia, true);
  console.log('OK: migración de Metalurgia idempotente y bidireccional');

  const casosArbol = JSON.parse(fs.readFileSync('fixtures/arbol-vectores.json', 'utf8'));
  for (const [indice, caso] of casosArbol.entries()) {
    const efectos = efectosActivos({ tecnologias: caso.tecnologias, investigaciones: caso.investigaciones }, ARBOL_INVESTIGACION);
    for (const [tipo, esperado] of Object.entries(caso.esperado)) {
      assert.deepStrictEqual(efectos[tipo], esperado, `efecto ${tipo} del vector ${indice + 1}`);
    }
  }
  console.log(`OK: ${casosArbol.length} vectores de efectos del árbol`);

  let semillaGolden = 0x71a1;
  const aleatorioGolden = () => {
    semillaGolden = (Math.imul(semillaGolden, 1664525) + 1013904223) >>> 0;
    return semillaGolden / 4294967296;
  };
  for (let indiceEstado = 0; indiceEstado < 10000; indiceEstado += 1) {
    const herramientas = Math.floor(aleatorioGolden() * 11);
    const logistica = Math.floor(aleatorioGolden() * 8);
    const defensa = Math.floor(aleatorioGolden() * 13);
    const reliquias = Math.floor(aleatorioGolden() * 6);
    const metalurgia = aleatorioGolden() < 0.5;
    const edificios = [];
    if (aleatorioGolden() < 0.5) {
      edificios.push({ tipoId: 'almacen', nivel: 1 + Math.floor(aleatorioGolden() * 5), integridad: Math.floor(aleatorioGolden() * 101) });
    }
    if (aleatorioGolden() < 0.5) {
      edificios.push({ tipoId: 'granero', nivel: 1 + Math.floor(aleatorioGolden() * 5), integridad: Math.floor(aleatorioGolden() * 101) });
    }
    const estadoGolden = {
      tecnologias: { herramientas, logistica, defensa },
      investigaciones: { metalurgia },
      legado: { reliquias },
      edificios,
    };
    const activos = efectosActivos(estadoGolden, ARBOL_INVESTIGACION);
    const bonoReliquiasEsperado = Math.min(RELIQUIAS.bonoMaximo, reliquias * RELIQUIAS.bonoPorReliquia);
    const produccionActual = (1 + activos.produccionGeneral) * (1 + bonoReliquiasEsperado);
    assert.strictEqual(activos.bonoReliquias, bonoReliquiasEsperado, `bono de reliquias estado ${indiceEstado + 1}`);
    assert(Math.abs(produccionActual - (1 + activos.produccionGeneral) * (1 + activos.bonoReliquias)) < 1e-10, `producción estado ${indiceEstado + 1}`);
    assert.strictEqual(activos.multiplicadorRecurso.hierro || 1, metalurgia ? 1.5 : 1, `metalurgia estado ${indiceEstado + 1}`);

    const capacidadesLegadas = { ...CAPACIDADES_BASE };
    for (const recurso of Object.keys(capacidadesLegadas)) capacidadesLegadas[recurso] += logistica * 100;
    for (const edificio of edificios) {
      const efectosEdificio = TIPOS_EDIFICIO[edificio.tipoId]?.efectoCapacidad || {};
      const eficiencia = Math.max(0, Math.min(1, (edificio.integridad ?? 100) / 100));
      for (const [recurso, porNivel] of Object.entries(efectosEdificio)) {
        capacidadesLegadas[recurso] = (capacidadesLegadas[recurso] || 0)
          + porNivel * (edificio.nivel || 1) * eficiencia;
      }
    }
    const capacidadesActuales = calcularCapacidades(estadoGolden);
    for (const recurso of Object.keys(capacidadesLegadas)) {
      assert(Math.abs(capacidadesActuales[recurso] - capacidadesLegadas[recurso]) < 1e-10, `capacidad ${recurso}, estado ${indiceEstado + 1}`);
    }

    const guardias = Math.floor(aleatorioGolden() * 8);
    const eficaciaGuardia = 0.5 + aleatorioGolden() * 1.5;
    const danoLegado = Math.min(0.8, defensa * 0.1 + guardias * 0.1 * eficaciaGuardia);
    const danoActual = Math.min(0.8, activos.reduccionDanoEventos + guardias * 0.1 * eficaciaGuardia);
    assert(Math.abs(danoActual - danoLegado) < 1e-10, `daño de evento, estado ${indiceEstado + 1}`);
  }
  console.log('OK: bono de reliquias limitado y efectos coinciden en 10.000 estados');

  const efectosConReliquiasDeSobra = efectosActivos({ legado: { reliquias: 100 } }, ARBOL_INVESTIGACION);
  assert.strictEqual(efectosConReliquiasDeSobra.bonoReliquias, RELIQUIAS.bonoMaximo);
  console.log('OK: el bono de reliquias respeta su límite');

  const capacidadesAmpliadas = calcularCapacidades({
    edificios: [{ tipoId: 'granero', nivel: 2 }, { tipoId: 'almacen', nivel: 3 }],
  });
  assert.strictEqual(capacidadesAmpliadas.comida, 1250);
  assert.strictEqual(capacidadesAmpliadas.madera, 1750);
  console.log('OK: granero y almacén amplían su capacidad sin nivel máximo');

  const estadoProduccion = {
    recursos: { madera: 0, comida: 0, oro: 0, trigo: 1, harina: 0, pan: 0, hierro: 0 },
    tasasGeneracion: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    multiplicadores: { generacion: 1 },
    aldeanos: [{ trabajo: 'minero', rasgo: 'minero' }],
    edificios: [{ tipoId: 'molino', nivel: 1 }, { tipoId: 'horno', nivel: 1 }, { tipoId: 'mina', nivel: 1 }],
  };
  simularSegundo(estadoProduccion);
  assert(estadoProduccion.recursos.trigo < 1);
  assert(estadoProduccion.recursos.harina > 0);
  assert(estadoProduccion.recursos.pan > 0);
  assert(estadoProduccion.recursos.hierro > 0);

  const estadoAlAnochecer = {
    recursos: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    tasasGeneracion: { madera: 1, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    multiplicadores: { generacion: 1 },
    tecnologias: {},
    legado: {},
    ciclo: { segundos: 119, dia: 1 },
    eventoNocturno: { tipo: null, dia: 0 },
    aldeanos: [],
    edificios: [],
  };
  simularSegundo(estadoAlAnochecer);
  assert.strictEqual(estadoAlAnochecer.ciclo.segundos, 120);
  assert(['bestias', 'helada', 'recaudador'].includes(estadoAlAnochecer.eventoNocturno.tipo));
  assert.strictEqual(estadoAlAnochecer.recursos.madera, 0.8);
  console.log('OK: anochecer inicia un evento y reduce la producción');

  const vectoresTiempo = JSON.parse(fs.readFileSync('./fixtures/tiempo-vectores.json', 'utf8'));
  for (const vector of vectoresTiempo) {
    if (!vector.recursosEsperados) continue;
    const estacion = estacionEn(vector.segundos);
    const factores = multiplicadoresDeEstacion(estacion.id, ESTACIONES);
    for (const [recurso, esperado] of Object.entries(vector.recursosEsperados)) {
      const actual = factores.general * (factores.recursos[recurso] ?? 1);
      assert(Math.abs(actual - esperado) < 0.0001, `vector estacional incorrecto para ${recurso} en ${vector.segundos}s`);
    }
  }
  console.log('OK: vectores de recursos estacionales pasan en el back');

  for (let i = 0; i < 1000; i += 1) {
    const seed = semillaDe('aldea-determinista');
    assert.strictEqual(elegirSiguienteEdad(seed, 7, 'calma', EDADES), elegirSiguienteEdad(seed, 7, 'calma', EDADES));
    assert.strictEqual(duracionDeEdad(seed, 7, EDADES.hielo), duracionDeEdad(seed, 7, EDADES.hielo));
  }
  console.log('OK: determinismo de edad durante 1000 repeticiones');

  const aldeaEdadCompletada = {
    _id: 'edad-entrega-reliquia',
    ciclo: { dia: 2 },
    edad: { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 1 },
    legado: { reliquias: 0 },
    cronica: [],
  };
  assert.strictEqual(avanzarEdad(aldeaEdadCompletada, EDADES).cambio, true);
  assert.strictEqual(aldeaEdadCompletada.legado.reliquias, RELIQUIAS.porEdad);
  assert.strictEqual(aldeaEdadCompletada.cronica.filter((entrada) => entrada.tipo === 'reliquia').length, 1);
  assert.strictEqual(avanzarEdad(aldeaEdadCompletada, EDADES).cambio, false);
  assert.strictEqual(aldeaEdadCompletada.legado.reliquias, RELIQUIAS.porEdad);
  console.log('OK: completar una edad entrega una reliquia sin duplicarla en la siguiente llamada');

  const minaSinPan = {
    recursos: { madera: 0, comida: 0, oro: 0, trigo: 1, harina: 0, pan: 0, hierro: 0 },
    tasasGeneracion: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    multiplicadores: { generacion: 1 },
    aldeanos: [{ trabajo: 'minero', rasgo: 'minero' }],
    edificios: [{ tipoId: 'mina', nivel: 1 }],
  };
  simularSegundo(minaSinPan);
  assert.strictEqual(minaSinPan.recursos.hierro, 0);
  console.log('OK: la mina requiere pan y la cadena produce hierro');

  const estadoRasgo = {
    recursos: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    tasasGeneracion: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    multiplicadores: { generacion: 1 },
    aldeanos: [{ trabajo: 'lenador', rasgo: 'maderero' }],
    edificios: [],
  };
  simularSegundo(estadoRasgo);
  assert.strictEqual(estadoRasgo.recursos.madera, 0.3);
  console.log('OK: el rasgo de aldeano mejora el oficio correspondiente');

  const agenteInicial = {
    nombre: 'Ana', modoTrabajo: 'automatico', trabajo: 'libre', rasgo: 'maderero',
    pensamientoActual: '', estado: 'buscando_arbol',
  };
  const aldeaAgente = {
    recursos: { madera: 20, comida: 0, hierro: 0, pan: 0 },
    edificios: [], aldeanos: [agenteInicial], ciclo: { segundos: 10, dia: 1 },
    eventoNocturno: { tipo: null }, tecnologias: {},
  };
  const primeraDecision = decidirTrabajo(aldeaAgente, agenteInicial, 0);
  const segundaDecision = decidirTrabajo(aldeaAgente, agenteInicial, 0);
  assert.deepStrictEqual(primeraDecision, segundaDecision, 'la misma situación debe producir la misma decisión');
  assert.strictEqual(primeraDecision.trabajo, 'lenador', 'el rasgo maderero debe inclinar la decisión');
  actualizarAgentes(aldeaAgente);
  assert.strictEqual(agenteInicial.trabajo, 'lenador');
  assert(agenteInicial.pensamientoActual.includes('madera'));
  console.log('OK: el agente elige de forma determinista y explica su decisión');

  const trabajadorManual = { modoTrabajo: 'manual', trabajo: 'agricultor', rasgo: 'maderero' };
  const aldeaManual = {
    recursos: { madera: 0, comida: 0, hierro: 0, pan: 0 },
    edificios: [], aldeanos: [trabajadorManual], ciclo: { segundos: 20, dia: 1 },
    eventoNocturno: { tipo: null }, tecnologias: {},
  };
  actualizarAgentes(aldeaManual);
  assert.strictEqual(trabajadorManual.trabajo, 'agricultor');
  console.log('OK: la decisión autónoma respeta los oficios manuales');

  const agenteDeGuardia = { modoTrabajo: 'automatico', trabajo: 'lenador', rasgo: 'polivalente' };
  const aldeaEnPeligro = {
    recursos: { madera: 100, comida: 80, hierro: 0, pan: 0 },
    edificios: [], aldeanos: [agenteDeGuardia], ciclo: { segundos: 120, dia: 1 },
    eventoNocturno: { tipo: 'bestias' }, tecnologias: { defensa: 1 },
  };
  actualizarAgentes(aldeaEnPeligro);
  assert.strictEqual(agenteDeGuardia.trabajo, 'guardia');
  assert.strictEqual(agenteDeGuardia.estado, 'vigilando');
  console.log('OK: un agente autónomo prioriza la guardia ante un evento nocturno');

  assert.deepStrictEqual(OBJETIVOS_IA, { madera: 0.42, comida: 0.40, hierro: 0.15 });
  assert.strictEqual(TOPE_OBJETIVO, null);
  assert.deepStrictEqual(
    objetivosDeRecursos({ madera: 1750, comida: 750, hierro: 1600 }),
    { madera: 735, comida: 300, hierro: 240 }
  );
  assert.deepStrictEqual(
    objetivosDeRecursos({ madera: 1750, comida: 750, hierro: 1600 }, OBJETIVOS_IA, 80),
    { madera: 80, comida: 80, hierro: 80 }
  );
  console.log('OK: objetivos IA escalan con capacidad y admiten tope opcional');

  const aldeaInercia = {
    recursos: { madera: 0, comida: 100, hierro: 0, pan: 0 },
    edificios: [],
    ciclo: { segundos: 0, dia: 1 },
    tecnologias: {},
    eventoNocturno: { tipo: null },
    aldeanos: [{ _id: 'inercia-estable', nombre: 'Estable', modoTrabajo: 'automatico', trabajo: 'libre', rasgo: 'maderero' }],
  };
  for (let decision = 0; decision < 100; decision += 1) {
    aldeaInercia.ciclo.segundos = (decision * 10) % 180;
    aldeaInercia.ciclo.dia = 1 + Math.floor((decision * 10) / 180);
    actualizarAgentes(aldeaInercia);
    assert.strictEqual(aldeaInercia.aldeanos[0].trabajo, 'lenador', `cambio inesperado en decisión ${decision + 1}`);
  }
  console.log('OK: inercia mantiene el oficio durante 100 decisiones estables');

  const catalogoIA = {
    capacidadesBase: CAPACIDADES_BASE,
    arbol: ARBOL_INVESTIGACION,
    objetivosIA: OBJETIVOS_IA,
    topeObjetivo: TOPE_OBJETIVO,
    tiposEdificio: TIPOS_EDIFICIO,
    rasgosAldeano: RASGOS_ALDEANO,
    edades: EDADES,
    estaciones: ESTACIONES,
  };
  const casosIA = JSON.parse(fs.readFileSync('fixtures/ia-vectores.json', 'utf8'));
  const eleccionesIA = [];
  for (const [indiceCaso, caso] of casosIA.entries()) {
    const aldeaVector = crearAldeaDeVectorIA(caso);
    const indice = caso.indice ?? 0;
    const resultado = decidirIA(aldeaVector, aldeaVector.aldeanos[indice], indice, catalogoIA);
    assert.strictEqual(resultado.eleccion.trabajo, caso.esperado.trabajo, `elección del vector ${indiceCaso + 1}`);
    assert.strictEqual(resultado.eleccion.pensamiento, caso.esperado.pensamiento, `pensamiento del vector ${indiceCaso + 1}`);
    eleccionesIA.push(resultado.eleccion.trabajo);
    for (const opcion of resultado.opciones) {
      const suma = Object.values(opcion.factores).reduce((total, factor) => total + factor, 0);
      assert(Math.abs(suma - opcion.puntaje) <= 0.001, `suma de factores del vector ${indiceCaso + 1}`);
    }
    if (caso.factorContextoEsperado) {
      const opcion = resultado.opciones.find((actual) => actual.trabajo === caso.factorContextoEsperado.trabajo);
      assert.strictEqual(opcion.factores.contexto, caso.factorContextoEsperado.valor);
    }
  }
  for (const grupo of ['diversidad-id', 'diversidad-nombre']) {
    const vectoresDiversidad = casosIA
      .map((caso, indice) => ({ caso, indice }))
      .filter(({ caso }) => caso.grupo === grupo);
    assert.strictEqual(vectoresDiversidad.length, 2);
    assert.notStrictEqual(
      eleccionesIA[vectoresDiversidad[0].indice],
      eleccionesIA[vectoresDiversidad[1].indice],
      `aldeanos equivalentes del grupo ${grupo} deben poder elegir oficios distintos`
    );
  }
  const vectoresEdad = casosIA
    .map((caso, indice) => ({ caso, indice }))
    .filter(({ caso }) => caso.grupo === 'edad-contraste');
  assert.notStrictEqual(
    eleccionesIA[vectoresEdad[0].indice],
    eleccionesIA[vectoresEdad[1].indice],
    'con los mismos recursos, Hielo debe cambiar la elección frente a Calma'
  );
  const aldeaHielo = crearAldeaDeVectorIA(vectoresEdad[1].caso);
  actualizarAgentes(aldeaHielo);
  assert.strictEqual(aldeaHielo.aldeanos[0].pensamientoActual, 'Es la Edad del Hielo; aseguro la cosecha.');
  const opcionAgricultorHielo = aldeaHielo.aldeanos[0].decision.opciones
    .find((opcion) => opcion.trabajo === 'agricultor');
  assert.strictEqual(opcionAgricultorHielo.factores.contexto, 0.15);
  console.log(`OK: ${casosIA.length} vectores de IA y suma de factores`);

  // --- 2. Progreso offline ---
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
  const aldeaFalsa = {
    ultimoGuardado: haceUnaHora,
    multiplicadores: { generacion: 1.5 },
    recursos: { madera: 10, comida: 5, oro: 0 },
    tasasGeneracion: { toObject: () => ({ madera: 0.4, comida: 0.5, oro: 0 }) },
    edificios: [{ tipoId: 'almacen', nivel: 5 }, { tipoId: 'granero', nivel: 5 }],
    ciclo: { segundos: 0, dia: 1 },
    eventoNocturno: { tipo: null, dia: 0 },
    tecnologias: { herramientas: 0, logistica: 0, defensa: 0, planosAntiguos: 0 },
    legado: { reliquias: 0, coloniasFundadas: 0 },
  };
  const ganancias = aplicarProgresoInactivo(aldeaFalsa);
  assert(Math.abs(ganancias.madera - 1957.9) < 30, 'la ganancia offline de madera se mantiene cercana al balance esperado');
  assert(Math.abs(aldeaFalsa.recursos.madera - (10 + 1957.9)) < 30);
  assert.strictEqual(aldeaFalsa.ciclo.dia, 21);
  assert(['bestias', 'helada', 'recaudador'].includes(aldeaFalsa.eventoNocturno.tipo));
  assert(aldeaFalsa.ultimoGuardado > haceUnaHora, 'ultimoGuardado debe actualizarse');
  console.log('OK: progreso offline calcula ganancias y actualiza ultimoGuardado');

  const aldeaConOficios = {
    ultimoGuardado: new Date(Date.now() - 60 * 60 * 1000),
    multiplicadores: { generacion: 1 },
    recursos: { madera: 0, comida: 0, oro: 0 },
    tasasGeneracion: { toObject: () => ({ madera: 0.4, comida: 0.5, oro: 0 }) },
    aldeanos: [
      { trabajo: 'lenador', rasgo: 'maderero' },
      { trabajo: 'agricultor', rasgo: 'hortelano' },
      { trabajo: 'libre', rasgo: 'polivalente' },
    ],
    edificios: [{ tipoId: 'almacen', nivel: 5 }, { tipoId: 'granero', nivel: 5 }],
    ciclo: { segundos: 0, dia: 1 },
    eventoNocturno: { tipo: null, dia: 0 },
    tecnologias: { herramientas: 0, logistica: 0, defensa: 0, planosAntiguos: 0 },
    legado: { reliquias: 0, coloniasFundadas: 0 },
  };
  const gananciasOficios = aplicarProgresoInactivo(aldeaConOficios);
  assert(Math.abs(gananciasOficios.madera - 2089.8) < 50, 'la madera offline con oficios se mantiene en el rango esperado');
  assert(Math.abs(gananciasOficios.comida - 2660) < 10, 'la comida offline con oficios incluye el bono de reliquias');
  console.log('OK: los oficios producen recursos durante el progreso offline');

  const aldeanoOffline = {
    _id: 'aldeano-offline-1',
    nombre: 'Ana',
    modoTrabajo: 'automatico',
    trabajo: 'libre',
    estado: 'buscando_arbol',
    rasgo: 'maderero',
    pensamientoActual: '',
    toObject() {
      return {
        _id: this._id,
        nombre: this.nombre,
        modoTrabajo: this.modoTrabajo,
        trabajo: this.trabajo,
        estado: this.estado,
        rasgo: this.rasgo,
        pensamientoActual: this.pensamientoActual,
        decision: this.decision,
      };
    },
  };
  const aldeaOfflineDecision = {
    ultimoGuardado: new Date(Date.now() - 1500),
    recursos: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    tasasGeneracion: { madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    multiplicadores: { generacion: 1 },
    aldeanos: [aldeanoOffline],
    edificios: [],
    investigaciones: {},
    tecnologias: {},
    legado: {},
    ciclo: { segundos: 9, dia: 1 },
    eventoNocturno: { tipo: null, dia: 0 },
    edad: { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 10 },
    cronica: [],
  };
  aplicarProgresoInactivo(aldeaOfflineDecision);
  assert.strictEqual(aldeanoOffline.trabajo, 'lenador');
  assert.strictEqual(aldeanoOffline.estado, 'talando');
  assert.strictEqual(aldeanoOffline.decision.elegida, 'lenador');
  assert.strictEqual(aldeanoOffline.decision.segundos, 10);
  console.log('OK: trabajo y decision offline se copian al aldeano por _id');

  const aldeaAlmacenLleno = {
    ultimoGuardado: new Date(Date.now() - 60 * 60 * 1000),
    multiplicadores: { generacion: 1 },
    recursos: { madera: 0, comida: 0, oro: 0 },
    tasasGeneracion: { toObject: () => ({ madera: 1, comida: 0, oro: 0 }) },
    aldeanos: [],
    edificios: [],
  };
  const gananciasConTope = aplicarProgresoInactivo(aldeaAlmacenLleno);
  assert.strictEqual(gananciasConTope.madera, 250);
  assert.strictEqual(aldeaAlmacenLleno.recursos.madera, 250);
  console.log('OK: el progreso offline respeta el tope del almacén');

  // Sin tiempo transcurrido no debe romper ni generar negativos
  const aldeaSinTiempo = {
    ultimoGuardado: new Date(),
    multiplicadores: { generacion: 1 },
    recursos: { madera: 0, comida: 0, oro: 0 },
    tasasGeneracion: { toObject: () => ({ madera: 0, comida: 0.5, oro: 0 }) },
  };
  const gananciasVacias = aplicarProgresoInactivo(aldeaSinTiempo);
  assert.deepStrictEqual(
    gananciasVacias,
    {
      resumenOffline: {
        segundosAusente: 0,
        segundosAplicados: 0,
        recursosGenerados: {},
        aldeanosLlegados: 0,
        alcanzoTope8h: false,
      },
    }
  );
  console.log('OK: progreso offline sin tiempo transcurrido no genera nada');

  const aldeaOchoHoras = {
    _id: 'aldea-test-edad', ultimoGuardado: new Date(Date.now() - 8 * 60 * 60 * 1000),
    multiplicadores: { generacion: 1 }, recursos: { madera: 0, comida: 0, oro: 0 },
    tasasGeneracion: { madera: 1, comida: 1, oro: 0 }, aldeanos: [], edificios: [],
    investigaciones: {}, tecnologias: {}, legado: {}, ciclo: { segundos: 0, dia: 1 },
    eventoNocturno: { tipo: null, dia: 0 }, edad: { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 10 },
    cronica: [],
  };
  const resumenOchoHoras = aplicarProgresoInactivo(aldeaOchoHoras).resumenTiempo;
  assert.strictEqual(aldeaOchoHoras.ciclo.dia, 161);
  assert.strictEqual(aldeaOchoHoras.legado.reliquias, resumenOchoHoras.cambios.filter((cambio) => cambio.tipo === 'reliquia').length);
  assert(aldeaOchoHoras.legado.reliquias > 0);
  assert(aldeaOchoHoras.edad?.id);
  assert(aldeaOchoHoras.cronica.length <= 50);
  console.log('OK: 8 h offline producen el año 161, edades y crónica limitada');

  const reliquiasAntesDeRecargar = aldeaOchoHoras.legado.reliquias;
  const cronicaAntesDeRecargar = aldeaOchoHoras.cronica.filter((entrada) => entrada.tipo === 'reliquia').length;
  const aldeaRecargada = JSON.parse(JSON.stringify(aldeaOchoHoras));
  aldeaRecargada.ultimoGuardado = new Date();
  aplicarProgresoInactivo(aldeaRecargada);
  assert.strictEqual(aldeaRecargada.legado.reliquias, reliquiasAntesDeRecargar);
  assert.strictEqual(aldeaRecargada.cronica.filter((entrada) => entrada.tipo === 'reliquia').length, cronicaAntesDeRecargar);
  console.log('OK: recargar la aldea no duplica reliquias ni entradas de crónica');

  const aldeaResumen = {
    ultimoGuardado: new Date(Date.now() - 60 * 60 * 1000), recursos: { madera: 5, comida: 5, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    tasasGeneracion: { madera: 1, comida: 0.5 }, multiplicadores: { generacion: 1 }, aldeanos: [], edificios: [], investigaciones: {},
    tecnologias: {}, legado: {}, ciclo: { segundos: 0, dia: 1 }, eventoNocturno: { tipo: null, dia: 0 },
    edad: { id: 'calma', numero: 1, inicioAnio: 1, duracionAnios: 10 }, cronica: [],
  };
  const resumenGanancias = aplicarProgresoInactivo(aldeaResumen);
  assert(resumenGanancias.resumenTiempo && Number.isFinite(resumenGanancias.resumenTiempo.segundos));
  assert(Array.isArray(resumenGanancias.resumenTiempo.cambios));
  registrarCronica(aldeaResumen, { anio: 12, tipo: 'evento', texto: 'Helada resuelta' });
  registrarCronica(aldeaResumen, { anio: 12, tipo: 'evento', texto: 'Helada resuelta' });
  assert.strictEqual(aldeaResumen.cronica.filter((e) => e.texto === 'Helada resuelta').length, 1);
  console.log('OK: resumen offline y deduplicación de crónica');

  // --- 3. Middleware de autenticación ---
  const tokenValido = jwt.sign({ id: 'usuario123' }, process.env.JWT_SECRET);
  let siguienteLlamado = false;
  const reqAuth = { headers: { authorization: `Bearer ${tokenValido}` } };
  const resAuth = crearResFalso();
  requiereAutenticacion(reqAuth, resAuth, () => { siguienteLlamado = true; });
  assert.strictEqual(siguienteLlamado, true);
  assert.strictEqual(reqAuth.usuarioId, 'usuario123');
  console.log('OK: middleware acepta token válido');

  const resSinToken = crearResFalso();
  requiereAutenticacion({ headers: {} }, resSinToken, () => { throw new Error('no debería llamar next()'); });
  assert.strictEqual(resSinToken.statusCode, 401);
  console.log('OK: middleware rechaza petición sin token');

  const resTokenMalo = crearResFalso();
  requiereAutenticacion({ headers: { authorization: 'Bearer token_invalido' } }, resTokenMalo, () => { throw new Error('no debería llamar next()'); });
  assert.strictEqual(resTokenMalo.statusCode, 401);
  console.log('OK: middleware rechaza token inválido');

  // --- 4. authController.registrar (con modelos mockeados) ---
  Usuario.findOne = async () => null;
  Usuario.create = async (datos) => ({ _id: 'nuevo_usuario', email: datos.email, nombre: datos.nombre });
  Aldea.create = async (datos) => ({ _id: 'nueva_aldea', ...datos });

  const resRegistro = crearResFalso();
  await authController.registrar({ body: { email: 'ana@test.com', password: '123456', nombre: 'Ana' } }, resRegistro);
  assert.strictEqual(resRegistro.statusCode, 201);
  assert(resRegistro.body.token, 'debe devolver un token JWT');
  assert.strictEqual(resRegistro.body.usuario.email, 'ana@test.com');
  console.log('OK: registrar crea usuario + aldea y devuelve token');

  const resRegistroSinPassword = crearResFalso();
  await authController.registrar({ body: { email: 'sin-pass@test.com' } }, resRegistroSinPassword);
  assert.strictEqual(resRegistroSinPassword.statusCode, 400);
  console.log('OK: registrar valida campos obligatorios');

  // --- 5. authController.iniciarSesion ---
  const hashReal = await bcrypt.hash('claveSecreta1', 10);
  Usuario.findOne = async () => ({ _id: 'usuario_existente', email: 'bob@test.com', passwordHash: hashReal });

  const resLoginOk = crearResFalso();
  await authController.iniciarSesion({ body: { email: 'bob@test.com', password: 'claveSecreta1' } }, resLoginOk);
  assert.strictEqual(resLoginOk.statusCode, 200);
  assert(resLoginOk.body.token);
  console.log('OK: login con credenciales correctas devuelve token');

  const resLoginMal = crearResFalso();
  await authController.iniciarSesion({ body: { email: 'bob@test.com', password: 'incorrecta' } }, resLoginMal);
  assert.strictEqual(resLoginMal.statusCode, 401);
  console.log('OK: login con contraseña incorrecta es rechazado');

  // --- 6. villageController.obtenerAldea aplica progreso offline y guarda ---
  let guardados = 0;
  const aldeaExistente = {
    edificios: [],
    ultimoGuardado: new Date(Date.now() - 10 * 60 * 1000), // hace 10 minutos
    multiplicadores: { generacion: 1 },
    recursos: { madera: 0, comida: 0, oro: 0 },
    tasasGeneracion: { toObject: () => ({ madera: 1, comida: 0, oro: 0 }) },
    save: async () => { guardados += 1; },
  };
  Aldea.findOne = async () => aldeaExistente;

  const resObtener = crearResFalso();
  await villageController.obtenerAldea({ usuarioId: 'usuario123' }, resObtener);
  assert.strictEqual(resObtener.statusCode, 200);
  assert(resObtener.body.progresoInactivo.madera > 0, 'debe reportar ganancias offline');
  assert.strictEqual(guardados, 1, 'debe guardar la aldea tras aplicar el progreso');
  console.log('OK: obtenerAldea aplica y persiste el progreso offline');

  const aldeaAntiguaVacia = {
    edificios: [],
    ultimoGuardado: new Date(),
    multiplicadores: { generacion: 1 },
    recursos: { madera: 0, comida: 0, oro: 0 },
    tasasGeneracion: { toObject: () => ({ madera: 0, comida: 0, oro: 0 }) },
    save: async () => {},
  };
  Aldea.findOne = async () => aldeaAntiguaVacia;
  const resAldeaAntigua = crearResFalso();
  await villageController.obtenerAldea({ usuarioId: 'usuario123' }, resAldeaAntigua);
  assert.strictEqual(resAldeaAntigua.body.aldea.recursos.madera, 20);
  console.log('OK: aldea antigua vacía recibe madera inicial para empezar');

  // --- 7. villageController.guardarAldea nunca deja pisar el dueño del documento ---
  let datosRecibidosEnUpdate = null;
  Aldea.findOneAndUpdate = async (filtro, datos) => {
    datosRecibidosEnUpdate = datos;
    return { ...datos, usuario: filtro.usuario };
  };

  const resGuardar = crearResFalso();
  await villageController.guardarAldea(
    { usuarioId: 'usuario123', body: { usuario: 'otro_usuario_hackeado', recursos: { madera: 999, comida: 0, oro: 0 } } },
    resGuardar
  );
  assert.strictEqual(resGuardar.statusCode, 200);
  assert.strictEqual(datosRecibidosEnUpdate.usuario, undefined, 'el campo "usuario" del body debe ignorarse');
  assert.strictEqual(resGuardar.body.aldea.usuario, 'usuario123', 'el dueño real viene del token, no del body');
  console.log('OK: guardarAldea ignora intentos de sobrescribir el dueño del documento');

  // --- 8. Edad, crónica y migración de tiempo ---
  const aldeaConEdad = {
    ciclo: { segundos: 20, dia: 7 },
    edad: { id: 'abundancia', numero: 2, inicioAnio: 3, duracionAnios: 8 },
    cronica: [{ anio: 2, tipo: 'edad', texto: 'Comienza una nueva edad.' }],
  };
  asegurarEdad(aldeaConEdad);
  asegurarEdad(aldeaConEdad);
  assert.strictEqual(aldeaConEdad.edad.id, 'abundancia');
  assert.strictEqual(aldeaConEdad.edad.numero, 2);
  registrarCronica(aldeaConEdad, { anio: 7, tipo: 'estacion', texto: 'Llegó el invierno.' });
  assert.strictEqual(aldeaConEdad.cronica.length, 2);
  for (let indice = 0; indice < 55; indice += 1) registrarCronica(aldeaConEdad, { anio: indice, tipo: 'prueba', texto: 'Entrada' });
  assert.strictEqual(aldeaConEdad.cronica.length, 50);
  console.log('OK: edad y crónica persisten con recorte a 50 entradas');

  const aldeaAntigua = { ciclo: { segundos: 0, dia: 12 } };
  asegurarEdad(aldeaAntigua);
  asegurarEdad(aldeaAntigua);
  assert.deepStrictEqual(aldeaAntigua.edad, { id: 'calma', numero: 1, inicioAnio: 12, duracionAnios: 10 });
  assert.deepStrictEqual(aldeaAntigua.cronica, []);
  console.log('OK: migración idempotente para aldeas antiguas sin edad ni crónica');

  Aldea.findOneAndUpdate = async (filtro, datos) => ({ ...datos.$set, usuario: filtro.usuario });
  const resGuardarTiempo = crearResFalso();
  await villageController.guardarAldea({
    usuarioId: 'usuario123',
    body: {
      edad: { id: 'sombras', numero: 3, inicioAnio: 20, duracionAnios: 7 },
      cronica: [{ anio: 20, tipo: 'edad', texto: 'Llegaron las sombras.' }],
      recursos: { madera: 100, comida: 50, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0 },
    },
  }, resGuardarTiempo);
  assert.strictEqual(resGuardarTiempo.body.aldea.edad.id, 'sombras');
  assert.strictEqual(resGuardarTiempo.body.aldea.cronica[0].texto, 'Llegaron las sombras.');
  console.log('OK: el PUT conserva edad y crónica');

  for (const [edadId, edad] of Object.entries(EDADES)) {
    const conteo = { bestias: 0, helada: 0, recaudador: 0 };
    const pesos = edad.pesosEventos;
    const totalPesos = Object.values(pesos).reduce((suma, peso) => suma + peso, 0);
    for (let ano = 1; ano <= 10000; ano += 1) {
      const tipo = elegirEventoInvierno(semillaDe(`estadistica-${edadId}-${ano}`), ano, pesos);
      conteo[tipo] += 1;
    }
    for (const [tipo, cantidad] of Object.entries(conteo)) {
      const frecuencia = cantidad / 10000;
      const esperada = pesos[tipo] / totalPesos;
      assert(Math.abs(frecuencia - esperada) <= 0.05, `frecuencia de ${tipo} fuera de tolerancia en ${edadId}`);
    }
  }
  console.log('OK: 10.000 años ponderados por edad mantienen las frecuencias esperadas');

  if (fallosAssert.length > 0) {
    console.error(`\n${fallosAssert.length} ASERCIONES FALLARON:`);
    for (const fallo of fallosAssert) console.error(`- ${fallo}`);
  } else {
    console.log('\nTODOS LOS TESTS DE LÓGICA DEL BACKEND PASARON ✅');
  }
}

correrTests().catch((error) => {
  console.error('FALLÓ UN TEST:', error);
  process.exit(1);
}).then(() => {
  if (fallosAssert.length > 0) process.exitCode = 1;
});
