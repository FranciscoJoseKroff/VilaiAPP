import { puedePagar } from './simulation';

const NOMBRES_TECNOLOGIAS = { planosAntiguos: 'Planos antiguos', metalurgia: 'Metalurgia' };
const NOMBRES_EDIFICIOS = { centroInvestigacion: 'Centro de Investigación' };

// Estado de cada edificio del catálogo para la aldea actual. Lo usan la pestaña Construir
// y la insignia de la barra de pestañas, para que ambas digan lo mismo.
export function datosConstruccion(aldea, catalogo, costosMejora = {}) {
  const recursos = aldea?.recursos || {};
  const edificios = aldea?.edificios || [];
  return Object.entries(catalogo?.tiposEdificio || {}).map(([id, info]) => {
    const existente = edificios.find((e) => e.tipoId === id);
    const bloqueoTecnologia = info.requiereTecnologia
      && !(aldea?.tecnologias?.[info.requiereTecnologia] || 0)
      ? `Requiere ${NOMBRES_TECNOLOGIAS[info.requiereTecnologia] || info.requiereTecnologia}.`
      : '';
    const bloqueoEdificio = (info.requiereEdificio || []).find((requisito) => {
      const requerido = edificios.find((edificio) => edificio.tipoId === requisito.tipoId);
      return !requerido || Number(requerido.nivel || 1) < requisito.nivel;
    });
    const bloqueo = bloqueoTecnologia || (bloqueoEdificio
      ? `Requiere ${NOMBRES_EDIFICIOS[bloqueoEdificio.tipoId] || bloqueoEdificio.tipoId} nivel ${bloqueoEdificio.nivel}.`
      : '');
    const bloqueado = Boolean(bloqueo);
    const maximo = Boolean(existente && info.maxNivel != null && existente.nivel >= info.maxNivel);
    const precio = costosMejora[id];
    const loading = Boolean(existente && !maximo && !precio?.error && (!precio || precio.nivel !== existente.nivel));
    const costo = existente ? (precio?.nivel === existente.nivel ? precio.costo : null) : info.costoBase;
    const puede = Boolean(costo && puedePagar(recursos, costo));
    const faltante = costo ? Object.entries(costo).reduce((total, [recurso, cantidad]) => total + Math.max(0, cantidad - (recursos[recurso] || 0)), 0) : 999;
    return { id, info, existente, bloqueado, bloqueo, maximo, loading, costo, puede, faltante };
  });
}

export function hayConstruccionDisponible(aldea, catalogo, costosMejora) {
  return datosConstruccion(aldea, catalogo, costosMejora).some((item) => !item.bloqueado && !item.maximo && !item.loading && item.puede);
}
