const { semillaDe, aleatorio } = require('./tiempo');

const CICLO_VIDA = Object.freeze({
  ninez: 6,
  vejez: 50,
  esperanza: Object.freeze([62, 82]),
});
const COMIDA_POR_NINO_ANUAL = 1;
const PROBABILIDAD_NACIMIENTO_ANUAL = 0.25;
const RASGOS_NACIMIENTO = Object.freeze([
  'polivalente',
  'maderero',
  'hortelano',
  'minero',
  'guardian',
]);
const NOMBRES_NACIMIENTO = Object.freeze([
  'Ana', 'Pedro', 'Sofía', 'Lucas', 'Valentina',
  'Mateo', 'Camila', 'Diego', 'Javiera', 'Tomás',
]);
const NOMBRES_ETAPA = Object.freeze({
  nino: 'Niño',
  adulto: 'Adulto',
  anciano: 'Anciano',
});

function identidadAldeano(aldeano, indice) {
  return String(aldeano?._id ?? aldeano?.id ?? `${aldeano?.nombre || 'aldeano'}:${indice}`);
}

function semillaAldea(aldea) {
  return semillaDe(String(aldea?._id ?? aldea?.id ?? aldea?.usuario ?? 'aldea'));
}

function edadInicial(aldea, aldeano, indice = 0) {
  return 15 + Math.floor(aleatorio(semillaAldea(aldea), `edad-inicial:${identidadAldeano(aldeano, indice)}`) * 26);
}

function esperanzaDeVida(aldea, aldeano, indice = 0) {
  const [minimo, maximo] = CICLO_VIDA.esperanza;
  const rango = maximo - minimo + 1;
  return minimo + Math.floor(aleatorio(semillaAldea(aldea), `esperanza:${identidadAldeano(aldeano, indice)}`) * rango);
}

function etapaVida(valor) {
  const edad = Number(typeof valor === 'object' && valor !== null
    ? (valor.edadAnios ?? valor.edad ?? 18)
    : valor ?? 18);
  if (!Number.isFinite(edad)) return 'adulto';
  if (edad < CICLO_VIDA.ninez) return 'nino';
  if (edad < CICLO_VIDA.vejez) return 'adulto';
  return 'anciano';
}

function multiplicadorProduccion(aldeano) {
  const etapa = etapaVida(aldeano);
  if (etapa === 'nino') return 0;
  return (etapa === 'anciano' ? 0.8 : 1)
    * (Number(aldeano?.dueloAniosRestantes || 0) > 0 ? 0.95 : 1);
}

function asegurarAldeaVida(aldea) {
  if (!aldea || typeof aldea !== 'object') return aldea;
  const aldeanos = (aldea.aldeanos || []).map((aldeano, indice) => {
    const edadGuardada = Number(aldeano.edadAnios);
    const edadAnios = Number.isInteger(edadGuardada) && edadGuardada >= 0
      ? edadGuardada
      : edadInicial(aldea, aldeano, indice);
    const esperanzaGuardada = Number(aldeano.esperanza);
    const esperanza = Number.isInteger(esperanzaGuardada)
      && esperanzaGuardada >= CICLO_VIDA.esperanza[0]
      && esperanzaGuardada <= CICLO_VIDA.esperanza[1]
      ? esperanzaGuardada
      : esperanzaDeVida(aldea, aldeano, indice);
    const resultado = {
      ...aldeano,
      edadAnios,
      esperanza,
      edad: edadAnios,
      familiaId: aldeano.familiaId || `familia-${identidadAldeano(aldeano, indice)}`,
      dueloAniosRestantes: Math.min(1, Math.max(0, Number(aldeano.dueloAniosRestantes || 0))),
    };
    if (etapaVida(edadAnios) === 'nino') {
      resultado.trabajo = 'libre';
      resultado.estado = 'descansando';
      resultado.decision = null;
      resultado.pensamientoActual = 'Aún es niño y no tiene oficio.';
    }
    return resultado;
  });
  return { ...aldea, aldeanos };
}

