const { esInvierno, estacionEn, semillaDe, aleatorio } = require('./tiempo');
const { OBJETIVOS_IA, TOPE_OBJETIVO } = require('./villageDefaults');
const { efectosActivos } = require('./investigacion');

const CAPACIDADES_BASE = {
  madera: 250,
  comida: 250,
  oro: 100,
  trigo: 100,
  harina: 100,
  pan: 100,
  hierro: 100,
};

const RASGOS_BASE = {
  polivalente: { trabajo: null },
  maderero: { trabajo: 'lenador' },
  hortelano: { trabajo: 'agricultor' },
  minero: { trabajo: 'minero' },
};

function objetivosDeRecursos(capacidades, fracciones = OBJETIVOS_IA, tope = TOPE_OBJETIVO) {
  return Object.fromEntries(Object.entries(fracciones).map(([recurso, fraccion]) => {
    const objetivo = (capacidades[recurso] || 0) * fraccion;
    return [recurso, tope == null ? objetivo : Math.min(tope, objetivo)];
  }));
}

function calcularCapacidades(aldea, catalogo) {
  const capacidades = { ...CAPACIDADES_BASE, ...(catalogo.capacidadesBase || {}) };
  const efectos = efectosActivos(aldea, catalogo.arbol || []);
  for (const recurso of Object.keys(capacidades)) {
    const plana = (efectos.capacidadPlana['*'] || 0) + (efectos.capacidadPlana[recurso] || 0);
    const porcentaje = (efectos.capacidadPct['*'] || 0) + (efectos.capacidadPct[recurso] || 0);
    capacidades[recurso] = (capacidades[recurso] + plana) * (1 + porcentaje);
  }
  for (const edificio of aldea.edificios || []) {
    const efectos = catalogo.tiposEdificio?.[edificio.tipoId]?.efectoCapacidad || {};
    const eficiencia = Math.max(0, Math.min(1, (edificio.integridad ?? 100) / 100));
    for (const [recurso, capacidadPorNivel] of Object.entries(efectos)) {
      capacidades[recurso] = (capacidades[recurso] || 0)
        + capacidadPorNivel * (edificio.nivel || 1) * eficiencia;
    }
  }
  return capacidades;
}

function evaluarOpciones(aldea, aldeano, indice = 0, catalogo = {}) {
  const capacidades = calcularCapacidades(aldea, catalogo);
  const fracciones = catalogo.objetivosIA || OBJETIVOS_IA;
  const tope = Object.prototype.hasOwnProperty.call(catalogo, 'topeObjetivo')
    ? catalogo.topeObjetivo
    : TOPE_OBJETIVO;
  const objetivos = objetivosDeRecursos(capacidades, fracciones, tope);
  const recursos = aldea.recursos || {};
  const aldeanos = aldea.aldeanos || [];
  const conteos = { lenador: 0, agricultor: 0, minero: 0, guardia: 0 };
  for (let otroIndice = 0; otroIndice < aldeanos.length; otroIndice += 1) {
    if (otroIndice === indice) continue;
    const trabajo = aldeanos[otroIndice].trabajo;
    if (conteos[trabajo] !== undefined) conteos[trabajo] += 1;
  }

  const rasgos = catalogo.rasgosAldeano || RASGOS_BASE;
  const rasgo = rasgos[aldeano.rasgo] || rasgos.polivalente || {};
  const trabajoPreferido = rasgo.trabajo;
  const ciclo = aldea.ciclo || { segundos: 0, dia: 1 };
  const edadId = aldea.edad?.id || 'calma';
  const edad = catalogo.edades?.[edadId];
  const estacionId = estacionEn(ciclo.segundos || 0).id;
  const estacionClave = estacionId === 'otoño' ? 'otono' : estacionId;
  const pesosEdad = edad?.pesosIA || {};
  const pesosEstacion = catalogo.estaciones?.[estacionClave]?.pesosIA || {};
  const efectos = efectosActivos(aldea, catalogo.arbol || []);
  const sinPan = (recursos.pan || 0) < 1;
  const identidad = aldeano._id != null ? String(aldeano._id) : `${aldeano.nombre || ''}:${indice}`;
  const claveVariedad = `${identidad}:${ciclo.dia || 1}:${ciclo.segundos || 0}`;
  const semillaVariedad = semillaDe(claveVariedad);
  const clamp = (valor) => Math.max(0, Math.min(1, valor));
  const crearOpcion = (trabajo, estado, pensamiento, necesidad, saturacionK) => {
    const denominador = 1 + conteos[trabajo] * saturacionK;
    const contextoEdad = pesosEdad[trabajo] || 0;
    const contextoEstacion = (pesosEstacion[trabajo] || 0)
      + (trabajo === 'minero' && sinPan ? pesosEstacion.mineroSinPan || 0 : 0);
    const factores = {
      necesidad,
      saturacion: necesidad / denominador - necesidad,
      rasgo: trabajoPreferido === trabajo ? 0.28 : 0,
      inercia: aldeano.trabajo === trabajo && aldeano.trabajo !== 'libre' ? 0.10 : 0,
      variedad: (aleatorio(semillaVariedad, trabajo) - 0.5) * 0.1,
      contexto: contextoEdad + contextoEstacion,
    };
    const puntaje = Object.values(factores).reduce((total, factor) => total + factor, 0);
    return { trabajo, estado, pensamiento, puntaje, factores };
  };
  const necesidad = (objetivo, actual) => objetivo > 0
    ? clamp((objetivo - actual) / objetivo)
    : 0;

  const opciones = [
    crearOpcion(
      'lenador',
      'talando',
      'La madera empieza a escasear; voy al bosque.',
      necesidad(objetivos.madera, recursos.madera || 0),
      0.8
    ),
    crearOpcion(
      'agricultor',
      'cultivando',
      'Quiero que las reservas de comida estén seguras.',
      necesidad(objetivos.comida, recursos.comida || 0),
      0.8
    ),
  ];

  const tieneMina = (aldea.edificios || []).some((edificio) => edificio.tipoId === 'mina');
  const hierro = recursos.hierro || 0;
  const inviernoSinPan = estacionId === 'invierno' && sinPan;
  if (tieneMina && (recursos.pan || 0) >= 1 && hierro < capacidades.hierro) {
    opciones.push(crearOpcion(
      'minero',
      'minando',
      'Hay pan y espacio en el almacén; bajo a la mina.',
      necesidad(objetivos.hierro, hierro),
      0.9
    ));
  } else if (tieneMina && inviernoSinPan && hierro < capacidades.hierro) {
    opciones.push(crearOpcion(
      'minero',
      'minando',
      'Hay espacio en el almacén; espero pan para bajar a la mina.',
      necesidad(objetivos.hierro, hierro),
      0.9
    ));
  }

  const hayEvento = Boolean(aldea.eventoNocturno?.tipo);
  if ((hayEvento || esInvierno(ciclo.segundos || 0)) && efectos.reduccionDanoEventos > 0) {
    opciones.push(crearOpcion(
      'guardia',
      'vigilando',
      hayEvento
        ? 'Oigo ruidos en el lindero; me quedo de guardia.'
        : 'La noche cae; vigilo las casas y los cultivos.',
      hayEvento ? 1.2 : 0.62,
      1.3
    ));
  }

  const orden = (indice + (ciclo.dia || 1)) % 2 === 0
    ? ['agricultor', 'lenador', 'minero', 'guardia']
    : ['lenador', 'agricultor', 'minero', 'guardia'];
  opciones.sort((primera, segunda) => {
    const diferencia = segunda.puntaje - primera.puntaje;
    return Math.abs(diferencia) > 0.0001
      ? diferencia
      : orden.indexOf(primera.trabajo) - orden.indexOf(segunda.trabajo);
  });
  return opciones;
}

