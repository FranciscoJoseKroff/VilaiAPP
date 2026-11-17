import test from 'node:test';
import assert from 'node:assert/strict';
import { exportarPartida, TAMANO_MAXIMO_PARTIDA, validarPartida } from './copiaPartida.js';

const catalogo = {
  capacidadesBase: { madera: 250, comida: 250, hierro: 100, oro: 100 },
  arbol: [{ id: 'herramientas' }],
  tiposEdificio: { aserradero: { maxNivel: 5 } },
};

function crearAldea() {
  return {
    usuario: 'correo-personal@example.test',
    _id: 'interno',
    marcaDemo: false,
    recursos: { madera: 100, comida: 80, hierro: 0, oro: 0 },
    aldeanos: [{ nombre: 'Ana', trabajo: 'libre', estado: 'buscando_arbol', rasgo: 'polivalente' }],
    edificios: [],
    ciclo: { dia: 12, segundos: 65 },
    edad: { id: 'calma', numero: 1 },
    tecnologias: { herramientas: 1 },
    eventoNocturno: { tipo: null, dia: 0 },
    eventoPrevisto: { tipo: null, dia: 0, segundosRestantes: 0 },
    estadisticas: { serie: [] },
  };
}

test('la partida exportada se valida sin cambios de estado y excluye datos privados', () => {
  const aldea = crearAldea();
  const copia = validarPartida(exportarPartida(aldea), catalogo);
  const esperada = { ...aldea };
  delete esperada.usuario;
  delete esperada._id;
  delete esperada.marcaDemo;
  assert.deepEqual(copia, esperada);
  assert.equal(JSON.stringify(copia).includes('correo-personal'), false);
  assert.equal(JSON.stringify(copia).includes('interno'), false);
});

test('rechaza enums inválidos con un mensaje identificable', () => {
  const aldea = crearAldea();
  aldea.aldeanos[0].estado = 'estado-inventado';
  assert.throws(
    () => validarPartida(exportarPartida(aldea), catalogo),
    /estado-inventado.*aldeano 1.*no es válido/,
  );
});

test('rechaza archivos mayores de 1 MB y recursos fuera de capacidad', () => {
  assert.throws(() => validarPartida(' '.repeat(TAMANO_MAXIMO_PARTIDA + 1), catalogo), /supera el límite de 1 MB/);
  const aldea = crearAldea();
  aldea.recursos.madera = 251;
  assert.throws(() => validarPartida(exportarPartida(aldea), catalogo), /madera supera la capacidad/);
});
