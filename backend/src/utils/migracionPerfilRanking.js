async function migrarPerfilRanking(Usuario) {
  const resultado = await Usuario.updateMany(
    { rankingVisible: { $exists: false } },
    { $set: { rankingVisible: false } }
  );
  return resultado.modifiedCount;
}

module.exports = { migrarPerfilRanking };
