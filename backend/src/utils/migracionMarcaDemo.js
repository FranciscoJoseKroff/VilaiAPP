async function migrarMarcaDemo(Aldea) {
  const resultado = await Aldea.updateMany(
    { marcaDemo: { $exists: false } },
    { $set: { marcaDemo: false } }
  );
  return resultado.modifiedCount;
}

module.exports = { migrarMarcaDemo };
