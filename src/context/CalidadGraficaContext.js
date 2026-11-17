import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calidadRecomendada, normalizarCalidadGrafica } from '../game/calidadGrafica';

export const CALIDAD_GRAFICA_KEY = 'vilai_calidad_grafica';
const CalidadGraficaContext = createContext(null);

export function CalidadGraficaProvider({ children }) {
  const [calidad, setCalidadState] = useState('auto');
  const [cargando, setCargando] = useState(true);
  const [fps, setFps] = useState(null);
  const [midiendo, setMidiendo] = useState(false);
  const [propuesta, setPropuesta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    AsyncStorage.getItem(CALIDAD_GRAFICA_KEY)
      .then((guardada) => {
        if (activo) setCalidadState(normalizarCalidadGrafica(guardada));
      })
      .catch(() => {
        if (activo) setError('No se pudo leer la calidad gráfica guardada.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (cargando || calidad !== 'auto') return undefined;
    if (typeof requestAnimationFrame !== 'function' || typeof cancelAnimationFrame !== 'function') {
      return undefined;
    }

    let frameId;
    let primerTiempo;
    let fotogramas = 0;
    let activo = true;

    const registrarFotograma = (tiempo) => {
      if (!activo) return;
      if (primerTiempo === undefined) {
        primerTiempo = tiempo;
        setMidiendo(true);
      }
      fotogramas += 1;
      const transcurrido = tiempo - primerTiempo;
      if (transcurrido >= 5000) {
        const promedio = transcurrido > 0 ? ((fotogramas - 1) * 1000) / transcurrido : 0;
        const nivelSugerido = calidadRecomendada(promedio);
        setFps(Math.round(promedio));
        setMidiendo(false);
        setPropuesta(nivelSugerido ? { nivel: nivelSugerido, fps: promedio } : null);
        return;
      }
      frameId = requestAnimationFrame(registrarFotograma);
    };

    frameId = requestAnimationFrame(registrarFotograma);
    return () => {
      activo = false;
      cancelAnimationFrame(frameId);
      setMidiendo(false);
    };
  }, [calidad, cargando]);

  const setCalidad = useCallback(async (siguiente) => {
    const nivel = normalizarCalidadGrafica(siguiente);
    try {
      await AsyncStorage.setItem(CALIDAD_GRAFICA_KEY, nivel);
      setCalidadState(nivel);
      setFps(null);
      setPropuesta(null);
      setError('');
      return true;
    } catch {
      setError('No se pudo guardar la calidad gráfica. Inténtalo de nuevo.');
      return false;
    }
  }, []);

  const descartarPropuesta = useCallback(() => setPropuesta(null), []);
  const errorMedicion = !cargando && calidad === 'auto'
    && (typeof requestAnimationFrame !== 'function' || typeof cancelAnimationFrame !== 'function')
    ? 'No se puede medir el rendimiento en este dispositivo.'
    : '';
  const valor = useMemo(() => ({
    calidad,
    cargando,
    fps,
    midiendo,
    propuesta,
    error: error || errorMedicion,
    setCalidad,
    descartarPropuesta,
  }), [calidad, cargando, fps, midiendo, propuesta, error, errorMedicion, setCalidad, descartarPropuesta]);

  return <CalidadGraficaContext.Provider value={valor}>{children}</CalidadGraficaContext.Provider>;
}

export function useCalidadGrafica() {
  const contexto = useContext(CalidadGraficaContext);
  if (!contexto) throw new Error('useCalidadGrafica debe usarse dentro de CalidadGraficaProvider');
  return contexto;
}
