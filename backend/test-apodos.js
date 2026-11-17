const assert = require('node:assert/strict');
const Usuario = require('./src/models/User');
const { APODOS_PROHIBIDOS, validarApodo } = require('./src/utils/apodos');
const { migrarPerfilRanking } = require('./src/utils/migracionPerfilRanking');

for (const apodo of ['Aldea 12', 'Sofía_3', 'Pueblo Feliz']) {
  assert.equal(validarApodo(apodo).valido, true, `debe aceptar ${apodo}`);
}
for (const apodo of ['', 'ab', 'abcdefghijklmnopq', 'sin-guion', 'tab\tulado', 'idiota Feliz']) {
  assert.equal(validarApodo(apodo).valido, false, `debe rechazar ${apodo}`);
}
assert.ok(APODOS_PROHIBIDOS.length > 0);

const usuarioInvalido = new Usuario({
  email: 'apodo-invalido@example.test',
  passwordHash: 'hash',
  apodo: 'mierda',
});
assert.ok(usuarioInvalido.validateSync().errors.apodo);
const usuarioValido = new Usuario({
  email: 'apodo-valido@example.test',
  passwordHash: 'hash',
  apodo: 'Aldea Viva',
});
assert.equal(usuarioValido.validateSync(), undefined);
assert.equal(usuarioValido.rankingVisible, false);

async function verificarMigracion() {
  const argumentos = [];
  const modificados = await migrarPerfilRanking({
    updateMany: async (...entrada) => {
      argumentos.push(entrada);
      return { modifiedCount: 2 };
    },
  });
  assert.equal(modificados, 2);
  assert.deepEqual(argumentos, [[
    { rankingVisible: { $exists: false } },
    { $set: { rankingVisible: false } },
  ]]);
  console.log('Pruebas de apodos: validación, esquema y migración correctos.');
}

verificarMigracion().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
