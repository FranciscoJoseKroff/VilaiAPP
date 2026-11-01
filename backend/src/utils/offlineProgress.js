const TOPE_SEGUNDOS_OFFLINE = 8 * 60 * 60; // máximo 8 horas de progreso acumulado sin abrir la app
const { simularSegundo } = require('./gameSimulation');
const { EDADES } = require('./villageDefaults');

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
    ciclo: aObjeto(aldea.ciclo),
    eventoNocturno: aObjeto(aldea.eventoNocturno),
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
  const aldeanosOffline = new Map(
    (estado.aldeanos || [])
      .filter((aldeano) => aldeano._id != null)
      .map((aldeano) => [String(aldeano._id), aldeano])
  );
  for (const aldeano of aldea.aldeanos || []) {
    const actualizado = aldeanosOffline.get(String(aldeano._id));
    if (!actualizado) continue;
    aldeano.trabajo = actualizado.trabajo;
    aldeano.estado = actualizado.estado;
    aldeano.pensamientoActual = actualizado.pensamientoActual;
    aldeano.decision = actualizado.decision;
  }
  aldea.legado = { ...estado.legado };
  aldea.edad = { ...estado.edad };
  aldea.cronica = [...(estado.cronica || [])];

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
  const diferenciaDePoblacion = Math.max(0, (estado.aldeanos || []).length - (aldea.aldeanos || []).length);
  const aldeanosLlegados = Math.max(llegadasEnCronica, diferenciaDePoblacion);
  Object.defineProperty(ganancias, 'resumenTiempo', { value: resumenTiempo, enumerable: false });
  ganancias.resumenOffline = {
    segundosAusente: Math.round(segundosTranscurridos),
    segundosAplicados: resumenTiempo.segundos,
    recursosGenerados: { ...ganancias },
    aldeanosLlegados,
    alcanzoTope8h: segundosTranscurridos >= TOPE_SEGUNDOS_OFFLINE,
  };
  return ganancias;
}

module.exports = { aplicarProgresoInactivo, TOPE_SEGUNDOS_OFFLINE };
