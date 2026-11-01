const { EDADES } = require('./villageDefaults');

function asegurarEdad(aldea) {
  if (!aldea) return aldea;
  const id = aldea.edad?.id;
  if (!EDADES[id]) {
    const inicioAnio = Number(aldea.ciclo?.dia ?? 1);
    aldea.edad = {
      id: 'calma',
      numero: 1,
      inicioAnio: Number.isFinite(inicioAnio) && inicioAnio > 0 ? inicioAnio : 1,
      duracionAnios: 10,
    };
  } else {
    aldea.edad.numero = Number.isFinite(Number(aldea.edad.numero)) ? Number(aldea.edad.numero) : 1;
    aldea.edad.inicioAnio = Number.isFinite(Number(aldea.edad.inicioAnio)) ? Number(aldea.edad.inicioAnio) : Number(aldea.ciclo?.dia ?? 1);
    aldea.edad.duracionAnios = Number.isFinite(Number(aldea.edad.duracionAnios)) ? Number(aldea.edad.duracionAnios) : 10;
  }
  if (!Array.isArray(aldea.cronica)) aldea.cronica = [];
  return aldea;
}

function registrarCronica(aldea, entrada) {
  if (!aldea || !entrada) return aldea;
  if (!Array.isArray(aldea.cronica)) aldea.cronica = [];
  const anio = Number(entrada.anio ?? aldea.ciclo?.dia ?? 1);
  const tipo = String(entrada.tipo ?? 'general');
  const texto = String(entrada.texto ?? '').trim();
  if (!texto) return aldea;
  const existe = aldea.cronica.some((item) =>
    Number(item.anio) === anio && String(item.tipo) === tipo && String(item.texto) === texto
  );
  if (existe) return aldea;
  aldea.cronica.push({ anio, tipo, texto });
  if (aldea.cronica.length > 50) aldea.cronica.splice(0, aldea.cronica.length - 50);
  return aldea;
}

module.exports = { asegurarEdad, registrarCronica };
