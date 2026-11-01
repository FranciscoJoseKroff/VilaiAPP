import { estacionEn, avanzarTiempo, multiplicadoresDeEstacion, avanzarEdad, semillaDe, elegirEventoInvierno } from './tiempo';
import { decidir } from './cerebro';
import { efectosActivos, RELIQUIAS } from './investigacion';

export function puedePagar(recursos, costo) {
  return Object.entries(costo).every(([recurso, cantidad]) => (recursos[recurso] || 0) >= cantidad);
}

export function progresoDeCosto(recursos, costo) {
  const entradas = Object.entries(costo || {});
  if (entradas.length === 0) return 0;
  return entradas.reduce((total, [recurso, cantidad]) => (
    total + Math.min(1, (recursos[recurso] || 0) / cantidad)
  ), 0) / entradas.length;
}

export function costoTecnologia(info, nivel) {
  return Object.fromEntries(Object.entries(info.costoBase).map(([recurso, cantidad]) => (
    [recurso, redondearADecima(cantidad * Math.pow(info.factorCosto || 1.6, nivel))]
  )));
}

export function redondearADecima(valor) {
  return Math.round((valor + Number.EPSILON * Math.abs(valor)) * 10) / 10;
}

export function calcularCapacidadesAldea(aldea, catalogo) {
  const capacidades = {
    madera: 250, comida: 250, oro: 100, trigo: 100, harina: 100, pan: 100, hierro: 100,
    ...(catalogo.capacidadesBase || {}),
  };
  const efectos = efectosActivos(aldea, catalogo.arbol || [], catalogo.reliquias || RELIQUIAS);
  for (const recurso of Object.keys(capacidades)) {
    const plana = (efectos.capacidadPlana['*'] || 0) + (efectos.capacidadPlana[recurso] || 0);
    const porcentaje = (efectos.capacidadPct['*'] || 0) + (efectos.capacidadPct[recurso] || 0);
    capacidades[recurso] = (capacidades[recurso] + plana) * (1 + porcentaje);
  }
  for (const edificio of aldea.edificios || []) {
    const efectos = catalogo.tiposEdificio[edificio.tipoId]?.efectoCapacidad || {};
    const eficiencia = Math.max(0, Math.min(1, (edificio.integridad ?? 100) / 100));
    for (const [recurso, capacidadPorNivel] of Object.entries(efectos)) {
      capacidades[recurso] = (capacidades[recurso] || 0) + capacidadPorNivel * edificio.nivel * eficiencia;
    }
  }
  return capacidades;
}

