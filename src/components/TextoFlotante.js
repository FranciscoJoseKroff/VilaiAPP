import React, { memo, useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';

export const TextoFlotante = memo(function TextoFlotante({ cantidad, id }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const estilo = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 0;
    opacity.value = withTiming(1, { duration: 120 });
    translateY.value = withTiming(-30, { duration: 900 }, (finished) => {
      if (finished) opacity.value = withTiming(0, { duration: 180 });
    });
  }, [cantidad, id, opacity, translateY]);

  if (!cantidad) return null;
  const texto = cantidad > 0 ? `+${Math.round(cantidad)}` : `${Math.round(cantidad)}`;

  return (
    <Animated.View pointerEvents="none" style={[styles.contenedor, estilo]}>
      <Text style={[styles.texto, cantidad < 0 && styles.perdida]}>{texto}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  texto: {
    color: theme.colors.exito,
    fontSize: theme.typography.sizes.small,
    fontWeight: theme.typography.weights.bold,
    textShadowColor: theme.colors.fondo,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  perdida: {
    color: theme.colors.aviso,
  },
});
