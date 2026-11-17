import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useAldea } from '../hooks/useAldea';
import { puedePagar, redondearADecima, calcularCapacidadesAldea, simularProduccionActiva } from '../game/simulation';
import { costoDe, efectosActivos, nivelDe, puedeInvestigar } from '../game/investigacion';
import { decidir } from '../game/cerebro';
import { incrementarContador } from '../game/estadisticas.js';
import { aplicarLogros } from '../game/logros.js';
import { calcularEfectosEdificios } from '../game/buildingEffects.js';
import { seleccionarEdificiosAfectados } from '../game/eventEffects.js';
import { etapaVida } from '../game/cicloVida.js';

function aplicarDecisionesAutomaticas(aldea, catalogo) {
  if (!aldea) return aldea;
  const aldeanos = (aldea.aldeanos || []).map((aldeano) => ({ ...aldeano }));
  const aldeaActualizada = { ...aldea, aldeanos };
  for (let index = 0; index < aldeanos.length; index += 1) {
    const aldeano = aldeanos[index];
    if (etapaVida(aldeano) === 'nino') {
      aldeano.trabajo = 'libre';
      aldeano.estado = 'descansando';
      aldeano.pensamientoActual = 'Aún es niño y no tiene oficio.';
      aldeano.decision = null;
      continue;
    }
    if (aldeano.modoTrabajo !== 'automatico') continue;
    const resultado = decidir(aldeaActualizada, aldeano, index, catalogo || {});
    aldeano.trabajo = resultado.eleccion.trabajo;
    aldeano.estado = resultado.eleccion.estado;
    aldeano.pensamientoActual = resultado.eleccion.pensamiento;
    aldeano.decision = {
      anio: aldea.ciclo?.dia || 1,
      segundos: aldea.ciclo?.segundos || 0,
      elegida: resultado.eleccion.trabajo,
      libre: resultado.libre,
      opciones: resultado.opciones.map((opcion) => ({
        trabajo: opcion.trabajo,
        puntaje: opcion.puntaje,
        factores: opcion.factores,
      })),
    };
  }
  return { ...aldea, aldeanos };
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const auth = useAuth();
  const [modoDemo, setModoDemo] = useState(false);
  const [activandoModoDemo, setActivandoModoDemo] = useState(false);
  const [velocidadDemo, setVelocidadDemo] = useState(1);
  const game = useAldea(auth.token, auth.setVerificandoSesion, auth.cerrarSesion, velocidadDemo, modoDemo);
  const { aldea: aldeaEstado, aldeaRef, catalogoRef, setAldea, guardar } = game;
  const { marcarDemo } = game;
  const [costosMejora, setCostosMejora] = useState({});
  const [confirmarExpedicion, setConfirmarExpedicion] = useState(false);

  const activarModoDemo = useCallback(async () => {
    if (modoDemo || activandoModoDemo) return;
    setActivandoModoDemo(true);
    try {
      if (await marcarDemo()) setModoDemo(true);
    } finally {
      setActivandoModoDemo(false);
    }
  }, [marcarDemo, modoDemo, activandoModoDemo]);

  const cambiarVelocidadDemo = useCallback((velocidad) => {
    if (![1, 5, 20].includes(velocidad)) return;
    setVelocidadDemo(velocidad);
    void marcarDemo();
  }, [marcarDemo]);

  const claveNiveles = useMemo(() => (game.aldea?.edificios || [])
    .map((e) => `${e.tipoId}:${e.nivel}`).sort().join('|'), [game.aldea]);

  useEffect(() => {
    if (!auth.token || !game.catalogo || !game.aldea) return undefined;
    let activo = true;
    Promise.all((game.aldea.edificios || []).map(async (edificio) => {
      try {
        const { costo } = await apiFetch(`/catalogo/${edificio.tipoId}/mejora/${edificio.nivel}`);
        return [edificio.tipoId, { nivel: edificio.nivel, costo }];
      } catch {
        return [edificio.tipoId, { nivel: edificio.nivel, error: true }];
      }
    })).then((precios) => activo && setCostosMejora(Object.fromEntries(precios)));
    return () => { activo = false; };
  }, [auth.token, game.catalogo, claveNiveles]);

  const setMensajeSeguro = game.setMensaje;

  const asignarTrabajo = useCallback((indice, trabajo) => {
    const aldeaActual = aldeaRef.current || aldeaEstado;
    if (!aldeaActual) return;
    if (etapaVida(aldeaActual.aldeanos[indice]) === 'nino') {
      setMensajeSeguro('Los niños todavía no pueden trabajar.');
      return;
    }
    const actualizada = { ...aldeaActual, aldeanos: aldeaActual.aldeanos.map((aldeano, posicion) => posicion === indice ? {
      ...aldeano,
      trabajo: trabajo === 'automatico' ? 'libre' : trabajo,
      modoTrabajo: trabajo === 'automatico' ? 'automatico' : 'manual',
      pensamientoActual: trabajo === 'automatico' ? 'Estoy decidiendo dónde puedo ayudar más.' : 'He elegido este oficio por ahora.',
    } : aldeano) };
    const conDecision = trabajo === 'automatico'
      ? aplicarDecisionesAutomaticas(actualizada, catalogoRef.current)
      : actualizada;
    setAldea(conDecision);
    guardar(conDecision, auth.token);
  }, [aldeaEstado, aldeaRef, catalogoRef, setAldea, guardar, auth.token, setMensajeSeguro]);

  const ponerTodosAuto = useCallback(() => {
    const aldeaActual = aldeaRef.current || aldeaEstado;
    if (!aldeaActual?.aldeanos?.length) return;
    const actualizada = {
      ...aldeaActual,
      aldeanos: aldeaActual.aldeanos.map((aldeano) => ({
        ...aldeano,
        trabajo: 'libre',
        modoTrabajo: 'automatico',
        pensamientoActual: etapaVida(aldeano) === 'nino'
          ? 'Aún es niño y no tiene oficio.'
          : 'Estoy decidiendo dónde puedo ayudar más.',
      })),
    };
    const conDecisiones = aplicarDecisionesAutomaticas(actualizada, catalogoRef.current);
    setAldea(conDecisiones);
    guardar(conDecisiones, auth.token);
  }, [aldeaEstado, aldeaRef, catalogoRef, setAldea, guardar, auth.token]);

  function tocarEdificio(tipoId) {
    const aldea = game.aldeaRef.current;
    const catalogo = game.catalogoRef.current;
    if (!aldea || !catalogo) return;
    const info = catalogo.tiposEdificio[tipoId];
    if (!info) return;
    if (info.requiereTecnologia && !(aldea.tecnologias?.[info.requiereTecnologia] || 0)) {
      const tecnologiaBonita = ({ planosAntiguos: 'Planos antiguos', metalurgia: 'Metalurgia' })[info.requiereTecnologia] || info.requiereTecnologia;
      game.setMensaje(`Desbloquea ${tecnologiaBonita} en el árbol de habilidades.`);
      return;
    }
    const existente = aldea.edificios.find((e) => e.tipoId === tipoId);
    if ((info.requiereEdificio || []).some((requisito) => {
      const requerido = aldea.edificios.find((edificio) => edificio.tipoId === requisito.tipoId);
      return !requerido || Number(requerido.nivel || 1) < requisito.nivel;
    })) {
      const requisito = info.requiereEdificio.find((item) => {
        const requerido = aldea.edificios.find((edificio) => edificio.tipoId === item.tipoId);
        return !requerido || Number(requerido.nivel || 1) < item.nivel;
      });
      const nombre = requisito.tipoId === 'centroInvestigacion' ? 'Centro de Investigación' : requisito.tipoId;
      game.setMensaje(`Construye ${nombre} nivel ${requisito.nivel} para desbloquear ${info.nombre}.`);
      return;
    }
    if (existente && info.maxNivel != null && existente.nivel >= info.maxNivel) {
      game.setMensaje(`${info.nombre} ya alcanzó su nivel máximo (${info.maxNivel}).`);
      return;
    }
    if (!existente) construir(tipoId, info, aldea);
    else mejorar(tipoId, info, existente);
  }

  function construir(tipoId, info, aldea) {
    if (!puedePagar(aldea.recursos, info.costoBase)) {
      setMensajeSeguro(`Te faltan recursos para construir ${info.nombre}`);
      return;
    }
    const recursos = { ...aldea.recursos };
    Object.entries(info.costoBase).forEach(([recurso, cantidad]) => {
      recursos[recurso] = redondearADecima(recursos[recurso] - cantidad);
    });
    const nuevo = { tipoId, x: aldea.edificios.length * 120, y: 0, progreso: info.tiempoConstruccion, completo: true, nivel: 1, mejorando: false, progresoMejora: 0, tiempoMejora: 0, contribucionTasa: 0, contribucionTasaSecundaria: 0, contribucionPoblacion: 0 };
    const tasasGeneracion = { ...aldea.tasasGeneracion };
    let poblacionMaxima = aldea.poblacionMaxima;
    if (info.efectoTasa) { nuevo.contribucionTasa = info.efectoTasa.base; const r = info.efectoTasa.recurso; tasasGeneracion[r] = redondearADecima((tasasGeneracion[r] || 0) + info.efectoTasa.base); }
    if (info.efectoTasaSecundario) { nuevo.contribucionTasaSecundaria = info.efectoTasaSecundario.base; const r = info.efectoTasaSecundario.recurso; tasasGeneracion[r] = redondearADecima((tasasGeneracion[r] || 0) + info.efectoTasaSecundario.base); }
    if (info.efectoPoblacion) { nuevo.contribucionPoblacion = info.efectoPoblacion; poblacionMaxima += info.efectoPoblacion; }
    const eraPrimeraVez = !aldea.edificios.some((edificio) => edificio.tipoId === tipoId);
    const cronicaConstruccion = eraPrimeraVez
      ? [...(Array.isArray(aldea.cronica) ? aldea.cronica : []), { anio: Number(aldea.ciclo?.dia || 1), tipo: 'construccion', texto: `Se construyó el primer ${info.nombre.toLowerCase()}` }].slice(-50)
      : (aldea.cronica || []);
    const actualizada = aplicarLogros(incrementarContador({
      ...aldea,
      recursos,
      tasasGeneracion,
      poblacionMaxima,
      cronica: cronicaConstruccion,
      arbolInvestigacionDesbloqueado: aldea.arbolInvestigacionDesbloqueado || tipoId === 'centroInvestigacion',
      edificios: [...aldea.edificios, nuevo],
    }, 'edificiosConstruidos'), game.catalogo?.logros);
    game.setAldea(actualizada);
    setMensajeSeguro(`¡${info.nombre} construido!`);
    game.guardar(actualizada, auth.token);
  }

  async function mejorar(tipoId, info, existente) {
    try {
      const nivelSolicitado = existente.nivel;
      const { costo } = await apiFetch(`/catalogo/${tipoId}/mejora/${nivelSolicitado}`);
      const actual = game.aldeaRef.current;
      const edificioActual = actual?.edificios.find((e) => e.tipoId === tipoId);
      if (!actual || edificioActual?.nivel !== nivelSolicitado) { setMensajeSeguro('El nivel del edificio cambió. Actualicé su precio; inténtalo de nuevo.'); return; }
      if (!puedePagar(actual.recursos, costo)) { setMensajeSeguro(`Te faltan recursos para mejorar ${info.nombre}`); return; }
      const recursos = { ...actual.recursos }; Object.entries(costo).forEach(([r, c]) => { recursos[r] = redondearADecima(recursos[r] - c); });
      const nuevoNivel = existente.nivel + 1;
      const tasas = { ...actual.tasasGeneracion }; let poblacionMaxima = actual.poblacionMaxima;
      const edificio = { ...edificioActual, nivel: nuevoNivel };
      if (info.efectoTasa) { const r = info.efectoTasa.recurso; const nueva = info.efectoTasa.base * nuevoNivel; tasas[r] = redondearADecima((tasas[r] || 0) - edificioActual.contribucionTasa + nueva); edificio.contribucionTasa = nueva; }
      if (info.efectoTasaSecundario) { const r = info.efectoTasaSecundario.recurso; const nueva = info.efectoTasaSecundario.base * nuevoNivel; tasas[r] = redondearADecima((tasas[r] || 0) - edificioActual.contribucionTasaSecundaria + nueva); edificio.contribucionTasaSecundaria = nueva; }
      if (info.efectoPoblacion) { const nueva = info.efectoPoblacion * nuevoNivel; poblacionMaxima += nueva - edificioActual.contribucionPoblacion; edificio.contribucionPoblacion = nueva; }
      const actualizada = aplicarLogros({ ...actual, recursos, tasasGeneracion: tasas, poblacionMaxima, edificios: actual.edificios.map((e) => e.tipoId === tipoId ? edificio : e) }, game.catalogo?.logros);
      game.setAldea(actualizada); setMensajeSeguro(`¡${info.nombre} mejorado a Nivel ${nuevoNivel}!`); game.guardar(actualizada, auth.token);
    } catch (e) { setMensajeSeguro(e.message); }
  }

  const investigar = useCallback((id) => {
    const actual = aldeaRef.current;
    const catalogo = catalogoRef.current;
    const nodo = catalogo?.arbol?.find((item) => item.id === id);
    if (!actual || !nodo) {
      setMensajeSeguro('Esta investigación no está disponible.');
      return;
    }
    const disponibilidad = puedeInvestigar(actual, nodo);
    if (!disponibilidad.ok) {
      setMensajeSeguro(disponibilidad.motivo);
      return;
    }

    const nivel = nivelDe(actual, id);
    const costo = costoDe(nodo, nivel);
    const recursos = { ...actual.recursos };
    Object.entries(costo.recursos).forEach(([recurso, cantidad]) => {
      recursos[recurso] = redondearADecima((recursos[recurso] || 0) - cantidad);
    });
    const legado = costo.reliquias > 0
      ? { ...actual.legado, reliquiasGastadas: (actual.legado?.reliquiasGastadas || 0) + costo.reliquias }
      : actual.legado;
    const actualizada = {
      ...actual,
      recursos,
      legado,
      investigacionEnCurso: {
        id,
        nivelObjetivo: nivel + 1,
        progresoSegundos: 0,
      },
    };
    setAldea(actualizada);
    setMensajeSeguro(`Investigación iniciada: ${nodo.nombre}, nivel ${nivel + 1}. Se completará con el paso del tiempo.`);
    guardar(actualizada, auth.token);
  }, [aldeaRef, catalogoRef, setAldea, guardar, auth.token, setMensajeSeguro]);

  const repararEdificio = useCallback((tipoId) => {
    const actual = game.aldeaRef.current; const edificio = actual?.edificios.find((e) => e.tipoId === tipoId); if (!actual || !edificio) return; const integridad = edificio.integridad ?? 100; if (integridad >= 100) return; const costo = { madera: Math.ceil((100 - integridad) / 20) * 8 }; if (!puedePagar(actual.recursos, costo)) { game.setMensaje('No hay madera suficiente para reparar el edificio.'); return; }
    const recursos = { ...actual.recursos, madera: actual.recursos.madera - costo.madera }; const edificios = actual.edificios.map((e) => e.tipoId === tipoId ? { ...e, integridad: 100 } : e); const actualizada = { ...actual, recursos, edificios }; game.setAldea(actualizada); game.setMensaje(`${tipoId} reparado.`); game.guardar(actualizada, auth.token);
  }, [auth.token, game]);

  const resolverEventoNocturno = useCallback((defender) => {
    const actual = game.aldeaRef.current;
    const tipoEvento = actual?.eventoNocturno?.tipo;
    const evento = game.catalogoRef.current?.eventosNocturnos?.[tipoEvento];
    if (!actual || !evento) return;
    const costo = evento.costoDefensa || {};
    if (defender && !puedePagar(actual.recursos, costo)) {
      game.setMensaje('No tienes recursos suficientes para defender el poblado.');
      return;
    }
    const recursos = { ...actual.recursos };
    const edificios = actual.edificios.map((edificio) => ({ ...edificio }));
    let resultado = 'La aldea resistió la noche.';
    if (defender) {
      Object.entries(costo).forEach(([recurso, cantidad]) => {
        recursos[recurso] = redondearADecima(Math.max(0, (recursos[recurso] || 0) - cantidad));
      });
    } else if (evento.dano > 0 && edificios.length > 0) {
      const afectados = seleccionarEdificiosAfectados(edificios, tipoEvento, evento);
      const eficaciaRasgos = actual.aldeanos
        .filter((aldeano) => aldeano.trabajo === 'guardia' && etapaVida(aldeano) !== 'nino')
        .reduce((total, aldeano) => {
          const rasgo = game.catalogoRef.current?.rasgosAldeano?.[aldeano.rasgo];
          return total + 0.1 * (1 + (rasgo?.trabajo === 'guardia' ? Number(rasgo.bono || 0) : 0));
        }, 0);
      const edadId = actual.edad?.id;
      const edad = game.catalogoRef.current?.edades?.[edadId] || game.catalogoRef.current?.edades?.calma;
      const efectosEdificios = calcularEfectosEdificios(actual, game.catalogoRef.current?.tiposEdificio);
      const eficaciaGuardia = Number(edad?.guardiaEficacia ?? 1) * efectosEdificios.multiplicadorGuardia;
      const efectos = efectosActivos(actual, game.catalogoRef.current?.arbol || []);
      const reduccion = Math.min(0.8, efectos.reduccionDanoEventos + eficaciaRasgos * eficaciaGuardia);
      const danoEdad = Math.max(1, Number(edad?.danoEventos ?? 1));
      const dano = Math.max(5, Math.round(evento.dano * danoEdad * (1 - reduccion)));
      if (afectados.length) {
        afectados.forEach((objetivo) => {
          objetivo.integridad = Math.max(0, (objetivo.integridad ?? 100) - dano);
        });
        resultado = `${afectados.map((objetivo) => `${objetivo.tipoId} al ${objetivo.integridad}%`).join(', ')} de integridad. Puedes repararlos.`;
      } else {
        resultado = 'No había edificios vulnerables que pudieran alcanzar las llamas.';
      }
    } else {
      const perdida = evento.perdidaMadera || 15;
      recursos.madera = Math.max(0, (recursos.madera || 0) - perdida);
      resultado = `Perdiste ${perdida} madera durante la noche.`;
    }
    const nombreEvento = evento.nombre || tipoEvento;
    const entradaEvento = { anio: Number(actual.ciclo?.dia || 1), tipo: 'evento', texto: defender ? `${nombreEvento}: el poblado defendió el invierno, sin daños` : `${nombreEvento}: ${resultado}` };
    const cronica = [...(Array.isArray(actual.cronica) ? actual.cronica : []), entradaEvento]
      .filter((entrada, indice, lista) => lista.findIndex((otra) => otra.anio === entrada.anio && otra.tipo === entrada.tipo && otra.texto === entrada.texto) === indice)
      .slice(-50);
    const actualizada = aplicarLogros(incrementarContador({
      ...actual,
      recursos,
      edificios,
      cronica,
      eventoNocturno: { tipo: null, dia: 0 },
      eventoPrevisto: { tipo: null, dia: 0, segundosRestantes: 0 },
    }, defender ? 'eventosDefendidos' : 'eventosAceptados'), game.catalogoRef.current?.logros);
    game.setAldea(actualizada);
    game.setMensaje(resultado);
    game.guardar(actualizada, auth.token);
    return actualizada;
  }, [auth.token, game]);

  const capacidades = game.aldea && game.catalogo ? calcularCapacidadesAldea(game.aldea, game.catalogo) : {};
  const produccion = game.aldea && game.catalogo ? simularProduccionActiva(game.aldea, game.catalogo) : {};
  const arbolDesbloqueado = Boolean(game.aldea?.arbolInvestigacionDesbloqueado || game.aldea?.edificios?.some((e) => e.tipoId === 'centroInvestigacion'));
  const valorContexto = useMemo(() => ({
    ...auth, ...game, auth, costosMejora, capacidades, produccion, arbolDesbloqueado,
    confirmarExpedicion, setConfirmarExpedicion, asignarTrabajo, ponerTodosAuto, tocarEdificio,
    modoDemo, velocidadDemo, activarModoDemo, cambiarVelocidadDemo,
    siguienteEstacion: game.siguienteEstacion,
    forzarCambioEdad: game.forzarCambioEdad,
    dispararEventoAnual: game.dispararEventoAnual,
    investigar, repararEdificio,
    resolverEventoNocturno,
  }), [auth, game, costosMejora, capacidades, produccion, arbolDesbloqueado, confirmarExpedicion,
    asignarTrabajo, ponerTodosAuto, tocarEdificio, investigar,
    repararEdificio, resolverEventoNocturno, modoDemo, velocidadDemo, activarModoDemo, cambiarVelocidadDemo]);

  return <GameContext.Provider value={valorContexto}>{children}</GameContext.Provider>;
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame debe usarse dentro de GameProvider');
  return value;
}
