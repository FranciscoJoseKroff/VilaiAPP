import { efectosActivos } from './investigacion.js';

const NOMBRES_RECURSOS = {
  madera: 'madera', comida: 'comida', oro: 'oro', trigo: 'trigo',
  harina: 'harina', pan: 'pan', hierro: 'hierro',
};

const NOMBRES_INVESTIGACIONES = {
  herramientas: 'Herramientas calibradas',
  logistica: 'Rutas de abastecimiento',
  defensa: 'Guardia comunal',
  metalurgia: 'Metalurgia',
  planosAntiguos: 'Planos antiguos',
};

const NOMBRES_EDIFICIOS = {
  centroInvestigacion: 'Centro de Investigación',
  mina: 'Mina',
  observatorio: 'Observatorio antiguo',
};

const NOMBRES_EVENTOS = {
  bestias: 'bestias', helada: 'heladas', recaudador: 'recaudadores',
};

function numeroBonito(valor) {
  return Number((Number(valor) || 0).toFixed(2)).toString().replace('.', ',');
}

function valorConSigno(valor, unidad = '') {
  const numero = Number(valor) || 0;
  const signo = numero < 0 ? '−' : '+';
  return `${signo}${numeroBonito(Math.abs(numero))}${unidad}`;
}

export function efectoDescripcion(nodo, nivel = 1) {
  const nivelActual = Math.max(0, Number(nivel) || 0);
  return (nodo?.efectos || []).map((efecto) => {
    const valor = Number(efecto.valor) || 0;
    const recurso = NOMBRES_RECURSOS[efecto.recurso] || 'recurso';
    switch (efecto.tipo) {
      case 'produccionGeneral':
        return `${valorConSigno(valor * nivelActual * 100, ' %')} de producción`;
      case 'produccionRecurso':
        return `${valorConSigno(valor * nivelActual * 100, ' %')} de producción de ${recurso}`;
      case 'multiplicadorRecurso':
        return `${recurso[0].toUpperCase()}${recurso.slice(1)} ×${numeroBonito(Math.pow(valor, nivelActual))}`;
      case 'capacidadPlana':
        return `${valorConSigno(valor * nivelActual)} de capacidad${efecto.recurso ? ` de ${recurso}` : ' total'}`;
      case 'capacidadPct':
        return `${valorConSigno(valor * nivelActual * 100, ' %')} de capacidad${efecto.recurso ? ` de ${recurso}` : ''}`;
      case 'reduccionDanoEventos':
        return `−${numeroBonito(Math.abs(valor * nivelActual) * 100)} % de daño de eventos`;
      case 'reduccionDanoTipo':
        return `−${numeroBonito(Math.abs(valor * nivelActual) * 100)} % de daño de ${NOMBRES_EVENTOS[efecto.tipoEvento] || 'eventos'}`;
      case 'guardiaEficacia':
        return `${valorConSigno(valor * nivelActual * 100, ' %')} de eficacia de guardia`;
      case 'avisoEventoSegundos':
        return `${valorConSigno(valor * nivelActual, ' s')} de aviso de eventos`;
      case 'iaIntervaloSegundos':
        return `${valorConSigno(valor * nivelActual, ' s')} al intervalo de la IA`;
      case 'iaBonoRasgo':
        return `${valorConSigno(valor * nivelActual * 100, ' %')} para rasgos de aldeanos`;
      case 'bonoRasgoProduccion':
        return `${valorConSigno(valor * nivelActual * 100, ' %')} de producción por rasgos${efecto.recurso ? ` de ${recurso}` : ''}`;
      case 'pronosticoEdadAnios':
        return `${valorConSigno(valor * nivelActual, ' años')} de pronóstico de edades`;
      case 'consumoMineros':
        return `Consumo de pan de mineros ×${numeroBonito(Math.pow(valor, nivelActual))}`;
      case 'velocidadInvestigacion':
        return `Velocidad de investigación ×${numeroBonito(Math.pow(valor, nivelActual))}`;
      case 'costoInvestigacion':
        return `Costo de investigación ×${numeroBonito(Math.pow(valor, nivelActual))}`;
      case 'costoConstruccion':
        return `Costo de construcción ×${numeroBonito(Math.pow(valor, nivelActual))}`;
      case 'inmunidadEvento':
        return `Inmunidad a ${NOMBRES_EVENTOS[efecto.tipoEvento || efecto.valor] || 'un evento'}`;
      case 'desbloquea':
        return `Desbloquea ${NOMBRES_EDIFICIOS[efecto.valor] || 'una mejora'}`;
      case 'estacionMod':
        return `${valorConSigno(valor * nivelActual * 100, ' %')} de ${recurso} en una estación`;
      default:
        return 'Mejora adicional';
    }
  }).join(' · ');
}

export function textoRequisito(requisito) {
  const nivel = Number(requisito?.nivel);
  const sufijoNivel = Number.isFinite(nivel) && nivel > 0 ? ` nivel ${nivel}` : '';
  if (requisito?.id) {
    return `${NOMBRES_INVESTIGACIONES[requisito.id] || 'Investigación especial'}${sufijoNivel}`;
  }
  if (requisito?.tipoId) {
    return `${NOMBRES_EDIFICIOS[requisito.tipoId] || 'Edificio requerido'}${sufijoNivel}`;
  }
  return 'Requisito especial';
}