function decidir(aldea, aldeano, indice = 0, catalogo = {}) {
  const opciones = evaluarOpciones(aldea, aldeano, indice, catalogo);
  const mejor = opciones[0];
  const libre = !mejor || mejor.puntaje < 0.2;
  const ciclo = aldea.ciclo || { segundos: 0, dia: 1 };
  const estacionId = estacionEn(ciclo.segundos || 0).id;
  const orden = (indice + (ciclo.dia || 1)) % 2 === 0
    ? ['agricultor', 'lenador', 'minero', 'guardia']
    : ['lenador', 'agricultor', 'minero', 'guardia'];
  const mejorSinContexto = [...opciones].sort((primera, segunda) => {
    const puntajePrimero = primera.puntaje - primera.factores.contexto;
    const puntajeSegundo = segunda.puntaje - segunda.factores.contexto;
    const diferencia = puntajeSegundo - puntajePrimero;
    return Math.abs(diferencia) > 0.0001
      ? diferencia
      : orden.indexOf(primera.trabajo) - orden.indexOf(segunda.trabajo);
  })[0];
  const contextoDecisivo = mejor && mejor.factores.contexto !== 0
    && (mejorSinContexto.trabajo !== mejor.trabajo
      || (mejorSinContexto.puntaje - mejorSinContexto.factores.contexto < 0.2 && mejor.puntaje >= 0.2));
  let pensamiento = mejor?.pensamiento;
  if (contextoDecisivo) {
    if (mejor.trabajo === 'agricultor' && (aldea.edad?.id === 'hielo' || aldea.edad?.id === 'abundancia')) {
      pensamiento = `Es la ${catalogo.edades?.[aldea.edad.id]?.nombre || 'nueva edad'}; aseguro la cosecha.`;
    } else if (mejor.trabajo === 'lenador' && aldea.edad?.id === 'ceniza') {
      pensamiento = 'Es la Edad de la Ceniza; voy al bosque.';
    } else if (mejor.trabajo === 'minero' && aldea.edad?.id === 'ceniza') {
      pensamiento = 'Es la Edad de la Ceniza; bajo a la mina.';
    } else if (mejor.trabajo === 'guardia' && aldea.edad?.id === 'sombras') {
      pensamiento = 'Es la Edad de las Sombras; refuerzo la guardia.';
    } else if (mejor.trabajo === 'agricultor' && estacionId === 'otoño') {
      pensamiento = 'Es otoño; aseguro la cosecha.';
    } else if (mejor.trabajo === 'guardia' && estacionId === 'invierno') {
      pensamiento = 'Llega el invierno; me quedo de guardia.';
    }
  }
  return {
    eleccion: libre
      ? {
        trabajo: 'libre',
        estado: 'descansando',
        pensamiento: 'Las reservas están estables; aprovecho para descansar.',
      }
      : { ...mejor, pensamiento },
    opciones,
    libre,
  };
}

module.exports = { objetivosDeRecursos, evaluarOpciones, decidir };