export function simularProduccionActiva(aldea, catalogo) {
  const recursos = {
    madera: 0, comida: 0, oro: 0, trigo: 0, harina: 0, pan: 0, hierro: 0,
    ...aldea.recursos,
  };
  const capacidades = calcularCapacidadesAldea(aldea, catalogo);
  const efectos = efectosActivos(aldea, catalogo.arbol || [], catalogo.reliquias || RELIQUIAS);
  const tasas = { ...aldea.tasasGeneracion };
  for (const edificio of aldea.edificios || []) {
    const info = catalogo.tiposEdificio[edificio.tipoId];
    if (!info) continue;
    const eficiencia = Math.max(0, Math.min(1, (edificio.integridad ?? 100) / 100));
    if (info.efectoTasa) {
      const total = edificio.contribucionTasa ?? info.efectoTasa.base * edificio.nivel;
      tasas[info.efectoTasa.recurso] = Math.max(0, (tasas[info.efectoTasa.recurso] || 0) - total * (1 - eficiencia));
    }
    if (info.efectoTasaSecundario) {
      const total = edificio.contribucionTasaSecundaria ?? info.efectoTasaSecundario.base * edificio.nivel;
      tasas[info.efectoTasaSecundario.recurso] = Math.max(0, (tasas[info.efectoTasaSecundario.recurso] || 0) - total * (1 - eficiencia));
    }
  }
  const rasgos = catalogo.rasgosAldeano || {};
  const bonoDeOficio = (aldeano, trabajo) => {
    const rasgo = rasgos[aldeano.rasgo] || rasgos.polivalente;
    return rasgo && (!rasgo.trabajo || rasgo.trabajo === trabajo) ? rasgo.bono : 0;
  };

  for (const aldeano of aldea.aldeanos) {
    if (aldeano.necesidades) continue;
    if (aldeano.trabajo === 'lenador') {
      tasas.madera = (tasas.madera || 0) + (catalogo.produccionTrabajador ?? 0.2) * (1 + bonoDeOficio(aldeano, 'lenador'));
    } else if (aldeano.trabajo === 'agricultor') {
      tasas.comida = (tasas.comida || 0) + (catalogo.produccionTrabajador ?? 0.2) * (1 + bonoDeOficio(aldeano, 'agricultor'));
    }
  }

  const estacionId = estacionEn(aldea.ciclo?.segundos || 0).id;
  const factoresEstacion = multiplicadoresDeEstacion(estacionId, catalogo.estaciones);
  const edad = catalogo.edades?.[aldea.edad?.id] || catalogo.edades?.calma || {};
  const multiplicadorGeneral = (aldea.multiplicadores?.generacion ?? 1)
    * (1 + efectos.produccionGeneral)
    * (1 + efectos.bonoReliquias)
    * factoresEstacion.general
    * (edad.generacion ?? 1);
  for (const [recurso, tasa] of Object.entries(tasas)) {
    const factorRecurso = (factoresEstacion.recursos[recurso] ?? 1) * (edad.recursos?.[recurso] ?? 1);
    recursos[recurso] = Math.min(
      capacidades[recurso] ?? Infinity,
      redondearADecima((recursos[recurso] || 0) + tasa * multiplicadorGeneral * factorRecurso)
    );
  }

  for (const [tipoId, info] of Object.entries(catalogo.tiposEdificio)) {
    if (!info.receta) continue;
    const edificio = aldea.edificios.find((actual) => actual.tipoId === tipoId);
    if (!edificio) continue;
    const receta = info.receta;
    const disponibleSalida = Math.max(0, (capacidades[receta.salida] ?? Infinity) - (recursos[receta.salida] || 0));
    const eficiencia = Math.max(0, Math.min(1, (edificio.integridad ?? 100) / 100));
    const producido = Math.min(receta.tasa * edificio.nivel * eficiencia * multiplicadorGeneral, recursos[receta.entrada] || 0, disponibleSalida);
    recursos[receta.entrada] = redondearADecima(Math.max(0, (recursos[receta.entrada] || 0) - producido));
    recursos[receta.salida] = redondearADecima((recursos[receta.salida] || 0) + producido);
  }

  const mina = aldea.edificios.find((edificio) => edificio.tipoId === 'mina');
  if (mina) {
    const mineros = aldea.aldeanos.filter((aldeano) => aldeano.trabajo === 'minero');
    const receta = catalogo.tiposEdificio.mina.produccionPorMinero;
    const capacidadMinera = mineros.reduce(
      (total, aldeano) => total + 1 + bonoDeOficio(aldeano, 'minero'),
      0
    );
    const hierroPosible = receta.produccion * capacidadMinera * mina.nivel * (efectos.multiplicadorRecurso.hierro || 1);
    const eficienciaMina = Math.max(0, Math.min(1, (mina.integridad ?? 100) / 100));
    const panSolicitado = receta.consumo * capacidadMinera * mina.nivel * eficienciaMina * multiplicadorGeneral;
    const hierroDisponible = Math.max(0, (capacidades.hierro || 0) - (recursos.hierro || 0));
    const factorHierro = (factoresEstacion.recursos.hierro ?? 1) * (edad.recursos?.hierro ?? 1);
    const hierroNeto = hierroPosible * eficienciaMina * multiplicadorGeneral * factorHierro;
    const factor = hierroNeto > 0
      ? Math.min(1, (recursos.pan || 0) / panSolicitado, hierroDisponible / hierroNeto)
      : 0;
    recursos.pan = redondearADecima(Math.max(0, (recursos.pan || 0) - panSolicitado * factor));
    recursos.hierro = redondearADecima((recursos.hierro || 0) + hierroNeto * factor);
  }

  for (const recurso of Object.keys(capacidades)) {
    recursos[recurso] = Math.min(capacidades[recurso], Math.max(0, recursos[recurso] || 0));
  }
  return recursos;
}

