export const ACCIONES = [
  'vagar',
  'ir_al_trabajo',
  'trabajar',
  'llevar_recurso',
  'comer',
  'descansar',
  'socializar',
  'huir',
];

const ACCION_POR_PROFESION = {
  lenador: 'ir_al_trabajo',
  granjero: 'ir_al_trabajo',
  minero: 'ir_al_trabajo',
};

function normalize(value) {
  return Math.max(0, Number(value) || 0);
}

function tieneTrabajos(mundo, profesion) {
  if (!profesion || profesion === 'sin_oficio') return false;
  const tipos = { lenador: 'aserradero', granjero: 'granja', minero: 'mina' };
  return (mundo.edificios || []).some((edificio) => edificio.tipoId === tipos[profesion] && edificio.completo !== false);
}

export function decidir(aldeano, mundo = {}) {
  const necesidades = aldeano.necesidades || {};
  const hambre = normalize(necesidades.hambre);
  const energia = normalize(necesidades.energia);
  const animo = normalize(necesidades.animo);
  const rasgos = Array.isArray(aldeano.rasgos) ? aldeano.rasgos : [];
  const hora = normalize(mundo.hora);
  const noche = hora >= 120 || hora < 20;
  const cargando = normalize(aldeano.carga) > 0;
  const opciones = [];

  if (hambre >= 70) {
    opciones.push({ accion: 'comer', utilidad: 100 + hambre * 0.25 });
  } else {
    opciones.push({ accion: 'comer', utilidad: hambre * 0.48 + (rasgos.includes('gloton') ? 18 : 0) });
  }

  opciones.push({
    accion: 'descansar',
    utilidad: (100 - energia) * (noche ? 0.85 : 0.75)
      + (rasgos.includes('perezoso') && !noche ? 12 : 0),
  });

  if (noche && !cargando) {
    opciones.push({ accion: 'descansar', utilidad: 74 + (100 - energia) * 0.2 });
  }

  if (cargando) {
    opciones.push({ accion: 'llevar_recurso', utilidad: 82 + animo * 0.05 });
  } else if (!noche && tieneTrabajos(mundo, aldeano.profesion)) {
    opciones.push({
      accion: ACCION_POR_PROFESION[aldeano.profesion],
      utilidad: 42 + energia * 0.3 + animo * 0.2
        + (rasgos.includes('trabajador') ? 18 : 0)
        - (rasgos.includes('perezoso') ? 40 : 0),
    });
  } else {
    opciones.push({ accion: 'vagar', utilidad: 25 + animo * 0.05 });
  }

  if ((mundo.eventos?.bestias || 0) > 0 && rasgos.includes('valiente')) {
    opciones.push({ accion: 'huir', utilidad: 35 });
  } else if ((mundo.eventos?.bestias || 0) > 0) {
    opciones.push({ accion: 'huir', utilidad: 88 });
  }

  if (!noche && animo >= 55 && !cargando) {
    opciones.push({
      accion: 'socializar',
      utilidad: 18 + animo * 0.12 + (rasgos.includes('sociable') ? 22 : 0),
    });
  }

  const azar = Math.max(-5, Math.min(5, Number(mundo.random?.(aldeano.id || aldeano.nombre || 'aldeano')) || 0));
  const elegido = opciones
    .map((opcion) => ({ ...opcion, utilidad: opcion.utilidad + azar }))
    .sort((a, b) => b.utilidad - a.utilidad)[0];

  return { accion: elegido.accion, utilidad: elegido.utilidad };
}
