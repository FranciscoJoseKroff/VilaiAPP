import React, { memo, useEffect } from 'react';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const VueloRecurso = memo(function VueloRecurso({ cambios, onTerminar }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(45);
  const reducido = useReducedMotion();
  const estilo = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  useEffect(() => {
    if (reducido) {
      runOnJS(onTerminar)();
      return;
    }
    opacity.value = 0;
    translateY.value = 45;
    opacity.value = withTiming(1, { duration: 180 });
    translateY.value = withTiming(-90, { duration: 850 }, (finished) => {
      if (finished) opacity.value = withTiming(0, { duration: 180 }, () => runOnJS(onTerminar)());
    });
  }, [cambios, onTerminar, opacity, reducido, translateY]);

  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View style={[styles.contenido, estilo]}>
        {Object.entries(cambios).filter(([, cantidad]) => cantidad !== 0).map(([recurso, cantidad]) => (
          <Text key={recurso} style={[styles.texto, cantidad < 0 && styles.perdida]}>
            {cantidad > 0 ? '+' : ''}{Number(cantidad).toFixed(0)} {recurso}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 78, zIndex: 1000, alignItems: 'center' },
  contenido: { alignItems: 'center', borderRadius: theme.radius[10], paddingHorizontal: theme.spacing[12], paddingVertical: theme.spacing[8], backgroundColor: theme.colors.superficie },
  texto: { color: theme.colors.exito, fontWeight: theme.typography.weights.bold },
  perdida: { color: theme.colors.aviso },
});