function avanzarAnioVida(aldea, opciones = {}) {
  const preparada = asegurarAldeaVida(aldea);
  const anio = Number(preparada.ciclo?.dia || 1);
  const comidaNinos = preparada.aldeanos.filter((aldeano) => etapaVida(aldeano) === 'nino').length;
  const recursos = {
    ...(preparada.recursos || {}),
    comida: Math.max(0, Number(preparada.recursos?.comida || 0) - comidaNinos * COMIDA_POR_NINO_ANUAL),
  };
  const cronica = [...(preparada.cronica || [])];
  const envejecidos = preparada.aldeanos.map((aldeano) => {
    const etapaAnterior = etapaVida(aldeano);
    const edadAnios = Number(aldeano.edadAnios) + 1;
    const etapaNueva = etapaVida(edadAnios);
    if (etapaNueva !== etapaAnterior) {
      const entrada = {
        anio: Number(preparada.ciclo?.dia || 1),
        tipo: 'etapa_vida',
        texto: `${aldeano.nombre || 'Un aldeano'} pasó de ${NOMBRES_ETAPA[etapaAnterior].toLowerCase()} a ${NOMBRES_ETAPA[etapaNueva].toLowerCase()}.`,
      };
      if (!cronica.some((item) => item.anio === entrada.anio && item.tipo === entrada.tipo && item.texto === entrada.texto)) {
        cronica.push(entrada);
      }
    }
    return {
      ...aldeano,
      edad: edadAnios,
      edadAnios,
      dueloAniosRestantes: Math.max(0, Number(aldeano.dueloAniosRestantes || 0) - 1),
      ...(etapaNueva === 'nino' ? { trabajo: 'libre', estado: 'descansando', decision: null } : {}),
    };
  });
  const fallecidos = envejecidos.filter((aldeano) => aldeano.edadAnios >= aldeano.esperanza);
  const familiasEnDuelo = new Set(fallecidos.map((aldeano) => aldeano.familiaId));
  const aldeanos = envejecidos
    .filter((aldeano) => aldeano.edadAnios < aldeano.esperanza)
    .map((aldeano) => (
      familiasEnDuelo.has(aldeano.familiaId)
        ? { ...aldeano, dueloAniosRestantes: 1 }
        : aldeano
    ));

  for (const fallecido of fallecidos) {
    cronica.push({
      anio,
      tipo: 'fallecimiento',
      texto: `${fallecido.nombre || 'Un aldeano'} falleció a los ${fallecido.edadAnios} años`,
    });
  }
  const legado = {
    ...(preparada.legado || {}),
    generaciones: Number(preparada.legado?.generaciones || 0) + fallecidos.length,
  };
  let resultado = {
    ...preparada,
    recursos,
    aldeanos,
    legado,
    cronica: cronica.slice(-50),
  };
  const capacidadComida = Number(
    opciones.capacidadComida
      ?? preparada.capacidades?.comida
      ?? 250
  );
  const maximoPoblacion = Number(preparada.poblacionMaxima || 0);
  const adultos = resultado.aldeanos.filter((aldeano) => etapaVida(aldeano) === 'adulto');
  const semilla = semillaAldea(preparada);

  if (
    resultado.aldeanos.length < maximoPoblacion
    && adultos.length >= 2
    && Number(recursos.comida || 0) > capacidadComida * 0.5
    && aleatorio(semilla, `nacimiento:probabilidad:${anio}`) < PROBABILIDAD_NACIMIENTO_ANUAL
  ) {
    const indicePadre = Math.floor(aleatorio(semilla, `nacimiento:padre:${anio}`) * adultos.length);
    const indiceOtroPadre = Math.floor(aleatorio(semilla, `nacimiento:otro-padre:${anio}`) * (adultos.length - 1));
    const primerPadre = adultos[indicePadre];
    const segundoPadre = adultos[indiceOtroPadre >= indicePadre ? indiceOtroPadre + 1 : indiceOtroPadre];
    const progenitorRasgo = aleatorio(semilla, `nacimiento:progenitor-rasgo:${anio}`) < 0.5
      ? primerPadre
      : segundoPadre;
    const heredaRasgo = aleatorio(semilla, `nacimiento:herencia:${anio}`) < 0.7;
    const rasgo = heredaRasgo && RASGOS_NACIMIENTO.includes(progenitorRasgo.rasgo)
      ? progenitorRasgo.rasgo
      : RASGOS_NACIMIENTO[
        Math.floor(aleatorio(semilla, `nacimiento:rasgo:${anio}`) * RASGOS_NACIMIENTO.length)
      ];
    const nombreBase = NOMBRES_NACIMIENTO[
      Math.floor(aleatorio(semilla, `nacimiento:nombre:${anio}`) * NOMBRES_NACIMIENTO.length)
    ];
    let nombre = nombreBase;
    let sufijo = 2;
    while (resultado.aldeanos.some((aldeano) => aldeano.nombre === nombre)) {
      nombre = `${nombreBase} ${sufijo}`;
      sufijo += 1;
    }
    const id = `nacimiento-${anio}`;
    const recienNacido = {
      id,
      nombre,
      x: 400,
      y: 300,
      edad: 0,
      edadAnios: 0,
      esperanza: esperanzaDeVida(preparada, { id }, aldeanos.length),
      familiaId: primerPadre.familiaId,
      dueloAniosRestantes: 0,
      trabajo: 'libre',
      modoTrabajo: 'automatico',
      rasgo,
      estado: 'descansando',
      pensamientoActual: 'Acaba de nacer.',
      objetivoEdificioId: null,
    };
    resultado.aldeanos = [...resultado.aldeanos, recienNacido];
    resultado.cronica = [
      ...resultado.cronica,
      {
        anio,
        tipo: 'nacimiento',
        texto: `Nació ${nombre}, hijo de ${primerPadre.nombre || 'un aldeano'}`,
      },
    ].slice(-50);
  }

  if (resultado.aldeanos.length < 3) {
    const llegadasNecesarias = 3 - resultado.aldeanos.length;
    for (let indice = 0; indice < llegadasNecesarias; indice += 1) {
      const identidad = `forastero-${anio}-${indice}`;
      const nombreBase = NOMBRES_NACIMIENTO[
        Math.floor(aleatorio(semilla, `forastero:nombre:${anio}:${indice}`) * NOMBRES_NACIMIENTO.length)
      ];
      let nombre = nombreBase;
      let sufijo = 2;
      while (resultado.aldeanos.some((aldeano) => aldeano.nombre === nombre)) {
        nombre = `${nombreBase} ${sufijo}`;
        sufijo += 1;
      }
      const rasgo = RASGOS_NACIMIENTO[
        Math.floor(aleatorio(semilla, `forastero:rasgo:${anio}:${indice}`) * RASGOS_NACIMIENTO.length)
      ];
      const forastero = {
        id: identidad,
        nombre,
        x: 400,
        y: 300,
        edad: edadInicial(preparada, { id: identidad }, indice),
        edadAnios: edadInicial(preparada, { id: identidad }, indice),
        esperanza: esperanzaDeVida(preparada, { id: identidad }, indice),
        familiaId: `familia-${identidad}`,
        dueloAniosRestantes: 0,
        trabajo: 'libre',
        modoTrabajo: 'automatico',
        rasgo,
        estado: 'buscando_arbol',
        pensamientoActual: 'Llegó para ayudar a la aldea.',
        objetivoEdificioId: null,
      };
      resultado.aldeanos = [...resultado.aldeanos, forastero];
      resultado.cronica = [
        ...resultado.cronica,
        { anio, tipo: 'aldeano', texto: `Llegó ${nombre}` },
      ].slice(-50);
    }
    resultado.estadisticas = {
      ...(resultado.estadisticas || {}),
      contadores: {
        ...(resultado.estadisticas?.contadores || {}),
        aldeanosLlegados: Number(resultado.estadisticas?.contadores?.aldeanosLlegados || 0)
          + llegadasNecesarias,
      },
    };
  }
  return resultado;
}

module.exports = {
  CICLO_VIDA,
  NOMBRES_ETAPA,
  COMIDA_POR_NINO_ANUAL,
  PROBABILIDAD_NACIMIENTO_ANUAL,
  RASGOS_NACIMIENTO,
  NOMBRES_NACIMIENTO,
  identidadAldeano,
  edadInicial,
  esperanzaDeVida,
  etapaVida,
  multiplicadorProduccion,
  asegurarAldeaVida,
  avanzarAnioVida,
};
