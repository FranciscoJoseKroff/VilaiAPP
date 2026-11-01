import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReducedMotion as useReducedMotionReanimated } from 'react-native-reanimated';

export const REDUCIR_ANIMACIONES_KEY = 'vilai_reducir_animaciones';
const listeners = new Set();
let preferenciaUsuario = false;
let cargada = false;

AsyncStorage.getItem(REDUCIR_ANIMACIONES_KEY).then((valor) => {
  preferenciaUsuario = valor === 'true';
  cargada = true;
  listeners.forEach((listener) => listener(preferenciaUsuario));
}).catch(() => {
  cargada = true;
});

export function setReducirAnimaciones(activo) {
  preferenciaUsuario = Boolean(activo);
  listeners.forEach((listener) => listener(preferenciaUsuario));
  AsyncStorage.setItem(REDUCIR_ANIMACIONES_KEY, String(preferenciaUsuario)).catch(() => {});
}

export function useReducedMotion() {
  const sistema = useReducedMotionReanimated();
  const [usuario, setUsuario] = useState(preferenciaUsuario);
  const [web, setWeb] = useState(false);

  useEffect(() => {
    const listener = (activo) => setUsuario(activo);
    listeners.add(listener);
    if (!cargada) {
      AsyncStorage.getItem(REDUCIR_ANIMACIONES_KEY).then((valor) => setUsuario(valor === 'true'));
    }
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const actualizar = () => setWeb(query.matches);
    actualizar();
    query.addEventListener?.('change', actualizar);
    return () => query.removeEventListener?.('change', actualizar);
  }, []);

  return Boolean(sistema || usuario || web);
}
