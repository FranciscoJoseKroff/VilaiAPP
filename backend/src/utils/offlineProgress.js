const TOPE_SEGUNDOS_OFFLINE = 8 * 60 * 60; // máximo 8 horas de progreso acumulado sin abrir la app
const { simularSegundo } = require('./gameSimulation');
const { EDADES } = require('./villageDefaults');
const { asegurarEstadisticas } = require('./migracionEstadisticas');
const { aplicarLogros } = require('./logros');
const { LOGROS } = require('./villageDefaults');

function aObjeto(valor) {
  return valor && typeof valor.toObject === 'function' ? valor.toObject() : valor || {};
}

/**
 * Suma a los recursos de la aldea lo que se habría generado desde el último
 * guardado hasta ahora, respetando el multiplicador de generación.
 * Devuelve un resumen de cuánto ganó el jugador, útil para mostrar un
 * mensaje tipo "¡Mientras no jugabas ganaste 120 madera!" en el frontend.
 */
function aplicarProgresoInactivo(aldea) {
  const ahora = new Date();
  const segundosTranscurridos = Math.max(0, (ahora - new Date(aldea.ultimoGuardado)) / 1000);
  const segundosAplicados = Math.min(segundosTranscurridos, TOPE_SEGUNDOS_OFFLINE);

  const recursosIniciales = aObjeto(aldea.recursos);
  const cicloInicial = aObjeto(aldea.ciclo);
  const edadInicialId = aldea.edad?.id || 'calma';
  const cronicaInicial = (aldea.cronica || []).map(aObjeto);
  const estado = {
    _id: aldea._id,
    id: aldea.id,
    edad: aObjeto(aldea.edad),
    cronica: (aldea.cronica || []).map(aObjeto),
    recursos: { ...recursosIniciales },
    tasasGeneracion: aObjeto(aldea.tasasGeneracion),
    multiplicadores: aObjeto(aldea.multiplicadores),
    aldeanos: (aldea.aldeanos || []).map(aObjeto),
    edificios: (aldea.edificios || []).map(aObjeto),
    investigaciones: aObjeto(aldea.investigaciones),
    tecnologias: aObjeto(aldea.tecnologias),
    legado: aObjeto(aldea.legado),
    poblacionMaxima: aldea.poblacionMaxima,
    ciclo: aObjeto(aldea.ciclo),
    eventoNocturno: aObjeto(aldea.eventoNocturno),
    eventoPrevisto: aObjeto(aldea.eventoPrevisto),
    investigacionEnCurso: aObjeto(aldea.investigacionEnCurso),
    estadisticas: aObjeto(aldea.estadisticas),
    logros: (aldea.logros || []).map(aObjeto),
  };

  if (segundosAplicados > 0) {
    let restante = segundosAplicados;
    while (restante > 0) {
      const duracion = Math.min(1, restante);
      simularSegundo(estado, duracion);
      restante -= duracion;
    }
  }

  const ganancias = {};
  for (const recurso of new Set([...Object.keys(recursosIniciales), ...Object.keys(estado.recursos)])) {
    const ganancia = Math.round(((estado.recursos[recurso] || 0) - (recursosIniciales[recurso] || 0)) * 10) / 10;
    aldea.recursos[recurso] = estado.recursos[recurso] || 0;
    if (ganancia > 0) ganancias[recurso] = ganancia;
  }
  if (aldea.ciclo) {
    aldea.ciclo.segundos = estado.ciclo.segundos;
    aldea.ciclo.dia = estado.ciclo.dia;
  }
  if (aldea.eventoNocturno) {
    aldea.eventoNocturno.tipo = estado.eventoNocturno.tipo;
    aldea.eventoNocturno.dia = estado.eventoNocturno.dia;
  }
  aldea.eventoPrevisto = {
    tipo: estado.eventoPrevisto?.tipo || null,
    dia: estado.eventoPrevisto?.dia || 0,
    segundosRestantes: estado.eventoPrevisto?.segundosRestantes || 0,
  };
  aldea.investigacionEnCurso = { ...estado.investigacionEnCurso };
  const aldeanosGuardados = [];
  for (const [indice, actualizado] of (estado.aldeanos || []).entries()) {
    const clave = actualizado._id != null
      ? `mongo:${actualizado._id}`
      : actualizado.id != null
        ? `id:${actualizado.id}`
        : `indice:${indice}`;
    const aldeano = (aldea.aldeanos || []).find((anterior, indiceAnterior) => (
      (anterior._id != null
        ? `mongo:${anterior._id}`
        : anterior.id != null
          ? `id:${anterior.id}`
          : `indice:${indiceAnterior}`) === clave
    ));
    if (!aldeano) {
      const { id, ...nuevoAldeano } = actualizado;
      aldeanosGuardados.push(nuevoAldeano);
      continue;
    }
    aldeano.trabajo = actualizado.trabajo;
    aldeano.estado = actualizado.estado;
    aldeano.pensamientoActual = actualizado.pensamientoActual;
    aldeano.decision = actualizado.decision;
    aldeano.edad = actualizado.edad;
    aldeano.edadAnios = actualizado.edadAnios;
    aldeano.esperanza = actualizado.esperanza;
    aldeano.rasgo = actualizado.rasgo;
    aldeano.familiaId = actualizado.familiaId;
    aldeano.dueloAniosRestantes = actualizado.dueloAniosRestantes;
    aldeanosGuardados.push(aldeano);
  }
  aldea.aldeanos = aldeanosGuardados;
  aldea.legado = { ...estado.legado };
  aldea.edad = { ...estado.edad };
  aldea.cronica = [...(estado.cronica || [])];
  aldea.estadisticas = estado.estadisticas;
  asegurarEstadisticas(aldea);
  const idsLogrosIniciales = new Set((aldea.logros || []).map((logro) => logro.id));
  Object.assign(estado, aplicarLogros(estado, LOGROS));
  aldea.logros = [...(estado.logros || [])];
  aldea.cronica = [...(estado.cronica || [])];
  aldea.legado = { ...estado.legado };
  const logrosDesbloqueados = aldea.logros
    .filter((logro) => !idsLogrosIniciales.has(logro.id))
    .map((logro) => logro.id);

  aldea.ultimoGuardado = ahora;
  const edadNuevaId = aldea.edad?.id || edadInicialId;
  const cambios = (aldea.cronica || [])
    .filter((entrada) => !cronicaInicial.some((anterior) =>
      Number(anterior.anio) === Number(entrada.anio)
      && String(anterior.tipo) === String(entrada.tipo)
      && String(anterior.texto) === String(entrada.texto)
    ))
    .map((entrada) => ({ anio: Number(entrada.anio), tipo: String(entrada.tipo), texto: String(entrada.texto) }));
  const resumenTiempo = {
    segundos: Math.round(segundosAplicados),
    anios: Math.max(0, Number(aldea.ciclo?.dia || 1) - Number(cicloInicial.dia || 1)),
    edadAnterior: EDADES[edadInicialId]?.nombre || edadInicialId,
    edadNueva: EDADES[edadNuevaId]?.nombre || edadNuevaId,
    cambios,
  };
  const llegadasEnCronica = cambios.filter((cambio) => cambio.tipo === 'aldeano').length;
  const aldeanosLlegados = llegadasEnCronica;
  Object.defineProperty(ganancias, 'resumenTiempo', { value: resumenTiempo, enumerable: false });
  ganancias.resumenOffline = {
    segundosAusente: Math.round(segundosTranscurridos),
    segundosAplicados: resumenTiempo.segundos,
    recursosGenerados: { ...ganancias },
    aldeanosLlegados,
    logrosDesbloqueados,
    alcanzoTope8h: segundosTranscurridos >= TOPE_SEGUNDOS_OFFLINE,
  };
  return ganancias;
}

module.exports = { aplicarProgresoInactivo, TOPE_SEGUNDOS_OFFLINE };
