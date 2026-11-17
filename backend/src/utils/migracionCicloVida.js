const { asegurarAldeaVida } = require('./cicloVida');

async function migrarCicloVida(Aldea) {
  const aldeas = await Aldea.find({
    $or: [
      { 'legado.generaciones': { $exists: false } },
      {
        aldeanos: {
          $elemMatch: {
            $or: [
              { edadAnios: { $exists: false } },
              { esperanza: { $exists: false } },
              { familiaId: { $exists: false } },
              { dueloAniosRestantes: { $exists: false } },
            ],
          },
        },
      },
    ],
  });
  let modificadas = 0;
  for (const aldea of aldeas) {
    aldea.aldeanos = asegurarAldeaVida(aldea.toObject()).aldeanos;
    aldea.legado.generaciones = Number(aldea.legado.generaciones || 0);
    await aldea.save();
    modificadas += 1;
  }
  return modificadas;
}

module.exports = { migrarCicloVida };
