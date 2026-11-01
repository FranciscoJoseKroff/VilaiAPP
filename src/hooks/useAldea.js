import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { avanzarCicloActivo, actualizarAgentesAutonomos, simularProduccionActiva } from '../game/simulation';
import { migrarInvestigacion } from '../game/migracionInvestigacion';
import { semillaDe, aleatorio } from '../game/tiempo';
import { crearAldeanoVida, sincronizarAldeanoConVida } from '../simulacion/mundo';
import { aldeanosStore } from '../simulacion/villagerStore';
import { simularAldeanos } from '../simulacion/simularAldeanos';
import { prepararAldeaParaGuardar } from '../simulacion/aldeanoEnums';

const NOMBRES_ALDEANOS = ['Ana', 'Pedro', 'Sofía', 'Lucas', 'Valentina', 'Mateo', 'Camila', 'Diego', 'Javiera', 'Tomás'];

export function useAldea(token, setVerificandoSesion, cerrarSesion) {
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

  useEffect(() => {
    if (!token) return;
    const iniciarCarga = () => setCargandoAldea(true);
    const temporizadorCarga = setTimeout(iniciarCarga, 0);
    apiFetch('/aldea', { token })
      .then(({ aldea: aldeaCargada, progresoInactivo, resumenTiempo, resumenOffline }) => {
        const aldeaMigrada = migrarInvestigacion({
          ...aldeaCargada,
          aldeanos: (aldeaCargada.aldeanos || []).map((aldeano, indice) => crearAldeanoVida(aldeano, indice)),
        });
        aldeanosStoreRef.current.setState((aldeaMigrada.aldeanos || []).map((aldeano, indice) => crearAldeanoVida(aldeano, indice)));
        setAldea(aldeaMigrada);
        setResumenTiempo(resumenTiempo || null);
        setResumenOffline(resumenOffline || null);
        const ganancias = Object.entries(progresoInactivo || {});
        if (ganancias.length) setProgresoInactivo(progresoInactivo);
        if (ganancias.length) setMensaje(`Mientras no jugabas generaste: ${ganancias.map(([recurso, cantidad]) => `+${cantidad} ${recurso}`).join(', ')}`);
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
  }, [token, cerrarSesion, setVerificandoSesion]);

  const guardar = useCallback(async (aldeaActualizada, tokenActual) => {
    const aldeaNormalizada = prepararAldeaParaGuardar(aldeaActualizada);
    for (let intento = 1; intento <= 3; intento += 1) {
      try {
        await apiFetch('/aldea', { method: 'PUT', token: tokenActual, body: aldeaNormalizada });
        setError('');
        hayGuardadoPendiente.current = false;
        return true;
      } catch (e) {
        if (e.status >= 400 && e.status < 500) {
          hayGuardadoPendiente.current = false;
          const detalle = e.detalle ? `: ${e.detalle}` : '';
          if (__DEV__) console.error('Error al guardar la aldea', e.status, detalle);
          setError(__DEV__ ? `${e.message}${detalle}` : 'No se pudo guardar la aldea.');
          return false;
        }
        setError(`Sin conexión, reintentando...`);
        if (intento < 3) await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    hayGuardadoPendiente.current = true;
    return false;
  }, []);

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
      if (!actual) return crearAldeanoVida(aldeano, indice);
      return sincronizarAldeanoConVida(aldeano, actual, indice);
    });
    aldeanosStoreRef.current.setState(sincronizados.map((aldeano, indice) => crearAldeanoVida(aldeano, indice)));
  }, [aldeaIniciada, aldeanosPersistidos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aldeaIniciada) return undefined;
    const intervalo = setInterval(() => {
      setAldea((actual) => {
        if (!actual) return actual;
        const cicloActualizado = avanzarCicloActivo(actual, catalogoRef.current);
        const aldeanosDecididos = actualizarAgentesAutonomos({ ...actual, ...cicloActualizado }, catalogoRef.current);
        const aldeaConCiclo = { ...actual, ...cicloActualizado, aldeanos: aldeanosDecididos };
        const recursos = simularProduccionActiva(aldeaConCiclo, catalogoRef.current);
        const entregas = aldeanosStoreRef.current.consumirEntregas();
        for (const [recurso, cantidad] of Object.entries(entregas)) {
          recursos[recurso] = (recursos[recurso] || 0) + cantidad;
        }
        let aldeanos = aldeanosDecididos.map((aldeano) => ({ ...aldeano }));
        let umbralPoblacion = actual.umbralPoblacion;
        const factorCrecimiento = catalogoRef.current?.factorCrecimientoUmbral ?? 1.6;
        if (aldeanos.length < actual.poblacionMaxima && recursos.comida >= umbralPoblacion) {
          recursos.comida = Math.round((recursos.comida - umbralPoblacion) * 10) / 10;
          umbralPoblacion = Math.round(umbralPoblacion * factorCrecimiento * 10) / 10;
          const semilla = semillaDe(String(actual._id ?? actual.id ?? 'aldea'));
          const numeroLlegada = aldeanos.length;
          const nombreNuevo = NOMBRES_ALDEANOS[Math.floor(aleatorio(semilla, `nombre:${numeroLlegada}`) * NOMBRES_ALDEANOS.length)];
          const rasgos = Object.keys(catalogoRef.current?.rasgosAldeano || { polivalente: {} });
          aldeanos = [...aldeanos, { nombre: nombreNuevo, x: 400, y: 300, trabajo: 'libre', modoTrabajo: 'automatico', rasgo: rasgos[Math.floor(aleatorio(semilla, `rasgo:${numeroLlegada}`) * rasgos.length)], estado: 'buscando_arbol', pensamientoActual: '¡Recién llegado!', objetivoEdificioId: null }];
          const entradaLlegada = { anio: Number(actual.ciclo?.dia || 1), tipo: 'aldeano', texto: `Llegó ${nombreNuevo}` };
          actual.cronica = [...(Array.isArray(actual.cronica) ? actual.cronica : []), entradaLlegada].slice(-50);
          setMensaje(`¡${nombreNuevo} se unió a la aldea!`);
        }
        hayGuardadoPendiente.current = true;
        return {
          ...actual,
          recursos,
          aldeanos,
          umbralPoblacion,
          ciclo: cicloActualizado.ciclo,
          eventoNocturno: cicloActualizado.eventoNocturno,
          edad: cicloActualizado.edad,
          cronica: cicloActualizado.cronica,
          legado: cicloActualizado.legado,
        };
      });
    }, 1000);
    return () => clearInterval(intervalo);
  }, [aldeaIniciada]);

  useEffect(() => {
    if (!token) return undefined;
    const intervalo = setInterval(() => {
      if (hayGuardadoPendiente.current && aldeaRef.current) {
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
              rasgos: vivo.rasgos,
              profesion: vivo.profesion,
              trabajo: vivo.trabajo,
            } : aldeano;
          }),
        };
        guardar(prepararAldeaParaGuardar(aldeaParaGuardar), token);
      }
    }, 5000);
    return () => clearInterval(intervalo);
  }, [token, guardar]);

  return { aldea, setAldea, aldeaRef, catalogo, setCatalogo, catalogoRef, costosMejora, setCostosMejora, cargandoAldea, hayGuardadoPendiente, error, setError, mensaje, setMensaje, progresoInactivo, setProgresoInactivo, resumenTiempo, setResumenTiempo, resumenOffline, setResumenOffline, guardar };
}
