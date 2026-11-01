import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREFERENCIA_ESCENA_KEY = 'vilai_escena_bajo_consumo';
export const PREFERENCIA_PARTICULAS_KEY = 'vilai_escena_particulas';

export function usePreferenciasEscena() {
  const [ahorroBateria, setAhorroBateriaState] = useState(false);
  const [particulas, setParticulasState] = useState(true);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    Promise.all([
      AsyncStorage.getItem(PREFERENCIA_ESCENA_KEY),
      AsyncStorage.getItem(PREFERENCIA_PARTICULAS_KEY),
    ])
      .then(([ahorro, mostrarParticulas]) => {
        if (!activo) return;
        if (ahorro !== null) setAhorroBateriaState(ahorro === 'true');
        if (mostrarParticulas !== null) setParticulasState(mostrarParticulas === 'true');
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, []);

  const setAhorroBateria = (activoVisual) => {
    setAhorroBateriaState(activoVisual);
    AsyncStorage.setItem(PREFERENCIA_ESCENA_KEY, String(activoVisual)).catch(() => {});
  };

  const setParticulas = (activas) => {
    setParticulasState(activas);
    AsyncStorage.setItem(PREFERENCIA_PARTICULAS_KEY, String(activas)).catch(() => {});
  };

  return { ahorroBateria, particulas, cargando, setAhorroBateria, setParticulas };
}
