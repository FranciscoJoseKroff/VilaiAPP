import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vibracionLigera, vibracionMedia, vibracionNotificacion } from '../servicios/haptica';

const HapticsContext = createContext(null);
const KEY = 'vilai_haptics_enabled';

export function HapticsProvider({ children }) {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((value) => value !== null && setEnabled(value === 'true'));
  }, []);

  const setHapticsEnabled = async (value) => {
    setEnabled(value);
    await AsyncStorage.setItem(KEY, String(value));
  };

  const light = () => enabled && vibracionLigera();
  const medium = () => enabled && vibracionMedia();
  const success = () => enabled && vibracionNotificacion('success');
  const error = () => enabled && vibracionNotificacion('error');

  return <HapticsContext.Provider value={{ enabled, setHapticsEnabled, light, medium, success, error }}>{children}</HapticsContext.Provider>;
}

export function useHapticsFeedback() {
  const value = useContext(HapticsContext);
  if (!value) throw new Error('useHapticsFeedback debe usarse dentro de HapticsProvider');
  return value;
}