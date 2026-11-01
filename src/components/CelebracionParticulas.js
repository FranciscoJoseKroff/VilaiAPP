import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { theme } from '../../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

const COLORES = [theme.colors.acento, theme.colors.exito, theme.colors.estacionPrimaveraCielo, theme.colors.peligro];

function Particula({ indice, activo, onTerminar }) {
  const desplazamiento = useSharedValue(0);
  const caer = useSharedValue(-20);
  const opacidad = useSharedValue(0);
  const direccion = indice % 2 === 0 ? 1 : -1;
  const distancia = 24 + (indice % 6) * 13;

  const estilo = useAnimatedStyle(() => ({
    opacity: opacidad.value,
    transform: [
      { translateX: desplazamiento.value },
      { translateY: caer.value },
      { rotate: `${desplazamiento.value * 2}deg` },
    ],
  }));

  useEffect(() => {
    if (!activo) return;
    const retraso = (indice % 8) * 35;
    // eslint-disable-next-line react-hooks/immutability
    opacidad.value = withDelay(retraso, withTiming(1, { duration: 100 }));
    // eslint-disable-next-line react-hooks/immutability
    desplazamiento.value = withDelay(retraso, withTiming(direccion * distancia, { duration: 520 }));
    // eslint-disable-next-line react-hooks/immutability
    caer.value = withDelay(retraso, withTiming(150 + (indice % 5) * 18, { duration: 1200 }, (terminado) => {
      if (terminado && indice === 23) runOnJS(onTerminar)();
    }));
    opacidad.value = withDelay(retraso + 850, withTiming(0, { duration: 350 }));
  }, [activo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      style={[
        styles.particula,
        {
          left: `${12 + (indice * 29) % 76}%`,
          top: `${15 + (indice % 4) * 8}%`,
          backgroundColor: COLORES[indice % COLORES.length],
        },
        estilo,
      ]}
    />
  );
}

function CelebracionParticulasComponent({ activo, onTerminar }) {
  const reducido = useReducedMotion();
  useEffect(() => {
    if (activo && reducido) {
      const temporizador = setTimeout(onTerminar, 0);
      return () => clearTimeout(temporizador);
    }
    return undefined;
  }, [activo, reducido, onTerminar]);
  if (!activo || reducido) return null;

  return (
    <View pointerEvents="none" style={styles.host}>
      {Array.from({ length: 24 }, (_, indice) => (
        <Particula key={indice} indice={indice} activo={activo} onTerminar={onTerminar} />
      ))}
    </View>
  );
}

export const CelebracionParticulas = memo(CelebracionParticulasComponent);

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, zIndex: 1100 },
  particula: { position: 'absolute', width: 7, height: 7, borderRadius: 1 },
});
