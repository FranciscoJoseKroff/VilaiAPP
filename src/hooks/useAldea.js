import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import {
  dispararEventoDelAnio,
  forzarSiguienteEdad,
  pasosPorTickDemo,
  simularPasoActivo,
} from '../game/simulation';
import { migrarInvestigacion } from '../game/migracionInvestigacion';
import { incrementarContador } from '../game/estadisticas.js';
import { aplicarLogros } from '../game/logros.js';
import { estacionEn, semillaDe, aleatorio } from '../game/tiempo';
import { NOMBRES_NACIMIENTO } from '../game/cicloVida';
import { crearAldeanoVida, sincronizarAldeanoConVida } from '../simulacion/mundo';
import { aldeanosStore } from '../simulacion/villagerStore';
import { simularAldeanos } from '../simulacion/simularAldeanos';
import { prepararAldeaParaGuardar } from '../simulacion/aldeanoEnums';
import { registrarGuardadoCorrecto } from '../diagnostico/registro';
import { debeReintentarGuardado, esErrorCliente } from '../game/politicaGuardado';

export function useAldea(token, setVerificandoSesion, cerrarSesion, velocidadDemo = 1, modoDemo = false) {
  const [catalogo, setCatalogo] = useState(null);
  const [aldea, setAldea] = useState(null);
  const [costosMejora, setCostosMejora] = useState({});
  const [cargandoAldea, setCargandoAldea] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [progresoInactivo, setProgresoInactivo] = useState(null);
  const [resumenTiempo, setResumenTiempo] = useState(null);
  const [resumenOffline, setResumenOffline] = useState(null);
  const aldeaRef = useRef(null);
  const catalogoRef = useRef(null);
  const hayGuardadoPendiente = useRef(false);
  const guardadosEnCursoRef = useRef(0);
  const guardadoRechazadoRef = useRef(false);
  const escenarioEnCursoRef = useRef(false);
  const aldeanosStoreRef = useRef(aldeanosStore);
  const ultimoTickAldeanosRef = useRef(0);

  useEffect(() => {
    aldeaRef.current = aldea;
  }, [aldea]);

  useEffect(() => {
    catalogoRef.current = catalogo;
  }, [catalogo]);

  useEffect(() => {
    apiFetch('/catalogo').then(setCatalogo).catch((e) => setError(`No se pudo cargar el catálogo: ${e.message}`));
  }, []);

  // Reemplaza el estado local por la aldea que entregó el servidor (al iniciar y al resincronizar).
  const aplicarAldeaDelServidor = useCallback((aldeaCargada) => {
    const aldeaMigrada = migrarInvestigacion({
      ...aldeaCargada,
      aldeanos: (aldeaCargada.aldeanos || []).map((aldeano, indice) => crearAldeanoVida(aldeano, indice, aldeaCargada)),
    });
    if (aldeaMigrada.ultimoGuardado) registrarGuardadoCorrecto(aldeaMigrada.ultimoGuardado);
    aldeanosStoreRef.current.setState((aldeaMigrada.aldeanos || []).map((aldeano, indice) => crearAldeanoVida(aldeano, indice, aldeaMigrada)));
    aldeaRef.current = aldeaMigrada;
    setAldea(aldeaMigrada);
  }, []);

  useEffect(() => {
    if (!token) return;
    const iniciarCarga = () => setCargandoAldea(true);
    const temporizadorCarga = setTimeout(iniciarCarga, 0);
    apiFetch('/aldea', { token })
      .then(({ aldea: aldeaCargada, progresoInactivo, resumenTiempo, resumenOffline }) => {
        aplicarAldeaDelServidor(aldeaCargada);
        setResumenTiempo(resumenTiempo || null);
        setResumenOffline(resumenOffline || null);
        const ganancias = Object.entries(progresoInactivo || {});
        if (ganancias.length) setProgresoInactivo(progresoInactivo);
        // progresoInactivo también trae objetos (p. ej. resumenOffline): el mensaje solo lista recursos numéricos.
        const recursosGanados = ganancias.filter(([, cantidad]) => typeof cantidad === 'number' && cantidad > 0);
        if (recursosGanados.length) setMensaje(`Mientras no jugabas generaste: ${recursosGanados.map(([recurso, cantidad]) => `+${Math.round(cantidad * 10) / 10} ${recurso}`).join(', ')}`);
      })
      .catch((e) => {
        const mensaje = String(e.message || '').toLowerCase();
        const sinConexion = mensaje.includes('network') || mensaje.includes('fetch') || mensaje.includes('failed') || mensaje.includes('conexión');
        if (sinConexion) {
          setError('Sin conexión, reintentando...');
          return;
        }
        setError(mensaje.includes('401') || mensaje.includes('token') || mensaje.includes('autoriz') ? 'Tu sesión expiró. Inicia sesión de nuevo.' : e.message);
        if (mensaje.includes('401') || mensaje.includes('token') || mensaje.includes('autoriz')) cerrarSesion();
      })
      .finally(() => {
        setCargandoAldea(false);
        setVerificandoSesion(false);
      });
    return () => clearTimeout(temporizadorCarga);
  }, [token, cerrarSesion, setVerificandoSesion, aplicarAldeaDelServidor]);

  const guardar = useCallback(async (aldeaActualizada, tokenActual, { automatico = false } = {}) => {
    if (!automatico) guardadoRechazadoRef.current = false;
    if (automatico && guardadoRechazadoRef.current) return false;
    if (escenarioEnCursoRef.current) {
      hayGuardadoPendiente.current = true;
      return false;
    }
    if (guardadosEnCursoRef.current > 0) {
      hayGuardadoPendiente.current = true;
      return false;
    }
    guardadosEnCursoRef.current += 1;
    try {
      const aldeaNormalizada = prepararAldeaParaGuardar(aldeaActualizada);
      for (let intento = 1; intento <= 3; intento += 1) {
        try {
          await apiFetch('/aldea', { method: 'PUT', token: tokenActual, body: aldeaNormalizada });
          setError('');
          hayGuardadoPendiente.current = false;
          guardadoRechazadoRef.current = false;
          return true;
        } catch (e) {
          if (esErrorCliente(e)) {
            guardadoRechazadoRef.current = true;
            hayGuardadoPendiente.current = false;
            const detalle = e.detalle ? `: ${e.detalle}` : '';
            if (__DEV__) console.error('Error al guardar la aldea', e.status, detalle);
            setError(__DEV__ ? `${e.message}${detalle}` : 'No se pudo guardar la aldea.');
            // Antes el autoguardado quedaba apagado para siempre mientras el juego seguía avanzando, y al
            // recargar se perdía todo ese tiempo. Ahora se vuelve al último estado válido del servidor
            // (se pierden como mucho los ~5 s de este guardado) y el autoguardado continúa.
            // 401 queda fuera: lo resuelve el flujo de sesión.
            if (e.status !== 401) {
              try {
                const { aldea: aldeaServidor } = await apiFetch('/aldea', { token: tokenActual });
                aplicarAldeaDelServidor(aldeaServidor);
                setMensaje('La aldea se resincronizó con el servidor.');
              } catch {
                // Sin conexión: el próximo autoguardado lo volverá a intentar.
              } finally {
                guardadoRechazadoRef.current = false;
              }
            }
            return false;
          }
          setError(`Sin conexión, reintentando...`);
          if (debeReintentarGuardado(e, intento)) await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      hayGuardadoPendiente.current = true;
      return false;
    } finally {
      guardadosEnCursoRef.current -= 1;
    }
  }, [aplicarAldeaDelServidor]);

  const aplicarEscenario = useCallback(async (escenario) => {
    escenarioEnCursoRef.current = true;
    try {
      while (guardadosEnCursoRef.current > 0) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      const { aldea: aldeaEscenario } = await apiFetch('/aldea/escenario', {
        method: 'POST',
        token,
        body: { escenario },
      });
      aldeaRef.current = aldeaEscenario;
      setAldea(aldeaEscenario);
      return aldeaEscenario;
    } finally {
      hayGuardadoPendiente.current = false;
      escenarioEnCursoRef.current = false;
    }
  }, [token]);

  const importarPartida = useCallback(async (partida) => {
    const { aldea: aldeaImportada } = await apiFetch('/aldea/importar', {
      method: 'POST',
      token,
      body: { aldea: partida },
    });
    const aldeaPreparada = migrarInvestigacion({
      ...aldeaImportada,
      aldeanos: (aldeaImportada.aldeanos || []).map((aldeano, indice) => (
        crearAldeanoVida(aldeano, indice, aldeaImportada)
      )),
    });
    aldeaRef.current = aldeaPreparada;
    aldeanosStoreRef.current.setState(aldeaPreparada.aldeanos || []);
    setAldea(aldeaPreparada);
    setError('');
    return aldeaPreparada;
  }, [token]);

  const simularPasos = useCallback((estadoInicial, cantidad) => {
    let estado = estadoInicial;
    for (let paso = 0; paso < cantidad; paso += 1) {
      const simulado = simularPasoActivo(estado, catalogoRef.current);
      const tecnologiaCompletada = Object.keys(simulado.tecnologias || {}).find((id) => (
        Number(simulado.tecnologias[id] || 0) > Number(estado.tecnologias?.[id] || 0)
      ));
      if (tecnologiaCompletada) {
        const nombre = catalogoRef.current?.arbol?.find((nodo) => nodo.id === tecnologiaCompletada)?.nombre || tecnologiaCompletada;
        setMensaje(`Investigación completada: ${nombre}.`);
      }
      const recursos = { ...simulado.recursos };
      for (const [recurso, cantidadEntregada] of Object.entries(aldeanosStoreRef.current.consumirEntregas())) {
        recursos[recurso] = (recursos[recurso] || 0) + cantidadEntregada;
      }

      let aldeanos = simulado.aldeanos.map((aldeano) => ({ ...aldeano }));
      let umbralPoblacion = estado.umbralPoblacion;
      const factorCrecimiento = catalogoRef.current?.factorCrecimientoUmbral ?? 1.6;
      if (aldeanos.length < estado.poblacionMaxima && recursos.comida >= umbralPoblacion) {
        recursos.comida = Math.round((recursos.comida - umbralPoblacion) * 10) / 10;
        umbralPoblacion = Math.round(umbralPoblacion * factorCrecimiento * 10) / 10;
        const semilla = semillaDe(String(estado._id ?? estado.id ?? 'aldea'));
        const numeroLlegada = aldeanos.length;
        const nombreNuevo = NOMBRES_NACIMIENTO[Math.floor(aleatorio(semilla, `nombre:${numeroLlegada}`) * NOMBRES_NACIMIENTO.length)];
        const rasgos = Object.keys(catalogoRef.current?.rasgosAldeano || { polivalente: {} });
        aldeanos = [...aldeanos, {
          nombre: nombreNuevo,
          x: 400,
          y: 300,
          trabajo: 'libre',
          modoTrabajo: 'automatico',
          rasgo: rasgos[Math.floor(aleatorio(semilla, `rasgo:${numeroLlegada}`) * rasgos.length)],
          estado: 'buscando_arbol',
          pensamientoActual: '¡Recién llegado!',
          objetivoEdificioId: null,
        }];
        const entradaLlegada = {
          anio: Number(simulado.ciclo?.dia || 1),
          tipo: 'aldeano',
          texto: `Llegó ${nombreNuevo}`,
        };
        simulado.cronica = [...(simulado.cronica || []), entradaLlegada].slice(-50);
        setMensaje(`¡${nombreNuevo} se unió a la aldea!`);
      }
      estado = { ...simulado, recursos, aldeanos, umbralPoblacion };
      if (aldeanos.length > simulado.aldeanos.length) {
        estado = incrementarContador(estado, 'aldeanosLlegados');
        estado = aplicarLogros(estado, catalogoRef.current?.logros);
      }
    }
    return estado;
  }, [setMensaje]);

  const marcarDemo = useCallback(async () => {
    const actual = aldeaRef.current;
    if (!actual) return false;
    if (actual.marcaDemo) return true;
    try {
      await apiFetch('/aldea/marca-demo', { method: 'POST', token });
      const actualizada = { ...(aldeaRef.current || actual), marcaDemo: true };
      aldeaRef.current = actualizada;
      setAldea(actualizada);
      return true;
    } catch (e) {
      setError(`No se pudo activar el modo demo: ${e.message}`);
      return false;
    }
  }, [token]);

  const guardarAccionDemo = useCallback(async (aldeaActualizada, texto) => {
    const textoDemo = `${texto} (demo)`;
    const repeticiones = (aldeaActualizada.cronica || []).filter((entrada) => (
      entrada.tipo === 'demo'
      && (entrada.texto === textoDemo || entrada.texto.startsWith(`${textoDemo} #`))
    )).length;
    const aldeaDemo = {
      ...aldeaActualizada,
      marcaDemo: true,
      cronica: [...(aldeaActualizada.cronica || []), {
        anio: Number(aldeaActualizada.ciclo?.dia || 1),
        tipo: 'demo',
        texto: `${textoDemo}${repeticiones ? ` #${repeticiones + 1}` : ''}`,
      }].slice(-50),
    };
    aldeaRef.current = aldeaDemo;
    setAldea(aldeaDemo);
    const guardado = await guardar(aldeaDemo, token);
    if (!guardado) hayGuardadoPendiente.current = true;
    return aldeaDemo;
  }, [guardar, token]);

  const siguienteEstacion = useCallback(async () => {
    const actual = aldeaRef.current;
    if (!actual) return null;
    const restante = estacionEn(actual.ciclo?.segundos || 0).restante;
    const actualizada = simularPasos(actual, restante);
    const nombreEstacion = estacionEn(actualizada.ciclo.segundos).id;
    return guardarAccionDemo(actualizada, `Comenzó ${nombreEstacion}`);
  }, [guardarAccionDemo, simularPasos]);

  const forzarCambioEdad = useCallback(async () => {
    const actual = aldeaRef.current;
    if (!actual) return null;
    const actualizada = forzarSiguienteEdad(actual, catalogoRef.current || {});
    return guardarAccionDemo(actualizada, 'Se forzó el cambio de edad');
  }, [guardarAccionDemo]);

  const dispararEventoAnual = useCallback(async () => {
    const actual = aldeaRef.current;
    if (!actual) return null;
    const actualizada = dispararEventoDelAnio(actual, catalogoRef.current || {});
    const nombresEvento = {
      bestias: 'Bestias en el lindero',
      helada: 'Helada nocturna',
      recaudador: 'Recaudador del camino',
    };
    return guardarAccionDemo(actualizada, `Evento del año: ${nombresEvento[actualizada.eventoNocturno.tipo]}`);
  }, [guardarAccionDemo]);

  const aldeaIniciada = Boolean(aldea);

  useEffect(() => {
    if (!aldeaIniciada) return undefined;
    const intervalo = setInterval(() => {
      const actual = aldeaRef.current;
      if (!actual) return;
      const ahora = Date.now();
      const anterior = ultimoTickAldeanosRef.current || ahora - 100;
      const delta = Math.min(0.2, Math.max(0.05, (ahora - anterior) / 1000));
      ultimoTickAldeanosRef.current = ahora;
      simularAldeanos(aldeanosStoreRef.current, {
        edificios: actual.edificios || [],
        recursos: actual.recursos || {},
        hora: actual.ciclo?.segundos || 0,
        eventos: { bestias: actual.eventoNocturno?.tipo === 'bestias' ? 1 : 0 },
        random: (semilla) => aleatorio(semillaDe(String(semilla)), String(Date.now() % 1000)) * 10 - 5,
      }, delta);
    }, 100);
    return () => clearInterval(intervalo);
  }, [aldeaIniciada]);

  const aldeanosPersistidos = (aldea?.aldeanos || [])
    .map((aldeano) => `${aldeano.id || aldeano._id}:${aldeano.profesion || aldeano.trabajo}`)
    .join('|');
  useEffect(() => {
    if (!aldea) return;
    const runtime = new Map(aldeanosStoreRef.current.getState().map((aldeano) => [String(aldeano.id), aldeano]));
    const sincronizados = (aldea.aldeanos || []).map((aldeano, indice) => {
      const actual = runtime.get(String(aldeano._id || aldeano.id || `aldeano-${indice}`));
      if (!actual) return crearAldeanoVida(aldeano, indice, aldea);
      return sincronizarAldeanoConVida(aldeano, actual, indice, aldea);
    });
    aldeanosStoreRef.current.setState(sincronizados.map((aldeano, indice) => crearAldeanoVida(aldeano, indice, aldea)));
  }, [aldeaIniciada, aldeanosPersistidos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aldeaIniciada || !catalogo) return undefined;
    const intervalo = setInterval(() => {
      const actual = aldeaRef.current;
      if (!actual) return;
      const pasos = pasosPorTickDemo(modoDemo, velocidadDemo);
      const actualizada = simularPasos(actual, pasos);
      aldeaRef.current = actualizada;
      hayGuardadoPendiente.current = true;
      setAldea(actualizada);
    }, 1000);
    return () => clearInterval(intervalo);
  }, [aldeaIniciada, catalogo, modoDemo, velocidadDemo, simularPasos]);

  useEffect(() => {
    if (!token) return undefined;
    const intervalo = setInterval(() => {
      if (hayGuardadoPendiente.current && aldeaRef.current && !guardadoRechazadoRef.current) {
        hayGuardadoPendiente.current = false;
        const runtime = new Map(aldeanosStoreRef.current.getState().map((aldeano) => [String(aldeano.id), aldeano]));
        const aldeaParaGuardar = {
          ...aldeaRef.current,
          aldeanos: (aldeaRef.current.aldeanos || []).map((aldeano, indice) => {
            const vivo = runtime.get(String(aldeano._id || aldeano.id || `aldeano-${indice}`));
            return vivo ? {
              ...aldeano,
              necesidades: vivo.necesidades,
              edad: vivo.edad,
              edadAnios: vivo.edadAnios ?? aldeano.edadAnios,
              esperanza: vivo.esperanza ?? aldeano.esperanza,
              rasgos: vivo.rasgos,
              profesion: vivo.profesion,
              trabajo: vivo.trabajo,
            } : aldeano;
          }),
        };
        guardar(prepararAldeaParaGuardar(aldeaParaGuardar), token, { automatico: true });
      }
    }, 5000);
    return () => clearInterval(intervalo);
  }, [token, guardar]);

  return {
    aldea, setAldea, aldeaRef, catalogo, setCatalogo, catalogoRef, costosMejora, setCostosMejora,
    cargandoAldea, hayGuardadoPendiente, error, setError, mensaje, setMensaje, progresoInactivo,
    setProgresoInactivo, resumenTiempo, setResumenTiempo, resumenOffline, setResumenOffline, guardar,
    aplicarEscenario, importarPartida, marcarDemo, siguienteEstacion, forzarCambioEdad, dispararEventoAnual,
  };
}
