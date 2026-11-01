import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureAudioMode, configureSfx, preloadSfx, playSfx, releaseSfx, unlockSfx } from '../audio/sfx';

const AJUSTES_AUDIO_KEY = 'vilai_ajustes_audio';
const VOLUMENES = { bajo: 0.35, medio: 0.65, alto: 1 };
const SonidoContext = createContext(null);

export function SonidoProvider({ children }) {
  const [habilitado, setHabilitado] = useState(true);
  const [volumen, setVolumen] = useState('bajo');

  useEffect(() => {
    AsyncStorage.getItem(AJUSTES_AUDIO_KEY)
      .then((guardado) => {
        if (!guardado) return;
        const ajustes = JSON.parse(guardado);
        if (typeof ajustes.habilitado === 'boolean') setHabilitado(ajustes.habilitado);
        if (VOLUMENES[ajustes.volumen]) setVolumen(ajustes.volumen);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    configureAudioMode().catch(() => {});
    preloadSfx();
    return releaseSfx;
  }, []);

  useEffect(() => {
    configureSfx({ enabled: habilitado, volume: VOLUMENES[volumen] });
  }, [habilitado, volumen]);

  const guardarAjustes = useCallback(async (siguienteHabilitado, siguienteVolumen) => {
    try {
      await AsyncStorage.setItem(AJUSTES_AUDIO_KEY, JSON.stringify({
        habilitado: siguienteHabilitado,
        volumen: siguienteVolumen,
      }));
    } catch {}
  }, []);

  const setHabilitadoPersistido = useCallback((valor) => {
    const siguiente = Boolean(valor);
    setHabilitado(siguiente);
    guardarAjustes(siguiente, volumen);
  }, [guardarAjustes, volumen]);

  const setVolumenPersistido = useCallback((valor) => {
    if (!VOLUMENES[valor]) return;
    setVolumen(valor);
    guardarAjustes(habilitado, valor);
  }, [guardarAjustes, habilitado]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const desbloquear = () => unlockSfx();
    globalThis.addEventListener?.('pointerdown', desbloquear, { once: true });
    return () => globalThis.removeEventListener?.('pointerdown', desbloquear);
  }, []);

  const reproducir = useCallback((nombre) => {
    const alias = {
      reclamar: 'clic',
      'investigacion': 'investigacion completada',
      'edad': 'edad nueva',
      aldeano: 'aldeano llega',
    }[nombre] || nombre;
    return playSfx(alias);
  }, []);

  const valor = useMemo(() => ({
    habilitado,
    volumen,
    setHabilitado: setHabilitadoPersistido,
    setVolumen: setVolumenPersistido,
    reproducir,
  }), [habilitado, volumen, reproducir, setHabilitadoPersistido, setVolumenPersistido]);

  return <SonidoContext.Provider value={valor}>{children}</SonidoContext.Provider>;
}

export function useSonido() {
  const valor = useContext(SonidoContext);
  if (!valor) throw new Error('useSonido debe usarse dentro de SonidoProvider');
  return valor;
}
