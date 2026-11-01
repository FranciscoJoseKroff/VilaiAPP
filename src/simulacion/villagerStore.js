export function crearStoreAldeanos(iniciales = []) {
  let aldeanos = [...iniciales];
  const suscriptores = new Set();
  let entregas = {};
  let cronica = [];

  const avisar = () => suscriptores.forEach((suscriptor) => suscriptor(aldeanos));

  return {
    getState: () => aldeanos,
    setState: (siguientes) => {
      aldeanos = [...siguientes];
      avisar();
    },
    subscribe: (suscriptor) => {
      suscriptores.add(suscriptor);
      return () => suscriptores.delete(suscriptor);
    },
    actualizar: (actualizador) => {
      aldeanos = actualizador(aldeanos);
      avisar();
    },
    agregarEntrega: (recurso, cantidad) => {
      entregas[recurso] = (entregas[recurso] || 0) + Math.max(0, Number(cantidad) || 0);
    },
    consumirEntregas: () => {
      const pendientes = entregas;
      entregas = {};
      return pendientes;
    },
    setEmote: (id, emote) => {
      aldeanos = aldeanos.map((aldeano) => aldeano.id === id ? { ...aldeano, emote } : aldeano);
      avisar();
    },
    seleccionar: (id) => id ? String(id) : null,
    registrarAccion: (id, texto) => {
      aldeanos = aldeanos.map((aldeano) => aldeano.id === id ? {
        ...aldeano,
        historial: [texto, ...(Array.isArray(aldeano.historial) ? aldeano.historial : [])].slice(0, 5),
      } : aldeano);
      avisar();
    },
    bendecir: (id, animo = 20) => {
      aldeanos = aldeanos.map((aldeano) => aldeano.id === id ? {
        ...aldeano,
        bendicionDisponibleEn: Date.now() + 5 * 60 * 1000,
        necesidades: {
          ...aldeano.necesidades,
          animo: Math.min(100, Number(aldeano.necesidades?.animo || 0) + animo),
        },
        historial: [`Recibió una bendición`, ...(Array.isArray(aldeano.historial) ? aldeano.historial : [])].slice(0, 5),
      } : aldeano);
      avisar();
    },
    getCronica: () => cronica,
    registrarSuceso: (texto, tipo = 'aldeano') => {
      cronica = [...cronica, { texto, tipo, fecha: Date.now() }].slice(-50);
    },
  };
}

export const aldeanosStore = crearStoreAldeanos();
