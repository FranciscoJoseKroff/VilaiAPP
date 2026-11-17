const {
  TIPOS_EDIFICIO,
  TECNOLOGIAS,
  ARBOL_INVESTIGACION,
  RELIQUIAS,
  EVENTOS_NOCTURNOS,
  SEGUNDOS_DIA,
  SEGUNDOS_NOCHE,
  DURACION_INVESTIGACION_SEGUNDOS,
  PRODUCCION_TRABAJADOR,
  RASGOS_ALDEANO,
  CAPACIDADES_BASE,
  OBJETIVOS_IA,
  TOPE_OBJETIVO,
  UMBRAL_POBLACION_BASE,
  FACTOR_CRECIMIENTO_UMBRAL,
  ESTACIONES,
  EDADES,
  LOGROS,
  CICLO_VIDA,
  costoSiguienteNivel,
  tiempoSiguienteNivel,
} = require('../utils/villageDefaults');

// GET /api/catalogo — catálogo estático de edificios + constantes de balance.
function obtenerCatalogo(req, res) {
  res.json({
    tiposEdificio: TIPOS_EDIFICIO,
    tecnologias: TECNOLOGIAS,
    arbol: ARBOL_INVESTIGACION,
    reliquias: RELIQUIAS,
    eventosNocturnos: EVENTOS_NOCTURNOS,
    segundosDia: SEGUNDOS_DIA,
    segundosNoche: SEGUNDOS_NOCHE,
    estaciones: ESTACIONES,
    edades: EDADES,
    logros: LOGROS,
    cicloVida: CICLO_VIDA,
    anioSegundos: 180,
    duracionInvestigacionSegundos: DURACION_INVESTIGACION_SEGUNDOS,
    produccionTrabajador: PRODUCCION_TRABAJADOR,
    rasgosAldeano: RASGOS_ALDEANO,
    capacidadesBase: CAPACIDADES_BASE,
    objetivosIA: OBJETIVOS_IA,
    topeObjetivo: TOPE_OBJETIVO,
    umbralPoblacionBase: UMBRAL_POBLACION_BASE,
    factorCrecimientoUmbral: FACTOR_CRECIMIENTO_UMBRAL,
  });
}

// GET /api/catalogo/:tipoId/mejora/:nivelActual — costo y tiempo para subir
// ese edificio de nivelActual a nivelActual+1. El frontend usa esto para
// mostrar el precio de la mejora sin tener que reimplementar la fórmula.
function obtenerCostoMejora(req, res) {
  const { tipoId, nivelActual } = req.params;
  const nivel = parseInt(nivelActual, 10);

  if (!TIPOS_EDIFICIO[tipoId]) {
    return res.status(404).json({ error: `Tipo de edificio desconocido: ${tipoId}` });
  }
  if (!Number.isSafeInteger(nivel) || nivel < 1) {
    return res.status(400).json({ error: 'nivelActual debe ser un entero mayor o igual a 1' });
  }
  if (TIPOS_EDIFICIO[tipoId].maxNivel != null && nivel >= TIPOS_EDIFICIO[tipoId].maxNivel) {
    return res.status(400).json({ error: `${TIPOS_EDIFICIO[tipoId].nombre} ya alcanzó el nivel máximo (${TIPOS_EDIFICIO[tipoId].maxNivel}).` });
  }

  res.json({
    costo: costoSiguienteNivel(tipoId, nivel),
    tiempoSegundos: tiempoSiguienteNivel(tipoId, nivel),
    nivelResultante: nivel + 1,
  });
}

module.exports = { obtenerCatalogo, obtenerCostoMejora };