export function formatearCosto(costo) {
  const nombres = { madera: 'madera', comida: 'comida', oro: 'oro' };
  return Object.entries(costo)
    .map(([recurso, cantidad]) => `${cantidad} ${nombres[recurso] || recurso}`)
    .join(' · ');
}

export function describirEdificio(info) {
  const nombres = { madera: 'madera', comida: 'comida', oro: 'oro', trigo: 'trigo', harina: 'harina', pan: 'pan', hierro: 'hierro' };
  if (info.efectoCapacidad) {
    return `Almacenamiento +${Object.entries(info.efectoCapacidad)
      .map(([recurso, cantidad]) => `${cantidad} ${nombres[recurso] || recurso}`)
      .join(' · ')} por nivel`;
  }
  if (info.receta) {
    return `${nombres[info.receta.entrada]} → ${nombres[info.receta.salida]} · ${info.receta.tasa}/s por nivel`;
  }
  if (info.produccionPorMinero) return 'Los mineros consumen pan para extraer hierro.';
  if (info.efectoTasaSecundario) return `Produce ${info.efectoTasa.recurso} y ${info.efectoTasaSecundario.recurso}.`;
  if (info.efectoTasa) return `Produce ${info.efectoTasa.recurso} · ${info.efectoTasa.base}/s por nivel`;
  if (info.efectoPoblacion) return `Aumenta la población máxima en ${info.efectoPoblacion} por nivel.`;
  return 'Desbloquea investigación para la aldea.';
}

export function aportePorOficio(aldeano, aldea, catalogo, capacidades) {
  const trabajo = aldeano.trabajo;
  if (!trabajo || trabajo === 'libre') return 'Sin oficio asignado';
  if (trabajo === 'guardia') return 'Reduce el daño de los eventos nocturnos';
  const rasgo = catalogo.rasgosAldeano?.[aldeano.rasgo] || catalogo.rasgosAldeano?.polivalente;
  const bono = rasgo && (!rasgo.trabajo || rasgo.trabajo === trabajo) ? rasgo.bono : 0;
  const produccion = catalogo.produccionTrabajador ?? 0.2;

  if (trabajo === 'lenador') {
    return `+${(produccion * (1 + bono)).toFixed(2)} madera/s`;
  }
  if (trabajo === 'agricultor') {
    return `+${(produccion * (1 + bono)).toFixed(2)} comida/s`;
  }
  if (trabajo === 'minero') {
    const mina = aldea.edificios.find((edificio) => edificio.tipoId === 'mina');
    if (!mina) return 'Requiere una mina';
    if ((aldea.recursos.pan || 0) <= 0) return 'Sin pan: no extrae hierro';
    if ((aldea.recursos.hierro || 0) >= capacidades.hierro) return 'Almacén de hierro lleno';
    const receta = catalogo.tiposEdificio.mina.produccionPorMinero;
    const metalurgia = efectosActivos(aldea, catalogo.arbol || []).multiplicadorRecurso.hierro || 1;
    return `+${(receta.produccion * mina.nivel * (1 + bono) * metalurgia).toFixed(2)} hierro/s`;
  }
  return 'Sin producción directa';
}

export function textoTasa(tasa, estaLleno) {
  if (estaLleno && tasa === 0) return 'Almacén lleno';
  return `${tasa > 0 ? '+' : ''}${tasa.toFixed(1)}/s`;
}

export function razonPrincipal(decision, catalogo = {}) {
  if (!decision) return 'Aún no ha decidido nada';
  if (decision.libre || decision.elegida === 'libre') return 'Todo está en orden';

  const opcion = (decision.opciones || []).find((item) => item.trabajo === decision.elegida);
  if (!opcion?.factores) return 'Aún no ha decidido nada';

  const dominante = Object.entries(opcion.factores)
    .filter(([, valor]) => Number.isFinite(valor) && valor > 0)
    .reduce((mejor, actual) => (
      !mejor || actual[1] > mejor[1] ? actual : mejor
    ), null)?.[0];

  if (dominante === 'necesidad') {
    return {
      lenador: 'Falta madera',
      agricultor: 'Falta comida',
      minero: 'Falta hierro',
      guardia: 'Hace falta proteger la aldea',
    }[opcion.trabajo] || 'Hay una necesidad en la aldea';
  }
  if (dominante === 'rasgo') {
    const rasgo = Object.values(catalogo.rasgosAldeano || {})
      .find((item) => item.trabajo === opcion.trabajo && item.nombre);
    const nombre = rasgo?.nombre?.toLowerCase();
    if (nombre?.includes('hortelano')) return 'Es hortelano de nacimiento';
    if (nombre?.includes('maderero')) return 'Es maderero de nacimiento';
    if (nombre?.includes('minero')) return 'Es minero de nacimiento';
    return 'Su rasgo favorece este oficio';
  }
  if (dominante === 'saturacion') return 'Ya hay muchos en este oficio';
  if (dominante === 'inercia') return 'Ya estaba en este oficio';
  if (dominante === 'contexto') return 'Por la edad/estación actual';
  if (dominante === 'variedad') return 'Un pequeño ajuste para variar los oficios';
  return 'Todo está en orden';
}