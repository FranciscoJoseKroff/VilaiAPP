import { decidir } from './decidir.js';
import { buscarRuta, caminoLibre } from './pathfinding.js';

const MAX_INDIVIDUAL = 30;

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function aplicarNecesidades(aldeano, segundos, noche) {
  const necesidad = { ...aldeano.necesidades };
  necesidad.hambre = Math.min(100, necesidad.hambre + segundos * 0.025);
  necesidad.energia = Math.max(0, necesidad.energia - segundos * 0.018 + (noche && aldeano.estado === 'descansar' ? segundos * 0.8 : 0));
  if (necesidad.hambre >= 85) necesidad.animo = Math.max(0, necesidad.animo - segundos * 0.12);
  aldeano.necesidades = necesidad;
}

function objetivoTrabajo(profesion, mundo) {
  const tipos = { lenador: 'aserradero', granjero: 'granja', minero: 'mina' };
  const tipo = tipos[profesion];
  return (mundo.edificios || []).find((edificio) => edificio.tipoId === tipo && edificio.completo !== false);
}

function destinoDeEdificio(edificio) {
  if (!edificio) return null;
  return { x: Number(edificio.x || 240), y: Number(edificio.y || 300) };
}

export function simularAldeanos(store, mundo, deltaSegundos = 0.1) {
  const individuales = store.getState().slice(0, MAX_INDIVIDUAL);
  const agregados = Math.max(0, store.getState().length - individuales.length);
  const edificios = (mundo.edificios || []).map((edificio) => ({
    x: Number(edificio.x || 0),
    y: Number(edificio.y || 0),
    width: 72,
    height: 72,
  }));
  for (const aldeano of individuales) {
    if (aldeano.profesion && aldeano.profesion !== 'sin_oficio') continue;
    const disponibles = [
      ['lenador', 'aserradero'],
      ['granjero', 'granja'],
      ['minero', 'mina'],
    ];
    for (const [profesion, tipo] of disponibles) {
      const hayEdificio = (mundo.edificios || []).some((edificio) => edificio.tipoId === tipo && edificio.completo !== false);
      const ocupados = individuales.filter((otro) => otro.profesion === profesion).length;
      if (hayEdificio && ocupados < 5) {
        aldeano.profesion = profesion;
        aldeano.trabajo = profesion === 'granjero' ? 'agricultor' : profesion;
        break;
      }
    }
  }

  for (let indice = 0; indice < individuales.length; indice += 1) {
    const aldeano = individuales[indice];
    const hora = Number(mundo.hora || 0);
    const noche = hora >= 120 || hora < 20;
    aplicarNecesidades(aldeano, deltaSegundos, noche);
    if (aldeano.progresoDecision == null || aldeano.progresoDecision >= 2) {
      const decision = decidir(aldeano, { ...mundo, hora, random: mundo.random });
      aldeano.accion = decision.accion;
      aldeano.estadoVida = decision.accion;
      aldeano.progresoDecision = 0;
    }
    aldeano.progresoDecision += deltaSegundos;

    const trabajo = objetivoTrabajo(aldeano.profesion, mundo);
    if (aldeano.accion === 'comer' && mundo.recursos?.comida > 0) {
      mundo.recursos.comida = Math.max(0, mundo.recursos.comida - 0.05 * deltaSegundos);
      aldeano.necesidades.hambre = Math.max(0, aldeano.necesidades.hambre - 5 * deltaSegundos);
      aldeano.necesidades.animo = Math.min(100, aldeano.necesidades.animo + 0.4 * deltaSegundos);
    } else if (aldeano.accion === 'descansar') {
      aldeano.necesidades.energia = Math.min(100, aldeano.necesidades.energia + 4 * deltaSegundos);
      aldeano.necesidades.animo = Math.min(100, aldeano.necesidades.animo + 0.1 * deltaSegundos);
    } else if (aldeano.accion === 'ir_al_trabajo' && trabajo) {
      const destino = destinoDeEdificio(trabajo);
      if (caminoLibre(aldeano.posicion, destino, edificios, 8, 6)) {
        aldeano.destino = destino;
      } else {
        const ruta = buscarRuta(aldeano.posicion, destino, edificios);
        aldeano.destino = ruta[0] || destino;
      }
    } else if (aldeano.accion === 'socializar') {
      const otro = individuales.find((candidato) => candidato !== aldeano && distancia(candidato.posicion, aldeano.posicion) < 40);
      if (otro && aldeano.progresoDecision >= 1) {
        aldeano.emote = '💬';
        otro.emote = '💬';
        aldeano.necesidades.animo = Math.min(100, aldeano.necesidades.animo + 2);
        aldeano.progresoDecision = 0;
      }
    } else if (aldeano.accion === 'llevar_recurso' && trabajo) {
      aldeano.destino = destinoDeEdificio(trabajo);
      if (distancia(aldeano.posicion, aldeano.destino) <= 8 && aldeano.carga > 0) {
        const recurso = aldeano.profesion === 'lenador' ? 'madera' : aldeano.profesion === 'minero' ? 'hierro' : 'comida';
        store.agregarEntrega(recurso, aldeano.carga);
        aldeano.carga = 0;
      }
    } else if (aldeano.accion === 'trabajar' || (aldeano.accion === 'ir_al_trabajo' && trabajo && distancia(aldeano.posicion, destinoDeEdificio(trabajo)) <= 12)) {
      aldeano.estadoVida = 'trabajar';
      aldeano.progresoTrabajo = (aldeano.progresoTrabajo || 0) + deltaSegundos;
      if (aldeano.progresoTrabajo >= 10) {
        const bonus = Math.max(0.8, aldeano.necesidades.animo / 100);
        aldeano.carga = 2 * bonus;
        aldeano.progresoTrabajo = 0;
        aldeano.accion = 'llevar_recurso';
      }
    }

    if (aldeano.destino) {
      const avance = Math.max(0.1, Number(aldeano.velocidad || 18)) * deltaSegundos;
      const dx = aldeano.destino.x - aldeano.posicion.x;
      const dy = aldeano.destino.y - aldeano.posicion.y;
      const distanciaRestante = Math.hypot(dx, dy);
      if (distanciaRestante <= avance) {
        aldeano.posicion = { ...aldeano.destino };
        aldeano.destino = null;
      } else {
        aldeano.posicion = {
          x: aldeano.posicion.x + dx / distanciaRestante * avance,
          y: aldeano.posicion.y + dy / distanciaRestante * avance,
        };
      }
      aldeano.destino = aldeano.destino && aldeano.accion === 'ir_al_trabajo' && trabajo
        && distancia(aldeano.posicion, destinoDeEdificio(trabajo)) <= 12
        ? null : aldeano.destino;
    }

    if (aldeano.emote) aldeano.emoteTiempo = (aldeano.emoteTiempo || 2) - deltaSegundos;
    if ((aldeano.emoteTiempo || 0) <= 0) {
      aldeano.emote = null;
      aldeano.emoteTiempo = 0;
    }
  }

  return { individuales: individuales.length, agregados };
}
