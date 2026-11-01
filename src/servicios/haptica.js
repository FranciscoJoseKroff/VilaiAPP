import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

export function vibracionLigera() {
  if (Platform.OS === 'web') return Promise.resolve();
  return ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function vibracionMedia() {
  if (Platform.OS === 'web') return Promise.resolve();
  return ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function vibracionNotificacion(tipo = 'success') {
  if (Platform.OS === 'web') return Promise.resolve();
  const feedback = tipo === 'error'
    ? ExpoHaptics.NotificationFeedbackType.Error
    : ExpoHaptics.NotificationFeedbackType.Success;
  return ExpoHaptics.notificationAsync(feedback).catch(() => {});
}
