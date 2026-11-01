import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme';
import { AppIcon } from '../components/icons';
import PixelPanel from '../components/pixel/PixelPanel';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { AvatarAldeano } from '../components/AvatarAldeano';
import { useSonido } from '../servicios/sonidos';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const toastCounter = useRef(0);

  const dismiss = (id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((items) => items.filter((item) => item.id !== id));
  };

  const showToast = (message, type = 'info', aldeano = null) => {
    toastCounter.current += 1;
    const id = `${Date.now()}-${toastCounter.current}`;
    setToasts((items) => [{ id, message, type, aldeano }, ...items].slice(0, 3));
    timers.current.set(id, setTimeout(() => dismiss(id), 3000));
    return id;
  };

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast debe usarse dentro de ToastProvider');
  return value;
}

const ICONS = { success: 'check-circle', info: 'information', warning: 'alert', error: 'alert-circle' };
const COLORS = { success: 'exito', info: 'acento', warning: 'aviso', error: 'peligro' };

function ToastHost({ toasts, onDismiss }) {
  return (
    <View pointerEvents="box-none" style={styles.host}>
      {toasts.map((toast) => <Toast key={toast.id} {...toast} onDismiss={() => onDismiss(toast.id)} />)}
    </View>
  );
}

function Toast({ message, type, aldeano, onDismiss }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-12);
  const reducirMovimiento = useReducedMotion();
  const sonido = useSonido();
  const estiloEntrada = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    opacity.value = withTiming(1, { duration: reducirMovimiento ? 0 : 180 });
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = withTiming(0, { duration: reducirMovimiento ? 0 : 180 });
  }, [opacity, reducirMovimiento, translateY]);

  useEffect(() => {
    if (type === 'error') sonido.reproducir('error');
  }, [type, sonido]);

  return (
    <Animated.View style={estiloEntrada}>
    <PixelPanel variant={type === 'error' ? 'peligro' : 'elevada'} style={styles.toast}>
      <PressableToast onPress={onDismiss}>
        {aldeano ? <AvatarAldeano aldeano={aldeano} size={36} /> : <AppIcon name={ICONS[type] || ICONS.info} size={20} color={theme.colors[COLORS[type] || 'acento']} />}
        <Text style={styles.message}>{message}</Text>
      </PressableToast>
    </PixelPanel>
    </Animated.View>
  );
}

function PressableToast({ children, onPress }) {
  return <Pressable accessibilityRole="button" style={styles.row} onPress={onPress}>{children}</Pressable>;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, top: 82, zIndex: 999, gap: 8 },
  toast: { borderWidth: 1, borderRadius: theme.radius[10], backgroundColor: theme.colors.superficieAlta, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  message: { flex: 1, color: theme.colors.textoPrimario, fontSize: theme.typography.sizes.normal, fontWeight: theme.typography.weights.semibold },
});