export function avanzarCicloActivo(aldea, catalogo) {
  const ciclo = { segundos: 0, dia: 1, ...(aldea.ciclo || {}) };
  const duracionDia = catalogo.segundosDia ?? 120;
  const duracionNoche = catalogo.segundosNoche ?? 60;
  const duracionTotal = duracionDia + duracionNoche;
  const siguiente = avanzarTiempo(ciclo, 1);
  let eventoNocturno = { tipo: null, dia: 0, ...(aldea.eventoNocturno || {}) };

  if (ciclo.segundos < duracionDia && siguiente.ciclo.segundos >= duracionDia && !eventoNocturno.tipo) {
    const edadActual = catalogo.edades?.[aldea.edad?.id] || catalogo.edades?.calma || {};
    const seed = semillaDe(String(aldea._id ?? aldea.id ?? 'aldea'));
    const tipo = elegirEventoInvierno(seed, ciclo.dia, edadActual.pesosEventos);
    eventoNocturno = { tipo, dia: ciclo.dia };
  }
  const copiaEdad = {
    ...aldea,
    legado: { ...(aldea.legado || {}) },
    ciclo: siguiente.ciclo,
    edad: { id: 'calma', numero: 1, inicioAnio: siguiente.ciclo.dia, duracionAnios: 10, ...(aldea.edad || {}) },
    cronica: Array.isArray(aldea.cronica) ? [...aldea.cronica] : [],
  };
  if (!catalogo.edades?.[copiaEdad.edad.id]) copiaEdad.edad.id = 'calma';
  if (siguiente.eventos.cruzoAnio) avanzarEdad(copiaEdad, catalogo.edades || {});
  void duracionNoche;
  void duracionTotal;
  return {
    ciclo: siguiente.ciclo,
    eventoNocturno,
    edad: copiaEdad.edad,
    cronica: copiaEdad.cronica,
    legado: copiaEdad.legado,
  };
}

export function actualizarAgentesAutonomos(aldea, catalogo) {
  if ((aldea.ciclo?.segundos || 0) % 10 !== 0) return aldea.aldeanos;
  const aldeanos = aldea.aldeanos.map((aldeano) => ({ ...aldeano }));
  const aldeaActualizada = { ...aldea, aldeanos };
  const redondear = (valor) => Math.round((valor + Number.EPSILON * Math.abs(valor)) * 100) / 100;

  for (let index = 0; index < aldeanos.length; index += 1) {
    const aldeano = aldeanos[index];
    if (aldeano.modoTrabajo !== 'automatico') continue;
    const resultado = decidir(aldeaActualizada, aldeano, index, catalogo);
    aldeano.trabajo = resultado.eleccion.trabajo;
    aldeano.estado = resultado.eleccion.estado;
    aldeano.pensamientoActual = resultado.eleccion.pensamiento;
    const opciones = resultado.opciones.map((opcion) => {
      const factores = Object.fromEntries(
        Object.entries(opcion.factores).map(([nombre, valor]) => [nombre, redondear(valor)])
      );
      return {
        trabajo: opcion.trabajo,
        puntaje: redondear(Object.values(factores).reduce((total, valor) => total + valor, 0)),
        factores,
      };
    });
    aldeano.decision = {
      anio: aldea.ciclo?.dia || 1,
      segundos: aldea.ciclo?.segundos || 0,
      elegida: resultado.eleccion.trabajo,
      libre: resultado.libre,
      opciones,
    };
  }
  return aldeanos;
}