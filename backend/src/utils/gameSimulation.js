const {
  CAPACIDADES_BASE,
  PRODUCCION_TRABAJADOR,
  RASGOS_ALDEANO,
  SEGUNDOS_DIA,
  SEGUNDOS_NOCHE,
  TIPOS_EDIFICIO,
  ESTACIONES: ESTACIONES_CATALOGO,
  ARBOL_INVESTIGACION,
  RELIQUIAS,
  EDADES,
  calcularCapacidades,
} = require('./villageDefaults');
const { actualizarAgentes } = require('./agentBrain');
const { efectosActivos } = require('./investigacion');
const { estacionEn, avanzarTiempo, multiplicadoresDeEstacion, avanzarEdad, semillaDe, elegirEventoInvierno } = require('./tiempo');
const { asegurarEdad } = require('./migracionTiempo');

function redondearADecima(valor) {
  return Math.round((valor + Number.EPSILON * Math.abs(valor)) * 10) / 10;
}

function avanzarCiclo(estado, duracion) {
  const ciclo = estado.ciclo || { segundos: 0, dia: 1 };
  const anterior = ciclo.segundos || 0;
  const resultado = avanzarTiempo(ciclo, duracion);

  if (anterior < SEGUNDOS_DIA && resultado.ciclo.segundos >= SEGUNDOS_DIA && !estado.eventoNocturno?.tipo) {
    asegurarEdad(estado);
    const edad = EDADES[estado.edad?.id] || EDADES.calma;
    const seed = semillaDe(String(estado._id ?? estado.id ?? 'aldea'));
    const tipo = elegirEventoInvierno(seed, ciclo.dia, edad.pesosEventos);
    estado.eventoNocturno = { tipo, dia: ciclo.dia };
  }
  estado.ciclo = resultado.ciclo;
  if (resultado.eventos.cruzoAnio) {
    asegurarEdad(estado);
    avanzarEdad(estado, EDADES);
  }
}

function simularSegundo(estado, duracion = 1, actualizarAgentesActual = actualizarAgentes) {
  avanzarCiclo(estado, duracion);
  actualizarAgentesActual(estado);
  const efectos = efectosActivos(estado, ARBOL_INVESTIGACION, RELIQUIAS);
  const recursos = estado.recursos;
  const capacidades = calcularCapacidades(estado);
  const tasas = { ...estado.tasasGeneracion };
  const aldeanos = estado.aldeanos || [];
  const legado = estado.legado || {};
  const estacionId = estacionEn(estado.ciclo.segundos).id;
  const factoresEstacion = multiplicadoresDeEstacion(estacionId, ESTACIONES_CATALOGO);
  const edad = EDADES[estado.edad?.id] || EDADES.calma;
  const multiplicadorGeneral = (estado.multiplicadores?.generacion ?? 1)
    * (1 + efectos.produccionGeneral)
    * (1 + efectos.bonoReliquias)
    * factoresEstacion.general
    * (edad.generacion ?? 1);

  for (const edificio of estado.edificios || []) {
    const info = TIPOS_EDIFICIO[edificio.tipoId];
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

  for (const aldeano of aldeanos) {
    const rasgo = RASGOS_ALDEANO[aldeano.rasgo] || RASGOS_ALDEANO.polivalente;
    if (aldeano.trabajo === 'lenador') {
      tasas.madera = (tasas.madera || 0) + PRODUCCION_TRABAJADOR * (1 + (rasgo.trabajo === 'lenador' || !rasgo.trabajo ? rasgo.bono : 0));
    } else if (aldeano.trabajo === 'agricultor') {
      tasas.comida = (tasas.comida || 0) + PRODUCCION_TRABAJADOR * (1 + (rasgo.trabajo === 'agricultor' || !rasgo.trabajo ? rasgo.bono : 0));
    }
  }

  for (const [recurso, tasa] of Object.entries(tasas)) {
    const capacidad = capacidades[recurso] ?? CAPACIDADES_BASE[recurso] ?? Infinity;
    const factorRecurso = (factoresEstacion.recursos[recurso] ?? 1) * (edad.recursos?.[recurso] ?? 1);
    recursos[recurso] = Math.min(
      capacidad,
      redondearADecima((recursos[recurso] || 0) + tasa * multiplicadorGeneral * factorRecurso * duracion)
    );
  }

  for (const [tipoId, info] of Object.entries(TIPOS_EDIFICIO)) {
    if (!info.receta) continue;
    const edificio = estado.edificios.find((actual) => actual.tipoId === tipoId);
    if (!edificio) continue;

    const receta = info.receta;
    const capacidadSalida = capacidades[receta.salida] ?? Infinity;
    const disponibleSalida = Math.max(0, capacidadSalida - (recursos[receta.salida] || 0));
    const producido = Math.min(
      receta.tasa * edificio.nivel * duracion * ((edificio.integridad ?? 100) / 100) * multiplicadorGeneral,
      recursos[receta.entrada] || 0,
      disponibleSalida
    );
    recursos[receta.entrada] = redondearADecima(Math.max(0, (recursos[receta.entrada] || 0) - producido));
    recursos[receta.salida] = redondearADecima((recursos[receta.salida] || 0) + producido);
  }

  const mina = estado.edificios.find((edificio) => edificio.tipoId === 'mina');
  if (mina) {
    const mineros = aldeanos.filter((aldeano) => aldeano.trabajo === 'minero');
    const receta = TIPOS_EDIFICIO.mina.produccionPorMinero;
    const rasgoMinero = mineros.reduce((suma, aldeano) => {
      const rasgo = RASGOS_ALDEANO[aldeano.rasgo] || RASGOS_ALDEANO.polivalente;
      return suma + 1 + (rasgo.trabajo === 'minero' || !rasgo.trabajo ? rasgo.bono : 0);
    }, 0);
    const eficienciaMetalurgia = efectos.multiplicadorRecurso.hierro || 1;
    const solicitado = receta.consumo * rasgoMinero * mina.nivel * duracion * multiplicadorGeneral;
    const espacioHierro = Math.max(0, capacidades.hierro - (recursos.hierro || 0));
    const eficienciaMina = Math.max(0, Math.min(1, (mina.integridad ?? 100) / 100));
    const factorHierro = (factoresEstacion.recursos.hierro ?? 1) * (edad.recursos?.hierro ?? 1);
    const hierroPosible = receta.produccion * rasgoMinero * mina.nivel * duracion
      * eficienciaMetalurgia * eficienciaMina * multiplicadorGeneral * factorHierro;
    const factor = hierroPosible > 0
      ? Math.min(1, (recursos.pan || 0) / solicitado, espacioHierro / hierroPosible)
      : 0;
    recursos.pan = redondearADecima(Math.max(0, (recursos.pan || 0) - solicitado * factor));
    recursos.hierro = redondearADecima((recursos.hierro || 0) + hierroPosible * factor);
  }

  for (const recurso of Object.keys(capacidades)) {
    recursos[recurso] = redondearADecima(
      Math.min(capacidades[recurso], Math.max(0, recursos[recurso] || 0))
    );
  }
}

module.exports = { simularSegundo };